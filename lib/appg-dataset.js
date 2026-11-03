// APPG sync from mySociety's published dataset (owner's brief, 3 Nov 2026), shared by the weekly route
// (app/api/sync-appgs/route.ts) and the CLI (scripts/sync-appgs.js) so the two can never drift apart.
//
// Source: "APPG Groups and Memberships", https://pages.mysociety.org/appg-membership/datasets/appg_groups_and_memberships/latest
// (mySociety, CC BY 4.0; pages showing this data carry "Source: mySociety APPG dataset (CC BY 4.0)").
//   1. datapackage.json gives the dataset version; a version already synced (sync_cursor 'sync-appgs:dataset') stops the run.
//   2. Otherwise register.csv and members.csv are downloaded (two requests) and filtered to parliament = 'uk'.
//   3. Officers: is_officer = true AND source = 'parliament' only (the Register itself; mySociety warns its 'ai_search'
//      rows are not yet validated). member_id is the dataset's mnis_id; nobody is matched by name. The dataset has no
//      party column, so an officer keeps the party stored for the same row, else the one stored for that member in
//      another group (when there is only one), else the party in our mps table, else none.
//   4. Funders (detailed_benefits): value_exact for a Financial Benefit ("Value £s"), value_band for a Benefit In Kind;
//      period_from/to from "From: dd/mm/yyyy To: dd/mm/yyyy" when both dates parse, else null; paid_via_secretariat when
//      the description says "paid by the following", with payer_list the list after the colon, as written and unsplit.
//   5. Only changes are written: a changed group is upserted; a group whose officers or funders changed has just its
//      own officers or funders replaced; groups gone from the dataset lose their officers and funders (the group row
//      stays). dataset_version is then set on every Westminster group, and the version is saved. Dry runs write nothing.
// The literal "None" the dataset uses for a missing contact or website is stored as null.
// CommonJS so the CLI (scripts/sync-appgs.js) can require it as well as the route importing it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('csv-parse/sync');

const BASE = 'https://pages.mysociety.org/appg-membership/data/appg_groups_and_memberships/latest';
const DATAPACKAGE_URL = `${BASE}/datapackage.json`;
const REGISTER_URL = `${BASE}/register.csv`;
const MEMBERS_URL = `${BASE}/members.csv`;
const CURSOR_ROUTE = 'sync-appgs:dataset';

// Sanity floor: a download this small is a broken file, not the Register (648 groups, 2,520 officers on 3 Nov 2026).
const MIN_GROUPS = 400;
const MIN_OFFICERS = 1000;

const APPG_COLS = ['title', 'purpose', 'category', 'parliament', 'secretariat', 'secretariat_url', 'registered_contact',
  'registrable_benefits', 'agm_date', 'reporting_year', 'next_reporting_deadline', 'website_url', 'website_status',
  'categories', 'source_url', 'register_edition'];
const OFF_COLS = ['member_id', 'name_at_time', 'party', 'role', 'removed', 'source'];
const FUND_COLS = ['source', 'description', 'value_band', 'value_exact', 'received_date', 'registered_date', 'benefit_type',
  'period_from', 'period_to', 'paid_via_secretariat', 'payer_list'];

const blank = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' || s === 'None' || s === 'nan' ? null : s;
};

