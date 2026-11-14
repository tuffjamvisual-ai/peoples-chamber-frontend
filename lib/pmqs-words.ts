// The /pmqs search box and filters (T2 ENTRY 1): reading what was typed. No database here, so the tests can load it.

// A date or part of one in the words: "2019", "October 2019", "21 October 2019", "21 Oct 2019", "2019-10-21", "21/10/2019".
// The answer is the start of the ISO date it stands for ("2019", "2019-10", "2019-10-21"), or null.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// A month's full name, its first three letters, or "sept".
const monthOf = (w: string) => {
  const l = w.toLowerCase();
  const i = MONTHS.findIndex((m) => l === m || l === m.slice(0, 3) || (m === 'september' && l === 'sept'));
  return i < 0 ? null : String(i + 1).padStart(2, '0');
};
const pad = (n: string) => n.padStart(2, '0');
export function datePrefix(q: string): string | null {
  const s = q.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})$/)) && +m[1] >= 1940 && +m[1] <= 2100) return m[1];
  if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) return m[3] ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : `${m[1]}-${pad(m[2])}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+) (\d{4})$/i)) && monthOf(m[2])) return `${m[3]}-${monthOf(m[2])}-${pad(m[1])}`;
  if ((m = s.match(/^([a-z]+) (\d{4})$/i)) && monthOf(m[1])) return `${m[2]}-${monthOf(m[1])}`;
  return null;
}

// The words as typed, made safe for the filter syntax: characters that would break it are dropped (as the transparency
// datasets do), at most 100 characters.
export const cleanWords = (q: string) => q.replace(/[,()*%"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

// A Prime Minister's key in the address: "keir-starmer", "harold-wilson-1974-to-1976".
export const pmSlug = (pm: string) => pm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
