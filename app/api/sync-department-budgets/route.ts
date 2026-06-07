import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

// Mirrors HM Treasury Main Estimates Departmental DEL XLSX into
// department_budgets — one row per (slug, financial_year).
//
// Discovery:
//   1. Scrape /government/collections/hmt-main-estimates for the list
//      of /government/publications/main-supply-estimates-YYYY-to-YYYY
//      slugs.
//   2. For each, hit the Content API
//      /api/content/government/publications/<slug> and read
//      details.attachments[] for the one titled
//      "Departmental DEL budgets: tables".
//   3. Download the XLSX (two sheets: RDEL, CDEL) and merge them on
//      department name.
//
// Format verified for Mains 2025-26 + Mains 2026-27 (released April
// 2026). Sheet layout:
//   row 0:    title
//   row 1:    "£ billion" | (blank) | "Plans"
//   row 2:    (blank) | (blank) | "2026-27"
//   row 3:    "Resource DEL" or "Capital DEL" (section header)
//   row 4+:   col 0 = department name (with optional trailing footnote
//             digit), col 2 = value in £ billion
//   last:     "Total Resource DEL" / "Total Capital DEL" then notes
//
// We never overwrite an outturn row with a plans row for the same FY:
// is_outturn is part of the unique key via the source column.

const COLLECTION_URL = 'https://www.gov.uk/government/collections/hmt-main-estimates';
const UA = 'PeoplesChamber/1.0 (+thepeopleschamber.uk)';

// Row label → site slug. The same labels work for Mains 25-26 and Mains
// 26-27 (verified). Rows we deliberately drop: Single Intelligence
// Account, Scottish/Welsh/NI devolved governments, the
// MHCLG-Local-Government split (we sum LG+HCLG into housing), HMRC
// (no site slug), and Small and Independent Bodies.
const ROW_TO_SLUG: Record<string, string> = {
  'Health and Social Care':                            'health',
  'Education':                                         'education',
  'Home Office':                                       'home-office',
  'Justice':                                           'justice',
  'Defence':                                           'defence',
  'Foreign, Commonwealth and Development Office':      'foreign-office',
  'Culture, Media and Sport':                          'culture',
  'Science, Innovation and Technology':                'science-tech',
  'Transport':                                         'transport',
  'Energy Security and Net Zero':                      'energy',
  'Environment, Food and Rural Affairs':               'environment',
  'Business and Trade':                                'business-trade',
  'Work and Pensions':                                 'work-pensions',
  'HM Treasury':                                       'treasury',
  'Cabinet Office':                                    'cabinet-office',
};

// Departments not separately broken out in Mains DEL — we still write
// a row so the page can render an explanation rather than a silent gap.
const NOT_IN_MAINS: Array<{ slug: string; caveat: string }> = [
  { slug: 'attorney-general',         caveat: "Bundled into Mains \"Law Officers' Departments\" with the Advocate General; per-office figures need each office's Main Estimates Memorandum" },
  { slug: 'advocate-general',         caveat: "Bundled into Mains \"Law Officers' Departments\"; the Advocate General for Scotland's share is not separately disclosed" },
  { slug: 'commons-leader',           caveat: 'Not in HM Treasury Main Estimates; House of Commons running costs sit inside the Administration and Members estimates' },
  { slug: 'lords-leader',             caveat: 'Not in HM Treasury Main Estimates; House of Lords running costs sit inside the House of Lords estimate' },
  { slug: 'scotland-office',          caveat: 'Bundled into Mains "Small and Independent Bodies"; not separately disclosed in the headline DEL tables (NB this is the UK government office, not the Scottish Government)' },
  { slug: 'wales-office',             caveat: 'Bundled into Mains "Small and Independent Bodies"; not separately disclosed in the headline DEL tables (NB this is the UK government office, not the Welsh Government)' },
  { slug: 'northern-ireland-office',  caveat: 'Bundled into Mains "Small and Independent Bodies"; not separately disclosed in the headline DEL tables (NB this is the UK government office, not the NI Executive)' },
  { slug: 'ukef',                     caveat: 'Bundled into Mains "Small and Independent Bodies"; UK Export Finance figures sit in its own Annual Report and Accounts' },
];

const HOUSING_PARTS = [
  'MHCLG Housing, Communities and Local Government',
  'MHCLG Local Government',
  'MHCLG - Housing and Communities',
  'MHCLG - Local Government',
];

