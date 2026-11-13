// T1-SITEMAP (c) (Cowork 13 Nov 2026): the sitemap's XML, its compressed cached form, the index, and the donor pages it
// leaves out (minor spellings, noindex).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/sitemap-parts.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlsetXml, indexXml, pack, unpack, SITE } from '../../lib/sitemap/xml';
import { minorSpellingSlugs } from '../../lib/donor-name-match';
import type { DonorPageEntry } from '../../lib/donor-registry';

test('the XML is as Next wrote it: loc, then lastmod, changefreq and priority when given', () => {
  const xml = urlsetXml([
    { url: `${SITE}`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/pmqs`, lastModified: new Date('2026-11-11T00:00:00Z'), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/a?b=1&c=2` },
  ]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">\n/);
  assert.match(xml, /<url>\n<loc>https:\/\/www.opengovt.uk<\/loc>\n<changefreq>daily<\/changefreq>\n<priority>1<\/priority>\n<\/url>/);
  assert.match(xml, /<loc>https:\/\/www.opengovt.uk\/pmqs<\/loc>\n<lastmod>2026-11-11T00:00:00.000Z<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/www.opengovt.uk\/a\?b=1&amp;c=2<\/loc>\n<\/url>/, 'escaped, and nothing empty written');
});

test('the cached form round-trips every field, and 24,000 entries pack to well under 2 MB', () => {
  const entries = Array.from({ length: 24000 }, (_, i) => ({ url: `${SITE}/divisions/pw-2026-11-${String(i % 28 + 1).padStart(2, '0')}-${i}-commons`, lastModified: '2026-11-12T00:00:00.000Z', changeFrequency: 'yearly', priority: 0.5 }));
  const packed = pack(entries);
  assert.ok(packed.length < 2_000_000 / 4, `packed ${packed.length} bytes`);
  assert.deepEqual(unpack(packed), entries);
  assert.deepEqual(unpack(pack([{ url: `${SITE}/x` }])), [{ url: `${SITE}/x` }]);
});

test('the index lists each sitemap', () => {
  assert.equal(indexXml([`${SITE}/sitemap.xml`, `${SITE}/sitemaps/donors.xml`]),
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap>\n<loc>https://www.opengovt.uk/sitemap.xml</loc>\n</sitemap>\n<sitemap>\n<loc>https://www.opengovt.uk/sitemaps/donors.xml</loc>\n</sitemap>\n</sitemapindex>\n');
});

test('donor pages: a minor spelling of a much larger page is left out; distinct donors and large pages stay', () => {
  const e = (slug: string, label: string, records: number): DonorPageEntry => ({ slug, label, names: [label], records, others: [] });
  const minor = minorSpellingSlugs([
    e('mr-christopher-harborne', 'Mr Christopher Harborne', 26),
    e('christopher-c-harborne', 'Christopher C Harborne', 2),     // same first and last word as a page 13 times larger
    e('union-of-shop-distributive-and-allied-workers', 'Union of Shop Distributive and Allied Workers', 877),
    e('union-of-shop-distributve-and-allied-workers', 'Union of Shop Distributve and Allied Workers', 1), // one letter off
    e('jane-smith', 'Jane Smith', 2),                             // no larger match
    e('john-harborne', 'John Harborne', 9),                       // over the small limit: kept
  ]);
  assert.deepEqual([...minor].sort(), ['christopher-c-harborne', 'union-of-shop-distributve-and-allied-workers']);
});
