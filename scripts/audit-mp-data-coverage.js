require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MEMBER_ID = 3914; // Shabana — high-data MP for thorough probe

// Tables consumed by the MP profile, with their FK column name.
const TABLES = [
  { table: 'mps',                            fk: 'member_id' },
  { table: 'mp_biography',                   fk: 'member_id' },
  { table: 'mp_contact',                     fk: 'member_id' },
  { table: 'mp_division_votes',              fk: 'member_id' },
  { table: 'bill',                           fk: 'sponsor_member_id', label: 'bill (as sponsor)' },
  { table: 'mp_registered_interests',        fk: 'member_id' },
  { table: 'mp_expenses_summary',            fk: 'member_id' },
  { table: 'mp_expenses_detail',             fk: 'member_id' },
  { table: 'dept_ministers',                 fk: 'member_id' },
  { table: 'mp_outside_earnings_summary',    fk: 'member_id' },
];

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

// Pull `something.field` accesses for a given identifier (e.g. `mp.party_colour`)
function fieldsAccessed(src, ident) {
  const re = new RegExp(`\\b${ident}\\??\\.(\\w+)`, 'g');
  const found = new Set();
  let m;
  while ((m = re.exec(src)) !== null) found.add(m[1]);
  return found;
}

(async () => {
  console.log('==== DATABASE: columns + sample for member_id', MEMBER_ID, '====\n');
  const dbSchema = {};
  for (const t of TABLES) {
    const sample = await supabase.from(t.table).select('*').eq(t.fk, MEMBER_ID).limit(1);
    const cols = sample.data?.[0] ? Object.keys(sample.data[0]) : null;
    const { count } = await supabase
      .from(t.table)
      .select('*', { count: 'exact', head: true })
      .eq(t.fk, MEMBER_ID);
    dbSchema[t.table] = cols || [];
    console.log(`[${t.label || t.table}]  ${count ?? 0} rows for this MP`);
    if (cols) console.log('  cols:', cols.join(', '));
    if (sample.error) console.log('  ERROR:', sample.error.message);
    console.log();
  }

  console.log('\n==== CODE: fields actually used in render ====\n');
  const page = readFile('app/mps/[id]/page.tsx');
  const sections = readFile('app/mps/[id]/MagazineProfileSections.tsx');
  const both = page + '\n' + sections;

  // Identifiers used in the code to refer to each row/object.
  const idents = {
    'mps':                         ['mp'],
    'mp_biography':                ['bio'],
    'mp_contact':                  ['contact'],
    'mp_division_votes':           ['v', 'vote'],
    'bill (as sponsor)':           ['b', 'bill'],
    'mp_registered_interests':     ['i', 'interest'],
    'mp_expenses_summary':         ['e', 'expense', 'latestExpense'],
    'mp_expenses_detail':          ['detail', 'claim'],
    'dept_ministers':              ['ministerialRows', 'r'],
    'mp_outside_earnings_summary': ['outsideRow'],
  };

  const usedByTable = {};
  for (const [table, identList] of Object.entries(idents)) {
    const fields = new Set();
    for (const id of identList) {
      for (const f of fieldsAccessed(both, id)) fields.add(f);
    }
    usedByTable[table] = fields;
  }

  console.log('\n==== COVERAGE REPORT ====\n');
  for (const t of TABLES) {
    const key = t.label || t.table;
    const dbFields = dbSchema[t.table] || [];
    const used = usedByTable[key] || new Set();
    const unused = dbFields.filter((f) => !used.has(f));
    const missing = [...used].filter((f) => !dbFields.includes(f) && !['data', 'error', 'count'].includes(f));
    console.log(`[${key}]`);
    console.log(`  DB columns:        ${dbFields.length} (${dbFields.join(', ') || '-'})`);
    console.log(`  Referenced fields: ${[...used].sort().join(', ') || '-'}`);
    console.log(`  ⚠ Unused in UI:    ${unused.join(', ') || '(none)'}`);
    if (missing.length) console.log(`  ❌ Referenced but not in DB: ${missing.join(', ')}`);
    console.log();
  }
})();
