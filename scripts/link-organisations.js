// "Also see" links between name only ministers' meetings pages and company pages (owner, 4 Nov 2026). Nothing is merged,
// and a link is never made by name alone. A registry page (no Companies House number, at least one meeting) is linked to
// a company page only when all of these hold:
//   1. a reviewed spelling of the registry entry (lobby_org_aliases) equals, under the registry's own normalising, a
//      spelling on a record carrying the company's number; one company only, and no other registry page claims it;
//   2. at Companies House, that number's current or former name normalises to a reviewed spelling of the same entry;
//   3. the company is active there, and a Companies House search finds no other active company with that name.
//
//   node scripts/link-organisations.js --rehearse --out <file.csv>   reads only and writes the list
//   node scripts/link-organisations.js --apply --plan <file.json>    writes the rows of a rehearsed plan
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { normaliseName } = require('./lib/lobby-names');
const { makeClient, sleep } = require('./lib/companies-house');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function readAll(table, columns, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(columns)).order(columns.split(',')[0].trim()).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function rehearse(outFile) {
  const [index, orgs, aliases] = await Promise.all([
    readAll('organisation_index', 'slug, kind, name, company_number, name_variants, lobby_org_id, meetings'),
    readAll('lobby_orgs', 'id, reviewed'),
    readAll('lobby_org_aliases', 'alias_norm, org_id'),
  ]);
  const reviewed = new Set(orgs.filter((o) => o.reviewed).map((o) => o.id));
  const spellings = new Map();
  for (const a of aliases) if (reviewed.has(a.org_id)) spellings.set(a.org_id, [...(spellings.get(a.org_id) ?? []), a.alias_norm]);
  const registry = index.filter((r) => r.kind === 'registry' && !r.company_number && r.meetings > 0);
  const byNorm = new Map();
  for (const c of index.filter((r) => r.kind === 'company')) {
    for (const name of [c.name, ...(c.name_variants ?? [])]) {
      const k = normaliseName(name);
      if (!k) continue;
      if (!byNorm.has(k)) byNorm.set(k, new Map());
      if (!byNorm.get(k).has(c.company_number)) byNorm.get(k).set(c.company_number, { company: c, spelling: name });
    }
  }
  const rows = registry.map((r) => {
    const own = spellings.get(r.lobby_org_id) ?? [];
    const hits = new Map();
    for (const a of own) for (const [n, v] of byNorm.get(a) ?? []) hits.set(n, { ...v, alias: a });
    return { r, own, hits };
  });
  const claims = new Map();
  for (const x of rows) if (x.hits.size === 1) { const n = [...x.hits.keys()][0]; claims.set(n, (claims.get(n) ?? 0) + 1); }

  const ch = makeClient(process.env.COMPANIES_HOUSE_API_KEY);
  const plan = [];
  const counts = { registry_pages: registry.length, no_record_spelling: 0, several_companies: 0, company_claimed_twice: 0, not_found_at_ch: 0, name_differs_at_ch: 0, not_active: 0, another_active_company: 0, confirmed: 0 };
  for (const { r, own, hits } of rows) {
    if (hits.size === 0) { counts.no_record_spelling++; continue; }
    const base = { lobby_org_id: r.lobby_org_id, registry_slug: r.slug, registry_name: r.name, meetings: r.meetings };
    if (hits.size > 1) { counts.several_companies++; plan.push({ ...base, verdict: 'several_companies', company_number: [...hits.keys()].join(' ') }); continue; }
    const [number, hit] = [...hits][0];
    const row = { ...base, company_number: number, company_slug: hit.company.slug, company_name: hit.company.name, record_spelling: hit.spelling, matched_spelling: hit.alias };
    if (claims.get(number) > 1) { counts.company_claimed_twice++; plan.push({ ...row, verdict: 'company_claimed_twice' }); continue; }
    const profile = await ch(`/company/${encodeURIComponent(number)}`);
    await sleep(550);
    if (!profile) { counts.not_found_at_ch++; plan.push({ ...row, verdict: 'not_found_at_ch' }); continue; }
    const names = [profile.company_name, ...(profile.previous_company_names ?? []).map((p) => p.name)].filter(Boolean);
    const named = names.find((n) => own.includes(normaliseName(n)));
    const info = { ...row, ch_name_now: profile.company_name, ch_status: profile.company_status };
    if (!named) { counts.name_differs_at_ch++; plan.push({ ...info, verdict: 'name_differs_at_ch' }); continue; }
    if (profile.company_status !== 'active') { counts.not_active++; plan.push({ ...info, ch_name: named, verdict: 'not_active' }); continue; }
    const norm = normaliseName(named);
    const found = await ch(`/search/companies?q=${encodeURIComponent(norm)}&items_per_page=100`);
    await sleep(550);
    const rivals = (found?.items ?? []).filter((i) => i.company_number !== number && i.company_status === 'active' && normaliseName(i.title) === norm);
    if (rivals.length) { counts.another_active_company++; plan.push({ ...info, ch_name: named, rivals: rivals.map((i) => `${i.title} ${i.company_number}`).join('; '), verdict: 'another_active_company' }); continue; }
    counts.confirmed++;
    plan.push({ ...info, ch_name: named, verdict: 'confirmed' });
  }
  fs.writeFileSync(outFile.replace(/\.csv$/, '') + '.json', JSON.stringify(plan, null, 1));
  const cols = ['verdict', 'registry_name', 'registry_slug', 'meetings', 'company_number', 'company_name', 'company_slug', 'record_spelling', 'matched_spelling', 'ch_name_now', 'ch_name', 'ch_status', 'rivals'];
  fs.writeFileSync(outFile, [cols.join(','), ...plan.sort((a, b) => a.verdict.localeCompare(b.verdict) || b.meetings - a.meetings).map((p) => cols.map((c) => csv(p[c])).join(','))].join('\n') + '\n');
  console.log(JSON.stringify(counts, null, 1));
}

async function apply(planFile) {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8')).filter((p) => p.verdict === 'confirmed');
  const { error } = await db.from('organisation_links').upsert(plan.map((p) => ({
    lobby_org_id: p.lobby_org_id, company_number: p.company_number, matched_spelling: p.matched_spelling, ch_name: p.ch_name, ch_status: p.ch_status, checked_at: new Date().toISOString(),
  })), { onConflict: 'lobby_org_id' });
  if (error) throw new Error(`organisation_links: ${error.message}`);
  const paths = plan.flatMap((p) => [`/organisations/${p.registry_slug}`, `/organisations/${p.company_slug}`]);
  fs.writeFileSync(planFile.replace(/\.json$/, '') + '-paths.txt', paths.join('\n') + '\n');
  console.log(`${plan.length} links written; refresh with: node scripts/revalidate.js --paths-file ${planFile.replace(/\.json$/, '')}-paths.txt`);
}

(args.includes('--apply') ? apply(opt('--plan')) : rehearse(opt('--out') ?? 'organisation-links.csv')).catch((e) => { console.error(e.message); process.exit(1); });
