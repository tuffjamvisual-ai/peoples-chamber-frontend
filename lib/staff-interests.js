// MPs' staff interests sync (owner's brief, 3 Nov 2026), shared by the weekly route (app/api/sync-staff-interests)
// and the CLI (scripts/sync-staff-interests.js) so the two can never drift apart.
//
// Source: the House of Commons register of interests of MPs' staff, from Parliament's interests API
// (https://interests-api.parliament.uk, Open Parliament Licence v3.0; the licence line is in every page's footer).
//   1. /api/v2/Registers lists the published registers; the newest of type CommonsStaff is the current one. A register
//      already synced (sync_cursor 'sync-staff-interests:register') stops the run there: one request on most weeks.
//   2. Otherwise /api/v2/Interests/csv?registerId=N is downloaded (a zip of three CSVs: 1 Occupation or employment,
//      2 Gifts and benefits, 3 Visits outside the UK), unzipped with fflate and parsed. A row whose cell count differs
//      from its header is malformed: skipped and counted. A row naming no MP is skipped and counted.
//   3. One row per entry and per MP named on it (an entry can name up to five MPs, each with the job title held for
//      that MP). Owner's decisions: no staff names (the register shows job titles only since January 2026, and the
//      sub item "Name" fields are never read); an elected council role is stored as "Councillor", with the council
//      (the payer) as the organisation, so the ward is never stored (isCouncillorRole). Summary, PayersBusiness and AdditionalInformation are
//      not stored.
//   4. The register is a full snapshot: entries are compared by (interest_id, member_id); new ones are inserted,
//      changed ones updated, and ones no longer in the register deleted. register_id and register_date are then set
//      on every row (not a change in what a page shows), and the register id is saved. The MPs whose rows were
//      inserted, updated or deleted have their pages refreshed. Dry runs write nothing.
const { parse } = require('csv-parse/sync'); // eslint-disable-line @typescript-eslint/no-require-imports
const { unzipSync, strFromU8 } = require('fflate'); // eslint-disable-line @typescript-eslint/no-require-imports

const API = 'https://interests-api.parliament.uk/api/v2';
const REGISTERS_URL = `${API}/Registers?Take=50`;
const csvUrl = (registerId) => `${API}/Interests/csv?registerId=${registerId}`;
const documentUrl = (registerId) => `${API}/Registers/${registerId}/document`;
const CURSOR_ROUTE = 'sync-staff-interests:register';

// Sanity floor: register 824 (12 Oct 2026) gave 750 entries; a download far below that is a broken file, not a
// register, and must not delete everything.
const MIN_ROWS = 300;

const COLS = ['register_id', 'register_date', 'category', 'job_title', 'description', 'organisation', 'payer_is_consultancy',
  'country', 'start_date', 'end_date', 'registered_date', 'link'];
// Compared to decide whether a row changed; register_id and register_date move with every register and are restamped
// separately.
const CMP_COLS = COLS.filter((c) => c !== 'register_id' && c !== 'register_date');

const blank = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// dd/mm/yyyy (or yyyy-mm-dd) to yyyy-mm-dd, only when it is a real date.
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

const bool = (v) => { const s = blank(v); return s == null ? null : /^true$/i.test(s) ? true : /^false$/i.test(s) ? false : null; };

const CATEGORY_BY_FILE = { 1: 'employment', 2: 'gift', 3: 'visit' };

