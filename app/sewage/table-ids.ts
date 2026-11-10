// The league tables /sewage can show (SewageView builds those with data). Each, with each sort order, has its own cached page
// for phones with JavaScript off: app/sewage/t/[table]/[sort] (UX2e).
export const SEWAGE_TABLE_IDS = ['eng-council', 'eng-county', 'eng-constituency', 'sco-council', 'sco-constituency', 'ni-council', 'ni-constituency'];

// The sort orders, as the league tables name them.
export type SortKey = 'hours' | 'share' | 'spills';
export const SORT_KEYS: SortKey[] = ['hours', 'share', 'spills'];
