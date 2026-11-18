// ART-SUMMARY (Cowork ENTRY 263): the key points an article shows as its Summary tab: 4 to 6 non-blank strings, as the
// editorials.key_points constraint allows; anything else gives none, so the page has no tabs and is as before.
export function usableKeyPoints(points: unknown): string[] | null {
  if (!Array.isArray(points)) return null;
  const p = points.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  return p.length >= 4 && p.length <= 6 && p.length === points.length ? p : null;
}
