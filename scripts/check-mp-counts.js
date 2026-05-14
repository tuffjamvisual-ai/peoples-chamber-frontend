require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const { count: total } = await supabase
    .from('mps')
    .select('*', { count: 'exact', head: true });

  const { count: current } = await supabase
    .from('mps')
    .select('*', { count: 'exact', head: true })
    .eq('current_member', true);

  console.log('Total MPs in table:', total);
  console.log('Current members:  ', current);
  console.log('Historical (dropped from sitemap):', (total ?? 0) - (current ?? 0));
})();
