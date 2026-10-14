// Organisation types for the lobbying index. Kept apart from lib/lobbying.ts (which reads
// the database) so client components can import the labels.

export type OrgType =
  | 'company' | 'trade_body' | 'union' | 'charity' | 'campaign' | 'think_tank'
  | 'professional_body' | 'academic' | 'public_body' | 'media' | 'other';

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  company: 'Company',
  trade_body: 'Trade or business body',
  union: 'Union',
  charity: 'Charity',
  campaign: 'Campaign',
  think_tank: 'Think tank',
  professional_body: 'Professional body',
  academic: 'University or academy',
  public_body: 'Public body',
  media: 'Media',
  other: 'Other',
};
