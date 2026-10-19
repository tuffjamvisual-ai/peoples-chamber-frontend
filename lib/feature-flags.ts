// Site-wide switches. Kept free of imports so any page, component or route can read them.

// Council area league table (owner's decision, 19 Oct 2026: hidden everywhere while its rate-based measures are
// reconsidered). false: /councils/league-table returns 404 and leaves the sitemap; every link to it is removed; the
// council Ratings tab and Your area show no league scores, topic scores or ranks. No data or scoring code is deleted:
// set to true to bring it all back.
export const SHOW_LEAGUE_TABLE = false;

// "Your Tax Pound" (/your-tax-pound) and "Budget Choices" (/budget-trade-offs): hidden (owner's decision, 19 Oct 2026).
// false: the page returns 404, leaves the sitemap and the menus. No page code or data is deleted: set to true to restore.
export const SHOW_YOUR_TAX_POUND = false;
export const SHOW_BUDGET_CHOICES = false;
