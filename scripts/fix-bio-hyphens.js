// Strip all hyphens between word characters in mp_biography.political_bio
// (AI-overuse cleanup — user-authorised, accepting that legitimate compounds
// like "working-class" become "workingclass").
//
// Default DRY-RUN: writes nothing. To persist, re-run with DRY_RUN=false.

require('dotenv').config({ path: '.env.local' });
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN !== 'false';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in .env.local');
  process.exit(1);
}
if (!DRY_RUN && !DATABASE_URL) {
  console.error('Writes require DATABASE_URL (psql is used to bypass anon RLS).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

function clean(text) {
  return text
    .replace(/-[ \t]*\n[ \t]*/g, '')   // 1. hyphen + (optional ws) + newline -> join
    .replace(/-[ \t]+/g, ' ')           // 2. hyphen + whitespace -> space
    .replace(/(\w)-(\w)/g, '$1$2');     // 3. word-hyphen-word -> joined (mangles compounds)
}

(async () => {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE (will update database)'}`);

  const { data: bios, error } = await supabase
    .from('mp_biography')
    .select('member_id, political_bio')
    .not('political_bio', 'is', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`Fetched ${bios.length} bios.\n`);

  const changes = [];
  for (const b of bios) {
    const before = b.political_bio;
    const after = clean(before);
    if (after !== before) {
      // Count hyphens removed
      const hyphensRemoved = (before.match(/-/g) || []).length - (after.match(/-/g) || []).length;
      changes.push({ member_id: b.member_id, before, after, hyphensRemoved });
    }
  }

  console.log(`Rows that change: ${changes.length}`);
  console.log(`Total hyphens removed: ${changes.reduce((s, c) => s + c.hyphensRemoved, 0)}\n`);

  // Show 3 sample diffs (snippet around the first hyphen in each)
  console.log('Sample diffs (window around first hyphen in each bio):\n');
  for (const c of changes.slice(0, 3)) {
    const i = c.before.indexOf('-');
    const start = Math.max(0, i - 40);
    const beforeSnip = c.before.slice(start, i + 60);
    // For "after", the index of the first hyphen-equivalent is now joined; just slice same start
    const afterSnip = c.after.slice(start, i + 60);
    console.log(`  member_id ${c.member_id}  (-${c.hyphensRemoved} hyphens)`);
    console.log(`    before: ${JSON.stringify(beforeSnip)}`);
    console.log(`    after:  ${JSON.stringify(afterSnip)}`);
    console.log();
  }

  if (DRY_RUN) {
    console.log('Dry run complete. No writes performed.');
    console.log('To apply: DRY_RUN=false node scripts/fix-bio-hyphens.js');
    return;
  }

  console.log(`Applying ${changes.length} updates via psql...`);
  let ok = 0;
  for (const c of changes) {
    const sql = `UPDATE mp_biography SET political_bio = ${sqlEsc(c.after)} WHERE member_id = ${c.member_id};`;
    try {
      execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'pipe' });
      ok++;
    } catch (e) {
      console.error(`Failed member_id ${c.member_id}:`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
  console.log(`Done. ${ok}/${changes.length} rows updated.`);
})();
