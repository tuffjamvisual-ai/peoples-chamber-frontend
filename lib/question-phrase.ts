// T1-MOB2 (4): the exact phrase a written questions search puts first (pure, so it can be tested).
export const PHRASE_MAX = 100;
export function phraseOf(words: string | undefined): string | null {
  const w = (words ?? '').trim();
  if (!w || /"/.test(w) || w.split(/\s+/).length < 2) return null;
  return w;
}
