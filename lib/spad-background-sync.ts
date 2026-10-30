// The background part of /api/sync-spad-roster (owner, 28 Oct 2026), after the named list:
//  1. the Cabinet Office's two latest "Publication of Special Adviser Interests" editions, upserted into
//     spad_interests (word for word; an entry the edition no longer holds is removed, for that edition only);
//  2. new ACOBA advice letters on former special advisers (publications whose title has "special adviser" and
//     "ACOBA", from 2023) into spad_post_appointments, by letter address. ACOBA closed on 13 October 2025, so this is
//     usually one search and nothing new;
//  3. departments' annual reports and accounts, whose special adviser interests are read by hand: when GOV.UK has a
//     newer report than the one read (ANNUAL_REPORTS), a warning is saved for the freshness email. Not an error.
// Same budget and polite fetching as the named list (lib/sync-budget.ts), at least 1 s between requests.
import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncBudget, politeFetch, saveCursor, sleep } from '@/lib/sync-budget';
import { BG_UA, ANNUAL_REPORTS, laterPeriod, parseCoInterests, parseAcobaLetter, formerRoleFromPublication, periodFromSlug } from '@/lib/spad-background';

const CONTENT = 'https://www.gov.uk/api/content';
const SEARCH = 'https://www.gov.uk/api/search.json';
export const SPAD_MANUAL_CHECKS_ROUTE = '/api/sync-spad-roster:manual-checks';

async function getJson<T>(url: string, budget: SyncBudget): Promise<T> {
  await sleep(1000);
  const res = await politeFetch(url, { headers: { 'User-Agent': BG_UA, Accept: 'application/json' } }, { budget });
  if (!res.ok) throw new Error(`GOV.UK answered HTTP ${res.status} for ${url.replace('https://www.gov.uk', '')}`);
  return res.json() as Promise<T>;
}
type Content = { title: string; base_path: string; first_published_at?: string; public_updated_at?: string; details?: { body?: string }; links?: { children?: { document_type: string; base_path: string }[]; documents?: { base_path: string; public_updated_at?: string }[] } };

