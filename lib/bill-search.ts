// "Find a bill" on /bills (owner's brief, 8 Nov 2026, BS1): matching a reader's text against bill titles. Case does not
// matter and neither does punctuation: apostrophes are dropped ("Childrens" finds "Children's") and any other mark is a
// space, so "lords" finds "[Lords]" and "high speed" finds "High Speed Rail (Crewe - Manchester)". A title matches when
// its words contain the reader's words in the same order. The text is at most 100 characters.
export const BILL_QUERY_MAX = 100;

export function normaliseTitle(s: string): string {
  return ` ${s.toLowerCase().replace(/['’‘`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

// The reader's text, trimmed, spaces collapsed and cut to 100 characters; '' when there is nothing to search for.
export function cleanBillQuery(raw: unknown): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return '';
  return v.replace(/\s+/g, ' ').trim().slice(0, BILL_QUERY_MAX).trim();
}

// Whether a title matches; text with no letters or digits matches nothing.
export function billTitleMatches(title: string, query: string): boolean {
  const q = normaliseTitle(query).trim();
  if (!q) return false;
  return normaliseTitle(title).includes(q);
}
