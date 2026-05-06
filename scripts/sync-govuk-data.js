const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  SUPABASE_KEY,
, { realtime: { transport: ws } });

const deptSlugs = {
  'treasury': 'hm-treasury',
  'home-office': 'home-office',
  'health': 'department-of-health-and-social-care',
  'energy': 'department-for-energy-security-and-net-zero',
  'education': 'department-for-education',
  'work-pensions': 'department-for-work-pensions',
  'transport': 'department-for-transport',
  'environment': 'department-for-environment-food-rural-affairs',
  'business-trade': 'department-for-business-and-trade',
  'science-tech': 'department-for-science-innovation-and-technology',
  'housing': 'ministry-of-housing-communities-local-government',
  'justice': 'ministry-of-justice',
  'defence': 'ministry-of-defence',
  'culture': 'department-for-culture-media-and-sport',
  'cabinet-office': 'cabinet-office',
  'foreign-office': 'foreign-commonwealth-development-office',
  'attorney-general': 'attorney-generals-office',
  'scotland-office': 'scotland-office',
  'wales-office': 'wales-office',
  'northern-ireland-office': 'northern-ireland-office',
  'commons-leader': 'privy-council-office',
  'lords-leader': 'office-of-the-leader-of-the-house-of-lords',
  'advocate-general': 'office-of-the-advocate-general-for-scotland',
  'ukef': 'uk-export-finance',
};

async function syncDepartment(deptSlug, govukSlug) {
  console.log(`Syncing ${deptSlug}...`);
  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${govukSlug}`);
    if (!res.ok) { console.log(`  ✗ API error ${res.status}`); return; }
    const data = await res.json();

    // Ministers
    const ministers = (data.links?.ordered_ministers || []).map((m, i) => {
      const currentRole = m.links?.role_appointments?.find(r => r.details?.current);
      return {
        dept_slug: deptSlug,
        name: m.title,
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
        is_secretary_of_state: i === 0,
        updated_at: new Date().toISOString(),
      };
    }).filter(m => m.role);

    // Delete old ministers for this dept and insert fresh
    await supabase.from('dept_ministers').delete().eq('dept_slug', deptSlug);
    if (ministers.length > 0) {
      await supabase.from('dept_ministers').insert(ministers);
    }

    // Officials
    const officials = (data.links?.ordered_board_members || []).map(m => {
      const currentRole = m.links?.role_appointments?.find(r => r.details?.current);
      const role = currentRole?.links?.role?.[0]?.title || '';
      const roleLower = role.toLowerCase();
      let category = 'other';
      if (roleLower.includes('permanent') || roleLower.includes('director general') || roleLower.includes('chief')) category = 'senior';
      if (roleLower.includes('non-executive') || roleLower.includes('board member')) category = 'board';
      return {
        dept_slug: deptSlug,
        name: m.title,
        role,
        slug: m.base_path?.replace('/government/people/', '') || '',
        category,
        updated_at: new Date().toISOString(),
      };
    }).filter(m => m.role);

    await supabase.from('dept_officials').delete().eq('dept_slug', deptSlug);
    if (officials.length > 0) {
      await supabase.from('dept_officials').insert(officials);
    }

    // Agencies
    const agencies = (data.links?.ordered_child_organisations || [])
      .filter(o => o.details?.organisation_govuk_status?.status === 'live')
      .map(o => ({
        dept_slug: deptSlug,
        name: o.title,
        url: o.web_url,
        acronym: o.details?.acronym || '',
        updated_at: new Date().toISOString(),
      }));

    await supabase.from('dept_agencies').delete().eq('dept_slug', deptSlug);
    if (agencies.length > 0) {
      await supabase.from('dept_agencies').insert(agencies);
    }

    console.log(`  ✓ ${ministers.length} ministers, ${officials.length} officials, ${agencies.length} agencies`);
    await new Promise(r => setTimeout(r, 500));

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
  }
}

async function main() {
  console.log('Syncing GOV.UK department data...');
  for (const [deptSlug, govukSlug] of Object.entries(deptSlugs)) {
    await syncDepartment(deptSlug, govukSlug);
  }
  console.log('Done!');
}

main();
