// Does a political_donations recipient_name refer to this MP? (owner, 31 Oct 2026)
//
// The token rule the MP Donations tab has used since it was written (app/api/mps/[id]/donations/route.ts, step 1),
// moved here unchanged so the "Also funds" exclusion (step 2) and scripts/checks/also-funds-self-check.ts use the
// very same test: the recipient name, lower cased and split on spaces, commas, full stops and hyphens, must contain
// the MP's last name as a whole word, and a word that equals or starts with the MP's first name ("edward" starts with
// "ed", so "Mr Edward Davey MP" is Ed Davey). firstWord and lastWord are lower case, from the MP's name without
// honorifics.
export function recipientIsMp(recipientName: string | null | undefined, firstWord: string, lastWord: string): boolean {
  const rn = String(recipientName || '').toLowerCase();
  const tokens = rn.split(/[\s,.\-]+/).filter(Boolean);
  if (!tokens.includes(lastWord)) return false;
  if (firstWord.length < 2) return false;
  return tokens.some((t) => t === firstWord || t.startsWith(firstWord));
}

// The MP's name without honorifics, as the Donations tab has always worked it out.
export function stripHonorific(name: string): string {
  return name
    .replace(/^(?:Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr|The )\s+/i, '')
    .replace(/\s+(?:MP|QC|KC|CBE|OBE|MBE)\s*$/i, '')
    .trim();
}
