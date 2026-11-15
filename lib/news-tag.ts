// The cache tag of one press release's page /news/<slug> (A16, owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129). The
// press syncs refresh it together with the page's path when that release changed.
export const newsTag = (slug: string) => `news:${slug.toLowerCase()}`;
// From a page path such as /news/<slug>.
export const newsTagForPath = (path: string) => newsTag(path.replace(/^\/news\//, '').split(/[?#]/)[0]);
