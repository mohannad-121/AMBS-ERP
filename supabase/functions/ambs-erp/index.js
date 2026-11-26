import { validateSnapshot } from './validation.js';

const maximumBytes = 12 * 1024 * 1024;
const endpoint = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const answer = (body, status = 200) => Response.json(body, { status, headers });

async function rpc(operation, args) {
  const result = await fetch(endpoint + '/rest/v1/rpc/ambs_erp_' + operation, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!result.ok) throw new Error('Unable to access the AMBS database.');
  return await result.json();
}

async function readBody(request) {
  if (!request.body || Number(request.headers.get('content-length')) > maximumBytes) throw new Error('Request is missing or too large.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new Error('AMBS request exceeds 12 MiB.');
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

async function verifiedEmailRequired() {
  const response = await fetch(endpoint + '/auth/v1/settings',{ headers: { apikey: publicKey } });
  if (!response.ok) throw Error('Unable to verify the Auth settings.');
  return (await response.json()).mailer_autoconfirm === false;
}

async function setup(request) {
  const data = await readBody(request);
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email || typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 72) {
    return answer({ message: 'Enter your authorized email and a password of 12 to 72 characters.' }, 400);
  }
  if (!await rpc('member', { p_email: email })) return answer({ message: 'This email is not enabled for AMBS.' }, 403);
  if (!await verifiedEmailRequired()) return answer({message:'Verified-email account setup is unavailable.'},503);
  const provider = await fetch(endpoint + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: publicKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: data.password })
  });
  if (!provider.ok) {
    const error = await provider.json().catch(() => ({}));
    return answer({ message: String(error.msg || error.message || 'Account setup could not be completed.') }, provider.status);
  }
  return answer({ message: 'Check your email for the AMBS confirmation code and enter it in the app.' });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/setup')) {
    try { return await setup(request); }
    catch { return answer({ message: 'Account setup is temporarily unavailable.' }, 503); }
  }
  if (!['GET', 'PUT'].includes(request.method)) return answer({ message: 'Method not allowed.' }, 405);
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return answer({ message: 'Sign in to AMBS.' }, 401);
  try {
    const auth = await fetch(endpoint + '/auth/v1/user', { headers: { apikey: publicKey, Authorization: token } });
    if (!auth.ok) return answer({ message: 'Your session expired. Sign in again.' }, 401);
    const user = await auth.json();
    if (!user.id || !user.email || !user.email_confirmed_at || user.is_anonymous) {
      return answer({ message: 'Confirm your account email before signing in.' }, 403);
    }
    if (!await verifiedEmailRequired()) return answer({message:'Verified-email access is temporarily unavailable.'},503);
    const email = user.email.toLowerCase();
    // Unsaved form drafts of this employee only (so a half-filled form follows them to another device).
    if (new URL(request.url).pathname.endsWith('/drafts')) {
      if (request.method === 'GET') {
        const drafts = await rpc('drafts_read', { p_email: email });
        return drafts === null ? answer({ message: 'This account does not have AMBS access.' }, 403) : answer({ drafts });
      }
      let body;
      try { body = await readBody(request); }
      catch { return answer({ message: 'Invalid drafts or payload is too large.' }, 400); }
      const drafts = body?.drafts;
      if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts) || JSON.stringify(drafts).length > 2 * 1024 * 1024 ||
        Object.keys(drafts).length > 200) return answer({ message: 'Drafts are too large.' }, 413);
      return await rpc('drafts_write', { p_email: email, p_drafts: drafts }) ? answer({ ok: true }) :
        answer({ message: 'This account does not have AMBS access.' }, 403);
    }
    const current = await rpc('read', { p_email: email });
    if (!current) return answer({ message: 'This account does not have AMBS access.' }, 403);
    if (request.method === 'GET') return answer({ ...current, identity: email });

    if (current.role === 'owner') return answer({ message: 'The owner account is view-only — nothing can be changed from it.' }, 403);
    let data;
    try { data = await readBody(request); }
    catch { return answer({ message: 'Invalid workspace data or payload is too large.' }, 400); }
    if (data.revision !== current.revision) return answer({ message: 'Another employee saved a change. Reload before saving again.' }, 409);
    const boss = ['admin', 'owner'].includes(current.role);
    if (!current.snapshot && !boss) return answer({ message: 'An administrator needs to initialize AMBS.' }, 403);
    try {
      validateSnapshot(data.snapshot);
      const prior = current.snapshot?.state;
      if (prior) {
        const candidate = data.snapshot.state;
        if (!boss && (canonical(prior.settings) !== canonical(candidate.settings) ||
          Object.keys(current.snapshot.legacy).some(name => name !== 'weighDocs' &&
            canonical(current.snapshot.legacy[name]) !== canonical(data.snapshot.legacy[name])))) {
          return answer({ message: 'Only an administrator can edit company settings or import the archive.' }, 403);
        }
        // Ledger entries already posted to stock are immutable.
        if (prior.events.length > candidate.events.length ||
          prior.events.some((event, index) => canonical(event) !== canonical(candidate.events[index]))) {
          return answer({ message: 'Existing stock movements cannot be changed or removed.' }, 422);
        }
      }
    } catch (error) {
      return answer({ message: error.message || 'Invalid AMBS workspace.' }, 422);
    }
    const revision = await rpc('write', { p_email: email, p_actor: user.id, p_expected: data.revision, p_snapshot: data.snapshot });
    if (revision === null) return answer({ message: 'The workspace changed. Reload before saving again.' }, 409);
    return answer({ revision });
  } catch {
    return answer({ message: 'AMBS cloud storage is temporarily unavailable. Try again shortly.' }, 503);
  }
});

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
