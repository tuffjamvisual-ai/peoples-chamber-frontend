// Ref tag click counter (owner approved 20 Nov 2026, Cowork ENTRY 440): how many visits arrive through our own tagged
// links (?ref=x11 on an X post). Counted per tag, page and hour, nothing else: no IP address, user agent, cookie, browser
// storage or identifier. Shared by the browser (app/components/RefClick.tsx, which checks the tag and path before
// sending) and the server route (app/api/ref-click/route.ts, which checks them again). Pure: no database, no request
// data. The table is public.ref_clicks (migration 2026-11-21g), read by scripts/analytics/ref-report.mjs.

// Tags we use besides x<number> (X posts: x1 to x9999). Anything not matching is ignored. Add a tag here to count it.
export const OTHER_REFS = ['bsky', 'nl'] as const;
const X_REF = /^x\d{1,4}$/;

// The tag as stored (lower case), or null when it is not one of ours.
export function cleanRef(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const r = raw.trim().toLowerCase();
  return X_REF.test(r) || (OTHER_REFS as readonly string[]).includes(r) ? r : null;
}

export const PATH_MAX = 200;
// A path as the browser sends it (percent encoded): printable ASCII, no spaces.
const PATH_CHARS = /^\/[\x21-\x7e]*$/;

// The page path as stored: from the first '/', no query string or fragment, at most 200 characters. null when it is
// not a path.
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const p = raw.split(/[?#]/, 1)[0].slice(0, PATH_MAX);
  return PATH_CHARS.test(p) ? p : null;
}

// The start of the hour (UTC), the only time kept.
export function refHour(d: Date = new Date()): string {
  return new Date(Math.floor(d.getTime() / 3_600_000) * 3_600_000).toISOString();
}

export type RefClickRow = { ref: string; path: string; hour: string };

// A request body ({ "ref": "x11", "path": "/mps" }) to the row counted, or null when nothing is counted. Any other
// field in the body is ignored.
export function refClickRow(body: unknown, now: Date = new Date()): RefClickRow | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const ref = cleanRef(b.ref);
  const path = cleanPath(b.path);
  if (!ref || !path) return null;
  return { ref, path, hour: refHour(now) };
}
