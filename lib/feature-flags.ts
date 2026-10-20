// Site-wide switches. Kept free of runtime imports so any page, component or route can read them.
import type { Metadata } from 'next';

// Council area league table (owner's decision, 19 Oct 2026: hidden everywhere while its rate-based measures are
// reconsidered). false: /councils/league-table returns 404 and leaves the sitemap; every link to it is removed; the
// council Ratings tab and Your area show no league scores, topic scores or ranks. No data or scoring code is deleted:
// set to true to bring it all back.
export const SHOW_LEAGUE_TABLE = false;

// "Your Tax Pound" (/your-tax-pound) and "Budget Choices" (/budget-trade-offs): hidden (owner's decision, 19 Oct 2026).
// false: the page returns 404, leaves the sitemap and the menus. No page code or data is deleted: set to true to restore.
export const SHOW_YOUR_TAX_POUND = false;
export const SHOW_BUDGET_CHOICES = false;

// Demo homepages /homepage-v2 and /landing-demo2: hidden (owner's decision, 20 Oct 2026). false: the page returns 404.
// No page code is deleted: set to true to restore.
export const SHOW_DEMO_PAGES = false;

// What a page hidden by one of these switches says about itself: the not-found page's title (app/not-found.tsx),
// kept out of search engines, instead of its own title and description.
export const HIDDEN_PAGE_METADATA: Metadata = { title: 'Page not found', robots: { index: false, follow: false } };
