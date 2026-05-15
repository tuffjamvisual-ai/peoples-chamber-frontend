require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tables = [
  'mps', 'mp_biography', 'mp_contact', 'mp_division_votes',
  'bills', 'bill',
  'mp_registered_interests', 'mp_expenses_summary',
  'mp_expenses_detail', 'mp_outside_earnings_summary', 'dept_ministers',
  'ministers_meetings', 'ministers_hospitality', 'revolving_door'
];

(async () => {
  console.log('=== TABLE ROW COUNTS ===\n');
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`${table.padEnd(35)} ERROR:`, JSON.stringify(error));
    } else {
      console.log(`${table.padEnd(35)} ${count?.toLocaleString() ?? 'null'}`);
    }
  }
})();
