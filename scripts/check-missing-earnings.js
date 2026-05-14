// Read-only audit. The MP profile shows the Earnings sidebar tab when:
//   earnings.ministerial > 0  OR  earnings.outside > 0
// where:
//   ministerial = MINISTERIAL_SUPPLEMENT[ highest dept_ministers.salary_band ]
//   outside     = mp_outside_earnings_summary.total_extracted
// This script reconciles the data and reports who should but doesn't yet
// see the Earnings tab.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

(async () => {
  // 1. Ministerial: dept_ministers rows with member_id AND salary_band populated.
  const { data: dm, error: dmErr } = await supabase
    .from('dept_ministers')
    .select('member_id, name, role, salary_band')
    .not('member_id', 'is', null)
    .not('salary_band', 'is', null);
  if (dmErr) { console.error(dmErr); process.exit(1); }

  // 2. Outside earnings: total_extracted > 0.
  const { data: oe, error: oeErr } = await supabase
    .from('mp_outside_earnings_summary')
    .select('member_id, total_extracted, claim_count, source_count')
    .gt('total_extracted', 0);
  if (oeErr) { console.error(oeErr); process.exit(1); }

  // 3. Counts.
  const ministerialMembers = new Set(dm.map((r) => r.member_id));
  const outsideMembers = new Set(oe.map((r) => r.member_id));
  const union = new Set([...ministerialMembers, ...outsideMembers]);
  console.log(`Ministers (member_id linked + has salary_band): ${ministerialMembers.size}`);
  console.log(`MPs with outside earnings > 0:                  ${outsideMembers.size}`);
  console.log(`Union (Earnings tab should appear):             ${union.size}`);
  console.log(`Overlap (both ministerial + outside):           ${
    [...ministerialMembers].filter((m) => outsideMembers.has(m)).length
  }`);

  // 4. Sanity: dept_ministers rows that have salary_band but NO member_id (gaps).
  const { count: unlinkedCount } = await supabase
    .from('dept_ministers')
    .select('*', { count: 'exact', head: true })
    .is('member_id', null)
    .not('salary_band', 'is', null);
  console.log(`\nUnlinked ministers (salary_band set, member_id NULL): ${unlinkedCount}`);
  console.log('  -> their MP profiles won\'t show ministerial earnings until member_id is filled.');
  if (unlinkedCount > 0) {
    const { data: unlinked } = await supabase
      .from('dept_ministers')
      .select('name, role, salary_band, dept_slug')
      .is('member_id', null)
      .not('salary_band', 'is', null)
      .limit(20);
    unlinked.forEach((r) =>
      console.log(`  [${r.dept_slug}] ${r.name} – ${r.role} (band: ${r.salary_band})`),
    );
    if (unlinkedCount > 20) console.log(`  ... and ${unlinkedCount - 20} more`);
  }

  // 5. Top earners (sanity).
  console.log(`\nTop 10 outside-earnings entries:`);
  const top = [...oe].sort((a, b) => Number(b.total_extracted) - Number(a.total_extracted)).slice(0, 10);
  for (const r of top) {
    const { data: mp } = await supabase
      .from('mps')
      .select('name, display_name, party')
      .eq('member_id', r.member_id)
      .single();
    const name = mp?.display_name || mp?.name || `(member_id ${r.member_id})`;
    console.log(`  £${Number(r.total_extracted).toLocaleString()}  ${name}  (${r.claim_count} claims / ${r.source_count} sources)`);
  }
})();
