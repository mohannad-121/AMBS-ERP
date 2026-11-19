// Synthetic-only regression. Credentials arrive on stdin and are never logged.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const c = JSON.parse(readFileSync(0, 'utf8'));
const namespace = c.namespace || 'synthetic.browser';
const base = process.env.AMBS_BROWSER_BASE_URL || 'http://127.0.0.1:3109';
const browser = await chromium.launch({ headless: true });
let stage = 'startup', passed = 0;
const errors = [];
function check(value, message) { if (!value) throw Error(message); passed++; console.log('PASS ' + message); }
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(60000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
async function signin(username) {
  await page.goto(base + '/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(c.workerPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(base + '/');
  await page.goto(base + '/imports'); await page.getByRole('heading', { name: 'Import Center', exact: true }).waitFor();
}
async function signout() { await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.waitForURL(base + '/login'); }
async function openSaved() { await page.getByRole('button', { name: 'Review ' + namespace, exact: true }).click(); await page.getByRole('heading', { name: 'Saved review: ' + namespace, exact: true }).waitFor(); }
try {
  stage = 'operator source review'; await signin(c.operator);
  await page.getByRole('heading', { name: '4. Saved synthetic reviews' }).waitFor();
  check(await page.getByText('NO DATA HAS BEEN IMPORTED', { exact: true }).isVisible(), 'Saved workflow explicitly reports no import');
  await page.getByLabel('Excel or CSV source').setInputFiles({ name: 'synthetic-p9.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Email\nSynthetic Durable Browser,durable@example.com\n') });
  await page.getByRole('heading', { name: '2. Confirm headers and map columns' }).waitFor();
  await page.getByLabel('Synthetic source namespace').fill(namespace);
  await page.getByLabel('I confirm this source contains synthetic test data only.').check();
  await page.getByRole('button', { name: 'Save synthetic source manifest' }).click();
  await page.getByRole('heading', { name: 'Saved review: ' + namespace, exact: true }).waitFor();
  check(true, 'Source manifest saved using existing authenticated CSRF workflow');
  await page.getByLabel('Mapping version', { exact: true }).fill('synthetic-1');
  await page.getByLabel('Selected source row numbers').fill('2');
  await page.getByLabel('Source row identities').fill('{"2":"SYNTH-BROWSER-001"}');
  await page.getByRole('button', { name: 'Save selection revision' }).click();
  await page.getByText(/revision 1 · version 1/).waitFor();
  await page.getByLabel('Review reason').fill('Synthetic browser validation');
  await page.getByRole('button', { name: 'Save validation run' }).click();
  await page.getByText('VALIDATED', { exact: true }).last().waitFor();
  check(true, 'Selected rows and exact validation run persist');
  await page.reload(); await openSaved();
  check(await page.getByLabel('Excel or CSV source').inputValue() === '', 'Refresh clears ephemeral upload while saved review persists');
  await page.getByText(/Valid selection ·/).click();
  check(await page.getByRole('columnheader', { name: 'Original values', exact: true }).isVisible(), 'Original values remain distinct from proposed values');
  check(await page.getByRole('columnheader', { name: 'Proposed values', exact: true }).isVisible(), 'Proposed values are clearly identified');
  stage = 'independent reviewer'; await signout(); await signin(c.reviewer); await openSaved();
  await page.getByLabel('Review reason').fill('Synthetic independent review');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await page.getByText('READY_FOR_APPROVAL', { exact: true }).last().waitFor();
  check(true, 'Separate reviewer records readiness');
  stage = 'independent approver'; await signout(); await signin(c.approver); await openSaved();
  await page.getByLabel('Review reason').fill('Synthetic independent approval');
  await page.getByRole('button', { name: 'Approve review metadata', exact: true }).click();
  await page.getByText('Approved metadata; no execution capability', { exact: false }).waitFor();
  check(true, 'Separate administrator approval is bound and has no execution capability');
  check(await page.getByRole('button', { name: /^(Import now|Apply|Execute|Execute import)$/i }).count() === 0, 'No executable import action exists');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    // Chromium can expose the preceding full-page screenshot's viewport during
    // resize. Wait for the same layout predicate under the existing 60s limit.
    const resizeStarted = performance.now();
    const immediateWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
    console.log('LAYOUT ' + JSON.stringify({ viewport: width, immediateWidth, settledMs: Math.round(performance.now() - resizeStarted) }));
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + 'px saved-review layout has no page overflow');
    await page.screenshot({ path: '/artifacts/p9-review-' + width + '.png', fullPage: true });
  }
  stage = 'protected navigation regression';
  for (const [route, heading] of [['/audit', 'Audit history'], ['/system', 'System status'], ['/imports', 'Import Center']]) {
    await page.goto(base + route); await page.getByRole('heading', { name: heading, exact: true, level: 1 }).waitFor();
    check(true, route + ' expected heading rendered under unchanged timeout');
  }
  await signout();
  check((await context.request.get(base + '/api/onboarding/review/sources')).status() === 401, 'Logged-out users cannot read durable metadata');
  check(errors.length === 0, 'No browser console, React or hydration errors');
  console.log('PASS ' + passed + ' durable review Chromium checks');
} catch (failure) {
  const redact = value => { let result = String(value); for (const secret of [c.password, c.workerPassword]) if (secret) result = result.replaceAll(secret, '[redacted]'); return result; };
  writeFileSync('/artifacts/p9-failure.json', redact(JSON.stringify({ stage, url: page.url(), error: failure.message, errors, dom: await page.locator('body').ariaSnapshot().catch(() => 'unavailable') }, null, 2)));
  await page.screenshot({ path: '/artifacts/p9-failure.png', mask: [page.locator('input,textarea')] }).catch(() => {});
  console.error('FAIL durable review at ' + stage + ': ' + redact(failure.message).split('\n')[0]); process.exitCode = 1;
} finally { await context.close(); await browser.close(); }
