// /sitemap-index.xml: the sitemap index (T1-SITEMAP (c), Cowork 13 Nov 2026), named in robots.txt: /sitemap.xml and one
// sitemap per added page type. It reads nothing from the database.
import { TYPE_PARTS } from '@/lib/sitemap/parts';
import { SITE, indexXml, xmlResponse } from '@/lib/sitemap/xml';

export const dynamic = 'force-dynamic';

export function GET() {
  return xmlResponse(indexXml([`${SITE}/sitemap.xml`, ...TYPE_PARTS.map((t) => `${SITE}/sitemaps/${t}.xml`)]));
}
