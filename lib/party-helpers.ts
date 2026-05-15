// Shared party-string helpers. Used by /mps (listing) and /mps/[id]
// (profile) so the "Labour (Co-op)" → "Labour" merge is consistent
// across both views.

const LABOUR_RED = '#E4003B';

// Hard-coded party-colour overrides for groups whose row-level
// party_colour is unreliable. The DB stores Labour (Co-op) members
// with party_colour='#808080' (grey), which would otherwise leak into
// the merged Labour bucket.
const PARTY_COLOUR_OVERRIDE: Record<string, string> = {
  Labour: LABOUR_RED,
};

/** Map raw `mps.party` strings to their canonical display group. */
export function normaliseParty(party: string | null | undefined): string {
  const p = (party || 'Independent').trim();
  if (p === 'Labour (Co-op)' || p === 'Labour and Co-operative') return 'Labour';
  return p;
}

/** True for the Co-op variants that we fold into the Labour group. */
export function isCoop(party: string | null | undefined): boolean {
  return party === 'Labour (Co-op)' || party === 'Labour and Co-operative';
}

/**
 * Resolve the display colour for a party group.
 *   - Respects PARTY_COLOUR_OVERRIDE first (Labour gets red regardless
 *     of which member sits at index 0 of the group).
 *   - Otherwise prefers the first member whose RAW party string matches
 *     the canonical group name exactly (skips Co-op rows when picking
 *     Labour's colour).
 *   - Falls back to the first member with any colour, then to a generic
 *     slate `#7697a2`.
 */
export function resolvePartyColour(
  partyName: string,
  members: Array<{ party?: string; party_colour?: string | null }>,
): string {
  if (PARTY_COLOUR_OVERRIDE[partyName]) return PARTY_COLOUR_OVERRIDE[partyName];
  const exact = members.find((m) => m.party === partyName && m.party_colour);
  const fallback = members.find((m) => !!m.party_colour);
  const src = exact || fallback;
  return src?.party_colour ? `#${src.party_colour.replace('#', '')}` : '#7697a2';
}

/**
 * Single-row colour resolver — used on MP profile pages where we have
 * the row directly rather than a list.
 */
export function partyColourForMember(
  party: string | null | undefined,
  party_colour: string | null | undefined,
): string {
  const canonical = normaliseParty(party);
  if (PARTY_COLOUR_OVERRIDE[canonical]) return PARTY_COLOUR_OVERRIDE[canonical];
  return party_colour ? `#${party_colour.replace('#', '')}` : '#7697a2';
}
