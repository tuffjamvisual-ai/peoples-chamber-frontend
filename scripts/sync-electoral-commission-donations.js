#!/usr/bin/env node
// Pulls every donation from the Electoral Commission search API and
// upserts into political_donations on ec_ref. Paginates by accepted-
// date window so the EC's /api/search/Donations sorted-by-date
// returns are stable across page calls.
//
// The EC API is POST-only with form-encoded payload; sorted by
// AcceptedDate desc; pages of up to 100 rows. Total record count
// at first run: ~93,000. The script is idempotent — re-running
// upserts the same rows by ec_ref.
//
// Usage: node scripts/sync-electoral-commission-donations.js
//   --from=01/01/2001   start of date window (DD/MM/YYYY)
//   --to=10/06/2026     end of date window (DD/MM/YYYY)
//   --rows=100          page size (max 100)

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  }),
);

const FROM = args.from || '01/01/2001';
const TO = args.to || formatDdmmyyyy(new Date());
const ROWS = Math.min(parseInt(args.rows || '100', 10) || 100, 100);

function formatDdmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function parseEcDate(v) {
  if (!v) return null;
  const m = String(v).match(/\/Date\((-?\d+)\)\//);
  if (!m) return null;
  const ms = parseInt(m[1], 10);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function dq(tag, v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `$${tag}$${String(v)}$${tag}$`;
}

function num(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,£\s]/g, ''));
  return Number.isFinite(n) ? String(n) : 'NULL';
}

function bool(v) {
  if (v === true || v === 'true' || v === 'True') return 'TRUE';
  if (v === false || v === 'false' || v === 'False') return 'FALSE';
  return 'NULL';
}

function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

async function fetchPage(start, rows) {
  const body = new URLSearchParams({
    rows: String(rows),
    start: String(start),
    query: '',
    sort: 'AcceptedDate',
    order: 'desc',
    includeOutsideSection75: 'true',
    AcceptedFromDate: FROM,
    AcceptedToDate: TO,
  }).toString();

  const res = await fetch('https://search.electoralcommission.org.uk/api/search/Donations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 PeoplesChamber/1.0',
    },
    body,
  });
  if (!res.ok) throw new Error(`EC API HTTP ${res.status}`);
  return res.json();
}

