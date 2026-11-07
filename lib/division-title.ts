// Search titles for vote pages (owner, 5 Nov 2026, visibility campaign item 13), for example
// "Animal Welfare (Sentience) Bill: how MPs voted, 14 Mar 2022". Only the search title changes; the page's heading keeps
// the motion in full. A name is never cut (owner, 7 Nov 2026), and every title keeps its date so no two votes share one
// (owner, 7 Nov 2026: the 60 character rule is for headlines, not browser titles). "how MPs voted" goes when it does not fit
// in 60; the name and date stay even over 60.
//
// Votes on one bill on one day (New Clause 1, New Clause 2 and so on) would share a title, so the day's first vote keeps
// it and the others name what was voted on, or the division's own number, "(vote 215)", so no two votes share a title.
import { endsOnLinkWord, shortDate, TITLE_MAX } from './seo-title';

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

function titleFor(motion: string, number: number, day: string, used: Set<string>, usedNames: Set<string>): string {
  const { name, part } = splitMotion(tidy(motion));
  // A later vote on a name already used that day goes straight to what was voted on: "[Lords]" is not a difference.
  const key = name.replace(/\s*\[(?:Lords|HL)\]/gi, '').toLowerCase();
  const nameTaken = usedNames.has(key);
  usedNames.add(key);
  const dated = `${name}, ${day}`;
  // For votes sharing a title, what was voted on; failing that the division's number (owner, 5 Nov 2026).
  const what = part ? shortPart(part) : '';
  const how = `${name}: how MPs voted, ${day}`;
  const plain = [
    ...(nameTaken ? [] : [dated]),
    ...(what ? [`${name}: ${what}, ${day}`] : []),
    `${dated} (vote ${number})`,
  ];
  // The first that fits in 60 characters and no other vote that day has. Failing that, without "how MPs voted": the name and date,
  // for example "Temporary and Agency Workers (Equal Treatment) Bill, 7 May 2008", over 60 if it must be.
  return [...(nameTaken ? [] : [how]), ...plain].find((t) => t.length <= TITLE_MAX && !used.has(t)) ?? plain.find((t) => !used.has(t)) ?? `${dated} (vote ${number})`;
}

// motion and number: this vote. sameDay: every vote that day, this one included.
export function divisionSeoTitle(motion: string, number: number, dateOnly: string, sameDay: { number: number; motion: string }[]): string {
  const day = shortDate(dateOnly) ?? dateOnly;
  const votes = [...sameDay.filter((v) => v.number !== number), { number, motion }].sort((a, b) => a.number - b.number);
  const used = new Set<string>(), usedNames = new Set<string>();
  for (const v of votes) {
    const title = titleFor(v.motion, v.number, day, used, usedNames);
    used.add(title);
    if (v.number === number) return title;
  }
  return tidy(motion);
}
