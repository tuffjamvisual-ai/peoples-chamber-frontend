// Site-wide switches. Kept free of runtime imports so any page, component or route can read them.
import type { Metadata } from 'next';

// Council area league table (owner's decision, 19 Oct 2026: hidden everywhere while its rate-based measures are
// reconsidered). false: /councils/league-table shows a short withdrawal notice (noindex, follow; since 23 Oct 2026) and
// leaves the sitemap; every link to it is removed; the
// council Ratings tab and Your area show no league scores, topic scores or ranks. No data or scoring code is deleted:
// set to true to bring it all back.
export const SHOW_LEAGUE_TABLE = false;

// "Your Tax Pound" (/your-tax-pound) and "Budget Choices" (/budget-trade-offs): hidden (owner's decision, 19 Oct 2026).
// false: the page returns 404, leaves the sitemap and the menus. No page code or data is deleted: set to true to restore.
export const SHOW_YOUR_TAX_POUND = false;
export const SHOW_BUDGET_CHOICES = false;

// Demo and preview pages: hidden (owner's decisions, 20 Oct 2026). false: the page returns 404. Covers /homepage-v2,
// /landing-demo2, /blank-landing, /folder-bg, /landing-demo, /landing-pca, /landing-preview, /landing1012, /new2,
// /newspaper-demo, /preview, /preview-2 to /preview-5, /preview-footer, /preview-home2 and /template.
// No page code is deleted: set to true to restore.
export const SHOW_DEMO_PAGES = false;

// Council pages' "Founded" row: hidden (owner's decision, 20 Oct 2026). The year mixes a town's charter, an earlier
// district and the current council (e.g. Bristol 1835, Darlington 1974, most unitaries 1996). false: the row is not shown;
// councils.founded_year is kept. Set to true to show it again.
export const SHOW_COUNCIL_FOUNDED = false;

// What a page hidden by one of these switches says about itself: the not-found page's title (app/not-found.tsx),
// kept out of search engines, instead of its own title and description.
export const HIDDEN_PAGE_METADATA: Metadata = { title: 'Page not found', robots: { index: false, follow: false } };