// Strip trailing footnote digits/spaces (e.g. "Home Office2 " → "Home Office")
function cleanLabel(raw: unknown): string {
  return String(raw ?? '').replace(/\s+$/, '').replace(/\d+$/, '').replace(/\s+$/, '').trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

// Returns { financialYear: '2026-27', xlsxUrl, releaseDate } from a
// publication content_api response.
type PubContent = {
  title: string;
  first_published_at?: string;
  public_updated_at?: string;
  details?: { attachments?: Array<{ title?: string; url?: string }> };
};
function pickDelAttachment(pub: PubContent): { financialYear: string; xlsxUrl: string; releaseDate: string | null } | null {
  const att = (pub.details?.attachments || []).find((a) =>
    /departmental\s+del\s+budgets:?\s+tables/i.test(a.title || '')
    || /mains_del_tables/i.test(a.url || '')
  );
  if (!att?.url) return null;
  // Title like "Main Supply Estimates 2026 to 2027 …" — pull YYYY to YYYY
  const ym = pub.title.match(/(\d{4})\s+to\s+(\d{4})/);
  const financialYear = ym ? `${ym[1]}-${ym[2].slice(-2)}` : 'unknown';
  return {
    financialYear,
    xlsxUrl: att.url,
    releaseDate: (pub.first_published_at || pub.public_updated_at || null)?.slice(0, 10) || null,
  };
}

// Parse one of the two sheets (RDEL / CDEL). Returns Map<row label, £m>
// — we convert from £ billion in the source to £ million to match the
// schema's NUMERIC(12,2) granularity.
function parseDelSheet(rows: unknown[][]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const label = cleanLabel(row?.[0]);
    if (!label) continue;
    if (label.startsWith('Total ')) break;
    if (label === 'Resource DEL' || label === 'Capital DEL') continue;
    const v = row?.[2];
    const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
    if (!Number.isFinite(n)) continue;
    // £ billion → £ million
    out.set(label, n * 1000);
  }
  return out;
}

