// Search titles and descriptions check (owner's approval, 24 Oct 2026). Read only: fetches pages from a running
// production build and prints each page's full <title> and meta description with their character counts, flagging
// titles over 60 characters, descriptions over 160, duplicate titles and empty values. Writes nothing.
//
// Usage: npm run build && npx next start -p 3001, then
//   npx tsx scripts/checks/seo-titles-check.ts [base URL, default http://127.0.0.1:3001]

const BASE = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/$/, '');
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

const PAGES = [
  '/editorials/ten-worst-performing-councils-england',
  '/editorials/hx7n4qw2mk',
  '/editorials/q7m3k9xw2r',
  '/mps/5449',
  '/mps/473',
  '/mps/5105',
  '/mps/4514',
  '/people/tara-smith',
  '/people/conrad-smewing',
  '/secretariats/christopher-grozdoski',
  '/transparency/special-advisers',
  '/debates/1532738B-A3C2-4ACB-AE5B-0D7B8FAC2600',
  '/',
];

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

async function main() {
  const rows: { path: string; status: number; title: string; description: string; flags: string[] }[] = [];
  for (const path of PAGES) {
    const res = await fetch(BASE + path);
    const html = await res.text();
    const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim());
    const description = decode((/<meta name="description" content="([^"]*)"/i.exec(html)?.[1] ?? '').trim());
    const flags: string[] = [];
    if (res.status !== 200) flags.push(`HTTP ${res.status}`);
    if (!title) flags.push('EMPTY TITLE');
    if (!description) flags.push('EMPTY DESCRIPTION');
    if (title.length > TITLE_MAX) flags.push(`TITLE OVER ${TITLE_MAX}`);
    if (description.length > DESCRIPTION_MAX) flags.push(`DESCRIPTION OVER ${DESCRIPTION_MAX}`);
    rows.push({ path, status: res.status, title, description, flags });
  }
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.title, (counts.get(r.title) ?? 0) + 1);
  for (const r of rows) if (r.title && (counts.get(r.title) ?? 0) > 1) r.flags.push('DUPLICATE TITLE');

  for (const r of rows) {
    console.log(r.path);
    console.log(`  title (${r.title.length}): ${r.title}`);
    console.log(`  description (${r.description.length}): ${r.description}`);
    console.log(`  ${r.flags.length ? `FLAGS: ${r.flags.join(', ')}` : 'ok'}`);
  }
  const flagged = rows.filter((r) => r.flags.length);
  console.log(`\n${rows.length} pages checked against ${BASE}; ${flagged.length} flagged${flagged.length ? `: ${flagged.map((r) => r.path).join(', ')}` : ''}`);
}

main().catch((e) => {
  console.error('seo-titles-check failed:', e);
  process.exit(1);
});
