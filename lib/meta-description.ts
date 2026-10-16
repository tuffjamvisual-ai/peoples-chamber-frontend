// Search-result descriptions: whole sentences where they fit, otherwise cut at a word with
// an ellipsis. Google shows about 155 to 160 characters; text cut mid-word ("the Regulator
// of Social Housing's press rel") looked broken in results (search engine check, 16 Oct 2026).
export function metaDescription(text: string | null | undefined, max = 160): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // Longest run of whole sentences that fits.
  const sentences = t.match(/[^.!?]+(?:[.!?](?=\s|$)|$)/g) ?? [t];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  out = out.trim();
  if (out.length >= max * 0.6) return out;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max * 0.5 ? at : max - 1).replace(/[,;:\s]+$/, '')}…`;
}
