// Accuracy checks A11 to A14 (T1-QA9, Cowork 11 and 12 Nov 2026, "Accuracy first"): errors a reader could be misled by
// are caught by us, not by readers. Run daily with the full rendered checks (rendered-checks-daily.mjs, 05:17) against the
// live site, one page load a second at most; by hand against a local build:
//   npx tsx --tsconfig tsconfig.json scripts/checks/qa/accuracy-checks.ts --base http://localhost:3199 [--only A11,A14] [--json out.json]
// A11 finds itself: every bill in the current session, every sitting MP, every council and every constituency is
//     returned by its own page's finder (/bills?q=, /mps?q=, /councils/search?q=, /constituencies?q=) on the first page.
// A12 labels match the source: on 50 contracts, 50 donations and 20 divisions every label checked names the source field
//     it shows (the notice type and "changed to" only for a value change; the reporting period and the date reported to
//     the Electoral Commission; the official Aye and No totals).
// A13 shortcuts and paging: every in-page link on the sample pages lands on visible content (its fold opened), and after
//     Next on a list replaced in place the new results' heading is on screen.
// A14 no empty destinations: no page linked from the menu, the A - Z Directory or a section hub shows a "No ... yet" state.
// Database reads are read only (the service key from .env.local). Exit 1 when anything fails.
import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
// The address of a division (lib/division-links.ts divisionHref; that module reads the database, so it is not imported).
const divisionHref = (date: string, number: number) => `/divisions/pw-${date.slice(0, 10)}-${number}-commons`;
import { NAV, PHONE_MENU_GROUPS, SECTION_PAGES } from '../../../lib/site-nav';
import { DIRECTORY } from '../../../lib/directory';

const ROOT = path.resolve(__dirname, '../../..');
const argv = process.argv.slice(2);
const arg = (k: string, d: string | null = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg('--base', 'http://localhost:3000') as string).replace(/\/$/, '');
const ONLY = (arg('--only') ?? 'A11,A12,A13,A14').split(',');
const JSON_OUT = arg('--json');
const LIVE = /opengovt\.uk$/.test(new URL(BASE).hostname);

for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

let last = 0;
async function pace() { if (!LIVE) return; const w = last + 1000 - Date.now(); if (w > 0) await new Promise((r) => setTimeout(r, w)); last = Date.now(); }
async function load(p: Page, url: string) { await pace(); return p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
async function all<T>(q: () => any, size = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) { const { data, error } = await q().range(from, from + size - 1); if (error) throw new Error(error.message); out.push(...(data ?? [])); if (!data || data.length < size) break; }
  return out;
}
const sample = <T,>(xs: T[], n: number, seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))) => {
  const a = [...xs]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};
const fails: string[] = [];
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}
const summary: Record<string, unknown> = {};

