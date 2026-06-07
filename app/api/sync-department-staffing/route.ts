import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Mirrors ONS Public Sector Employment Table 8 into department_staffing.
//
// Source:
//   https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/
//     publicsectorpersonnel/datasets/publicsectoremploymentreferencetable/
//     current/datasets8.xlsx
//
// `current/` always points at the latest quarterly release; ONS publishes
// March / June / September / December reference quarters ~3 months after
// the period ends. The sheet "Table 8 HC" gives headcount per civil
// service department; "Table 8 FTE" gives the FTE equivalent.
//
// We only sync the PERMANENT EMPLOYEES block (the casual/temporary block
// follows the same departments lower down on the same sheet but is
// usually <1% of headcount and visually noisy). UK-only — Scottish
// Government / Welsh Government / TOTAL rows are dropped.

const ONS_LANDING =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/publicsectorpersonnel/datasets/publicsectoremploymentreferencetable';
// We scrape the landing page for the latest dated URL rather than use
// /current/ — ONS's /current/ endpoint 404s intermittently behind their
// CDN, while the dated URLs (e.g. /december2025/) are stable.
const URL_PATTERN = /\/employmentandlabourmarket\/peopleinwork\/publicsectorpersonnel\/datasets\/publicsectoremploymentreferencetable\/([a-z]+\d{4})\/datasets8\.xlsx/g;
const UA = 'PeoplesChamber/1.0 (+thepeopleschamber.uk)';

// Months in publication order so the latest sort works numerically
const MONTH_ORDER: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

async function discoverLatestXlsxUrl(): Promise<string | null> {
  const html = await fetch(ONS_LANDING, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  // ONS XLSX downloads MUST go through the /file?uri= proxy — direct
  // /employmentandlabourmarket/... paths 404 even though the landing
  // page shows them as anchor hrefs.
  const candidates = Array.from(html.matchAll(URL_PATTERN), (m) => ({ slug: m[1], full: `https://www.ons.gov.uk/file?uri=${m[0]}` }))
    .filter((c) => c.slug !== 'current');
  if (candidates.length === 0) return null;
  // Sort by (year, month) descending; pick the most recent
  candidates.sort((a, b) => {
    const ma = a.slug.match(/^([a-z]+)(\d{4})$/);
    const mb = b.slug.match(/^([a-z]+)(\d{4})$/);
    if (!ma || !mb) return 0;
    const ya = parseInt(ma[2], 10), yb = parseInt(mb[2], 10);
    if (ya !== yb) return yb - ya;
    return (MONTH_ORDER[mb[1]] ?? 0) - (MONTH_ORDER[ma[1]] ?? 0);
  });
  return candidates[0].full;
}

// Map ONS Table 8 row labels → our 24 department slugs.
// Three depts have no separate ONS row at all (commons-leader, lords-leader,
// advocate-general) and are written as placeholder rows so the page can
// show "Not separately reported".
const ROW_TO_SLUG: Record<string, { slug: string; proxy?: string }> = {
  "Attorney General's departments": { slug: 'attorney-general', proxy: "Aggregated under \"Attorney General's departments\" with CPS, SFO and GLD" },
  'Business and Trade':                                { slug: 'business-trade' },
  'Cabinet Office':                                    { slug: 'cabinet-office' },
  'Culture, Media and Sport':                          { slug: 'culture' },
  'Defence':                                           { slug: 'defence' },
  'Education':                                         { slug: 'education' },
  'Energy Security and Net Zero':                      { slug: 'energy' },
  'Environment, Food and Rural Affairs':               { slug: 'environment' },
  'Export Credits Guarantee Department':               { slug: 'ukef', proxy: 'Reported under its statutory name "Export Credits Guarantee Department"' },
  'Foreign, Commonwealth and Development Office':      { slug: 'foreign-office' },
  'Health and Social Care':                            { slug: 'health' },
  'HM Treasury':                                       { slug: 'treasury' },
  'Home Office':                                       { slug: 'home-office' },
  'Housing, Communities and Local Government':         { slug: 'housing' },
  'Justice':                                           { slug: 'justice' },
  'Northern Ireland Office':                           { slug: 'northern-ireland-office' },
  'Office of the Secretary of State for Scotland':     { slug: 'scotland-office' },
  'Office of the Secretary of State for Wales':        { slug: 'wales-office' },
  'Science, Innovation and Technology':                { slug: 'science-tech' },
  'Transport':                                         { slug: 'transport' },
  'Work and Pensions':                                 { slug: 'work-pensions' },
};

const NOT_REPORTED_SLUGS = ['commons-leader', 'lords-leader', 'advocate-general'];

// Tiny numeric coerce — ONS uses ".." to suppress small / disclosure-risk
// cells; treat those as null rather than 0.
function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v === '..' || v.trim() === '') return null;
    const n = Number(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Pulls (currentTotal, priorTotal, change) from a Table 8 row layout:
//   col 0 = label, col 10 = current Total, col 12 = prior Total, col 14 = change
// Verified Dec 2025 release. If ONS shifts columns we'll see proxy_note
// mismatch in the resulting rows.
function readRow(row: unknown[]): { current: number | null; prior: number | null; change: number | null } {
  return {
    current: num(row[10]),
    prior:   num(row[12]),
    change:  num(row[14]),
  };
}

// Parse a "Month YYYY" string from cell ws['C4'] / row 3 col 2 — both Table
// 8 HC and FTE put the reference quarter label there. Returns
// { period: 'December 2025', endDate: '2025-12-31' }.
function parseReferenceQuarter(row: unknown[]): { period: string; endDate: string } | null {
  const label = String(row?.[2] ?? '').trim();
  const m = label.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/);
  if (!m) return null;
  const monthName = m[1];
  const year = parseInt(m[2], 10);
  const monthIdx = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(monthName.toLowerCase());
  // End-of-month for the reference quarter
  const endOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0));
  const endDate = endOfMonth.toISOString().slice(0, 10);
  return { period: label, endDate };
}