export async function runSpadBackgroundSync(supabase: SupabaseClient, budget: SyncBudget): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const changedAdvisers = new Set<string>();

  // 1. Cabinet Office interests.
  const collection = await getJson<Content>(`${CONTENT}/government/collections/cabinet-office-publication-of-special-adviser-interests`, budget);
  const editions = (collection.links?.documents ?? []).sort((a, b) => (b.public_updated_at ?? '').localeCompare(a.public_updated_at ?? '')).slice(0, 2);
  const co: Record<string, number> = {};
  for (const ed of editions) {
    const period = periodFromSlug(ed.base_path.split('/').pop() ?? '');
    if (!period) continue;
    const pub = await getJson<Content>(`${CONTENT}${ed.base_path}`, budget);
    const htmlPath = pub.links?.children?.find((c) => c.document_type === 'html_publication')?.base_path;
    if (!htmlPath) { co[period] = -1; continue; }
    const html = await getJson<Content>(`${CONTENT}${htmlPath}`, budget);
    const rows = parseCoInterests(html.details?.body ?? '', { period, sourceTitle: `Cabinet Office: ${pub.title}`, sourceUrl: `https://www.gov.uk${htmlPath}` });
    if (!rows.length) { co[period] = 0; continue; } // an edition we cannot read changes nothing
    // Advisers whose entries were added or removed (owner, 30 Oct 2026): their ministers' MP pages are refreshed.
    const { data: had } = await supabase.from('spad_interests').select('adviser_name, entry_text').eq('department', 'Cabinet Office').eq('period', period);
    const hadKeys = new Set((had ?? []).map((r) => `${r.adviser_name}|${r.entry_text}`));
    for (const r of rows) if (!hadKeys.has(`${r.adviser_name}|${r.entry_text}`)) changedAdvisers.add(r.adviser_name);
    const now = new Date().toISOString();
    const { error } = await supabase.from('spad_interests').upsert(rows.map((r) => ({ ...r, updated_at: now })), { onConflict: 'adviser_name,department,period,entry_text' });
    if (error) throw new Error(`spad_interests: ${error.message}`);
    const { data: saved, error: readError } = await supabase.from('spad_interests').select('id, adviser_name, entry_text').eq('department', 'Cabinet Office').eq('period', period);
    if (readError) throw new Error(`spad_interests read: ${readError.message}`);
    const keep = new Set(rows.map((r) => `${r.adviser_name}|${r.entry_text}`));
    const staleRows = (saved ?? []).filter((r) => !keep.has(`${r.adviser_name}|${r.entry_text}`));
    for (const r of staleRows) changedAdvisers.add(r.adviser_name);
    const stale = staleRows.map((r) => r.id);
    if (stale.length) {
      const { error: delError } = await supabase.from('spad_interests').delete().in('id', stale);
      if (delError) throw new Error(`spad_interests remove: ${delError.message}`);
    }
    co[period] = rows.length;
  }
  out.cabinet_office_interests = co;
  out.changed_advisers = [...changedAdvisers];

  // 2. ACOBA letters.
  // Every ACOBA publication since 2023 (about 250, three pages): a text search misses some of them.
  const found: { title: string; link: string }[] = [];
  for (let start = 0; start < 1000; start += 100) {
    const page = await getJson<{ results: { title: string; link: string }[] }>(
      `${SEARCH}?filter_organisations=advisory-committee-on-business-appointments&filter_public_timestamp=from:2023-01-01&count=100&start=${start}&order=-public_timestamp&fields=title,link`, budget);
    found.push(...(page.results ?? []));
    if ((page.results ?? []).length < 100) break;
  }
  const pubs = found.filter((r) => /special advis/i.test(r.title) && /acoba/i.test(r.title));
  const { data: known, error: knownError } = await supabase.from('spad_post_appointments').select('source_url');
  if (knownError) throw new Error(`spad_post_appointments read: ${knownError.message}`);
  const knownUrls = new Set((known ?? []).map((r) => r.source_url));
  let added = 0;
  for (const p of pubs) {
    if (budget.stopStarting()) { out.acoba_partial = true; break; }
    const pub = await getJson<Content>(`${CONTENT}${p.link}`, budget);
    for (const child of (pub.links?.children ?? []).filter((c) => c.document_type === 'html_publication')) {
      const url = `https://www.gov.uk${child.base_path}`;
      if (knownUrls.has(url)) continue;
      const letter = await getJson<Content>(`${CONTENT}${child.base_path}`, budget);
      const published = letter.first_published_at ?? '';
      if (published < '2023-01-01') continue;
      const row = parseAcobaLetter({ title: letter.title, url, published, body: letter.details?.body ?? '' }, formerRoleFromPublication(pub.title));
      if (!row) continue;
      const { error } = await supabase.from('spad_post_appointments').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'source_url', ignoreDuplicates: true });
      if (error) throw new Error(`spad_post_appointments: ${error.message}`);
      added++;
    }
  }
  out.acoba = { publications: pubs.length, letters_added: added };

  // 3. Annual reports to read by hand.
  const warnings: string[] = [];
  for (const d of ANNUAL_REPORTS) {
    if (budget.stopStarting()) { out.annual_reports_partial = true; break; }
    const r = await getJson<{ results: { title: string; link: string }[] }>(
      `${SEARCH}?filter_organisations=${d.org}&filter_format=corporate_report&count=40&order=-public_timestamp&fields=title,link`, budget);
    // The department's own report, not one of its arm's length bodies' ("Judicial Pensions Scheme annual report").
    const newer = (r.results ?? []).find((x) => /annual report/i.test(x.title) && d.title.test(x.title) && /\b(20\d\d)\s*(to|-|–)\s*(20)?\d\d\b/.test(x.title)
      && laterPeriod(x.title.match(/20\d\d\s*(?:to|-|–)\s*(?:20)?\d\d/)![0], d.checked));
    if (newer) warnings.push(`${d.department}: "${newer.title}" is on GOV.UK (https://www.gov.uk${newer.link}); read its special adviser interests by hand and add them to scripts/data/spad-interests-annual-reports.json`);
  }
  await saveCursor(supabase, SPAD_MANUAL_CHECKS_ROUTE, { warnings, checked_at: new Date().toISOString() });
  out.manual_checks = warnings;
  return out;
}