async function a11(p: Page) {
  // The current session (parliament_session_bill_counts_stored carries the flag, as lib/parliament-sessions.ts reads it).
  const { data: sess, error: sErr } = await db.from('parliament_session_bill_counts_stored').select('session_id').eq('is_current', true).limit(1).maybeSingle();
  if (sErr || !sess) throw new Error(`current session: ${sErr?.message ?? 'none'}`);
  const bills = await all<{ bill_id: number; title: string }>(() => db.from('bill_in_session_stored').select('bill_id, title').eq('session_id', sess.session_id).order('bill_id'));
  const mps = await all<{ member_id: number; name: string; display_name: string | null }>(() => db.from('mps').select('member_id, name, display_name').eq('current_member', true).order('member_id'));
  const councils = await all<{ slug: string; name: string }>(() => db.from('councils').select('slug, name').order('slug'));
  const seats = await all<{ slug: string; name: string }>(() => db.from('constituencies').select('slug, name').order('slug'));
  const n: Record<string, [number, number]> = {};
  const check = async (kind: string, url: string, href: string, label: string) => {
    n[kind] ??= [0, 0]; n[kind][0]++;
    try {
      await load(p, url);
      // Lists filtered in the browser (/mps) render after the script runs: wait for the link, up to 8 seconds.
      await p.waitForFunction((h) => [...document.querySelectorAll('main a[href]')].some((a) => (a.getAttribute('href') || '').split(/[?#]/)[0] === h), href, { timeout: kind === 'mp' ? 8000 : 1500 }).catch(() => {});
      const ok = await p.evaluate((h) => [...document.querySelectorAll('main a[href]')].some((a) => (a.getAttribute('href') || '').split(/[?#]/)[0] === h), href);
      if (!ok) { n[kind][1]++; fails.push(`A11 ${kind} "${label}": ${url} does not list ${href}`); }
    } catch (e) { n[kind][1]++; fails.push(`A11 ${kind} "${label}": ${url} did not load (${(e as Error).message.split('\n')[0]})`); }
  };
  for (const b of bills) await check('bill', `/bills?q=${encodeURIComponent(b.title)}`, `/bills/${b.bill_id}`, b.title);
  for (const c of councils) await check('council', `/councils/search?q=${encodeURIComponent(c.name)}`, `/councils/${c.slug}`, c.name);
  for (const s of seats) await check('constituency', `/constituencies?q=${encodeURIComponent(s.name)}`, `/constituencies/${s.slug}`, s.name);
  // MPs: /mps filters in the browser, so one load and the address's ?q= for each name.
  for (const m of mps) {
    const name = (m.display_name || m.name).trim();
    await check('mp', `/mps?q=${encodeURIComponent(name)}`, `/mps/${m.member_id}`, name);
  }
  summary.A11 = Object.fromEntries(Object.entries(n).map(([k, [t, f]]) => [k, `${t - f} of ${t} found`]));
}

async function a12(p: Page) {
  // Contracts: each notice line names the notice's own type; "changed to" only on a change notice that changes the value.
  const { data: cn } = await db.from('contract_notices').select('ocid').in('value_type', ['change_new']).limit(5000);
  const ocids = sample([...new Set((cn ?? []).map((r) => r.ocid as string))], 50);
  let cBad = 0;
  for (const ocid of ocids) {
    const { data: ns } = await db.from('contract_notices').select('release_id, notice_type, value_type, source_url').eq('ocid', ocid);
    await load(p, `/contracts/${ocid}`);
    const lines = await p.evaluate(() => [...document.querySelectorAll('main li')].map((li) => ({ href: li.querySelector('a')?.getAttribute('href') ?? '', text: (li.textContent || '').replace(/\s+/g, ' ') })));
    for (const l of lines) {
      const rel = (ns ?? []).find((n) => n.source_url === l.href);
      if (!rel) continue;
      const isChangeForm = rel.notice_type === 'UK10' || (!rel.notice_type && rel.value_type === 'change_new');
      if (/changed to £/.test(l.text) && !isChangeForm) { cBad++; fails.push(`A12 contract /contracts/${ocid}: "changed to" on a ${rel.notice_type ?? 'non-change'} notice (${rel.release_id})`); }
      if (/Contract change notice/.test(l.text) && rel.notice_type && rel.notice_type !== 'UK10') { cBad++; fails.push(`A12 contract /contracts/${ocid}: labelled a change notice but is ${rel.notice_type} (${rel.release_id})`); }
    }
  }
  // Donations: the card's reporting period and date reported are the record's own fields.
  const { data: dons } = await db.from('political_donations').select('id, donor_name, reporting_period_name, reported_date').not('reporting_period_name', 'is', null).not('donor_name', 'is', null).order('received_date', { ascending: false, nullsFirst: false }).limit(3000);
  let dChecked = 0, dBad = 0;
  for (const d of sample(dons ?? [], 120)) {
    if (dChecked >= 50) break;
    const { count } = await db.from('political_donations').select('id', { count: 'exact', head: true }).or(`donor_name.ilike.%${(d.donor_name as string).replace(/[%_,()]/g, '')}%,recipient_name.ilike.%${(d.donor_name as string).replace(/[%_,()]/g, '')}%`);
    if ((count ?? 99) > 20) continue; // the card would not be on the first page
    await load(p, `/transparency/donations?q=${encodeURIComponent(d.donor_name as string)}`);
    const card = await p.evaluate((id) => document.querySelector(`[data-donation-id="${id}"]`)?.textContent?.replace(/\s+/g, ' ') ?? null, String(d.id));
    if (card == null) continue;
    dChecked++;
    const period = /Reporting period: ([^·]+?)(?: ·|$| Reported| Full)/i.exec(card)?.[1]?.trim();
    if (/Reported (?!to the Electoral Commission)[A-Z][a-z]+ \d{4}/.test(card)) { dBad++; fails.push(`A12 donation ${d.id}: a reporting period labelled as a date reported`); }
    if (period && period.toLowerCase() !== String(d.reporting_period_name).trim().toLowerCase()) { dBad++; fails.push(`A12 donation ${d.id}: reporting period "${period}", record "${d.reporting_period_name}"`); }
    if (d.reported_date && !/Reported to the Electoral Commission:/i.test(card)) { dBad++; fails.push(`A12 donation ${d.id}: the date reported is not shown`); }
  }
  // Divisions: the Aye and No headings are the official totals.
  const { data: tot } = await db.from('commons_division_totals').select('division_id, aye_count, no_count').order('division_id', { ascending: false }).limit(2000);
  let vBad = 0, vChecked = 0;
  for (const t of sample(tot ?? [], 40)) {
    if (vChecked >= 20) break;
    const { data: v } = await db.from('mp_division_votes').select('division_date_only, division_number').eq('division_id', t.division_id).limit(1).maybeSingle();
    if (!v?.division_date_only || v.division_number == null) continue;
    vChecked++;
    const href = divisionHref(v.division_date_only as string, v.division_number as number);
    await load(p, href);
    const txt = await p.evaluate(() => document.querySelector('main')?.textContent?.replace(/\s+/g, ' ') ?? '');
    const aye = /Voted AYE \((\d+)\)/i.exec(txt)?.[1], no = /Voted NO \((\d+)\)/i.exec(txt)?.[1];
    if (Number(aye) !== t.aye_count || Number(no) !== t.no_count) { vBad++; fails.push(`A12 division ${href}: shows Ayes ${aye ?? '?'} Noes ${no ?? '?'}, official ${t.aye_count} and ${t.no_count}`); }
  }
  summary.A12 = { contracts: `${ocids.length} checked, ${cBad} wrong labels`, donations: `${dChecked} checked, ${dBad} wrong`, divisions: `${vChecked} checked, ${vBad} wrong` };
}

async function a13(p: Page) {
  // The sample pages of the rendered checks (one of each page type in mobile-audit-fast.txt).
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-pages.csv'), 'utf8'));
  const types = fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const urls = [...new Set(types.map((t) => (rows.find((r) => r.route === t) ?? rows.find((r) => r.example_url === t))?.example_url).filter(Boolean) as string[])];
  let links = 0, bad = 0;
  for (const u of urls) {
    await load(p, u); await p.waitForTimeout(500);
    const hrefs = await p.evaluate(() => [...new Set([...document.querySelectorAll('main a[href^="#"]')].filter((a) => a.getClientRects().length).map((a) => a.getAttribute('href')!).filter((h) => h.length > 1))].slice(0, 8));
    for (const h of hrefs) {
      links++;
      await p.evaluate((hh) => { const a = [...document.querySelectorAll(`main a[href="${hh}"]`)].find((x) => x.getClientRects().length) as HTMLElement | undefined; a?.click(); }, h);
      await p.waitForTimeout(500);
      const r = await p.evaluate((hh) => { const t = document.getElementById(decodeURIComponent(hh.slice(1))); if (!t) return 'no target'; if (!t.getClientRects().length) return 'target hidden'; const top = t.getBoundingClientRect().top; return top < -8 || top > innerHeight ? `target off screen (${Math.round(top)}px)` : null; }, h);
      if (r) { bad++; fails.push(`A13 ${u}: in-page link ${h}: ${r}`); }
    }
  }
  // Paging that replaces a list in place: the MP voting record's Next.
  await load(p, '/mps/5191?section=voting'); await p.waitForTimeout(2000);
  const fold = p.locator('summary', { hasText: /Older votes and every vote by year/ }).first();
  if (await fold.count()) await fold.click();
  const next = p.locator('button:visible', { hasText: 'Next →' }).first();
  if (await next.count()) {
    await next.click(); await p.waitForTimeout(2500);
    const top = await p.evaluate(() => document.getElementById('mp-vote-page')?.getBoundingClientRect().top ?? null);
    if (top == null || top < -8 || top > 844) { bad++; fails.push(`A13 /mps/5191 voting record: after Next the results heading is not on screen (${top})`); }
  }
  summary.A13 = `${urls.length} pages, ${links} in-page links and one Next, ${bad} problems`;
}

async function a14(p: Page) {
  const hrefs = new Set<string>();
  for (const i of NAV) { hrefs.add(i.page ?? i.href); for (const c of i.children ?? []) hrefs.add(c.href); }
  for (const g of PHONE_MENU_GROUPS) for (const l of g.links) hrefs.add(l.href);
  for (const e of DIRECTORY) if (!e.see) hrefs.add(e.href);
  for (const s of SECTION_PAGES) hrefs.add(`/sections/${s.slug}`);
  const list = [...hrefs].filter((h) => h.startsWith('/') && !h.includes('#')).sort();
  let bad = 0;
  for (const h of list) {
    try {
      await load(p, h);
      // An empty state: a paragraph, item or block whose whole text is "No ... yet" (not a sentence that uses the words).
      const m = await p.evaluate(() => [...document.querySelectorAll('main p, main li, main div')].map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).find((t) => /^(No|Nothing) [^.]{0,70}\byet\.?$|^Coming soon\.?$/i.test(t)) ?? null);
      if (m) { bad++; fails.push(`A14 ${h}: shows "${m}"`); }
    } catch (e) { bad++; fails.push(`A14 ${h}: did not load (${(e as Error).message.split('\n')[0]})`); }
  }
  summary.A14 = `${list.length} linked pages, ${bad} empty`;
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await c.addCookies([{ name: 'og_cookies_policy', value: encodeURIComponent(JSON.stringify({ analytics: false })), url: BASE }]);
  await c.route('**/*', (r) => {
    const u = r.request().url(), t = r.request().resourceType();
    if (/posthog|vercel-insights|_vercel\/(insights|speed)/.test(u) || (!LIVE && /opengovt\.uk/.test(u)) || t === 'image' || t === 'font' || t === 'media') return r.abort();
    return r.continue();
  });
  const p = await c.newPage();
  const started = Date.now();
  for (const [k, fn] of [['A11', a11], ['A12', a12], ['A13', a13], ['A14', a14]] as const) {
    if (!ONLY.includes(k)) continue;
    try { await fn(p); } catch (e) { fails.push(`${k} could not run: ${(e as Error).message.split('\n')[0]}`); }
  }
  await b.close();
  summary.minutes = Math.round((Date.now() - started) / 60000);
  summary.new_problems = fails.length;
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, fails }, null, 1));
  console.log(`accuracy checks (A11 finds itself, A12 labels match the source, A13 shortcuts and paging, A14 no empty destinations): ${JSON.stringify(summary)}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  process.exit(fails.length ? 1 : 0);
})();
