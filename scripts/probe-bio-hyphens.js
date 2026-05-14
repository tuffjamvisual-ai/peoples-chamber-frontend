// Diagnostic: figure out what hyphen-line-break pattern actually exists in
// mp_biography.political_bio so we can write a correct fix.
//
// Reports counts for several candidate patterns and prints samples of each.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PATTERNS = [
  { name: 'hyphen + \\n (end of line)',           re: /-[ \t]*\n/g },
  { name: 'hyphen + \\r\\n (Windows EOL)',         re: /-[ \t]*\r\n/g },
  { name: 'hyphen + space + lowercase',             re: /[a-z]+-[ ]+[a-z]+/g },
  { name: 'hyphen + multiple spaces + lowercase',   re: /[a-z]+-[ ]{2,}[a-z]+/g },
  { name: 'hyphen + tab',                           re: /-\t/g },
  { name: 'standalone newlines',                    re: /\n/g },
  { name: 'lowercase + hyphen + lowercase (compound or break)', re: /[a-z]-[a-z]/g },
];

(async () => {
  const { data: bios, error } = await supabase
    .from('mp_biography')
    .select('member_id, political_bio')
    .not('political_bio', 'is', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`Scanning ${bios.length} bios.\n`);

  for (const p of PATTERNS) {
    let total = 0;
    let rows = 0;
    const samples = [];
    for (const b of bios) {
      const ms = b.political_bio.match(p.re);
      if (!ms) continue;
      rows++;
      total += ms.length;
      if (samples.length < 3) {
        const idx = b.political_bio.search(p.re);
        const start = Math.max(0, idx - 25);
        const end = Math.min(b.political_bio.length, idx + 35);
        samples.push({ member_id: b.member_id, snippet: JSON.stringify(b.political_bio.slice(start, end)) });
      }
    }
    console.log(`[${p.name}]  rows: ${rows}  total matches: ${total}`);
    for (const s of samples) console.log(`    member_id ${s.member_id}: ${s.snippet}`);
    console.log();
  }
})();
