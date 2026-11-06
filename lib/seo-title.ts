// Search result titles (owner's approval, 24 Oct 2026). The root layout's title template adds " | opengovt" to every
// page title (app/layout.tsx), and the full title should be 60 characters or fewer so it is not cut in results.
// fitTitle takes the preferred forms in order and returns the first that fits with the suffix; when none fits it
// returns the last, the agreed fallback. Titles are never cut mid-word.
export const TITLE_SUFFIX = ' | opengovt';
export const TITLE_MAX = 60;

// One title kept whole (owner's brief, 3 Nov 2026): with the suffix when the whole fits in 60 characters, on its own
// when it fits without it, and on its own even when longer (never cut). For a name that can be long, use namedTitle.
export function titleWithin(title: string): string | { absolute: string } {
  return title.length + TITLE_SUFFIX.length <= TITLE_MAX ? title : { absolute: title };
}

export function fitTitle(...candidates: string[]): string {
  for (const c of candidates) if (c.length + TITLE_SUFFIX.length <= TITLE_MAX) return c;
  return candidates[candidates.length - 1];
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
  const fitted = (t: string) => (t.length + TITLE_SUFFIX.length <= TITLE_MAX ? t : t.length <= TITLE_MAX ? { absolute: t } : null);
  const whole = squeeze(text);
  for (const shape of shapes(whole)) { const f = fitted(shape); if (f) return f; }
  const words = whole.split(' ');
  for (let n = words.length - 1; n > 0; n--) {
    const cut = words.slice(0, n).join(' ').replace(/[\s,;:&.-]+$/, '');
    if (cut.length + 1 <= TITLE_MAX && !endsOnLinkWord(cut)) return { absolute: `${cut}\u2026` };
  }
  return { absolute: `${whole.slice(0, TITLE_MAX - 1)}\u2026` };
}

// Shortening a name by natural breaks only (owner, 5 Nov 2026): never mid word and never mid phrase. A bracket is dropped
// whole and the words after it stay, so "Draft Strikes (Minimum Service Levels) (England) Regulations 2024" is "Draft
// Strikes Regulations 2024" and never "Draft Strikes". The number of a bill, "(No. 2)", is kept: it tells two bills apart.
const squeeze = (s: string) => s.replace(/\s+/g, ' ').trim();
export function cleanNameForms(name: string): string[] {
  const forms = [squeeze(name)];
  const next = (f: (s: string) => string) => { const v = squeeze(f(forms[forms.length - 1])); if (v && v !== forms[forms.length - 1] && !DANGLING.test(v)) forms.push(v); };
  next((s) => s.replace(/\s*\[(?:Lords|HL)\]/gi, ''));
  next((s) => s.replace(/\s*\(S\.?I\.?[^)]*\)/gi, ''));
  next((s) => s.replace(/^Opposition Day:\s*/i, ''));
  next((s) => s.replace(/\s*\((?!No\.?\s*\d)[^()]*\)/gi, ''));
  next((s) => s.replace(/\bUnited Kingdom\b/g, 'UK').replace(/\bEuropean Union\b/g, 'EU'));
  return forms;
}

// Words a shortened name must not end on.
const DANGLING = /\b(?:and|or|of|the|for|to|in|on|at|by|with|from|a|an|as|is|that|be|this|these|its|their|our|into|between|against|under|over|new|not|than|how|who|why|what)$/i;
export const endsOnLinkWord = (s: string) => DANGLING.test(s.trim());
const AFTER_END = /\b(?:Bill|Act(?: \d{4})?|Order(?: \d{4})?|Regulations(?: \d{4})?)\b/g;
// A comma only breaks a clause when a lower case word follows: "Agreement, done at Bern", not "Surveillance, Target" or "10,000".
const CLAUSE = /\s*(?::\s|;\s|,\s(?=[a-z])|\s[-\u2013\u2014]\s|\s\()/g;
const PHRASE = /\s+(?:but|as|after|while|when|because|with|between|including|incorporating|across|within|through|under|via|against|jointly|in respect of|relating to|following|despite|before|until|amid|over|in|on|for|to|from|at|by)\s/gi;

// The longest whole start of the text, no longer than max, ending at a natural break: the end of a clause or of a bill's
// name, otherwise before a linking word. Null when there is none; the caller then says something shorter instead.
export function naturalCut(text: string, max: number, minLength = 12): string | null {
  const t = squeeze(text);
  if (t.length <= max) return t;
  const fit = (ends: number[]) => {
    const good = ends.filter((e) => e <= max && e >= minLength).sort((a, b) => b - a);
    for (const e of good) {
      const c = t.slice(0, e).trim();
      const open = (c.match(/\(/g)?.length ?? 0) - (c.match(/\)/g)?.length ?? 0);
      const quotes = (c.match(/["“”]/g)?.length ?? 0) % 2;
      if (!open && !quotes && !DANGLING.test(c)) return c;
    }
    return null;
  };
  return fit([...t.matchAll(AFTER_END)].map((m) => m.index + m[0].length))
    ?? fit([...t.matchAll(CLAUSE)].map((m) => m.index))
    // A comma before a capital ends a clause only if no list follows: "NHS deaths, BMJ analysis finds".
    ?? fit([...t.matchAll(/,\s(?=[A-Z])/g)].map((m) => m.index).filter((i) => !/,| and /.test(t.slice(i + 1))))
    ?? fit([...t.matchAll(PHRASE)].map((m) => m.index));
}

// A title for a named record, 60 characters or fewer (owner, 5 Nov 2026). shapes turns a name into the wordings wanted,
// best first. Each is tried with the name whole and then in its shorter clean forms, with " | opengovt" when that fits
// and without it when only that fits. Then the name is cut at a natural break. fallback is used if nothing fits.
export function namedTitle(name: string, shapes: (n: string) => string[], fallback?: string): string | { absolute: string } {
  const fitted = (t: string) => (t.length + TITLE_SUFFIX.length <= TITLE_MAX ? t : t.length <= TITLE_MAX ? { absolute: t } : null);
  for (const n of cleanNameForms(name)) for (const shape of shapes(n)) { const f = fitted(shape); if (f) return f; }
  const last = cleanNameForms(name).pop() ?? name;
  for (const shape of shapes('\u0000')) {
    const c = naturalCut(last, TITLE_MAX - shape.replace('\u0000', '').length);
    if (c) { const f = fitted(shape.replace('\u0000', c)); if (f) return f; }
  }
  if (fallback) { const f = fitted(fallback); if (f) return f; }
  return { absolute: last };
}

// "4 Mar 2026" from an ISO date or timestamp, read from its date part so the day never shifts with the time zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
