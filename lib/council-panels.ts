// The council page's detail tabs, loaded when opened (owner, 4 Nov 2026). Shared by app/councils/[slug]/panels.tsx (the
// server) and CouncilTabs (the browser).
export const COUNCIL_LAZY_TABS = ['work', 'housing', 'crime', 'schools', 'broadband', 'sewage'] as const;
export type CouncilLazyTab = (typeof COUNCIL_LAZY_TABS)[number];
export const isCouncilLazyTab = (tab: string): tab is CouncilLazyTab => (COUNCIL_LAZY_TABS as readonly string[]).includes(tab);
// Where the welfare section goes in the Work & benefits tab's HTML: it is the one part with its own browser script, so
// CouncilTabs renders it there rather than taking it from the loaded HTML.
export const WELFARE_SLOT = '<div data-welfare-slot="1"></div>';
