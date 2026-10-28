// Addresses that no longer have a page (owner's decision, 28 Oct 2026, Search Console fixes), checked in proxy.ts
// before the page renders, because only the proxy can answer 410 Gone. Each check is one small read; a failed read
// lets the request through to the page, so an outage never turns a real page into a 410.
//   /departments/<slug>  not one of our departments: the organisation page when one has that name (an old donor page
//                        link treated every contract buyer as a department), otherwise 410. Councils and agencies
//                        are redirected earlier, in next.config.ts.
//   /donors/<slug>       no donor name in the register gives this slug: 410 (the Electoral Commission corrected or
//                        removed the name).
//   /news/<slug>         not in our press releases: GOV.UK's page when it still has the release, otherwise 410.
import { donorNameToSlug } from './donor-slug';

// Every department page (lib/departments/index.ts). next.config.ts checks at build time that the two lists agree.
export const DEPARTMENT_SLUGS = new Set([
  'treasury', 'home-office', 'health', 'energy', 'education', 'work-pensions', 'transport', 'environment',
  'business-trade', 'housing', 'justice', 'defence', 'culture', 'cabinet-office', 'foreign-office', 'attorney-general',
  'scotland-office', 'wales-office', 'northern-ireland-office', 'commons-leader', 'lords-leader', 'advocate-general',
  'ukef',
]);

export type GoneAction = { kind: 'pass' } | { kind: 'redirect'; location: string } | { kind: 'gone' };
const PASS: GoneAction = { kind: 'pass' };
const TIMEOUT_MS = 3000;
const TTL_MS = 60 * 60 * 1000;
const MAX_CACHED = 5000;
const cache = new Map<string, { at: number; action: GoneAction }>();
// Per check: set when a read fails, so that check's PASS is not cached (a slow first call after a cold start would
// otherwise switch the check off for an hour).
type Ctx = { failed: boolean };

async function rest<T>(ctx: Ctx, path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  // A failed check lets the request through to the page; the reason is logged (never the key) so it shows up.
  if (!url || !key) { ctx.failed = true; console.error(`[url-gone] ${!url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_SECRET_KEY'} is not set in the proxy`); return null; }
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) { ctx.failed = true; console.error(`[url-gone] ${path.split('?')[0]}: HTTP ${res.status}`); return null; }
    return (await res.json()) as T;
  } catch (e) {
    ctx.failed = true;
    console.error(`[url-gone] ${path.split('?')[0]}: ${(e as Error).message}`);
    return null;
  }
}

async function departmentAction(ctx: Ctx, slug: string): Promise<GoneAction> {
  if (DEPARTMENT_SLUGS.has(slug)) return PASS;
  // "network-rail-infrastructure-ltd" is the organisation page "network-rail-infrastructure-limited".
  const names = [...new Set([slug, slug.replace(/(^|-)ltd(-|$)/g, '$1limited$2'), slug.replace(/(^|-)limited(-|$)/g, '$1ltd$2')])];
  const rows = await rest<{ slug: string }[]>(ctx, `organisation_index?select=slug&slug=in.(${names.map(encodeURIComponent).join(',')})&limit=1`);
  if (rows == null) return PASS;
  return rows[0] ? { kind: 'redirect', location: `/organisations/${rows[0].slug}` } : { kind: 'gone' };
}

// A pattern that every donor name giving this slug matches (donorNameToSlug: lower case, "&" read as "and",
// apostrophes dropped, anything else between letters and digits a hyphen). The names it finds are then checked exactly.
function donorPattern(slug: string): string {
  const any = '[^a-z0-9]*';
  const tok = (t: string) => (t === 'and' ? '(and|&)' : t.split('').join("['’‘]?"));
  return `^${any}${slug.split('-').map(tok).join(any)}${any}$`;
}

async function donorAction(ctx: Ctx, slug: string): Promise<GoneAction> {
  // Long slugs are cut at 100 characters and "-2" marks a second name with the same slug: left to the page.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length >= 95 || /-\d+$/.test(slug)) return PASS;
  const LIMIT = 50;
  const rows = await rest<{ donor_name: string | null }[]>(ctx, `political_donations?select=donor_name&donor_name=imatch.${encodeURIComponent(donorPattern(slug))}&limit=${LIMIT}`);
  if (rows == null) return PASS;
  if (rows.some((r) => r.donor_name && donorNameToSlug(r.donor_name.trim()) === slug)) return PASS;
  return rows.length < LIMIT ? { kind: 'gone' } : PASS;
}

async function newsAction(ctx: Ctx, slug: string): Promise<GoneAction> {
  const safe = slug.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (!safe) return PASS;
  const rows = await rest<{ id: number }[]>(ctx, `press_releases?select=id&news_slug=eq.${encodeURIComponent(safe)}&limit=1`);
  if (rows == null || rows.length) return PASS;
  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/news/${safe}`, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) return { kind: 'redirect', location: `https://www.gov.uk/government/news/${safe}` };
    return res.status === 404 || res.status === 410 ? { kind: 'gone' } : PASS;
  } catch {
    ctx.failed = true;
    return PASS;
  }
}

export async function goneAction(section: 'departments' | 'donors' | 'news', rawSlug: string): Promise<GoneAction> {
  let slug: string;
  try { slug = decodeURIComponent(rawSlug).toLowerCase(); } catch { return PASS; }
  const key = `${section}/${slug}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.action;
  const ctx: Ctx = { failed: false };
  const action = section === 'departments' ? await departmentAction(ctx, slug) : section === 'donors' ? await donorAction(ctx, slug) : await newsAction(ctx, slug);
  if (ctx.failed) return action;
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), action });
  return action;
}

export const GONE_HTML = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page removed | opengovt</title></head><body style="margin:0;background:#ebe5d8;color:#14100d;font-family:'Special Elite',monospace;font-size:17px;line-height:1.6"><main style="max-width:40em;margin:0 auto;padding:48px 16px"><h1 style="font-size:28px;margin:0 0 16px">This page has been removed</h1><p>The record it showed is no longer in the official data Open Govt publishes.</p><p><a href="/" style="color:#14100d">Go to the Open Govt home page</a></p></main></body></html>`;
