// Replace word-internal hyphens with spaces in EVERY mp_biography.political_bio.
// (working-class -> working class, post-war -> post war, etc.)
// User-authorised destructive change to all 71 non-null bios.
// Backs up each row to scripts/backups/ before writing.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN !== 'false';
if (!SUPABASE_URL || !ANON_KEY) { console.error('env missing'); process.exit(1); }
if (!DRY_RUN && !DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

(async () => {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
  const { data: bios, error } = await supabase
    .from('mp_biography')
    .select('member_id, political_bio')
    .not('political_bio', 'is', null);
  if (error) { console.error(error); process.exit(1); }

  const changes = [];
  for (const b of bios) {
    const before = b.political_bio;
    // Replace hyphen between two word chars with a space.
    const after = before.replace(/(\w)-(\w)/g, '$1 $2');
    if (after !== before) {
      const removed = (before.match(/-/g) || []).length - (after.match(/-/g) || []).length;
      changes.push({ member_id: b.member_id, before, after, removed });
    }
  }
  console.log(`Rows with hyphens: ${changes.length}/${bios.length}`);
  const total = changes.reduce((s, c) => s + c.removed, 0);
  console.log(`Total hyphens to replace: ${total}\n`);

  console.log('Sample diffs:');
  for (const c of changes.slice(0, 3)) {
    const i = c.before.indexOf('-');
    console.log(`  member_id ${c.member_id} (-${c.removed} hyphens)`);
    console.log(`    before: ${JSON.stringify(c.before.slice(Math.max(0, i - 30), i + 40))}`);
    console.log(`    after:  ${JSON.stringify(c.after.slice(Math.max(0, i - 30), i + 40))}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run only. Re-run with DRY_RUN=false to write.');
    return;
  }

  // Back up all affected rows
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `mp_biography_all_${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(changes.map(({ member_id, before }) => ({ member_id, political_bio: before })), null, 2));
  console.log(`\nBacked up ${changes.length} previous bios to ${backupFile}`);

  let ok = 0;
  for (const c of changes) {
    const sql = `UPDATE mp_biography SET political_bio = ${sqlEsc(c.after)} WHERE member_id = ${c.member_id};`;
    try {
      execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'pipe' });
      ok++;
    } catch (e) {
      console.error(`member_id ${c.member_id} failed:`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
  console.log(`Done. ${ok}/${changes.length} rows updated.`);
})();
