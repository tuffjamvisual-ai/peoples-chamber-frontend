// /sitemaps/<type>.xml: one sitemap per page type added on 13 Nov 2026 (T1-SITEMAP (c)): donors, secretariats, people,
// agencies, statutory-instruments (lib/sitemap/parts.ts). Any other name answers 404.
import { partEntries, TYPE_PARTS } from '@/lib/sitemap/parts';
import { urlsetXml, xmlResponse } from '@/lib/sitemap/xml';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const type = name.endsWith('.xml') ? name.slice(0, -4) : '';
  if (!TYPE_PARTS.includes(type)) return new Response('Not found', { status: 404 });
  return xmlResponse(urlsetXml((await partEntries(type)) ?? []));
}
