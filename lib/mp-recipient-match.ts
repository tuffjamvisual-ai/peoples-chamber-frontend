// Does a name in the data (a political_donations recipient_name, a ministers' diary minister_name) refer to this MP?
//
// History:
// - Until 31 Oct 2026 this was the token rule inside app/api/mps/[id]/donations/route.ts (step 1). It moved here
//   unchanged on 31 Oct 2026 so the Donations tab's "Also funds" exclusion, the ministers' meetings and hospitality on
//   the profile, and the read-only checks all use the very same test.
// - 31 Oct 2026 (owner, Step B of the name matching job): hyphenated surnames. The old rule split names on hyphens as
//   well as spaces, so "Alex Davies-Jones" became "alex", "davies", "jones" and never contained the MP's last name
//   "davies-jones": 12 MPs with hyphenated surnames had their own donations hidden, and the diaries of four hyphenated
//   ministers would have been lost. Now the words are split on spaces, commas and full stops only (so "davies-jones"
//   stays one word), and each hyphen part is added as an extra word; a hyphenated last name also matches when its parts
//   appear as consecutive words ("Davies Jones" written without the hyphen).
//
// The rule: the MP's last name must match (as above), and some word must equal, or start with, the MP's first name
// ("edward" starts with "ed", so "Mr Edward Davey MP" is Ed Davey). firstWord and lastWord are lower case, from the
// MP's name without honorifics (lastWord may contain a hyphen).
export function recipientIsMp(recipientName: string | null | undefined, firstWord: string, lastWord: string): boolean {
  if (firstWord.length < 2 || lastWord.length < 2) return false;
  const words = String(recipientName || '').toLowerCase().split(/[\s,.]+/).filter(Boolean);
  const all = [...words];
  for (const w of words) if (w.includes('-')) all.push(...w.split('-').filter(Boolean));

  let lastOk = all.includes(lastWord);
  if (!lastOk && lastWord.includes('-')) {
    const parts = lastWord.split('-').filter(Boolean);
    for (let i = 0; i + parts.length <= words.length && !lastOk; i++) {
      lastOk = parts.every((p, k) => words[i + k] === p);
    }
  }
  if (!lastOk) return false;
  return all.some((t) => t === firstWord || t.startsWith(firstWord));
}

// The longest hyphen part of a last name, for a database prefilter (ILIKE %part%) that lets both the hyphenated and
// the unhyphenated spelling through to recipientIsMp: "davies-jones" gives "davies".
export function lastNamePrefilter(lastWord: string): string {
  return lastWord.split('-').filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? lastWord;
}

// The MP's name without honorifics, as the Donations tab has always worked it out.
export function stripHonorific(name: string): string {
  return name
    .replace(/^(?:Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr|The )\s+/i, '')
    .replace(/\s+(?:MP|QC|KC|CBE|OBE|MBE)\s*$/i, '')
    .trim();
}
