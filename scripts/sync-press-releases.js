const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
, { realtime: { transport: ws } });

async function syncPressReleases() {
  try {
    console.log('Fetching press releases from GOV.UK...');
    
    const res = await fetch(
      'https://www.gov.uk/api/search.json?count=20&order=-public_timestamp&filter_content_store_document_type=press_release',
      { headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } }
    );
    
    const data = await res.json();
    const results = data.results || [];
    
    console.log(`Found ${results.length} press releases`);
    
    for (const item of results) {
      const record = {
        title: item.title,
        description: item.description || null,
        organisation: item.organisations?.[0]?.title || 'GOV.UK',
        published_at: item.public_timestamp || null,
        gov_url: `https://www.gov.uk${item.link}`,
        fetched_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('press_releases')
        .upsert(record, { onConflict: 'gov_url' });
      
      if (error) console.error('Error upserting:', error.message);
    }
    
    // Keep only last 100 records
    const { data: old } = await supabase
      .from('press_releases')
      .select('id')
      .order('published_at', { ascending: true });
    
    if (old && old.length > 100) {
      const toDelete = old.slice(0, old.length - 100).map(r => r.id);
      await supabase.from('press_releases').delete().in('id', toDelete);
    }
    
    console.log('Done');
  } catch (e) {
    console.error('Sync error:', e);
  }
}

syncPressReleases();
