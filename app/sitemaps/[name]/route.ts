// /sitemaps/<type>.xml: one sitemap per page type (lib/sitemap/parts.ts): the types added on 13 Nov 2026 (T1-SITEMAP (c)):
// donors, secretariats, people, agencies, statutory-instruments, news; and since ENTRY 531 item 2 the record pages of
// divisions, pmqs, edms, organisations, lobbying, lords, mps, constituencies, petitions, recommendations, bills,
// editorials and councils (cut from the main build). Any other name answers 404.
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
