// "EHC plans" section for the Schools tab on council pages (server component, England). Reads council_ehcp —
// DfE's timeliness of new education, health and care plans (migration 2026-10-20e-council-ehcp.sql), excluding
// exceptions. Owner's decisions (20 Oct 2026): counts for the latest year, DfE's own percentage as published, and
// the change on the previous year in counts and percentage change only.
//
// Shown on education authorities. District councils issue no plans, so a district page gets one line pointing to its
// county's Schools tab.

import { pageDb } from '@/lib/page-reads';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const SOURCE_URL = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/90d7c9d3-d811-46f1-ae61-39ea674d4654';

type Row = {
  year: number;
  plans_issued_ex: number | null;
  within_20_weeks_ex: number | null;
  pc_within_20_weeks_ex: number | null;
  over_1_year_ex: number | null;
  notes: string | null;
};

const fmt = (n: number) => n.toLocaleString('en-GB');

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      EHC plans
    </h2>
  );
}

// "598 fewer (down 25.4%)", "216 more (up 27.6%)", "the same". No percentage when the earlier figure is under 20
// (owner's decision, 20 Oct 2026): from a small base it reads oddly ("370 more", not "up 4111.1%").
const MIN_BASE_FOR_PCT = 20;
function change(cur: number | null, prev: number | null): string | null {
  if (cur == null || prev == null) return null;
  const d = cur - prev;
  if (d === 0) return 'the same';
  const pct = prev >= MIN_BASE_FOR_PCT ? ` (${d > 0 ? 'up' : 'down'} ${(Math.abs(d) / prev * 100).toFixed(1)}%)` : '';
  return `${fmt(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'}${pct}`;
}

export default async function CouncilEhcpSection({
  gssCode,
  isDistrict,
  countyName,
  countySlug,
}: {
  gssCode: string | null;
  isDistrict: boolean;
  countyName?: string | null;
  countySlug?: string | null;
}) {
  if (!gssCode || !gssCode.startsWith('E')) return null;

  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>
          Education, health and care plans for children and young people here are issued by{' '}
          <a href={`/councils/${countySlug}#schools`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</a>
          , the education authority; its Schools tab shows how many it issued and how quickly.
        </p>
      </section>
    );
  }

  const [{ data, error }, { data: latestRow }] = await Promise.all([
    pageDb().from('council_ehcp').select('year, plans_issued_ex, within_20_weeks_ex, pc_within_20_weeks_ex, over_1_year_ex, notes').eq('gss', gssCode).order('year', { ascending: false }),
    pageDb().from('council_ehcp').select('year').order('year', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error || !data || data.length === 0) return null;
  const rows = data as Row[];
  const latestYear = (latestRow as { year: number } | null)?.year ?? rows[0].year;
  const shown = rows.find((r) => r.plans_issued_ex != null);
  if (!shown) return null;
  const prev = rows.find((r) => r.year === shown.year - 1 && r.plans_issued_ex != null) ?? null;

  // Why the latest year is missing: DfE gives no row (the stored note), or marks the year "x".
  let gapNote: string | null = null;
  if (shown.year < latestYear) {
    const latest = rows.find((r) => r.year === latestYear);
    gapNote = latest
      ? `DfE's file shows no figures for ${latestYear} (marked "x", not available), so ${shown.year} is shown.`
      : (shown.notes?.match(/DfE's file has no figures for [^.]*\./)?.[0] ?? `DfE's file has no figures for ${latestYear}.`);
  }

  const changes = prev && [
    ['plans issued', change(shown.plans_issued_ex, prev.plans_issued_ex)],
    ['issued within 20 weeks', change(shown.within_20_weeks_ex, prev.within_20_weeks_ex)],
    ['took over a year', change(shown.over_1_year_ex, prev.over_1_year_ex)],
  ].filter(([, t]) => t) as [string, string][];

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 10px' }}>
        EHC plans issued in {shown.year} (excluding exceptions): <strong>{fmt(shown.plans_issued_ex as number)}</strong>.
        {shown.within_20_weeks_ex != null && (
          <> Issued within 20 weeks: <strong>{fmt(shown.within_20_weeks_ex)}</strong>
            {shown.pc_within_20_weeks_ex != null ? ` (${shown.pc_within_20_weeks_ex}%)` : " (DfE gives no percentage)"}.</>
        )}
        {shown.over_1_year_ex != null && <> Took over a year: <strong>{fmt(shown.over_1_year_ex)}</strong>.</>}
      </p>
      {changes && changes.length > 0 && (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 10px' }}>
          Change on {prev!.year}: {changes.map(([label, t]) => `${label} ${t}`).join('; ')}.
        </p>
      )}
      {gapNote && (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 10px' }}>{gapNote}</p>
      )}
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 8px' }}>
        An education, health and care (EHC) plan sets out the support a child or young person with special educational needs
        must get; the council should issue one within 20 weeks of a request. All three figures leave out exceptions: cases
        where the law allows longer, such as a school being closed for the holidays or a family&rsquo;s exceptional circumstances.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>
        Source: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>DfE, Education, health and care plans, 2026 release</a>{' '}
        (calendar years). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
