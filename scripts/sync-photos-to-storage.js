const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function downloadAndStore(url, path) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const { data, error } = await s.storage.from('photos').upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) { console.log('Upload error:', error.message); return null; }
    const { data: { publicUrl } } = s.storage.from('photos').getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.log('Error:', e.message);
    return null;
  }
}

async function run() {
  // MPs
  console.log('Fetching MPs...');
  const { data: mps } = await s.from('mps').select('id, member_id, name, photo_url').not('photo_url', 'is', null).eq('current_member', true);
  console.log('MPs to process:', mps.length);
  
  for (const mp of mps) {
    if (mp.photo_url && mp.photo_url.includes('supabase')) continue;
    const path = `mps/${mp.member_id}.jpg`;
    const newUrl = await downloadAndStore(mp.photo_url, path);
    if (newUrl) {
      await s.from('mps').update({ photo_url: newUrl }).eq('id', mp.id);
      console.log('Stored MP:', mp.name);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Ministers
  console.log('Fetching ministers...');
  const { data: ministers } = await s.from('dept_ministers').select('id, name, photo_url').not('photo_url', 'is', null);
  console.log('Ministers to process:', ministers.length);

  for (const minister of ministers) {
    if (minister.photo_url && minister.photo_url.includes('supabase')) continue;
    const path = `ministers/${minister.id}.jpg`;
    const newUrl = await downloadAndStore(minister.photo_url, path);
    if (newUrl) {
      await s.from('dept_ministers').update({ photo_url: newUrl }).eq('id', minister.id);
      console.log('Stored minister:', minister.name);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('All done');
}

run();
