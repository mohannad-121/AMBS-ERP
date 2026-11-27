/* Vercel function: GET /api/geo?url=https://maps.app.goo.gl/…  →  {lat, lng}
   Google Maps short links only show their coordinates after a redirect, which the browser cannot follow
   (cross-origin). This expands one short link, following redirects only while they stay on Google.
   Only maps.app.goo.gl / goo.gl/maps links are accepted, so it cannot be used to fetch anything else. */
const SHORT_MAP = /^https:\/\/(?:maps\.app\.goo\.gl\/[A-Za-z0-9_-]+|goo\.gl\/maps\/[A-Za-z0-9_-]+)\/?(?:\?[^#]*)?$/;
const GOOGLE_HOST = /^(?:maps\.app\.goo\.gl|goo\.gl|(?:[a-z]+\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?)$/i;

function mapCoords(url) {
  let text = String(url || '');
  try { text = decodeURIComponent(text.replace(/\+/g, ' ')); } catch { /* keep raw text */ }
  const num = '(-?\\d{1,3}\\.\\d+)';
  for (const re of [new RegExp('!3d' + num + '!4d' + num), new RegExp('/search/' + num + ',\\s*' + num),
    new RegExp('[?&](?:q|query|ll|destination|center)=' + num + ',\\s*' + num), new RegExp('@' + num + ',' + num)]) {
    const m = text.match(re);
    if (m && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180) return { lat: +m[1], lng: +m[2] };
  }
  return null;
}

async function expandMap(url) {
  let next = url;
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(next, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AMBS)' } });
    const target = response.headers.get('location');
    await response.body?.cancel();
    if (!target) return null;
    const link = new URL(target, next);
    if (link.protocol !== 'https:' || !GOOGLE_HOST.test(link.hostname)) return null;
    const point = mapCoords(link.href) || mapCoords(link.searchParams.get('continue') || '');
    if (point) return point;
    next = link.href;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
  const link = String(req.query?.url || '');
  if (!SHORT_MAP.test(link)) return res.status(400).json({ message: 'Send a maps.app.goo.gl link.' });
  const point = await expandMap(link).catch(() => null);
  if (!point) return res.status(404).json({ message: 'This Google Maps link has no coordinates.' });
  // a short link always points at the same place: let the CDN keep the answer for a day
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
  return res.status(200).json(point);
}
