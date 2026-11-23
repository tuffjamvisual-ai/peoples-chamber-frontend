// /sitemap.xml: the site's hub, list and other pages (since ENTRY 531 item 2 the record pages of 13 types are in
// /sitemaps/<type>.xml; all listed in /sitemap-index.xml) (T1-SITEMAP (c), Cowork 13 Nov 2026). Drawn on
// each request from the data cache (lib/sitemap/parts.ts), so a publish or sync refresh shows at once; until 13 Nov it was
// made once per deploy (app/sitemap.ts). The new page types are in /sitemaps/<type>.xml, all listed in /sitemap-index.xml.
import { partEntries } from '@/lib/sitemap/parts';
import { urlsetXml, xmlResponse } from '@/lib/sitemap/xml';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  return xmlResponse(urlsetXml((await partEntries('main')) ?? []));
}
