// Reading the CSVs of the House of Commons register of interests of MPs' staff, from Parliament's interests API
// (https://interests-api.parliament.uk, Open Parliament Licence v3.0; the licence line is in every page's footer).
// scripts/sync-staff-register.js is the only writer of mp_staff_interests (owner, 4 Nov 2026) and uses this.
//   /api/v2/Interests/csv?registerId=N is a zip of three CSVs: 1 Occupation or employment, 2 Gifts and benefits,
//   3 Visits outside the UK. A row whose cell count differs from its header is malformed: skipped and counted. A row
//   naming no MP is skipped and counted. One row per entry and per MP named on it (an entry can name up to five MPs,
//   each with the job title held for that MP). Owner's decisions: no staff names (the register shows job titles only
//   since January 2026, and the sub item "Name" fields are never read); an elected council role is stored as
//   "Councillor", with the council (the payer) as the organisation, so the ward is never stored (isCouncillorRole).
//   Summary, PayersBusiness and AdditionalInformation are not stored.
const { parse } = require('csv-parse/sync'); // eslint-disable-line @typescript-eslint/no-require-imports
const { unzipSync, strFromU8 } = require('fflate'); // eslint-disable-line @typescript-eslint/no-require-imports

const API = 'https://interests-api.parliament.uk/api/v2';
const csvUrl = (registerId) => `${API}/Interests/csv?registerId=${registerId}`;
const CURSOR_ROUTE = 'sync-staff-interests:register';

// Sanity floor: register 824 (12 Oct 2026) gave 750 entries; a download far below that is a broken file, not a
// register, and must not mark everything as no longer current.
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

module.exports = { COLS, CMP_COLS, MIN_ROWS, CURSOR_ROUTE, csvUrl, isoDate, isCouncillorRole, parseCategoryCsv, buildRows };
