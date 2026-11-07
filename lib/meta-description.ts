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

// A text split into its sentences, for wholeSentences: a sentence ends at . ! or ? followed by a space or the end, so
// "6.5 per cent" stays whole (L6, 7 Nov 2026).
export function sentencesOf(text: string | null | undefined): string[] {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t ? t.split(/(?<=[.!?]["'”’)]*)\s+/).map((s) => s.trim()).filter(Boolean) : [];
}

// A sentence from a title or name: the text with a full stop, unless it already ends a sentence.
export const asSentence = (s: string) => (/[.!?]["'”’)]*$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// The first of the sentences that still fits after the text, or null (L6): a fuller sentence where there is room, a
// shorter one where there is not.
export function firstThatFits(text: string, options: string[], max = 160): string | null {
  return options.find((o) => text.length + 1 + o.length <= max) ?? null;
}

// A piece's own prose as a description (L6): its whole sentences that fit in 160 characters. Where even the first
// sentence is longer, the headline is used instead, so nothing is cut with an ellipsis.
export function proseDescription(text: string | null | undefined, headline: string, max = 160): string {
  const s = sentencesOf(text);
  return s.length && s[0].length <= max ? wholeSentences(s, max) : wholeSentences([asSentence(headline)], max);
}

// A description led by the page's most useful fact (owner, 7 Nov 2026, L7): the first lead sentence that fits in max,
// then whichever later sentences still fit. Where no lead fits, the official name as a sentence; where the name alone
// is over max, the name whole and nothing else, as on division pages. Official names are never shortened.
export function ledBy(name: string, leads: (string | null | undefined | false)[], rest: (string | null | undefined | false)[] = [], max = 160): string {
  const lead = leads.find((l): l is string => !!l && l.replace(/\s+/g, ' ').trim().length <= max);
  if (lead) return wholeSentences([lead, ...rest], max);
  const n = name.replace(/\s+/g, ' ').trim();
  const plain = asSentence(n);
  return plain.length <= max ? wholeSentences([plain, ...rest], max) : n;
}

// "1 meeting", "2 meetings": a count with its noun, in the house style for numbers.
export const countOf = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
