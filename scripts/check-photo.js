require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const { data: mp, error } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', 3914)
    .single();
  if (error) { console.error(error); process.exit(1); }

  // Print every column whose value mentions http/photo/portrait/url
  const interesting = Object.entries(mp).filter(([k, v]) =>
    /photo|portrait|url|image|pic|thumb/i.test(k) ||
    (typeof v === 'string' && /^https?:\/\//.test(v))
  );
  console.log(`MP: ${mp.display_name || mp.name}  (member_id ${mp.member_id})`);
  console.log('Photo-ish columns:\n');
  for (const [k, v] of interesting) {
    console.log(`  ${k.padEnd(20)} = ${v}`);
  }

  // Verify the live URL responds 200
  if (mp.photo_url) {
    console.log(`\nProbing photo_url for live response...`);
    try {
      const r = await fetch(mp.photo_url, { method: 'HEAD' });
      console.log(`  HTTP ${r.status}  ${r.headers.get('content-type') || ''}  ${r.headers.get('content-length') || ''} bytes`);
    } catch (e) {
      console.log(`  fetch failed: ${e.message}`);
    }
  }
})();