// dd/mm/yyyy or yyyy-mm-dd to yyyy-mm-dd, only when it is a real date.
function isoDate(v) {
  const s = blank(v);
  if (!s) return null;
  let y, m, d;
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [, y, m, d] = r;
  else if ((r = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [, d, m, y] = r;
  else return null;
  const t = new Date(Date.UTC(+y, +m - 1, +d));
  if (t.getUTCFullYear() !== +y || t.getUTCMonth() !== +m - 1 || t.getUTCDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function registerEdition(sourceUrl) {
  const m = (sourceUrl || '').match(/cmallparty\/(\d{2})(\d{2})(\d{2})\//);
  return m ? isoDate(`20${m[1]}-${m[2]}-${m[3]}`) : null;
}

// "X acts as the group's secretariat.https://x.org/" -> { secretariat: 'X', secretariat_url: 'https://x.org/' }
function splitSecretariat(v) {
  const s = blank(v);
  if (!s) return { secretariat: null, secretariat_url: null };
  const urlM = s.match(/(https?:\/\/[^\s]+)/);
  const before = urlM ? s.slice(0, urlM.index).trim() : s;
  const name = before.replace(/\s*acts\s+as\s+the\s+group['’]?s\s+secretariat\.?\s*$/i, '').trim();
  return { secretariat: name || null, secretariat_url: urlM ? urlM[1] : null };
}

function money(v) {
  const s = blank(v);
  if (!s) return null;
  const t = s.replace(/[£,\s]/g, '');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

function funderFields(b) {
  const desc = blank(b.Description);
  const pm = desc && desc.match(/From:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*To:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  let from = pm ? isoDate(pm[1]) : null;
  let to = pm ? isoDate(pm[2]) : null;
  if (!from || !to) from = to = null;
  const paid = !!desc && /paid by the following/i.test(desc);
  let payers = null;
  if (paid) {
    const after = desc.split(/paid by the following/i)[1];
    const colon = after.indexOf(':');
    if (colon >= 0) payers = after.slice(colon + 1).split(/\s*From:\s*\d/i)[0].trim() || null;
  }
  return {
    source: blank(b.Source) || '(unspecified)',
    description: desc,
    value_band: blank(b['Value £s In bands of £1,500']),
    value_exact: money(b['Value £s']),
    received_date: isoDate(b.Received),
    registered_date: isoDate(b.Registered),
    benefit_type: blank(b.benefit_type),
    period_from: from,
    period_to: to,
    paid_via_secretariat: paid,
    payer_list: payers,
  };
}

// The dataset as rows for our three tables. Officers come back without a party (see assignParty).
function buildRows(registerCsv, membersCsv) {
  const reg = parse(registerCsv, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  const mem = parse(membersCsv, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  const appgs = [];
  const funders = [];
  const unreadableFunders = [];
  for (const r of reg) {
    if (r.parliament !== 'uk' || !blank(r.slug)) continue;
    const slug = r.slug.trim();
    const sec = splitSecretariat(r.secretariat);
    appgs.push({
      slug,
      title: blank(r.title) || slug,
      purpose: blank(r.purpose),
      category: blank(r.category),
      parliament: 'uk',
      secretariat: sec.secretariat,
      secretariat_url: sec.secretariat_url,
      registered_contact: blank(r.registered_contact_name),
      registrable_benefits: blank(r.registrable_benefits),
      agm_date: isoDate(r.date_of_most_recent_agm),
      reporting_year: blank(r.reporting_year),
      next_reporting_deadline: isoDate(r.next_reporting_deadline),
      website_url: blank(r.website),
      website_status: blank(r.website_status),
      categories: (r.categories || '').split('|').map((c) => c.trim()).filter(Boolean),
      source_url: blank(r.source_url),
      register_edition: registerEdition(r.source_url),
    });
    const raw = blank(r.detailed_benefits);
    if (!raw) continue;
    let items;
    try { items = JSON.parse(raw); } catch { unreadableFunders.push(slug); continue; }
    if (!Array.isArray(items)) { unreadableFunders.push(slug); continue; }
    for (const b of items) {
      const f = funderFields(b || {});
      if (!f.benefit_type) f.benefit_type = blank(r.registrable_benefits);
      funders.push({ appg_slug: slug, ...f });
    }
  }
  const slugs = new Set(appgs.map((a) => a.slug));
  const officers = [];
  let officersSkipped = 0;
  for (const m of mem) {
    if (m.parliament !== 'uk' || String(m.is_officer).toLowerCase() !== 'true' || m.source !== 'parliament') continue;
    const slug = (m.appg || '').trim();
    if (!slugs.has(slug)) { officersSkipped++; continue; } // a group not in the register: no row to hang it on
    const id = blank(m.mnis_id) ? Math.trunc(Number(m.mnis_id)) : null;
    officers.push({
      appg_slug: slug,
      member_id: Number.isInteger(id) && id > 0 ? id : null,
      name_at_time: blank(m.name) || '(unknown)',
      party: null,
      role: blank(m.officer_role) || 'Officer',
      removed: String(m.removed).toLowerCase() === 'true',
      source: 'parliament',
    });
  }
  return { appgs, officers, funders, unreadableFunders, officersSkipped };
}

// Party for each officer (the dataset has none): the stored row's, else the member's only stored party, else ours.
function assignParty(officers, storedOfficers, mpParty) {
  const rowKey = (o) => `${o.appg_slug}|${o.member_id ?? ''}|${o.name_at_time}|${o.role}`;
  const byRow = new Map();
  const byMember = new Map();
  for (const o of storedOfficers) {
    if (!byRow.has(rowKey(o))) byRow.set(rowKey(o), o.party ?? null);
    if (o.member_id != null && o.party) {
      if (!byMember.has(o.member_id)) byMember.set(o.member_id, new Set());
      byMember.get(o.member_id).add(o.party);
    }
  }
  for (const o of officers) {
    if (byRow.has(rowKey(o))) { o.party = byRow.get(rowKey(o)); continue; }
    const seen = o.member_id != null ? byMember.get(o.member_id) : null;
    o.party = seen && seen.size === 1 ? [...seen][0] : (o.member_id != null ? mpParty.get(o.member_id) ?? null : null);
  }
}

// One comparable value per column: blank as null, numbers as numbers, dates as yyyy-mm-dd.
const NUMERIC = new Set(['member_id', 'value_exact']);
function canonRow(r, cols) {
  return JSON.stringify(cols.map((c) => {
    const v = r[c];
    if (v == null || v === '') return c === 'categories' ? [] : null;
    if (NUMERIC.has(c)) return Number(v);
    if (Array.isArray(v)) return v;
    return v;
  }));
}

// mpIds: when given, only these member ids count as MP pages to refresh (officers who are peers have none).
function diffRows(fresh, stored, mpIds = null) {
  if (fresh.appgs.length < MIN_GROUPS || fresh.officers.length < MIN_OFFICERS) {
    throw Object.assign(new Error(`dataset looks incomplete: ${fresh.appgs.length} groups, ${fresh.officers.length} officers`), { stage: 'sanity' });
  }
  const group = (rows, cols) => {
    const m = new Map();
    for (const r of rows) { if (!m.has(r.appg_slug)) m.set(r.appg_slug, []); m.get(r.appg_slug).push(canonRow(r, cols)); }
    for (const v of m.values()) v.sort();
    return m;
  };
  const same = (a = [], b = []) => a.length === b.length && a.every((x, i) => x === b[i]);
  const appgBy = new Map(stored.appgs.map((r) => [r.slug, r]));
  const changedAppgs = fresh.appgs.filter((a) => { const o = appgBy.get(a.slug); return !o || canonRow(o, APPG_COLS) !== canonRow(a, APPG_COLS); });
  const offOld = group(stored.officers, OFF_COLS), offNew = group(fresh.officers, OFF_COLS);
  const fundOld = group(stored.funders, FUND_COLS), fundNew = group(fresh.funders, FUND_COLS);
  const fetched = new Set(fresh.appgs.map((a) => a.slug));
  const unreadable = new Set(fresh.unreadableFunders);
  const offChanged = [...fetched].filter((s) => !same(offOld.get(s), offNew.get(s)));
  const fundChanged = [...fetched].filter((s) => !unreadable.has(s) && !same(fundOld.get(s), fundNew.get(s)));
  const goneSlugs = [...new Set([...offOld.keys(), ...fundOld.keys()])].filter((s) => !fetched.has(s));
  const touched = new Set([...changedAppgs.map((a) => a.slug), ...offChanged, ...fundChanged, ...goneSlugs]);
  const changedMps = new Set();
  for (const r of [...stored.officers, ...fresh.officers]) {
    if (touched.has(r.appg_slug) && r.member_id != null && (!mpIds || mpIds.has(Number(r.member_id)))) changedMps.add(Number(r.member_id));
  }
  const countRows = (slugs, rows) => { const s = new Set(slugs); return rows.filter((r) => s.has(r.appg_slug)).length; };
  return {
    changedAppgs, offChanged, fundChanged, goneSlugs, touched, changedMps,
    counts: {
      appgs_upserted: changedAppgs.length,
      appgs_new: changedAppgs.filter((a) => !appgBy.has(a.slug)).length,
      officer_groups_changed: offChanged.length + goneSlugs.length,
      officer_rows_deleted: countRows([...offChanged, ...goneSlugs], stored.officers),
      officer_rows_inserted: countRows(offChanged, fresh.officers),
      funder_groups_changed: fundChanged.length + goneSlugs.length,
      funder_rows_deleted: countRows([...fundChanged, ...goneSlugs], stored.funders),
      funder_rows_inserted: countRows(fundChanged, fresh.funders),
      groups_gone: goneSlugs.length,
      mps_changed: changedMps.size,
    },
  };
}

async function readAll(supabase, table, cols, orderBy) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).order(orderBy).range(from, from + 999);
    if (error) throw Object.assign(new Error(`${table}: ${error.message}`), { stage: 'read stored' });
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

// The whole run. fetchText(url) returns the body or throws; dry writes nothing (not even the version).
/**
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, fetchText: (url: string) => Promise<string>,
 *           dry: boolean, force?: boolean, log?: (msg: string) => void }} opts
 */
async function runAppgSync({ supabase, fetchText, dry, force = false, log = () => {} }) {
  const pkg = JSON.parse(await fetchText(DATAPACKAGE_URL));
  const version = pkg && typeof pkg.version === 'string' ? pkg.version : null;
  if (!version) throw Object.assign(new Error('datapackage.json has no version'), { stage: 'version' });
  const { data: cur, error: curErr } = await supabase.from('sync_cursor').select('cursor').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) throw Object.assign(new Error(`sync_cursor read: ${curErr.message}`), { stage: 'version' });
  const lastVersion = cur && cur.cursor ? cur.cursor.version ?? null : null;
  if (lastVersion === version && !force) {
    return { result: { unchanged: true, version }, changedMps: new Set() };
  }

  const registerCsv = await fetchText(REGISTER_URL);
  const membersCsv = await fetchText(MEMBERS_URL);
  const fresh = buildRows(registerCsv, membersCsv);
  log(`dataset ${version}: ${fresh.appgs.length} groups, ${fresh.officers.length} officers, ${fresh.funders.length} funder lines`);

  const [appgs, officers, funders, mps] = await Promise.all([
    readAll(supabase, 'appgs', ['slug', ...APPG_COLS].join(', '), 'slug'),
    readAll(supabase, 'appg_officers', ['id', 'appg_slug', ...OFF_COLS].join(', '), 'id'),
    readAll(supabase, 'appg_funders', ['id', 'appg_slug', ...FUND_COLS].join(', '), 'id'),
    readAll(supabase, 'mps', 'id, member_id, party', 'id'),
  ]);
  const stored = { appgs, officers, funders };
  assignParty(fresh.officers, officers, new Map(mps.filter((m) => m.member_id != null && m.party).map((m) => [m.member_id, m.party])));
  const d = diffRows(fresh, stored, new Set(mps.map((m) => Number(m.member_id))));

  const written = { appgs: 0, officers: 0, funders: 0, versions_set: 0 };
  if (!dry) {
    const now = new Date().toISOString();
    for (let i = 0; i < d.changedAppgs.length; i += 200) {
      const slice = d.changedAppgs.slice(i, i + 200).map((a) => ({ ...a, dataset_version: version, scraped_at: now }));
      const { error } = await supabase.from('appgs').upsert(slice, { onConflict: 'slug' });
      if (error) throw Object.assign(new Error(error.message), { stage: 'appgs', written });
      written.appgs += slice.length;
    }
    const replace = async (table, slugs, rows) => {
      let n = 0;
      for (let i = 0; i < slugs.length; i += 100) {
        const part = slugs.slice(i, i + 100);
        const { error: dErr } = await supabase.from(table).delete().in('appg_slug', part);
        if (dErr) throw Object.assign(new Error(`${table} delete: ${dErr.message}`), { stage: table, written });
        const set = new Set(part);
        const add = rows.filter((r) => set.has(r.appg_slug));
        for (let j = 0; j < add.length; j += 500) {
          const { error } = await supabase.from(table).insert(add.slice(j, j + 500));
          if (error) throw Object.assign(new Error(`${table} insert: ${error.message}`), { stage: table, written });
          n += add.slice(j, j + 500).length;
        }
      }
      return n;
    };
    written.officers = await replace('appg_officers', [...d.offChanged, ...d.goneSlugs], fresh.officers);
    written.funders = await replace('appg_funders', [...d.fundChanged, ...d.goneSlugs], fresh.funders);
    const { data: vs, error: vErr } = await supabase.from('appgs').update({ dataset_version: version })
      .eq('parliament', 'uk').or(`dataset_version.is.null,dataset_version.neq."${version}"`).select('slug');
    if (vErr) throw Object.assign(new Error(`appgs dataset_version: ${vErr.message}`), { stage: 'version', written });
    written.versions_set = (vs || []).length;
    const { error: cErr } = await supabase.from('sync_cursor').upsert(
      { route: CURSOR_ROUTE, cursor: { version, synced_at: now }, updated_at: now }, { onConflict: 'route' });
    if (cErr) throw Object.assign(new Error(`sync_cursor write: ${cErr.message}`), { stage: 'version', written });
  }

  return {
    result: {
      version,
      last_version: lastVersion,
      groups: fresh.appgs.length,
      officers: fresh.officers.length,
      funders: fresh.funders.length,
      officers_skipped_no_group: fresh.officersSkipped,
      funders_unreadable_groups: fresh.unreadableFunders,
      ...d.counts,
      written,
      ...(dry ? { dry_run: true } : {}),
    },
    changedMps: d.changedMps,
    fresh,
    diff: d,
  };
}

module.exports = {
  DATAPACKAGE_URL, REGISTER_URL, MEMBERS_URL, CURSOR_ROUTE, APPG_COLS, OFF_COLS, FUND_COLS,
  buildRows, assignParty, diffRows, runAppgSync, isoDate, funderFields,
};