type BudgetRow = {
  department_slug: string;
  financial_year: string;
  is_outturn: boolean;
  resource_del_millions: number | null;
  capital_del_millions: number | null;
  total_del_millions: number | null;
  ame_millions: number | null;
  caveat_note: string | null;
  source: string;
  source_file_url: string | null;
  source_release_date: string | null;
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

  // 1. Find publication slugs in the collection HTML, take the two most
  // recent FYs (most-recent for plans, one back for change-on-prev-year).
  const html = await fetch(COLLECTION_URL, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  const slugs = Array.from(
    new Set((html.match(/\/government\/publications\/main-supply-estimates-\d{4}-to-\d{2,4}/g) || [])
      .map((s) => s.replace('/government/publications/', '')))
  ).sort();
  if (slugs.length === 0) return NextResponse.json({ error: 'no publication slugs found' }, { status: 502 });
  const recent = slugs.slice(-2);   // last two FYs

  const results: Array<{ slug: string; financialYear: string; written: number; note?: string }> = [];
  const allRows: BudgetRow[] = [];

  for (const slug of recent) {
    try {
      const pub = await fetchJson<PubContent>(`https://www.gov.uk/api/content/government/publications/${slug}`);
      const dl = pickDelAttachment(pub);
      if (!dl) { results.push({ slug, financialYear: 'unknown', written: 0, note: 'no DEL XLSX attachment' }); continue; }
      const buf = await fetch(dl.xlsxUrl, { headers: { 'User-Agent': UA } }).then((r) => r.arrayBuffer());
      const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
      const rdelRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['RDEL'] || wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false, defval: null });
      const cdelRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['CDEL'] || wb.Sheets[wb.SheetNames[1]], { header: 1, blankrows: false, defval: null });
      const rdel = parseDelSheet(rdelRows);
      const cdel = parseDelSheet(cdelRows);

      // Merge known labels into rows for our 24 slugs
      const written: BudgetRow[] = [];
      for (const [label, siteSlug] of Object.entries(ROW_TO_SLUG)) {
        const r = rdel.get(label) ?? null;
        const c = cdel.get(label) ?? null;
        if (r == null && c == null) continue;
        written.push({
          department_slug: siteSlug,
          financial_year: dl.financialYear,
          is_outturn: false,
          resource_del_millions: r,
          capital_del_millions: c,
          total_del_millions: (r ?? 0) + (c ?? 0),
          ame_millions: null,
          caveat_note: null,
          source: 'hmt_main_estimates',
          source_file_url: dl.xlsxUrl,
          source_release_date: dl.releaseDate,
        });
      }

      // Housing — sum the two MHCLG rows (the split varies between
      // releases by label but the money is the same).
      const housingRdel = HOUSING_PARTS.reduce((s, k) => s + (rdel.get(k) ?? 0), 0);
      const housingCdel = HOUSING_PARTS.reduce((s, k) => s + (cdel.get(k) ?? 0), 0);
      if (housingRdel > 0 || housingCdel > 0) {
        written.push({
          department_slug: 'housing',
          financial_year: dl.financialYear,
          is_outturn: false,
          resource_del_millions: housingRdel || null,
          capital_del_millions: housingCdel || null,
          total_del_millions: (housingRdel || 0) + (housingCdel || 0),
          ame_millions: null,
          caveat_note: 'Sums MHCLG Housing, Communities and Local Government with MHCLG Local Government',
          source: 'hmt_main_estimates',
          source_file_url: dl.xlsxUrl,
          source_release_date: dl.releaseDate,
        });
      }

      // Placeholder rows for the 8 depts that don't appear separately
      for (const np of NOT_IN_MAINS) {
        written.push({
          department_slug: np.slug,
          financial_year: dl.financialYear,
          is_outturn: false,
          resource_del_millions: null,
          capital_del_millions: null,
          total_del_millions: null,
          ame_millions: null,
          caveat_note: np.caveat,
          source: 'hmt_main_estimates',
          source_file_url: dl.xlsxUrl,
          source_release_date: dl.releaseDate,
        });
      }

      allRows.push(...written);
      results.push({ slug, financialYear: dl.financialYear, written: written.length });
    } catch (err) {
      results.push({ slug, financialYear: '?', written: 0, note: (err as Error).message });
    }
  }

  if (allRows.length === 0) {
    return NextResponse.json({ error: 'no rows parsed', results }, { status: 502 });
  }

  // Upsert by (department_slug, financial_year, source)
  // editorial_prose is INTENTIONALLY not in the row payload — it's seeded
  // separately and we never want to overwrite curated copy on a refresh.
  const { error } = await supabase
    .from('department_budgets')
    .upsert(allRows, { onConflict: 'department_slug,financial_year,source', ignoreDuplicates: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute year-on-year change for the most recent year.
  // The Mains release supersedes prior plans for the same FY; we compute
  // the YoY % change from the next-most-recent year's total. SQL is the
  // cleanest place to do this without holding both FYs in memory.
  const recentFys = Array.from(new Set(allRows.map((r) => r.financial_year))).sort();
  if (recentFys.length === 2) {
    const [prev, curr] = recentFys;
    const { error: updErr } = await supabase.rpc('compute_budget_yoy_change', {
      prev_year: prev,
      curr_year: curr,
    });
    // If the RPC doesn't exist (first-time deploy), fall back to JS pass.
    if (updErr && /function .* does not exist/i.test(updErr.message || '')) {
      const { data: prevRows } = await supabase
        .from('department_budgets')
        .select('department_slug,total_del_millions')
        .eq('financial_year', prev)
        .eq('source', 'hmt_main_estimates');
      const prevByDept = new Map<string, number | null>(
        (prevRows || []).map((r) => [r.department_slug, r.total_del_millions])
      );
      for (const row of allRows.filter((r) => r.financial_year === curr)) {
        const prevTotal = prevByDept.get(row.department_slug);
        if (prevTotal == null || prevTotal === 0 || row.total_del_millions == null) continue;
        const pct = Number((((row.total_del_millions - prevTotal) / prevTotal) * 100).toFixed(2));
        await supabase
          .from('department_budgets')
          .update({ change_from_previous_percent: pct })
          .eq('department_slug', row.department_slug)
          .eq('financial_year', curr)
          .eq('source', 'hmt_main_estimates');
      }
    }
  }

  return NextResponse.json({
    ok: true,
    publications: results,
    rows_written: allRows.length,
    syncedAt: new Date().toISOString(),
  });
}
