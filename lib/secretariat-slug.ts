// The APPG secretariat page slug (moved from app/secretariats/[slug]/page.tsx so the sitemap can use it; T1-SITEMAP (c)).
export function secretariatNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
