require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  // First confirm the column name (member_id vs mp_id vs something else)
  const probe = await supabase.from('mp_registered_interests').select('*').limit(1);
  console.log('Sample row columns:', probe.data?.[0] ? Object.keys(probe.data[0]) : '(empty table?)');
  if (probe.error) { console.error(probe.error); process.exit(1); }

  // Now query for Shabana (member_id 3914)
  const { data: interests, count, error } = await supabase
    .from('mp_registered_interests')
    .select('*', { count: 'exact' })
    .eq('member_id', 3914)
    .order('category_sort_order', { ascending: true });

  console.log(`\nShabana (3914) interests count: ${count}`);
  console.log(`Returned: ${interests?.length}`);
  if (error) console.error('Query error:', error);
  if (interests && interests.length > 0) {
    console.log('\nFirst 3 interests:');
    for (const i of interests.slice(0, 3)) {
      console.log(`  [${i.category_name}] ${(i.description || '').slice(0, 80)}...`);
    }
  }

  // Also probe how many MPs have any interests at all
  const allMps = await supabase
    .from('mp_registered_interests')
    .select('member_id', { count: 'exact', head: true });
  console.log(`\nTotal interest rows in table: ${allMps.count}`);
})();
