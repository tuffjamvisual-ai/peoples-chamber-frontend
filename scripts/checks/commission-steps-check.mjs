// Commission form steps and Find Your MP messages (owner, 4 Nov 2026), on a running site. Under 1,024px (phones, and
// tablets since T1-GUARD batch 4, 13 Nov 2026; under 640px until T1-768): four steps, Next and Back, values kept, each step
// checked with the form's own rules, Enter moves on rather than sends, a send that fails on an earlier step returns to it,
// and the enquiry sent holds every field. From 1,024px: every field shows and there are no steps. /api/commission is always answered by this script, so no email is ever sent.
//   node scripts/checks/commission-steps-check.mjs <base url> <out dir>
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const [base, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };
const IDS = ['name', 'email', 'organisation', 'title', 'question', 'knownPeople', 'knownFrom', 'knownTo', 'knownArea', 'knownLinks', 'deadline', 'publish', 'terms'];
const STEPS = { 1: ['title', 'question'], 2: ['knownPeople', 'knownFrom', 'knownTo', 'knownArea'], 3: ['knownLinks', 'deadline', 'publish'], 4: ['name', 'email', 'organisation', 'terms'] };
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const shown = (page) => page.evaluate((ids) => ids.filter((i) => { const e = document.getElementById(`commission-${i}`); return e && e.getClientRects().length > 0; }), IDS);
const line = (page) => page.locator('[data-cm-progress]').innerText();
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const consent = async (page) => {
  const b = page.getByRole('button', { name: /reject|decline|essential/i }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(200); }
};
const phone = () => browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// ---- the steps, at 375px
{
  const ctx = await phone();
  const page = await ctx.newPage();
  const sent = [];
  let answer = { status: 200, body: { ok: true } };
  await page.route('**/api/commission', async (r) => { sent.push(r.request().postDataJSON()); await r.fulfill({ status: answer.status, contentType: 'application/json', body: JSON.stringify(answer.body) }); });
  await page.goto(`${base}/commission`, { waitUntil: 'networkidle', timeout: 180000 });
  await consent(page);
  const next = page.locator('[data-cm-next]');
  const back = page.locator('[data-cm-back]');
  const send = page.locator('button[type=submit]');
  const shot = (n) => page.screenshot({ path: path.join(outDir, `375-commission-${n}.png`) });

  check('starts on step 1', (await line(page)).includes('Step 1 of 4'), await line(page));
  check('step 1 shows title and description only', same(await shown(page), STEPS[1]), (await shown(page)).join());
  check('no Back or Send on step 1', !(await back.isVisible()) && !(await send.isVisible()));
  check('page not wider than the screen', (await sideways(page)) <= 0);
  const size = await next.boundingBox();
  check('Next is at least 44px tall', size.height >= 44, `${Math.round(size.height)}px`);

  await next.tap();
  check('empty step 1 stays put with its errors', (await line(page)).includes('Step 1 of 4') && (await page.locator('#commission-title-error').isVisible()) && (await page.locator('#commission-question-error').isVisible()));
  check('no error from a later step shows', !(await page.locator('#commission-name-error').count()));
  check('focus goes to the first field in error', await page.evaluate(() => document.activeElement?.id === 'commission-title'));
  await shot('1-errors');

  await page.fill('#commission-title', 'Spending on a test');
  await page.fill('#commission-question', 'A question that is long enough to pass the thirty character rule.');
  await page.press('#commission-title', 'Enter');
  await page.waitForTimeout(150);
  check('Enter in a field moves on and sends nothing', (await line(page)).includes('Step 2 of 4') && sent.length === 0, await line(page));
  check('step 2 shows people, dates and area', same(await shown(page), STEPS[2]), (await shown(page)).join());
  check('the step heading is in view', await page.evaluate(() => { const r = document.querySelector('[data-cm-progress]').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; }));
  check('no sideways scroll with the date fields', (await sideways(page)) <= 0);
  await page.fill('#commission-knownPeople', 'A person, a body and a company');
  await page.fill('#commission-knownFrom', '2024-02-01');
  await page.fill('#commission-knownTo', '2024-01-01');
  await next.tap();
  check('a period ending before it starts is refused', (await line(page)).includes('Step 2 of 4') && (await page.locator('#commission-knownTo-error').isVisible()));
  await page.fill('#commission-knownTo', '2025-01-01');
  await page.fill('#commission-knownArea', 'Nottingham');
  await shot('2');
  await next.tap();
  check('step 3 shows links, deadline and publication', (await line(page)).includes('Step 3 of 4') && same(await shown(page), STEPS[3]), (await shown(page)).join());

  await page.fill('#commission-knownLinks', ['1', '2', '3', '4', '5', '6'].map((n) => `https://www.gov.uk/${n}`).join('\n'));
  await next.tap();
  check('six links are refused', await page.locator('#commission-knownLinks-error').isVisible(), await page.locator('#commission-knownLinks-error').innerText());
  check('an unanswered publication question is refused', await page.locator('#commission-publish-error').isVisible());
  await page.fill('#commission-knownLinks', ['1', '2', '3', '4', '5'].map((n) => `https://www.gov.uk/${n}`).join('\n'));
  await page.selectOption('#commission-publish', 'Not sure');
  await page.fill('#commission-deadline', '2099-01-01');
  await shot('3');
  await next.tap();
  check('step 4 shows name, email, organisation and terms', (await line(page)).includes('Step 4 of 4') && same(await shown(page), STEPS[4]), (await shown(page)).join());
  check('Send and Back show on step 4, Next does not', (await send.isVisible()) && (await back.isVisible()) && !(await next.isVisible()));
  const honeypot = await page.evaluate(() => { const r = document.getElementById('commission-website').getBoundingClientRect(); return r.left < 0; });
  check('the spam field stays off the screen', honeypot);

  await page.fill('#commission-name', 'A Tester');
  await page.fill('#commission-email', 'tester@example.com');
  await page.fill('#commission-organisation', 'Testers');
  for (const n of [3, 2, 1]) {
    await back.tap();
    check(`Back reaches step ${n}`, (await line(page)).includes(`Step ${n} of 4`));
  }
  const kept = await page.evaluate((ids) => Object.fromEntries(ids.map((i) => [i, document.getElementById(`commission-${i}`).value])), IDS);
  check('nothing is lost moving between steps', kept.title === 'Spending on a test' && kept.knownArea === 'Nottingham' && kept.publish === 'Not sure' && kept.deadline === '2099-01-01' && kept.name === 'A Tester' && kept.knownLinks.split('\n').length === 5);
  for (let n = 0; n < 3; n++) await next.tap();

  await page.locator('[data-cm-send]').tap();
  await page.waitForTimeout(150);
  check('terms not ticked: nothing is sent', sent.length === 0 && (await page.locator('#commission-terms-error').isVisible()));
  await page.check('#commission-terms');
  await shot('4');

  answer = { status: 400, body: { error: 'Please correct the highlighted fields.', errors: { title: 'The server refused this title.' } } };
  await page.locator('[data-cm-send]').tap();
  await page.waitForSelector('#commission-title-error');
  check('a refusal for an earlier step returns to that step', (await line(page)).includes('Step 1 of 4') && await page.evaluate(() => document.activeElement?.id === 'commission-title'), await line(page));
  for (let n = 0; n < 3; n++) await next.tap();
  check('its error can be passed once the field is fine', (await line(page)).includes('Step 4 of 4'), await line(page));

  answer = { status: 200, body: { ok: true } };
  await page.locator('[data-cm-send]').tap();
  await page.getByRole('status').waitFor();
  const b = sent.at(-1);
  check('the enquiry holds every field', b.title === 'Spending on a test' && b.question.startsWith('A question') && b.knownPeople.startsWith('A person') && b.knownFrom === '2024-02-01' && b.knownTo === '2025-01-01' && b.knownArea === 'Nottingham' && b.knownLinks.length === 5 && b.deadline === '2099-01-01' && b.publish === 'Not sure' && b.name === 'A Tester' && b.email === 'tester@example.com' && b.organisation === 'Testers' && b.terms === true && b.website === '');
  await shot('sent');
  await ctx.close();
}

