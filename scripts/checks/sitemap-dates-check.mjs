// Sitemap dates check (owner, 7 Nov 2026, Search Console "Invalid date"): fails if /sitemap.xml holds a lastmod before
// 1970, in the future or not a date at all. Run by the push check (scripts/checks/mobile-audit-prepush.mjs) against the
// local build, or by hand: node scripts/checks/sitemap-dates-check.mjs --base http://localhost:3000
const i = process.argv.indexOf('--base');
const base = i > 0 ? process.argv[i + 1] : 'http://localhost:3000';
const res = await fetch(`${base}/sitemap.xml`);
if (!res.ok) { console.error(`sitemap dates: ${base}/sitemap.xml returned HTTP ${res.status}`); process.exit(1); }
const xml = await res.text();
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
console.log(`sitemap dates: ${count} lastmod values, all from 1970 to now`);
