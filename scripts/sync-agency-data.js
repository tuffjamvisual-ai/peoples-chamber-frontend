const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
, { realtime: { transport: ws } });

async function syncAgency(slug) {
  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${slug}`);
    if (!res.ok) { console.log(`  ✗ ${slug} — API error ${res.status}`); return; }
    const data = await res.json();

    const name = data.title || '';
    const description = data.description || '';
    const body = data.details?.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    const acronym = data.details?.acronym || '';

    const ministers = (data.links?.ordered_ministers || []).map((m, i) => {
      const currentRole = m.links?.role_appointments?.find(r => r.details?.current);
      return {
        name: m.title,
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
      };
    }).filter(m => m.role);

    const boardMembers = (data.links?.ordered_board_members || []).map(m => {
      const currentRole = m.links?.role_appointments?.find(r => r.details?.current);
      return {
        name: m.title,
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
      };
    }).filter(m => m.role);

    const parentOrgs = (data.links?.ordered_parent_organisations || []).map(o => ({
      name: o.title,
      slug: o.base_path?.replace('/government/organisations/', '') || '',
    }));

    const { error } = await supabase.from('agency_cache').upsert({
      slug,
      name,
      description,
      body,
      acronym,
      ministers,
      board_members: boardMembers,
      parent_orgs: parentOrgs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' });

    if (error) { console.log(`  ✗ ${slug} — ${error.message}`); return; }
    console.log(`  ✓ ${slug} — ${name}`);
  } catch (e) {
    console.log(`  ✗ ${slug} — ${e.message}`);
  }
}

async function main() {
  console.log('Fetching all agency slugs from dept_agencies...');
  const { data: agencies, error } = await supabase.from('dept_agencies').select('url');
  if (error) { console.error(error.message); return; }

  const slugs = [...new Set(
    agencies
      .map(a => a.url.split('/government/organisations/')[1])
      .filter(Boolean)
  )];

  console.log(`Found ${slugs.length} agencies. Syncing...\n`);

  for (const slug of slugs) {
    await syncAgency(slug);
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\nDone.');
}

main();
