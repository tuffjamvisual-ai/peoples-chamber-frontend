// The party policy texts (party_policies: manifesto_position, current_shift, position_label and their sources) are hidden
// (owner approved 17 Nov 2026, Cowork ENTRY 235 PP-HIDE: T2 found 156 of 161 texts state figures or pledges that their
// cited sources do not contain). Hidden, not deleted: no row is removed and no text changed. A party listed here shows
// its texts again on /parties/<slug> and /parties/manifestos (one change per party); then refresh the tag
// table:party_policies. Empty: hidden for every party. Nowhere else on the site shows these texts.
const SHOWN: ReadonlySet<string> = new Set<string>([]);

export function partyPoliciesShown(slug: string): boolean {
  return SHOWN.has(slug);
}

export function anyPartyPoliciesShown(): boolean {
  return SHOWN.size > 0;
}
