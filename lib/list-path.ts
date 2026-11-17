// A16 (owner rule 15 Nov 2026): a list's page number and filters are in its path, never in ?query, so each variant is a
// static page built on its first visit and rebuilt only when its data's tags are refreshed: /x/page/<n> (page only) or
// /x/filter/<key>/<value>/... in a fixed key order (one address per choice; defaults and page 1 left out). A free-text
// search (?q=) stays in the query and is answered by /x/search (next.config.ts rewrites; a16-exceptions.json).
export const slug = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Spec = { keys: readonly string[]; slugged?: readonly string[]; search?: boolean; pageOnly?: boolean };
// Batch 2 (F04, no exceptions): the lists whose page or fixed filters move into the path. The search lists (debates, edms,
// petitions, organisations, pmqs) join in batch 3 with their /x/search routes; until then their ?query addresses are not
// redirected.
export const LISTS: Record<string, Spec> = {
  '/divisions': { keys: ['page'], pageOnly: true },
  '/treaties': { keys: ['page'], pageOnly: true },
  '/laws': { keys: ['page'], pageOnly: true },
  '/lords': { keys: ['page'], pageOnly: true },
  '/laws/made-without-a-vote': { keys: ['department', 'procedure', 'flag', 'page'], slugged: ['department', 'procedure'] },
};
const DYNAMIC: [RegExp, Spec][] = [
  [/^\/divisions\/year\/\d{4}$/, { keys: ['page'], pageOnly: true }],
  [/^\/second-jobs\/[^/]+\/\d+$/, { keys: ['page'], pageOnly: true }],
];
const PAGED = new Set(['page', 'dpage', 'show']);
const okNumber = (x: string) => /^[1-9][0-9]{0,3}$/.test(x);

export function listPath(base: string, v: Record<string, string | null | undefined>, spec = LISTS[base]): string {
  if (spec.pageOnly) return Number(v.page) > 1 ? `${base}/page/${Number(v.page)}` : base;
  const parts = spec.keys.flatMap((k) => { const x = v[k]; return x && !(PAGED.has(k) && x === '1') ? [k, spec.slugged?.includes(k) ? slug(x) : x] : []; });
  return parts.length ? `${base}/filter/${parts.join('/')}` : base;
}

// proxy.ts: where an old ?key= address of a list moves to (308); null for a search (?q= with text: the rewrite answers it);
// undefined when the address is not a list address. Other query keys (utm_*, Lords party/type) are kept.
export function listRedirect(pathname: string, sp: URLSearchParams): string | null | undefined {
  const spec = LISTS[pathname] ?? DYNAMIC.find(([re]) => re.test(pathname))?.[1];
  if (!spec || !spec.keys.some((k) => sp.has(k))) return undefined;
  if (spec.search && (sp.get('q') ?? '').trim()) return null;
  const v: Record<string, string> = {};
  for (const k of spec.keys) { const x = (sp.get(k) ?? '').trim(); if (x && (!PAGED.has(k) || okNumber(x))) v[k] = x; }
  const kept = new URLSearchParams();
  for (const [k, x] of sp) if (!spec.keys.includes(k) && k !== 'q') kept.append(k, x);
  return listPath(pathname, v, spec) + (kept.size ? `?${kept}` : '');
}

// A /x/filter/[...f] route's segments back to choices; null (the route answers 404) when a key is unknown, repeated or out
// of order, or a page number is not 2 to 9999. Values are still checked by the route against its own lists.
export function listChoices(base: string, f: string[]): Record<string, string> | null {
  const spec = LISTS[base];
  if (!spec || f.length === 0 || f.length % 2) return null;
  const out: Record<string, string> = {};
  let at = -1;
  for (let i = 0; i < f.length; i += 2) {
    const k = spec.keys.indexOf(f[i]);
    if (k <= at || (PAGED.has(f[i]) && (!okNumber(f[i + 1]) || f[i + 1] === '1'))) return null;
    at = k; out[f[i]] = f[i + 1];
  }
  return out;
}
