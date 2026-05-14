const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function run() {
  const { data: ministers, error } = await s.from('dept_ministers').select('id, photo_url');
  if (error) { console.log('Fetch error:', error.message); return; }
  console.log('Total ministers:', ministers.length);
  let updated = 0;
  for (const m of ministers) {
    const url = m.photo_url || '';
    if (!url || url.includes('supabase')) continue;
    const newUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co/storage/v1/object/public/photos/ministers/' + m.id + '.jpg';
    const { error: updateError } = await s.from('dept_ministers').update({ photo_url: newUrl }).eq('id', m.id);
    if (updateError) console.log('Error:', updateError.message);
    else updated++;
  }
  console.log('Updated:', updated);
}
run();
