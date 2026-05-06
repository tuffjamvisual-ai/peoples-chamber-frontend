const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

const PROGRESS_FILE = '/tmp/mp-interests-progress.json';
const DELAY_MS = 300;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function kebab(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|sir|dame|rt hon|hon|lord|lady|the)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { processedMemberIds: [] };
  }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function fetchAllMps() {
  const all = [];
  const take = 20;
  let skip = 0;
  while (true) {
    const url = `https://members-api.parliament.uk/api/Members/Search?House=Commons&IsCurrentMember=true&take=${take}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Members API ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    for (const it of items) {
      if (it.value?.id) {
        all.push({
          id: it.value.id,
          name: it.value.nameDisplayAs || it.value.nameListAs || '',
        });
      }
    }
    const total = data.totalResults ?? 0;
    skip += items.length;
    if (items.length === 0 || skip >= total) break;
    await sleep(DELAY_MS);
  }
  return all;
}

async function fetchMinisterSlugs() {
  const { data, error } = await supabase
    .from('dept_ministers')
    .select('name, slug');
  if (error) throw error;
  const map = new Map();
  for (const m of data || []) {
    if (m.slug && m.name) map.set(kebab(m.name), m.slug);
  }
  return map;
}

async function fetchInterests(memberId) {
  const all = [];
  let skip = 0;
  const take = 100;
  while (true) {
    const url = `https://interests-api.parliament.uk/api/v1/Interests?MemberId=${memberId}&ExpandChildInterests=True&Take=${take}&Skip=${skip}&SortOrder=PublishingDateDescending`;
    const res = await fetch(url);
    if (!res.ok) return all;
    const data = await res.json();
    const items = data.items || [];
    all.push(...items);
    if (items.length < take) break;
    skip += take;
    await sleep(DELAY_MS);
  }
  return all;
}

function buildDetail(item) {
  const parts = [];
  for (const f of item.fields || []) {
    if (f.value == null || f.value === '' || f.value === false) continue;
    const label = f.description || f.name;
    let v = f.value;
    if (typeof v === 'object') v = JSON.stringify(v);
    parts.push(`${label}: ${v}`);
  }
  return parts.join('\n');
}

async function main() {
  console.log('Loading ministers map...');
  const ministerSlugs = await fetchMinisterSlugs();
  console.log(`  ${ministerSlugs.size} minister slugs available`);

  console.log('Fetching MPs...');
  const mps = await fetchAllMps();
  console.log(`  ${mps.length} MPs`);

  const progress = loadProgress();
  const done = new Set(progress.processedMemberIds);

  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    if (done.has(mp.id)) continue;

    const slug = ministerSlugs.get(kebab(mp.name)) || kebab(mp.name);
    console.log(`[${i + 1}/${mps.length}] ${mp.name} (${mp.id}) → ${slug}`);

    try {
      const items = await fetchInterests(mp.id);
      if (items.length > 0) {
        const rows = items.map(it => ({
          member_slug: slug,
          member_id: mp.id,
          category: it.category?.name || '',
          summary: it.summary || '',
          detail: buildDetail(it),
          registered_date: it.registrationDate || it.publishedDate || null,
        }));

        await supabase.from('mp_interests')
          .delete()
          .eq('member_id', mp.id);

        for (let j = 0; j < rows.length; j += 500) {
          const chunk = rows.slice(j, j + 500);
          const { error } = await supabase.from('mp_interests').insert(chunk);
          if (error) console.log(`  ! insert error: ${error.message}`);
        }
        console.log(`  ✓ ${rows.length} interests`);
      } else {
        console.log('  — no interests');
      }
    } catch (e) {
      console.log(`  ! ${e.message}`);
    }

    done.add(mp.id);
    progress.processedMemberIds = [...done];
    saveProgress(progress);
    await sleep(DELAY_MS);
  }

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