function rowToSql(r) {
  const ec_ref = r.ECRef;
  if (!ec_ref) return null;
  const tag = `d${String(ec_ref).replace(/[^a-zA-Z0-9]/g, '')}`;
  const fields = {
    ec_ref: dq(tag, ec_ref),
    ec_id: r.Id ? String(r.Id) : 'NULL',
    donor_name: dq(tag, r.DonorName),
    donor_type: dq(tag, r.DonorStatus),
    donor_status: dq(tag, r.DonorStatus),
    donor_id: r.DonorId ? String(r.DonorId) : 'NULL',
    recipient_name: dq(tag, r.RegulatedEntityName),
    recipient_type: dq(tag, r.RegulatedEntityType),
    regulated_entity_id: r.RegulatedEntityId ? String(r.RegulatedEntityId) : 'NULL',
    regulated_entity_type: dq(tag, r.RegulatedEntityType),
    regulated_donee_type: dq(tag, r.RegulatedDoneeType),
    amount: num(r.Value),
    cash_value: num(r.CashValue),
    non_cash_value: num(r.NonCashValue),
    received_date: dq(tag, r.ReceivedDate ? parseEcDate(r.ReceivedDate) : null),
    accepted_date: dq(tag, parseEcDate(r.AcceptedDate)),
    reported_date: dq(tag, r.ReportedDate ? parseEcDate(r.ReportedDate) : null),
    published_date: dq(tag, parseEcDate(r.PublishedDate)),
    dealt_with_date: dq(tag, parseEcDate(r.DealtWithDate)),
    returned_date: dq(tag, parseEcDate(r.ReturnedDate)),
    trust_created_date: dq(tag, parseEcDate(r.TrustCreatedDate)),
    nature: dq(tag, r.NatureOfDonation),
    donation_type_label: dq(tag, r.DonationType),
    donation_action: dq(tag, r.DonationAction),
    manner_in_which_made: dq(tag, r.MannerInWhichMade),
    purpose_of_visit: dq(tag, r.PurposeOfVisit),
    position_standing_for: dq(tag, r.PositionStandingFor),
    explanatory_notes: dq(tag, r.ExplanatoryNotes),
    impermissibility_reason: dq(tag, r.ReasonForImpermissibility),
    concealment_details: dq(tag, r.DetailsOfConcealmentRevealed),
    attempted_concealment: bool(r.AttemptedConcealment),
    is_anonymous: bool(r.IsAnonymous),
    is_aggregation: bool(r.IsAggregation),
    is_bequest: bool(r.IsBequest),
    is_sponsorship: bool(r.IsSponsorship),
    is_irish_source: bool(r.IsIrishSource),
    is_reported_pre_poll: bool(r.IsReportedPrePoll),
    accounting_units_as_central_party: bool(r.AccountingUnitsAsCentralParty),
    reporting_period_name: dq(tag, r.ReportingPeriodName),
    reporting_period_type: dq(tag, r.ReportingPeriodType),
    campaigning_name: dq(tag, r.CampaigningName),
    register_name: dq(tag, r.RegisterName),
    trust_name: dq(tag, r.TrustName),
    trust_creator_name: dq(tag, r.TrustCreatorName),
    trust_creator_status: dq(tag, r.TrustCreatorStatus),
    company_registration_number: dq(tag, r.CompanyRegistrationNumber),
    accounting_unit_name: dq(tag, r.AccountingUnitName),
    accounting_unit_id: r.AccountingUnitId ? String(r.AccountingUnitId) : 'NULL',
    addr_line1: dq(tag, r.Line1),
    addr_line2: dq(tag, r.Line2),
    addr_line3: dq(tag, r.Line3),
    addr_line4: dq(tag, r.Line4),
    addr_town: dq(tag, r.Town),
    addr_county: dq(tag, r.County),
    addr_country: dq(tag, r.Country),
    addr_postcode: dq(tag, r.Postcode),
    updated_at: 'now()',
  };

  const cols = Object.keys(fields);
  const vals = Object.values(fields);

  const updateClauses = cols
    .filter(c => c !== 'ec_ref')
    .map(c => `${c} = EXCLUDED.${c}`)
    .join(', ');

  return `INSERT INTO political_donations (${cols.join(', ')}) VALUES (${vals.join(', ')})
    ON CONFLICT (ec_ref) DO UPDATE SET ${updateClauses};`;
}

(async () => {
  console.log(`EC donations sync — window ${FROM} to ${TO}, page size ${ROWS}`);
  // Probe total
  const probe = await fetchPage(0, 1);
  const total = probe.Total;
  console.log(`Total available: ${total.toLocaleString()}`);

  let inserted = 0, failed = 0;
  for (let start = 0; start < total; start += ROWS) {
    let data;
    try {
      data = await fetchPage(start, ROWS);
    } catch (e) {
      console.log(`  fetch fail at start=${start}: ${e.message}`);
      failed++;
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }
    const rows = data.Result || [];
    if (rows.length === 0) break;
    const sqls = rows.map(rowToSql).filter(Boolean);
    try {
      await psqlWrite(sqls.join('\n'));
      inserted += sqls.length;
    } catch (e) {
      console.log(`  write fail at start=${start}: ${e.message.split('\n')[0]}`);
      failed++;
    }
    if ((start + ROWS) % 1000 === 0 || start === 0) {
      console.log(`  ${Math.min(start + ROWS, total).toLocaleString()} / ${total.toLocaleString()}  upserted=${inserted}`);
    }
    // Be polite to EC infra
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\nDone. upserted=${inserted} failed_pages=${failed}`);
})();
