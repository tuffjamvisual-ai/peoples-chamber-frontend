// Pre-warm Vercel's image optimiser cache for every current MP photo.
// After each deploy, run this once so the first real user never pays
// the cold-cache cost of /_next/image fetching from Supabase.
//
// Hits the production /_next/image endpoint at the widths actually used
// in the UI (84 for the listing thumbnail, 260 for the profile polaroid)
// plus their 2x variants for retina screens. Concurrency-limited.
//
// Override the site URL with SITE=https://staging.example.com if needed.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SITE = (process.env.SITE || 'https://www.thepeopleschamber.uk').replace(/\/$/, '');
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);

// Width × quality pairs to warm. Next.js validates BOTH against allow-lists:
//   * widths: imageSizes [16,32,48,64,96,128,256,384] + deviceSizes [640,...]
//   * qualities: defaults to just [75] (since Next 15) — any other q returns 400
// Stay on q=75 and pick widths that bracket the two display sizes used in
// the UI (84px listing thumbnail, 260px profile polaroid).
const VARIANTS = [
  { w: 64,  q: 75 },  // listing ~1x
  { w: 96,  q: 75 },  // listing ~1.5x
  { w: 128, q: 75 },  // listing 2x retina
  { w: 256, q: 75 },  // profile ~1x
  { w: 384, q: 75 },  // profile ~1.5x
  { w: 640, q: 75 },  // profile 2x+
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function fetchOne(photoUrl, w, q) {
  const url = `${SITE}/_next/image?url=${encodeURIComponent(photoUrl)}&w=${w}&q=${q}`;
  try {
    const t0 = Date.now();
    const res = await fetch(url, { method: 'GET' });
    const ms = Date.now() - t0;
    // Drain body so the connection can be reused / closed cleanly.
    await res.arrayBuffer();
    return {
      ok: res.ok,
      status: res.status,
      ms,
      // Vercel exposes its edge-cache state in these headers.
      cache: res.headers.get('x-vercel-cache') || res.headers.get('x-nextjs-cache') || '-',
      age: res.headers.get('age') || '-',
      bytes: res.headers.get('content-length') || '?',
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function runWithConcurrency(items, limit, fn) {
  let i = 0;
  const out = new Array(items.length);
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

(async () => {
  console.log(`Prewarming via ${SITE}/_next/image  (concurrency=${CONCURRENCY})`);

  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, name, display_name, photo_url')
    .eq('current_member', true)
    .not('photo_url', 'is', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`MPs with photos: ${mps.length}`);
  console.log(`Variants per MP: ${VARIANTS.length}  →  total requests: ${mps.length * VARIANTS.length}\n`);

  // Build the work list
  const jobs = [];
  for (const mp of mps) {
    for (const v of VARIANTS) {
      jobs.push({ mp, v });
    }
  }

  const t0 = Date.now();
  let hit = 0, miss = 0, stale = 0, other = 0, failed = 0;
  let bytesSeen = 0;
  let processed = 0;

  await runWithConcurrency(jobs, CONCURRENCY, async ({ mp, v }) => {
    const r = await fetchOne(mp.photo_url, v.w, v.q);
    processed++;
    if (!r.ok) {
      failed++;
      if (failed <= 5) console.log(`  ✗ ${mp.display_name || mp.name} w=${v.w}: ${r.error || `HTTP ${r.status}`}`);
      return;
    }
    bytesSeen += Number(r.bytes) || 0;
    const tag = (r.cache || '').toUpperCase();
    if (tag.includes('HIT')) hit++;
    else if (tag.includes('STALE')) stale++;
    else if (tag.includes('MISS')) miss++;
    else other++;
    if (processed % 100 === 0) {
      console.log(`  …${processed}/${jobs.length}  hit=${hit} miss=${miss} stale=${stale} other=${other} failed=${failed}`);
    }
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
  console.log(`  HIT    : ${hit}`);
  console.log(`  MISS   : ${miss}   (now warm at the edge)`);
  console.log(`  STALE  : ${stale}  (will revalidate in background)`);
  console.log(`  other  : ${other}`);
  console.log(`  failed : ${failed}`);
  console.log(`  total bytes served: ${(bytesSeen / 1024 / 1024).toFixed(1)} MB`);
})();
