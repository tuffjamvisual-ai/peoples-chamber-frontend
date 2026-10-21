// Site rule (owner, 16 Oct 2026): no em or en dashes on the site. Our own writing is written
// without them. Official records we show word for word (Hansard, GOV.UK releases,
// Parliament answers, contract notices, petitions and so on) still contain them, so text
// read from the database is passed through this on its way to the page. The stored
// original is never changed.
//
//   "word — word"   -> "word, word"     (a comma reads closest to a dash)
//   "word, — word"  -> "word, word"     (no doubled punctuation)
//   "1990—2000"     -> "1990 to 2000"   (number ranges)
//   "was asked—"    -> "was asked:"     (a dash that ends a heading or line)
//   "— word" at the start of a value    -> "word"
// &mdash; and &#8212; in HTML bodies are treated the same as the character.

const DASH = '(?:\\u2014|&mdash;|&#8212;|&#x2014;)';
const RANGE = new RegExp(`(\\d)\\s*${DASH}\\s*(\\d)`, 'g');
const LEADING = new RegExp(`(^|["'>(\\[])\\s*${DASH}\\s*`, 'g');
const TRAILING = new RegExp(`\\s*${DASH}\\s*(?=$|["'<)\\]\\n])`, 'g');
const AFTER_PUNCT = new RegExp(`([,;:.!?])\\s*${DASH}\\s*`, 'g');
const MIDDLE = new RegExp(`\\s*${DASH}\\s*`, 'g');

// En dashes in official text: a spaced one ("WITTON – WITTON LANE") reads as a break, so it
// takes a comma like an em dash; an unspaced one joining two words or numbers ("UK–Taiwan",
// "2024–25") becomes a hyphen.
const EN = '(?:\\u2013|&ndash;|&#8211;|&#x2013;)';
const EN_JOINED = new RegExp(`([A-Za-z0-9])${EN}(?=[A-Za-z0-9])`, 'g');
const EN_SPACED = new RegExp(`\\s+${EN}\\s+`, 'g');
const ANY_DASH = /—|–|&mdash;|&ndash;|&#821[12];|&#x201[34];/i;

export function withoutEmDashes(text: string): string {
  if (!text || !ANY_DASH.test(text)) return text;
  return text
    .replace(EN_JOINED, '$1-')
    .replace(EN_SPACED, ', ')
    .replace(RANGE, '$1 to $2')
    .replace(LEADING, '$1')
    .replace(TRAILING, ':')
    .replace(AFTER_PUNCT, '$1 ')
    .replace(MIDDLE, ', ');
}

// During `next build`, a database read that fails (a 5xx answer such as a statement timeout, or no answer) is tried
// once more after 5 seconds before the page's own error stops the build (owner's approval, 21 Oct 2026: two builds
// that day failed on a passing slowdown while other jobs were writing). Reads are GET/HEAD requests and calls to
// read functions (POST /rest/v1/rpc/...); a second failure still stops the build. Outside a build nothing is retried.
const BUILD_RETRY_MS = 5_000;
const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

async function fetchRetryingReadsInBuild(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1], method: string): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isRead = method === 'GET' || method === 'HEAD' || (method === 'POST' && url.includes('/rest/v1/rpc/'));
  if (!isBuild() || !isRead) return fetch(input, init);
  let first: Response | null = null;
  try {
    first = await fetch(input, init);
    if (first.status < 500) return first;
  } catch {
    // no answer: retried below
  }
  console.warn(`database read failed during build (${first ? `HTTP ${first.status}` : 'no answer'}); trying once more in ${BUILD_RETRY_MS / 1000} s: ${url.replace(/\?.*$/, '')}`);
  await new Promise((r) => setTimeout(r, BUILD_RETRY_MS));
  return fetch(input, init);
}

// A fetch for Supabase clients that applies the rule to every read (GET/HEAD) response.
// Writes are passed through untouched, so nothing altered is ever written back.
export const fetchWithoutEmDashes: typeof fetch = async (input, init) => {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const res = await fetchRetryingReadsInBuild(input, init, method);
  if (method !== 'GET' && method !== 'HEAD') return res;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('json')) return res;
  const body = await res.text();
  const cleaned = withoutEmDashes(body);
  if (cleaned === body) { const h = new Headers(res.headers); h.delete('content-length'); h.delete('content-encoding'); return new Response(body, { status: res.status, statusText: res.statusText, headers: h }); }
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(cleaned, { status: res.status, statusText: res.statusText, headers });
};

/** res.json() for live official APIs shown on the page (Hansard, Bills, GOV.UK), with the rule applied. */
export async function jsonWithoutEmDashes<T = unknown>(res: Response): Promise<T> {
  return JSON.parse(withoutEmDashes(await res.text())) as T;
}
