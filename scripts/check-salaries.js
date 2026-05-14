require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TEST_IDS = [3914, 4655, 4514]; // Shabana + two known ministers

(async () => {
  console.log('=== salary CONSTANTS shipped in lib/ministerial-salaries.ts ===');
  try {
    const lib = require('../lib/ministerial-salaries');
    console.log('MP_BASE_SALARY_2026  =', lib.MP_BASE_SALARY_2026);
    console.log('MINISTERIAL_SUPPLEMENT =', lib.MINISTERIAL_SUPPLEMENT);
    console.log('SALARY_BAND_LABEL =', lib.SALARY_BAND_LABEL);
  } catch (e) {
    console.log('(could not require lib/ministerial-salaries:', e.message, ')');
  }

  for (const memberId of TEST_IDS) {
    console.log(`\n=== member_id ${memberId} ===`);
    const { data: mp } = await supabase
      .from('mps')
      .select('member_id, name, display_name, party')
      .eq('member_id', memberId)
      .single();
    if (!mp) { console.log('  (not found)'); continue; }
    console.log(`  ${mp.display_name || mp.name} (${mp.party})`);

    // Where the salary band actually lives.
    const { data: dm } = await supabase
      .from('dept_ministers')
      .select('dept_slug, role, salary_band')
      .eq('member_id', memberId);
    console.log(`  dept_ministers rows: ${dm?.length ?? 0}`);
    (dm || []).forEach((r) => console.log(`    [${r.dept_slug}] ${r.role || '-'} band=${r.salary_band || 'null'}`));

    const { data: outside } = await supabase
      .from('mp_outside_earnings_summary')
      .select('total_extracted, claim_count, source_count')
      .eq('member_id', memberId)
      .maybeSingle();
    console.log(`  outside earnings: total_extracted=${outside?.total_extracted ?? 0} claims=${outside?.claim_count ?? 0}`);
  }

  // Column shape of dept_ministers (using any row, not filtered).
  const probe = await supabase.from('dept_ministers').select('*').limit(1);
  console.log('\n=== dept_ministers columns ===');
  console.log(probe.data?.[0] ? Object.keys(probe.data[0]).join(', ') : '(empty)');
})();
