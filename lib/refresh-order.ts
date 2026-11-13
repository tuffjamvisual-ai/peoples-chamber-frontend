// The order a publish refreshes its pages in (T1-SITEMAP, Cowork 13 Nov 2026): listing pages, the feed and the sitemap
// last, so none of them is rebuilt from the reports list as it was before the publish. Used by scripts/publish-editorial.ts.
export const REFRESH_LAST = ['/reports', '/', '/feed.xml', '/sitemap.xml'];

export function refreshOrder(paths: string[]): string[] {
  const last = new Set(REFRESH_LAST);
  const unique = [...new Set(paths)];
  return [...unique.filter((p) => !last.has(p)), ...REFRESH_LAST.filter((p) => unique.includes(p))];
}
