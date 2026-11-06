// mps.party, party_abbreviation and party_colour, kept to Parliament's Members API by the roster and party syncs. The colours are
// the site's own for parties it has one for, because Parliament's differ (Labour d50000, ours E4003B) and would recolour every MP;
// a party the site has no colour for takes Parliament's.
export const PARTY_COLOURS: Record<string, string> = {
  'Labour': '#E4003B',
  'Labour (Co-op)': '#E4003B',
  'Conservative': '#0087DC',
  'Liberal Democrat': '#FAA61A',
  'Scottish National Party': '#FDF38E',
  'Green Party': '#6AB023',
  'Plaid Cymru': '#005B54',
  'Democratic Unionist Party': '#D46A4C',
  'Sinn Féin': '#326760',
  'Social Democratic and Labour Party': '#2AA82C',
  'Alliance': '#F6CB2F',
  'Reform UK': '#12B6CF',
  'Independent': '#808080',
};

export type ApiParty = { name?: string | null; abbreviation?: string | null; backgroundColour?: string | null };

export function colourForParty(p: ApiParty): string {
  const own = p.name ? PARTY_COLOURS[p.name] : undefined;
  if (own) return own;
  return p.backgroundColour ? `#${p.backgroundColour.replace('#', '')}` : '#808080';
}

// What to write, or null if the stored label and abbreviation already match. The full label is compared, "(Co-op)" included.
// The colour moves only with them, so a run never repaints a row whose party has not changed.
export function partyUpdate(stored: { party: string | null; party_abbreviation: string | null }, api: ApiParty): { party: string; party_abbreviation: string | null; party_colour: string } | null {
  if (!api.name) return null;
  const abbreviation = api.abbreviation ?? null;
  if ((stored.party ?? '').trim() === api.name && (stored.party_abbreviation ?? null) === abbreviation) return null;
  return { party: api.name, party_abbreviation: abbreviation, party_colour: colourForParty(api) };
}
