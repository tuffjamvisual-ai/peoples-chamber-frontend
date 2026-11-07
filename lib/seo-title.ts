// Search result titles (owner's approval, 24 Oct 2026). The root layout's title template adds " | opengovt" to every
// page title (app/layout.tsx), and the full title should be 60 characters or fewer so it is not cut in results.
// fitTitle takes the preferred forms in order. When a title is over 60 the suffix goes first; an official name is never cut (owner, 7 Nov 2026).
export const TITLE_SUFFIX = ' | opengovt';
export const TITLE_MAX = 60;

// One title kept whole (owner's brief, 3 Nov 2026): with the suffix when the whole fits in 60 characters, on its own
// when it fits without it, and on its own even when longer (never cut).
export function titleWithin(title: string): string | { absolute: string } {
  return title.length + TITLE_SUFFIX.length <= TITLE_MAX ? title : { absolute: title };
}

// The first form that fits, with the suffix when it fits with it and without when only that fits (owner, 7 Nov 2026). When none fits, the last form whole, without the suffix.
const fitted = (t: string) => (t.length + TITLE_SUFFIX.length <= TITLE_MAX ? t : t.length <= TITLE_MAX ? { absolute: t } : null);
export function fitTitle(...candidates: string[]): string | { absolute: string } {
  for (const c of candidates) { const f = fitted(c); if (f) return f; }
  return { absolute: candidates[candidates.length - 1] };
}

// A title for a committee or public body (owner, 6 Nov 2026): cutting at a natural break can leave a name unclear, as "Speaker's Committee"
// for two different committees. So the first shape that fits with the name whole, and otherwise the whole name alone, even over 60.
export function wholeNameTitle(name: string, shapes: (n: string) => string[] = () => []): string | { absolute: string } {
  const whole = squeeze(name);
  for (const shape of shapes(whole)) {
    if (shape.length + TITLE_SUFFIX.length <= TITLE_MAX) return shape;
    if (shape.length <= TITLE_MAX) return { absolute: shape };
  }
  return titleWithin(whole);
}

// A title for text written by someone else, where stopping at a natural break can change what it says (owner's petition brief,
// 6 Nov 2026: "Do not stop transgender people from receiving care" for "... in mainstream hospital wards"). Whole if it fits;
// otherwise the most whole words that fit, not ending on a linking word, and an ellipsis to say there is more.
export function markedCutTitle(text: string, shapes: (t: string) => string[]): string | { absolute: string } {
  const whole = squeeze(text);
  for (const shape of shapes(whole)) { const f = fitted(shape); if (f) return f; }
  const words = whole.split(' ');
  for (let n = words.length - 1; n > 0; n--) {
    const cut = words.slice(0, n).join(' ').replace(/[\s,;:&.-]+$/, '');
    if (cut.length + 1 <= TITLE_MAX && !endsOnLinkWord(cut)) return { absolute: `${cut}\u2026` };
  }
  return { absolute: `${whole.slice(0, TITLE_MAX - 1)}\u2026` };
}

const squeeze = (s: string) => s.replace(/\s+/g, ' ').trim();

// Words a cut title must not end on.
const DANGLING = /\b(?:and|or|of|the|for|to|in|on|at|by|with|from|a|an|as|is|that|be|this|these|its|their|our|into|between|against|under|over|new|not|than|how|who|why|what)$/i;
export const endsOnLinkWord = (s: string) => DANGLING.test(s.trim());
// A title for a named record (owner, 7 Nov 2026): never a word cut from the name. shapes turns the name into the wordings wanted, best first. The first that fits in
// 60 characters, with " | opengovt" when that fits and without it when only that fits. When none fits, the last shape with the name whole, over 60 if it must be.
export function namedTitle(name: string, shapes: (n: string) => string[]): string | { absolute: string } {
  return fitTitle(...shapes(squeeze(name)));
}

// "4 Mar 2026" from an ISO date or timestamp, read from its date part so the day never shifts with the time zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
