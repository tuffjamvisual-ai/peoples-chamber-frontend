import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ORGANOGRAM_DATASET_URL } from '@/lib/organogram-urls';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Mirrors data.gov.uk Senior Civil Servants organograms into
// person_cache.actual_pay_floor + actual_pay_ceiling.
//
// For each department in ORGANOGRAM_DATASET_URL:
//   1. Fetch the data.gov.uk listing HTML
//   2. Extract the latest "-senior.csv" S3 link (filenames are
//      sortable: <run-timestamp>-<as-at-date>-organogram-senior.csv)
//   3. Download CSV, parse "Last, First" name + Actual Pay Floor/Ceiling
//   4. Match each row to person_cache by normalised "First Last"
//   5. Update person_cache.actual_pay_floor / _ceiling / pay_period
//
// Junior civil servants don't appear here (only SCS senior bands are
// published per-person; junior staff are aggregated). Cron weekly.

type CsvRow = {
  name: string;             // "Last, First"
  grade: string;
  jobTitle: string;
  payFloor: number | null;  // £
  payCeiling: number | null;
  fte: number | null;       // 1.00 = full-time
};

function parseCsv(text: string): CsvRow[] {
  // The organogram CSVs are RFC-4180 with quoted strings; values
  // never contain literal newlines inside quotes (confirmed for
  // HMT/DfE/MoD), so a one-pass split on newline + a careful
  // quote-aware split per row is enough.
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
  const idx = {
    name: header.findIndex((h) => /^name$/i.test(h)),
    grade: header.findIndex((h) => /grade/i.test(h)),
    jobTitle: header.findIndex((h) => /^job title$/i.test(h)),
    floor: header.findIndex((h) => /actual pay floor/i.test(h)),
    ceiling: header.findIndex((h) => /actual pay ceiling/i.test(h)),
    fte: header.findIndex((h) => /^fte$/i.test(h)),
  };
  const out: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, '').trim());
    const name = cells[idx.name] || '';
    if (!name || /^vacant/i.test(name) || /^n\/?d$/i.test(name) || /not disclosed/i.test(name)) continue;
    const floorRaw = cells[idx.floor] || '';
    const ceilingRaw = cells[idx.ceiling] || '';
    const fteRaw = idx.fte >= 0 ? (cells[idx.fte] || '') : '';
    const fte = /^\d+(\.\d+)?$/.test(fteRaw) ? parseFloat(fteRaw) : null;
    out.push({
      name,
      grade: cells[idx.grade] || '',
      jobTitle: cells[idx.jobTitle] || '',
      payFloor: /^\d+$/.test(floorRaw) ? parseInt(floorRaw, 10) : null,
      payCeiling: /^\d+$/.test(ceilingRaw) ? parseInt(ceilingRaw, 10) : null,
      fte,
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// "Bowler, James" -> "james-bowler"; "Smith, John A." -> "john-smith"
function lastFirstToSlug(name: string): string {
  const m = name.match(/^([^,]+),\s*(.+)$/);
  if (!m) return name.toLowerCase().replace(/\s+/g, '-');
  const last = m[1].trim();
  // Drop middle initials/names — gov.uk slugs use just first + last.
  const first = m[2].trim().split(/\s+/)[0];
  return `${first}-${last}`
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchLatestSeniorCsvUrl(datasetUrl: string): Promise<{ csvUrl: string; periodLabel: string } | null> {
  const res = await fetch(datasetUrl, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) return null;
  const html = await res.text();
  const links = Array.from(
    html.matchAll(/href="(https:\/\/[^"]*organogram-senior\.csv)"/g),
  ).map((m) => m[1]);
  if (links.length === 0) return null;
  // Filenames sort lexicographically by leading run-timestamp; the
  // latest is the lexicographically largest.
  links.sort();
  const csvUrl = links[links.length - 1];
  // Extract the "as-at" date from the filename: <ts>-<YYYY-MM-DD>-organogram-senior.csv
  const m = csvUrl.match(/-(\d{4}-\d{2}-\d{2})-organogram-senior\.csv$/);
  return { csvUrl, periodLabel: m ? m[1] : '' };
}

async function syncDept(supabase: SupabaseClient, deptSlug: string, datasetUrl: string) {
  const latest = await fetchLatestSeniorCsvUrl(datasetUrl);
  if (!latest) return { deptSlug, matched: 0, updated: 0, note: 'no senior csv found' };
  const csvRes = await fetch(latest.csvUrl, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!csvRes.ok) return { deptSlug, matched: 0, updated: 0, note: `csv ${csvRes.status}` };
  const rows = parseCsv(await csvRes.text());

  let matched = 0;
  let updated = 0;
  for (const row of rows) {
    if (row.payFloor == null || row.payCeiling == null) continue;
    const slug = lastFirstToSlug(row.name);
    if (!slug) continue;
    // Only update if person_cache already has a row for this slug
    // (we don't insert speculative rows; sync-person-cache owns
    // membership).
    const { data: existing } = await supabase
      .from('person_cache')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) continue;
    matched++;
    const { error } = await supabase
      .from('person_cache')
      .update({
        actual_pay_floor: row.payFloor,
        actual_pay_ceiling: row.payCeiling,
        pay_period: latest.periodLabel,
        pay_synced_at: new Date().toISOString(),
        fte: row.fte,
      })
      .eq('slug', slug);
    if (!error) updated++;
  }
  return { deptSlug, csvUrl: latest.csvUrl, periodLabel: latest.periodLabel, rows: rows.length, matched, updated };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  const results: Array<Awaited<ReturnType<typeof syncDept>>> = [];
  for (const [deptSlug, datasetUrl] of Object.entries(ORGANOGRAM_DATASET_URL)) {
    try {
      results.push(await syncDept(supabase, deptSlug, datasetUrl));
    } catch (err) {
      results.push({ deptSlug, matched: 0, updated: 0, note: 'err: ' + (err as Error).message });
    }
  }
  return NextResponse.json({
    departments: results.length,
    matched: results.reduce((a, r) => a + (r.matched || 0), 0),
    updated: results.reduce((a, r) => a + (r.updated || 0), 0),
    syncedAt: new Date().toISOString(),
    results,
  });
}
