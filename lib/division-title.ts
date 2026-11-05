// Search titles for vote pages (owner, 5 Nov 2026, visibility campaign item 13): 60 characters or fewer, for example
// "Animal Welfare (Sentience) Bill: how MPs voted, 14 Mar 2022". Only the search title changes; the page's heading keeps
// the motion in full. A name is only ever shortened at a natural break (lib/seo-title.ts): when the shortest clean name
// does not fit with "how MPs voted", those words go, then the date, rather than leaving a fragment of the name.
//
// Votes on one bill on one day (New Clause 1, New Clause 2 and so on) would share a title, so the day's first vote keeps
// it and the others name what was voted on, or the division's own number when that is shared too.
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

function titleFor(motion: string, number: number, dateOnly: string, day: string, used: Set<string>): string {
  const { name, part } = splitMotion(tidy(motion));
  const forms = cleanNameForms(name);
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
  // Shorter dates next, which keep the name whole; then, for votes sharing a title, what was voted on or the number.
  const year = dateOnly.slice(0, 4);
  const monthYear = day.replace(/^\d+ /, '');
  const what = part ? shortPart(part) : '';
  const candidates = [
    ...usual,
    ...(what ? forms.map((n) => `${n}: ${what}, ${day}`) : []),
    ...forms.map((n) => `${n}, ${monthYear}`),
    ...forms.map((n) => `${n}, ${year}`),
    ...(what ? forms.map((n) => `${n}: ${what}, ${year}`) : []),
    ...forms.map((n) => `${n}: Division ${number}, ${year}`),
    ...forms.map((n) => `${n}: Division ${number}`),
    '',
  ];
  const found = candidates.slice(0, -1).find(free);
  if (found) return found;
  // Every wording that keeps the name is taken or too long. A name that fits on its own stays, even if another vote shares
  // the title; a name over 60 characters with no natural break is kept whole, never cut (the job's report lists them).
  const bare = [...forms.map((n) => `${n}, ${monthYear}`), ...forms.map((n) => `${n}, ${year}`), ...forms].find(fits);
  return bare ?? forms[forms.length - 1];
}

// motion and number: this vote. sameDay: every vote that day, this one included.
export function divisionSeoTitle(motion: string, number: number, dateOnly: string, sameDay: { number: number; motion: string }[]): string {
  const day = shortDate(dateOnly) ?? dateOnly;
  const votes = [...sameDay.filter((v) => v.number !== number), { number, motion }].sort((a, b) => a.number - b.number);
  const used = new Set<string>();
  for (const v of votes) {
    const title = titleFor(v.motion, v.number, dateOnly, day, used);
    used.add(title);
    if (v.number === number) return title;
  }
  return tidy(motion);
}