type StaffingRow = {
  department_slug: string;
  period: string;
  period_end_date: string;
  headcount: number | null;
  fte: number | null;
  prior_quarter_headcount: number | null;
  change_from_previous_percent: number | null;
  is_proxy: boolean;
  proxy_note: string | null;
  source: string;
  source_file_url: string;
};

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  // 1. Discover the latest dated XLSX URL and download it
  const xlsxUrl = await discoverLatestXlsxUrl();
  if (!xlsxUrl) return NextResponse.json({ error: 'could not discover latest XLSX URL' }, { status: 502 });
  const res = await fetch(xlsxUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) return NextResponse.json({ error: `ONS download ${res.status} for ${xlsxUrl}` }, { status: 502 });
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });

  const hcSheet = wb.Sheets['Table 8 HC'];
  const fteSheet = wb.Sheets['Table 8 FTE'];
  if (!hcSheet || !fteSheet) {
    return NextResponse.json({ error: 'Table 8 HC or FTE sheet missing' }, { status: 502 });
  }
  const hcRows = XLSX.utils.sheet_to_json<unknown[]>(hcSheet, { header: 1, blankrows: false, defval: null });
  const fteRows = XLSX.utils.sheet_to_json<unknown[]>(fteSheet, { header: 1, blankrows: false, defval: null });

  // 2. Reference quarter (e.g. "December 2025")
  const ref = parseReferenceQuarter(hcRows[3]);
  if (!ref) return NextResponse.json({ error: 'could not parse reference quarter from row 3' }, { status: 502 });

  // 3. Build (label → fte_current) lookup from the FTE sheet so we can join
  // on the row label while iterating the HC sheet.
  const fteByLabel = new Map<string, number | null>();
  for (const row of fteRows) {
    const label = String(row?.[0] ?? '').trim();
    if (!label) continue;
    fteByLabel.set(label, num(row[10]));
  }

  // 4. Iterate HC rows. Permanent block sits between "Permanent Employees"
  // (a section-header row with nulls in the data cols) and "Central
  // Government Departments Total" (a footer we skip).
  const out: StaffingRow[] = [];
  let inPermanent = false;
  for (const row of hcRows) {
    const label = String(row?.[0] ?? '').trim();
    if (label === 'Permanent Employees') { inPermanent = true; continue; }
    if (!inPermanent) continue;
    if (label === 'Central Government Departments Total' || label === 'TOTAL' || label === '') {
      // End of the permanent block — break out, we don't want casual rows
      // contaminating the join.
      if (label === 'Central Government Departments Total') break;
      continue;
    }
    const mapping = ROW_TO_SLUG[label];
    if (!mapping) continue;            // skip non-ministerial / non-mapped rows
    const { current, prior, change } = readRow(row);
    const pct = (change != null && prior != null && prior > 0) ? Number(((change / prior) * 100).toFixed(2)) : null;
    out.push({
      department_slug: mapping.slug,
      period: ref.period,
      period_end_date: ref.endDate,
      headcount: current,
      fte: fteByLabel.get(label) ?? null,
      prior_quarter_headcount: prior,
      change_from_previous_percent: pct,
      is_proxy: !!mapping.proxy,
      proxy_note: mapping.proxy ?? null,
      source: 'ons_pse_table8',
      source_file_url: xlsxUrl,
    });
  }

  // 5. Placeholder rows for the 3 depts ONS doesn't separately report
  for (const slug of NOT_REPORTED_SLUGS) {
    out.push({
      department_slug: slug,
      period: ref.period,
      period_end_date: ref.endDate,
      headcount: null,
      fte: null,
      prior_quarter_headcount: null,
      change_from_previous_percent: null,
      is_proxy: true,
      proxy_note: 'Not separately reported in ONS Public Sector Employment Table 8',
      source: 'ons_pse_table8',
      source_file_url: xlsxUrl,
    });
  }

  // 6. Upsert by (department_slug, period_end_date)
  const { error } = await supabase
    .from('department_staffing')
    .upsert(out, { onConflict: 'department_slug,period_end_date' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    period: ref.period,
    period_end_date: ref.endDate,
    rows_written: out.length,
    mapped: out.filter((r) => r.headcount != null).length,
    placeholder: out.filter((r) => r.headcount == null).length,
    syncedAt: new Date().toISOString(),
  });
}
