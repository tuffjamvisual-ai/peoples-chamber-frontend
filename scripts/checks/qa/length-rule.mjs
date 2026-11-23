// A3 phone length rule, in one place (T2, 23 Nov 2026: so rendered-checks.mjs and webkit-iphone.mjs cannot drift).
// At 375px, as the page opens, a page may be at most LIMIT_PX tall (not counting article text and the app bar's room),
// or its own limit in PAGE_LIMIT_PX; page types in LENGTH_LIFTED have no limit; a page already over its limit in the
// baseline may not grow by more than GROWTH_PX.
export const LIMIT_PX = 2500;
// Named page limits (owner decision 21 Nov 2026, ENTRY 493: 5 rows plus towns lines). Every other page keeps LIMIT_PX.
export const PAGE_LIMIT_PX = { '/council-areas/lowest-scores': 2700 };
export const limitFor = (url) => PAGE_LIMIT_PX[new URL(url, 'http://x').pathname] ?? LIMIT_PX;
// Page types where the owner lifted the phone length limit (18 Nov 2026, Cowork ENTRY 302 item 1: lists open with 3 always,
// even where that makes the page longer). /debates/[guid] is the same case (2 to 3 speeches, 78px over): added under that
// rule, told to Cowork. /reports: 20 reports a page with no month folds (owner decision, ENTRY 306).
export const LENGTH_LIFTED = [/^\/laws$/, /^\/transparency\/press-releases$/, /^\/treaties$/, /^\/polls(\/voting-intention)?$/, /^\/pmqs\/\d{4}-\d{2}-\d{2}$/, /^\/debates\/[0-9A-Fa-f-]{36}$/, /^\/reports$/];
export const GROWTH_PX = 200;

// The A3 verdict for one page: null when it passes; { known: false } when it is over its limit and was not before;
// { known: true, grown: boolean } when it was already over its limit in the baseline.
export function a3Verdict(url, height, baselineHeight) {
  const pathname = new URL(url, 'http://x').pathname;
  if (height == null || height <= limitFor(url) || LENGTH_LIFTED.some((re) => re.test(pathname))) return null;
  const known = baselineHeight != null && baselineHeight > limitFor(url);
  return { known, grown: known && height > baselineHeight + GROWTH_PX };
}