// Owner's decision: an elected council role is shown as "Councillor, <council>", never with its ward or division
// (the register often names them: "Cllr for Marine", "Member for Worthing West"). Councillor or Cllr always counts;
// the other elected roles (cabinet member, portfolio holder, leader, mayor, "member for", a neighbourhood chair) count
// when the payer is a local authority, so a council's own staff (a caseworker paid by a council) keep their role.
const ALWAYS_COUNCILLOR = /\b(councill?ors?|cllr|elected member|member of a local authority|council member)\b|^(borough|county|district|parish|town|city) council$/i;
const ELECTED_ROLE = /\b(cabinet (support )?member|portfolio holder|council leader|leader of the council|deputy leader|mayor|member for|leader of .*\bgroup|neighbourhood)\b/i;
const LOCAL_AUTHORITY = /\b(council|borough|combined authority|mbc)\b|^city (of|& county of)\b/i;
const NOT_AUTHORITY = /\b(council (on|for)|funding council|councillors association|council for racial)\b/i;
function isCouncillorRole(role, payer) {
  if (!role) return false;
  const authority = !!payer && LOCAL_AUTHORITY.test(payer) && !NOT_AUTHORITY.test(payer);
  // A councillor's pension scheme entry ("member of the LGPS as County Cllr") is not the council role itself.
  if (ALWAYS_COUNCILLOR.test(role)) return !/\bpension\b/i.test(role);
  return authority && ELECTED_ROLE.test(role);
}

// The newest version of a field on a row: "Version N <field>" with the highest N that has a value.
function latest(row, versions, field) {
  for (const n of versions) {
    const v = blank(row[`Version ${n} ${field}`]);
    if (v != null) return v;
  }
  return null;
}

// One CSV as rows for our table, plus the counts of rows skipped.
function parseCategoryCsv(text, category, registerId, registerDate) {
  const records = parse(text, { bom: true, relax_column_count: true, relax_quotes: true, skip_empty_lines: true });
  if (records.length === 0) return { rows: [], malformed: 0, noMp: 0, entries: 0 };
  const header = records[0].map((h) => String(h).trim());
  const versions = [...new Set(header.map((h) => (h.match(/^Version (\d+) /) || [])[1]).filter(Boolean).map(Number))].sort((a, b) => b - a);
  const mpSlots = [...new Set(header.map((h) => (h.match(/^Mnis Id (\d+)$/) || [])[1]).filter(Boolean).map(Number))].sort((a, b) => a - b);
  const rows = [];
  let malformed = 0, noMp = 0, entries = 0;
  for (const cells of records.slice(1)) {
    if (cells.length !== header.length) { malformed++; continue; }
    const r = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    const interestId = Number(blank(r.Id));
    if (!Number.isInteger(interestId) || interestId <= 0) { malformed++; continue; }
    const mps = mpSlots
      .map((n) => ({ id: Number(blank(r[`Mnis Id ${n}`])), job: blank(r[`Job title for Member ${n}`]) }))
      .filter((m) => Number.isInteger(m.id) && m.id > 0);
    if (mps.length === 0) { noMp++; continue; }
    entries++;
    let description = null, organisation = null, consultancy = null, country = null, start = null, end = null;
    if (category === 'employment') {
      const role = latest(r, versions, 'Role');
      organisation = latest(r, versions, 'Payer');
      description = isCouncillorRole(role, organisation) ? 'Councillor' : role;
      consultancy = bool(latest(r, versions, 'PayerIsConsultancy'));
      start = isoDate(latest(r, versions, 'StartDate'));
      end = isoDate(latest(r, versions, 'EndDate'));
    } else if (category === 'gift') {
      description = latest(r, versions, 'GiftOrBenefit');
      organisation = latest(r, versions, 'Source');
      start = isoDate(latest(r, versions, 'DateReceived'));
      end = isoDate(latest(r, versions, 'EndDate'));
    } else {
      description = latest(r, versions, 'Purpose');
      organisation = latest(r, versions, 'Source (.0.0)');
      country = latest(r, versions, 'Country (.0.0)');
      start = isoDate(latest(r, versions, 'StartDate'));
      end = isoDate(latest(r, versions, 'EndDate'));
    }
    const seen = new Set();
    for (const m of mps) {
      if (seen.has(m.id)) continue; // the same MP twice on one entry: one row
      seen.add(m.id);
      rows.push({
        interest_id: interestId,
        member_id: m.id,
        register_id: registerId,
        register_date: registerDate,
        category,
        job_title: m.job,
        description,
        organisation,
        payer_is_consultancy: consultancy,
        country,
        start_date: start,
        end_date: end,
        registered_date: isoDate(latest(r, versions, 'Registered')),
        link: blank(r.Link),
      });
    }
  }
  return { rows, malformed, noMp, entries };
}