// ---- phones and tablets (767, 768 and 1023px) have steps; 1024px and 1440px do not
for (const [width, stepped] of [[767, true], [768, true], [1023, true], [1024, false], [1440, false]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/commission`, { waitUntil: 'networkidle', timeout: 180000 });
  const fields = await shown(page);
  const progress = await page.locator('[data-cm-progress]').isVisible();
  const nextShown = await page.locator('[data-cm-next]').isVisible();
  if (stepped) check(`${width}px has steps`, progress && nextShown && same(fields, STEPS[1]));
  else check(`${width}px shows every field and no steps`, !progress && !nextShown && fields.length === IDS.length && (await page.locator('[data-cm-send]').isVisible()), `${fields.length} fields`);
  await ctx.close();
}

// ---- Find Your MP, phone and desktop. Uses the site's own postcode lookup.
for (const [label, ctxOpts] of [['375', { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(`${base}/find-your-mp`, { waitUntil: 'networkidle', timeout: 180000 });
  await consent(page);
  const input = page.getByRole('textbox', { name: /postcode/i });
  const button = page.getByRole('button', { name: 'Find my MP' });
  const body = () => page.locator('form').first().innerText();
  check(`${label}: hint gives an example postcode`, (await body()).includes('SW1A 0AA'));
  check(`${label}: Browse all MPs goes to /mps`, (await page.getByRole('link', { name: 'Browse all MPs' }).getAttribute('href')) === '/mps');
  check(`${label}: not wider than the screen`, (await sideways(page)) <= 0);
  await page.screenshot({ path: path.join(outDir, `${label}-find-mp.png`) });
  for (const [typed, want] of [['SW1A', /looks incomplete/], ['SW1A 0', /looks incomplete/], ['ZZ1 1ZZ', /could not find that postcode/]]) {
    await input.fill(typed);
    await button.click();
    await page.getByText(want).waitFor({ timeout: 15000 }).then(() => check(`${label}: "${typed}" gives its message`, true), () => check(`${label}: "${typed}" gives its message`, false));
    await page.screenshot({ path: path.join(outDir, `${label}-find-mp-${typed.replace(/ /g, '')}.png`) });
  }
  await input.fill('Abbott');
  await page.getByText(/Diane Abbott/).first().waitFor({ timeout: 15000 }).then(() => check(`${label}: name search still works`, true), () => check(`${label}: name search still works`, false));
  await input.fill('SW1A 0AA');
  await button.click();
  await page.waitForURL(/\/mps\/\d+/, { timeout: 30000 }).then(() => check(`${label}: a full postcode goes to its MP`, true, page.url().replace(base, '')), () => check(`${label}: a full postcode goes to its MP`, false));
  await ctx.close();
}

// ---- the phone menu, measured only
{
  const ctx = await phone();
  const page = await ctx.newPage();
  await page.goto(`${base}/commission`, { waitUntil: 'networkidle', timeout: 180000 });
  await consent(page);
  const bar = await page.$$eval('.og-mbar-btn', (b) => b.map((x) => ({ label: x.getAttribute('aria-label'), w: Math.round(x.offsetWidth), h: Math.round(x.offsetHeight) })));
  await page.locator('.og-mbar-btn[aria-label=Menu]').tap();
  await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const panel = document.getElementById('og-menu-panel');
    const r = panel.getBoundingClientRect();
    const box = (a) => { const b = a.getBoundingClientRect(); return { text: a.innerText.trim().replace(/\s+/g, ' '), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      panel: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], viewport: [innerWidth, innerHeight],
      scrollable: panel.scrollHeight > panel.clientHeight, panelScroll: [panel.scrollHeight, panel.clientHeight], overflow: getComputedStyle(panel).overflowY, pageLocked: getComputedStyle(document.documentElement).overflow,
      close: box(panel.querySelector('.og-menu-close')), sections: [...panel.querySelectorAll('.og-menu-list a')].map(box),
      cta: box(panel.querySelector('.og-menu-cta')), account: [...panel.querySelectorAll('.og-menu-account a, .og-menu-account button')].map(box), focus: document.activeElement?.innerText,
    };
  });
  console.log('MENU bar', JSON.stringify(bar));
  console.log('MENU', JSON.stringify(m));
  await page.screenshot({ path: path.join(outDir, '375-menu.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log('MENU closed by Escape', await page.locator('#og-menu-panel').isHidden());
  await page.locator('.og-mbar-btn[aria-label=Menu]').tap();
  await page.waitForTimeout(150);
  await page.goBack();
  await page.waitForTimeout(250);
  console.log('MENU closed by Back', await page.locator('#og-menu-panel').isHidden(), 'still on', page.url().replace(base, ''));
  await page.locator('.og-mbar-btn[aria-label=Menu]').tap();
  await page.waitForTimeout(150);
  await page.locator('.og-menu-close').tap();
  await page.waitForTimeout(250);
  console.log('MENU closed by X', await page.locator('#og-menu-panel').isHidden());
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
