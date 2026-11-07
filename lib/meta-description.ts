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

// A description built from whole sentences only (owner, 7 Nov 2026, L4): the first sentence always, then each later one in
// order that still fits in max characters; one that does not fit is left out and the next is tried. Nothing is cut with
// an ellipsis unless the first sentence alone is over max.
export function wholeSentences(sentences: (string | null | undefined | false)[], max = 160): string {
  const parts = sentences.filter((s): s is string => !!s && !!s.trim()).map((s) => s.replace(/\s+/g, ' ').trim());
  if (!parts.length) return '';
  if (parts[0].length > max) return metaDescription(parts[0], max);
  let out = parts[0];
  for (const s of parts.slice(1)) if (out.length + 1 + s.length <= max) out += ` ${s}`;
  return out;
}
