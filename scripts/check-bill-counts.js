require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const [tot, acts, recent] = await Promise.all([
    supabase.from('bill').select('*', { count: 'exact', head: true }),
    supabase.from('bill').select('*', { count: 'exact', head: true }).eq('is_act', true),
    supabase.from('bill').select('*', { count: 'exact', head: true }).gte('last_update', '2023-01-01'),
  ]);
  console.log('Total bills:               ', tot.count);
  console.log('Acts (is_act=true):        ', acts.count);
  console.log('Updated since 2023-01-01:  ', recent.count);
})();
