// Sitemap XML and its compact cached form (T1-SITEMAP (c), Cowork 13 Nov 2026).
// The XML is the same as Next wrote for app/sitemap.ts: <url> with <loc>, then <lastmod>, <changefreq> and <priority>
// when given. The cached form is a compact list (path, lastmod, changefreq, priority), gzipped and base64: about 23,700
// entries come to well under the 2 MB a Vercel data cache item may hold.
import { gzipSync, gunzipSync } from 'node:zlib';

export const SITE = 'https://www.opengovt.uk';
export type SitemapEntry = { url: string; lastModified?: string | Date; changeFrequency?: string; priority?: number };
type Compact = [string, string | null, string | null, number | null];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const iso = (d: string | Date) => (d instanceof Date ? d.toISOString() : d);

export function urlsetXml(entries: SitemapEntry[]): string {
  const rows = entries.map((e) => [
    '<url>',
    `<loc>${esc(e.url)}</loc>`,
    e.lastModified != null ? `<lastmod>${esc(iso(e.lastModified))}</lastmod>` : '',
    e.changeFrequency ? `<changefreq>${esc(e.changeFrequency)}</changefreq>` : '',
    e.priority != null ? `<priority>${e.priority}</priority>` : '',
    '</url>',
  ].filter(Boolean).join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

export function indexXml(locs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map((l) => `<sitemap>\n<loc>${esc(l)}</loc>\n</sitemap>`).join('\n')}\n</sitemapindex>\n`;
}

export function pack(entries: SitemapEntry[]): string {
  const rows: Compact[] = entries.map((e) => [
    e.url.startsWith(SITE) ? e.url.slice(SITE.length) : e.url,
    e.lastModified != null ? iso(e.lastModified) : null,
    e.changeFrequency ?? null,
    e.priority ?? null,
  ]);
  return gzipSync(Buffer.from(JSON.stringify(rows))).toString('base64');
}

export function unpack(packed: string): SitemapEntry[] {
  const rows = JSON.parse(gunzipSync(Buffer.from(packed, 'base64')).toString('utf8')) as Compact[];
  return rows.map(([p, lastmod, freq, priority]) => ({
    url: p.startsWith('http') ? p : `${SITE}${p}`,
    ...(lastmod != null ? { lastModified: lastmod } : {}),
    ...(freq != null ? { changeFrequency: freq } : {}),
    ...(priority != null ? { priority } : {}),
  }));
}

export const xmlResponse = (xml: string) =>
  new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
