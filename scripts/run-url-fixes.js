// run-url-fixes.js
// One-off script to fix URL construction bugs in Supabase.
// Triggered by .github/workflows/fix-url-construction-bugs.yml
// See also: scripts/db-fixes-url-construction-2026-06.sql

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('=== CHANGE 2: mp_contact.website protocol fix ===');

  // Step 1: report affected rows before fix
  const { data: before, error: e1 } = await supabase
    .from('mp_contact')
    .select('member_id, website')
    .not('website', 'is', null)
    .neq('website', '')
    .not('website', 'like', 'http://%')
    .not('website', 'like', 'https://%');

  if (e1) { console.error('SELECT before error:', e1.message); process.exit(1); }
  console.log('Rows affected before fix:', before.length);
  console.log('IDs:', JSON.stringify(before.map(r => ({ member_id: r.member_id, website: r.website }))));

  // Step 2: apply fix — prefix bare www. values with https://
  const wwwRows = (before || []).filter(r => r.website && r.website.startsWith('www.'));
  console.log('Rows matching www. pattern:', wwwRows.length);

  for (const row of wwwRows) {
    const { error: eu } = await supabase
      .from('mp_contact')
      .update({ website: 'https://' + row.website })
      .eq('member_id', row.member_id);
    if (eu) {
      console.error('Update error for member_id', row.member_id, eu.message);
    } else {
      console.log('Updated member_id', row.member_id, ':', row.website, '->', 'https://' + row.website);
    }
  }

  // Step 3: confirm zero rows remain
  const { data: after, error: e2 } = await supabase
    .from('mp_contact')
    .select('member_id, website')
    .not('website', 'is', null)
    .neq('website', '')
    .not('website', 'like', 'http://%')
    .not('website', 'like', 'https://%');

  if (e2) { console.error('SELECT after error:', e2.message); }
  console.log('Rows without protocol after fix (should be 0):', after?.length ?? 'error');
  if (after?.length > 0) {
    console.log('Remaining rows:', JSON.stringify(after));
  }

  console.log('\n=== CHANGE 3: government_posts.additional_info_link leading-slash fix ===');

  // Step 1: report affected rows before fix
  const { data: gpBefore, error: e3 } = await supabase
    .from('government_posts')
    .select('id, additional_info_link')
    .or('additional_info_link.like./http://%,additional_info_link.like./https://%');

  if (e3) { console.error('government_posts SELECT error:', e3.message); process.exit(1); }
  console.log('government_posts rows with leading slash:', gpBefore.length);
  console.log('IDs:', JSON.stringify(gpBefore.map(r => ({ id: r.id, link: r.additional_info_link }))));

  // Step 2: strip leading slash
  for (const row of gpBefore || []) {
    const fixed = row.additional_info_link.substring(1);
    const { error: eu } = await supabase
      .from('government_posts')
      .update({ additional_info_link: fixed })
      .eq('id', row.id);
    if (eu) {
      console.error('Update error for id', row.id, eu.message);
    } else {
      console.log('Updated id', row.id, ':', row.additional_info_link, '->', fixed);
    }
  }

  // Step 3: confirm zero rows remain
  const { data: gpAfter, error: e4 } = await supabase
    .from('government_posts')
    .select('id, additional_info_link')
    .or('additional_info_link.like./http://%,additional_info_link.like./https://%');

  if (e4) { console.error('government_posts SELECT after error:', e4.message); }
  console.log('government_posts rows with leading slash after fix (should be 0):', gpAfter?.length ?? 'error');

  console.log('\n=== DONE ===');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
