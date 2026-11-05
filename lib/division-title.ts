// Search titles for vote pages (owner, 5 Nov 2026, visibility campaign item 13): 60 characters or fewer, for example
// "Animal Welfare (Sentience) Bill: how MPs voted, 14 Mar 2022". Only the search title changes; the page's heading keeps
// the motion in full. A name is only ever shortened at a natural break (lib/seo-title.ts): when the shortest clean name
// does not fit with "how MPs voted", those words go, then the date, rather than leaving a fragment of the name.
//
// Votes on one bill on one day (New Clause 1, New Clause 2 and so on) would share a title, so the day's first vote keeps
// it and the others name what was voted on, or the division's own number, "(vote 215)", so no two votes share a title.
import { cleanNameForms, endsOnLinkWord, naturalCut, shortDate, TITLE_MAX } from './seo-title';

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

// What was voted on, in the fewest words: "motion to disagree with Lords Amendment 16" is "Lords Amendment 16".
const WHAT = /\b(?:Lords\s+(?:Amendments?|Amdts?)\s+(?:\(\w{1,3}\)|\w+)|LA\s*\d+\w*|New\s+Clauses?\s+\w+|New\s+Schedules?\s+\w+|Amendments?\s+(?:\(\w{1,3}\)|\d+\w*|\w\b)|Amdts?\s+\w+|Clauses?\s+\d+\w*|Schedules?\s+\d+\w*|NC\s*\d+|Second\s+Reading|Third\s+Reading)/i;
const shortPart = (part: string) => (WHAT.exec(part)?.[0] ?? tidy(part)).replace(/\bAmdts?\b/gi, 'Amendment').replace(/^LA\s*/, 'Lords Amendment ');

// The last ": " outside any bracket, so "Draft Strikes (Minimum Service Levels: Rail) Regulations" is not split.
function topColon(text: string): number {
  let depth = 0, at = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (depth === 0 && text.startsWith(': ', i)) at = i;
  }
  return at;
}

// Splits a motion into the thing voted on and the part of it: "X Bill: Report Stage: New Clause 5", "X Bill Report: NC1".
function splitMotion(motion: string): { name: string; part: string } {
  const bill = /^(.*?\bBill\b(?:\s*\[(?:Lords|HL)\])?)[\s:,]*(.*)$/i.exec(motion);
  if (bill && bill[1].length >= 8) return { name: bill[1], part: bill[2] };
  const colon = topColon(motion);
  if (colon > 0 && !/^Opposition Day$/i.test(motion.slice(0, colon)) && !endsOnLinkWord(motion.slice(0, colon))) return { name: motion.slice(0, colon), part: motion.slice(colon + 2) };
  const inName = WHAT.exec(motion);
  if (inName && inName.index > 2 && !/^(?:motion to|to)\b/i.test(motion)) return { name: motion.slice(0, inName.index).replace(/[\s,:;-]+$/, '').replace(/\s+to the( motion on)?( the)?$/i, ''), part: inName[0] };
  return { name: motion, part: '' };
}

function titleFor(motion: string, number: number, dateOnly: string, day: string, used: Set<string>, usedNames: Set<string>): string {
  const { name, part } = splitMotion(tidy(motion));
  const forms = cleanNameForms(name);
  // A later vote on a name already used that day goes straight to what was voted on: "[Lords]" is not a difference.
  const key = forms[forms.length - 1].toLowerCase();
  const nameTaken = usedNames.has(key);
  usedNames.add(key);
  const fits = (t: string) => t.length <= TITLE_MAX;
  const free = (t: string) => fits(t) && !used.has(t);
  const how = (n: string) => `${n}: how MPs voted, ${day}`;
  const dated = (n: string) => `${n}, ${day}`;

  // The name whole or in a clean form, then, only if neither fits at all, the name cut at a natural break.
  const whole = [...forms.map(how), ...forms.map(dated)];
  const usual = whole.some(fits) ? whole : [
    ...[naturalCut(forms[forms.length - 1], TITLE_MAX - how('').length)].filter((c): c is string => !!c).map(how),
    ...[naturalCut(forms[forms.length - 1], TITLE_MAX - dated('').length)].filter((c): c is string => !!c).map(dated),
  ];
  // For votes sharing a title, what was voted on; failing that the division's number, which keeps every title unique
  // (owner, 5 Nov 2026) even if it takes the title over 60 characters.
  const what = part ? shortPart(part) : '';
  const year = dateOnly.slice(0, 4);
  const vote = `(vote ${number})`;
  const shortest = forms[forms.length - 1];
  const candidates = [
    ...(nameTaken ? [] : usual),
    ...(what ? forms.map((n) => `${n}: ${what}, ${day}`) : []),
    ...forms.map((n) => `${n}, ${year} ${vote}`),
    ...forms.map((n) => `${n} ${vote}`),
  ];
  const found = candidates.find(free);
  if (found) return found;
  // Nothing fits in 60 characters. A name with no natural break is kept whole, never cut: with its date, and its number
  // if another vote that day already has that title.
  return used.has(dated(shortest)) ? `${dated(shortest)} ${vote}` : dated(shortest);
}

// motion and number: this vote. sameDay: every vote that day, this one included.
export function divisionSeoTitle(motion: string, number: number, dateOnly: string, sameDay: { number: number; motion: string }[]): string {
  const day = shortDate(dateOnly) ?? dateOnly;
  const votes = [...sameDay.filter((v) => v.number !== number), { number, motion }].sort((a, b) => a.number - b.number);
  const used = new Set<string>(), usedNames = new Set<string>();
  for (const v of votes) {
    const title = titleFor(v.motion, v.number, dateOnly, day, used, usedNames);
    used.add(title);
    if (v.number === number) return title;
  }
  return tidy(motion);
}