// The zip as rows. Every one of the three files must be there, or nothing is written (a partial register would delete
// the missing categories).
function buildRows(zipBytes, registerId, registerDate) {
  const files = unzipSync(zipBytes);
  const out = { rows: [], perCategory: {}, malformed: {}, noMp: {} };
  for (const [n, category] of Object.entries(CATEGORY_BY_FILE)) {
    const name = Object.keys(files).find((f) => new RegExp(`CommonsStaff_${n}_[^/]*\\.csv$`, 'i').test(f));
    if (!name) throw Object.assign(new Error(`register ${registerId}: no CommonsStaff_${n} CSV in the zip`), { stage: 'unzip' });
    const p = parseCategoryCsv(strFromU8(files[name]), category, registerId, registerDate);
    out.rows.push(...p.rows);
    out.perCategory[category] = p.rows.length;
    out.malformed[category] = p.malformed;
    out.noMp[category] = p.noMp;
  }
  return out;
}

const key = (r) => `${r.interest_id}|${r.member_id}`;
const canon = (r) => JSON.stringify(CMP_COLS.map((c) => (r[c] === undefined || r[c] === '' ? null : r[c])));

function diffRows(fresh, stored) {
  if (fresh.length < MIN_ROWS) {
    throw Object.assign(new Error(`register looks incomplete: ${fresh.length} rows (at least ${MIN_ROWS} expected)`), { stage: 'sanity' });
  }
  const old = new Map(stored.map((r) => [key(r), r]));
  const now = new Map(fresh.map((r) => [key(r), r]));
  const inserts = fresh.filter((r) => !old.has(key(r)));
  const updates = fresh.filter((r) => old.has(key(r)) && canon(old.get(key(r))) !== canon(r)).map((r) => ({ ...r, id: old.get(key(r)).id }));
  const deletes = stored.filter((r) => !now.has(key(r)));
  const changedMps = new Set([...inserts, ...updates, ...deletes].map((r) => Number(r.member_id)));
  const byCat = (rows) => rows.reduce((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {});
  return {
    inserts, updates, deletes, changedMps,
    counts: { insert: inserts.length, update: updates.length, delete: deletes.length, unchanged: fresh.length - inserts.length - updates.length,
      insert_by_category: byCat(inserts), update_by_category: byCat(updates), delete_by_category: byCat(deletes), mps_changed: changedMps.size },
  };
}

async function readStored(supabase) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('mp_staff_interests').select(['id', 'interest_id', 'member_id', ...COLS].join(', ')).order('id').range(from, from + 999);
    if (error) throw Object.assign(new Error(`mp_staff_interests: ${error.message}`), { stage: 'read stored' });
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

// The newest CommonsStaff register: { id, publishedDate }.
function newestStaffRegister(json) {
  const items = (json && (json.items || json)) || [];
  const staff = items.filter((r) => r && r.type === 'CommonsStaff' && Number.isInteger(r.id));
  staff.sort((a, b) => String(b.publishedDate).localeCompare(String(a.publishedDate)) || b.id - a.id);
  return staff[0] ? { id: staff[0].id, publishedDate: isoDate(staff[0].publishedDate) } : null;
}

/**
 * The whole run. fetchText(url) and fetchBytes(url) return the body or throw; dry writes nothing (not even the id).
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, fetchText: (url: string) => Promise<string>,
 *           fetchBytes: (url: string) => Promise<Uint8Array>, dry: boolean, force?: boolean,
 *           log?: (msg: string) => void }} opts
 */
async function runStaffInterestsSync({ supabase, fetchText, fetchBytes, dry, force = false, log = () => {} }) {
  const reg = newestStaffRegister(JSON.parse(await fetchText(REGISTERS_URL)));
  if (!reg) throw Object.assign(new Error('no CommonsStaff register listed'), { stage: 'registers' });
  const { data: cur, error: curErr } = await supabase.from('sync_cursor').select('cursor').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) throw Object.assign(new Error(`sync_cursor read: ${curErr.message}`), { stage: 'registers' });
  const lastId = cur && cur.cursor ? cur.cursor.register_id ?? null : null;
  if (lastId === reg.id && !force) {
    return { result: { unchanged: true, register_id: reg.id, register_date: reg.publishedDate, rows_written: 0 }, changedMps: new Set() };
  }

  const built = buildRows(await fetchBytes(csvUrl(reg.id)), reg.id, reg.publishedDate);
  log(`register ${reg.id} (${reg.publishedDate}): ${built.rows.length} rows; malformed skipped ${JSON.stringify(built.malformed)}; no MP ${JSON.stringify(built.noMp)}`);
  const stored = await readStored(supabase);
  const d = diffRows(built.rows, stored);

  const written = { inserted: 0, updated: 0, deleted: 0, restamped: 0 };
  if (!dry) {
    const now = new Date().toISOString();
    const fail = (stage, msg) => Object.assign(new Error(msg), { stage, written });
    for (let i = 0; i < d.deletes.length; i += 200) {
      const ids = d.deletes.slice(i, i + 200).map((r) => r.id);
      const { error } = await supabase.from('mp_staff_interests').delete().in('id', ids);
      if (error) throw fail('delete', error.message);
      written.deleted += ids.length;
    }
    for (let i = 0; i < d.updates.length; i += 200) {
      const slice = d.updates.slice(i, i + 200).map((r) => ({ ...r, updated_at: now }));
      const { error } = await supabase.from('mp_staff_interests').upsert(slice, { onConflict: 'id' });
      if (error) throw fail('update', error.message);
      written.updated += slice.length;
    }
    for (let i = 0; i < d.inserts.length; i += 500) {
      const slice = d.inserts.slice(i, i + 500).map((r) => ({ ...r, updated_at: now }));
      const { error } = await supabase.from('mp_staff_interests').insert(slice);
      if (error) throw fail('insert', error.message);
      written.inserted += slice.length;
    }
    const { data: rs, error: rErr } = await supabase.from('mp_staff_interests')
      .update({ register_id: reg.id, register_date: reg.publishedDate }).neq('register_id', reg.id).select('id');
    if (rErr) throw fail('restamp', rErr.message);
    written.restamped = (rs || []).length;
    const { error: cErr } = await supabase.from('sync_cursor').upsert(
      { route: CURSOR_ROUTE, cursor: { register_id: reg.id, register_date: reg.publishedDate, synced_at: now }, updated_at: now }, { onConflict: 'route' });
    if (cErr) throw fail('cursor', `sync_cursor write: ${cErr.message}`);
  }

  return {
    result: {
      register_id: reg.id,
      register_date: reg.publishedDate,
      last_register_id: lastId,
      rows: built.rows.length,
      rows_by_category: built.perCategory,
      malformed_skipped: built.malformed,
      no_mp_skipped: built.noMp,
      ...d.counts,
      rows_written: written.inserted + written.updated + written.deleted,
      written,
      ...(dry ? { dry_run: true } : {}),
    },
    changedMps: d.changedMps,
    built,
    diff: d,
  };
}

module.exports = {
  REGISTERS_URL, CURSOR_ROUTE, COLS, csvUrl, documentUrl,
  isoDate, isCouncillorRole, parseCategoryCsv, buildRows, diffRows, newestStaffRegister, runStaffInterestsSync,
};
