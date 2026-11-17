// A16 (owner rule 15 Nov 2026): a list's page number and filters are in its path, never in ?query, so each variant is a
// static page built on its first visit and rebuilt only when its data's tags are refreshed: /x/page/<n> (page only) or
// /x/filter/<key>/<value>/... in a fixed key order (one address per choice; defaults and page 1 left out). A free-text
// search (?q=) stays in the query and is answered by /x/search (next.config.ts rewrites; a16-exceptions.json).
export const slug = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// defaults: a key's default value, left out of the address like page 1 (the mp-activity form always sends its view).
type Spec = { keys: readonly string[]; slugged?: readonly string[]; search?: boolean; pageOnly?: boolean; defaults?: Record<string, string> };
// Batch 2 (F04, no exceptions): the lists whose page or fixed filters move into the path. The search lists (debates, edms,
// petitions, organisations, pmqs) join in batch 3 with their /x/search routes; until then their ?query addresses are not
// redirected.
export const LISTS: Record<string, Spec> = {
  '/divisions': { keys: ['page'], pageOnly: true },
  '/treaties': { keys: ['page'], pageOnly: true },
  '/laws': { keys: ['page'], pageOnly: true },
  '/lords': { keys: ['page'], pageOnly: true },
  '/laws/made-without-a-vote': { keys: ['department', 'procedure', 'flag', 'page'], slugged: ['department', 'procedure'] },
  // Batch 3: a search list; ?q= with text is left to the rewrite (/debates/search).
  '/debates': { keys: ['section', 'page'], slugged: ['section'], search: true },
  '/edms': { keys: ['state', 'prayer', 'sort', 'member', 'role', 'show'], search: true },
  '/organisations': { keys: ['has', 'page'], search: true },
  '/petitions': { keys: ['state', 'responded', 'debated', 'constituency'], search: true },
  '/pmqs': { keys: ['pm', 'year', 'page', 'dpage'], search: true },
  '/transparency/mp-activity': { keys: ['view', 'party', 'page'], slugged: ['party'], search: true, defaults: { view: 'most-active' } },
};
const DYNAMIC: [RegExp, Spec][] = [
  [/^\/divisions\/year\/\d{4}$/, { keys: ['page'], pageOnly: true }],
  [/^\/second-jobs\/[^/]+\/\d+$/, { keys: ['page'], pageOnly: true }],
  // Batch 3: the six dataset lists; a ?q= search is left to the rewrite (/transparency/<section>/search).
  [/^\/transparency\/(ministers-meetings|appgs|hospitality|revolving-door|donations|contracts)$/, { keys: ['page'], pageOnly: true, search: true }],
];
const PAGED = new Set(['page', 'dpage', 'show']);
const okNumber = (x: string) => /^[1-9][0-9]{0,3}$/.test(x);

export function listPath(base: string, v: Record<string, string | null | undefined>, spec = LISTS[base]): string {
  if (spec.pageOnly) return Number(v.page) > 1 ? `${base}/page/${Number(v.page)}` : base;
  const parts = spec.keys.flatMap((k) => { const x = v[k]; return x && !(PAGED.has(k) && x === '1') && spec.defaults?.[k] !== x ? [k, spec.slugged?.includes(k) ? slug(x) : x] : []; });
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

// Two old ?key= addresses moved by the proxy rather than next.config.ts, whose redirects always pass the whole query on
// (T2 review, ENTRY 219: no ...before/X?before=X): the key that moved into the path is dropped, any other (utm_*) kept.
// undefined when the address is not one of them; null when it is but its value is not one the path takes (served as is).
const QUERY_MOVES: { path: RegExp; key: string; value: RegExp; to: (m: RegExpMatchArray, v: string) => string; status: 307 | 308 }[] = [
  // Older pages of a department's written questions (F04 batch 2).
  { path: /^\/questions\/department\/([^/]+)$/, key: 'before', value: /^\d{4}-\d{2}-\d{2}_\d{1,10}$/, to: (m, v) => `/questions/department/${m[1]}/before/${v}`, status: 308 },
  // Newsletter status pages, for links already sent; temporary, so a later change of copy is not stuck in browsers.
  { path: /^\/newsletter$/, key: 'status', value: /^(confirmed|unsubscribed|invalid|error)$/, to: (_m, v) => `/newsletter/status/${v}`, status: 307 },
];
export function queryMove(pathname: string, sp: URLSearchParams): { to: string; status: 307 | 308 } | null | undefined {
  for (const q of QUERY_MOVES) {
    const m = pathname.match(q.path);
    if (!m || !sp.has(q.key)) continue;
    const v = sp.get(q.key) ?? '';
    if (!q.value.test(v)) return null;
    const kept = new URLSearchParams();
    for (const [k, x] of sp) if (k !== q.key) kept.append(k, x);
    return { to: q.to(m, v) + (kept.size ? `?${kept}` : ''), status: q.status };
  }
  return undefined;
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
