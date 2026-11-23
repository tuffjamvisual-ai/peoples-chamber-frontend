// Sitemap dates check (owner, 7 Nov 2026, Search Console "Invalid date"): fails if any sitemap in /sitemap-index.xml holds a lastmod before
// 1970, in the future or not a date at all. Run by the push check (scripts/checks/mobile-audit-prepush.mjs) against the
// local build, or by hand: node scripts/checks/sitemap-dates-check.mjs --base http://localhost:3000
const i = process.argv.indexOf('--base');
const base = i > 0 ? process.argv[i + 1] : 'http://localhost:3000';
// Every sitemap the index lists (ENTRY 531 item 2: one sitemap per page type), each read from the build being checked:
// the index names the live addresses, so their origin is swapped for the base.
const idx = await fetch(`${base}/sitemap-index.xml`);
if (!idx.ok) { console.error(`sitemap dates: ${base}/sitemap-index.xml returned HTTP ${idx.status}`); process.exit(1); }
const files = [...(await idx.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => base + new URL(m[1]).pathname);
if (!files.length) { console.error('sitemap dates: the index lists no sitemaps'); process.exit(1); }
let xml = '';
for (const f of files) {
  const res = await fetch(f);
  if (!res.ok) { console.error(`sitemap dates: ${f} returned HTTP ${res.status}`); process.exit(1); }
  xml += await res.text();
}
const earliest = Date.parse('1970-01-01T00:00:00Z');
const now = Date.now() + 60 * 60 * 1000; // an hour's grace for clock differences
const bad = [];
let count = 0;
for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const lastmod = m[1].match(/<lastmod>([^<]*)<\/lastmod>/)?.[1];
  if (lastmod == null) continue;
  count++;
  const t = Date.parse(lastmod);
  if (!Number.isFinite(t) || t < earliest || t > now) bad.push(`${m[1].match(/<loc>([^<]*)<\/loc>/)?.[1]} ${lastmod}`);
}
if (!count) { console.error('sitemap dates: no lastmod found, the sitemap looks broken'); process.exit(1); }
if (bad.length) {
  console.error(`sitemap dates: ${bad.length} lastmod values before 1970, in the future or not dates, for example:`);
  for (const b of bad.slice(0, 10)) console.error(`  ${b}`);
  process.exit(1);
}
console.log(`sitemap dates: ${count} lastmod values in ${files.length} sitemaps, all from 1970 to now`);
