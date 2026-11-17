// The party policy texts (party_policies: manifesto_position, current_shift, position_label and their sources) are hidden
// (owner approved 17 Nov 2026, Cowork ENTRY 235 PP-HIDE: T2 found 156 of 161 texts state figures or pledges that their
// cited sources do not contain). Hidden, not deleted: no row is removed and no text changed. A party listed here shows
// its texts again on /parties/<slug> and /parties/manifestos (one change per party); then refresh the tag
// table:party_policies. Empty: hidden for every party (17 Nov 2026, 16:40 to the reveal). Nowhere else on the site shows these texts.
// Every party, all at once (owner's plan, Cowork ENTRY 255, 17 Nov 2026): each party's 7 or 11 rows rewritten from texts
// checked against their sources (ENTRY 241 to 255) and confirmed by T2.
const SHOWN: ReadonlySet<string> = new Set<string>([
  'alliance', 'conservative', 'dup', 'green', 'labour', 'liberal-democrats', 'plaid-cymru', 'reform-uk',
  'restore-britain', 'sdlp', 'sinn-fein', 'snp', 'tuv', 'uup', 'your-party',
]);

export function partyPoliciesShown(slug: string): boolean {
  return SHOWN.has(slug);
}

export function anyPartyPoliciesShown(): boolean {
  return SHOWN.size > 0;
}
