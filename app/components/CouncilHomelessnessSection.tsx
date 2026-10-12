// "Homelessness" section for council pages (server component, England only).
// Reads council_homelessness — MHCLG statutory homelessness detailed local
// authority tables; see scripts/migrations/2026-10-11i-council-homelessness.sql.
//
// County councils have no rows of their own: their figures are the sum of
// their district councils (gssCodes). A county figure for a quarter is only
// shown when every district has it, so a total is never silently partial.
//
// The trend is a single-series bar chart (households in temporary
// accommodation at the end of each quarter), one ink colour, native
// tooltips, empty slots for quarters with no published figure, and the
// figures in a table under "Quarterly figures".

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

type Row = {
  council_gss_code: string;
  period_start: string;
  period_label: string;
  owed_duty_total: number | null;
  owed_prevention: number | null;
  owed_prevention_s21: number | null;
  owed_relief: number | null;
  households_thousands: number | null;
  ta_total: number | null;
  ta_with_children: number | null;
  ta_children: number | null;
  ta_bb: number | null;
  ta_bb_children: number | null;
  ta_nightly_paid: number | null;
  ta_nightly_paid_children: number | null;
  ta_hostels: number | null;
  ta_hostels_children: number | null;
  ta_private_sector: number | null;
  ta_private_sector_children: number | null;
  ta_la_ha_stock: number | null;
  ta_la_ha_stock_children: number | null;
  ta_other: number | null;
  ta_other_children: number | null;
  ta_in_another_la: number | null;
  ta_no_accommodation_secured: number | null;
  release_status: string;
};
type Field = Exclude<keyof Row, 'council_gss_code' | 'period_start' | 'period_label' | 'release_status'>;

const SELECT = 'council_gss_code, period_start, period_label, owed_duty_total, owed_prevention, owed_prevention_s21, owed_relief, households_thousands, ta_total, ta_with_children, ta_children, ta_bb, ta_bb_children, ta_nightly_paid, ta_nightly_paid_children, ta_hostels, ta_hostels_children, ta_private_sector, ta_private_sector_children, ta_la_ha_stock, ta_la_ha_stock_children, ta_other, ta_other_children, ta_in_another_la, ta_no_accommodation_secured, release_status';

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const fmtRate = (n: number) => n.toFixed(1);
const QUARTER_END: Record<string, string> = { '01': '31 March', '04': '30 June', '07': '30 September', '10': '31 December' };
const quarterEnd = (p: string) => `${QUARTER_END[p.slice(5, 7)]} ${p.slice(0, 4)}`;
const shortQ = (p: string) => `Q${(Number(p.slice(5, 7)) + 2) / 3} ${p.slice(0, 4)}`;

// PostgREST caps responses at 1,000 rows; a county's ~12 districts x ~28
// quarters is under that, but page anyway so growth can't truncate it.
async function fetchAll(codes: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await supabase
      .from('council_homelessness')
      .select(SELECT)
      .in('council_gss_code', codes)
      .order('period_start', { ascending: true })
      .order('council_gss_code', { ascending: true })
      .range(from, from + 999);
    if (error || !data) break;
    out.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  return out;
}

export default async function CouncilHomelessnessSection({ gssCodes, isCounty }: { gssCodes: string[]; isCounty: boolean }) {
  if (gssCodes.length === 0 || !gssCodes.every((c) => c.startsWith('E'))) return null;
  const rows = await fetchAll(gssCodes);
  if (rows.length === 0) return null;

  const byPeriod = new Map<string, Row[]>();
  for (const r of rows) byPeriod.set(r.period_start, [...(byPeriod.get(r.period_start) ?? []), r]);
  const periods = [...byPeriod.keys()].sort();
  const labelOf = (p: string) => byPeriod.get(p)![0].period_label;

  // Sum a field across the councils for a quarter; null unless every council has it.
  const combine = (p: string, f: Field): number | null => {
    const list = byPeriod.get(p) ?? [];
    if (list.length < gssCodes.length) return null;
    let s = 0;
    for (const r of list) {
      const v = r[f];
      if (v == null) return null;
      s += Number(v);
    }
    return s;
  };

  const newest = periods[periods.length - 1];
  const latestA1 = [...periods].reverse().find((p) => combine(p, 'owed_duty_total') != null) ?? null;
  const latestTA = [...periods].reverse().find((p) => combine(p, 'ta_total') != null) ?? null;
  if (!latestA1 && !latestTA) return null;
  const provisional = (byPeriod.get(newest) ?? []).some((r) => r.release_status === 'provisional');

  const hhA1 = latestA1 ? combine(latestA1, 'households_thousands') : null;
  const owed = latestA1 ? combine(latestA1, 'owed_duty_total') : null;
  const prevention = latestA1 ? combine(latestA1, 'owed_prevention') : null;
  const relief = latestA1 ? combine(latestA1, 'owed_relief') : null;
  const s21 = latestA1 ? combine(latestA1, 'owed_prevention_s21') : null;

  const hhTA = latestTA ? combine(latestTA, 'households_thousands') : null;
  const ta = latestTA ? combine(latestTA, 'ta_total') : null;
  const taKids = latestTA ? combine(latestTA, 'ta_with_children') : null;
  const children = latestTA ? combine(latestTA, 'ta_children') : null;
  const anotherLA = latestTA ? combine(latestTA, 'ta_in_another_la') : null;
  const noAccom = latestTA ? combine(latestTA, 'ta_no_accommodation_secured') : null;

  const types: { label: string; total: Field; kids: Field }[] = [
    { label: 'Bed and breakfast hotels', total: 'ta_bb', kids: 'ta_bb_children' },
    { label: 'Nightly-paid self-contained rooms or flats', total: 'ta_nightly_paid', kids: 'ta_nightly_paid_children' },
    { label: 'Hostels and refuges', total: 'ta_hostels', kids: 'ta_hostels_children' },
    { label: 'Private homes leased for the purpose', total: 'ta_private_sector', kids: 'ta_private_sector_children' },
    { label: 'Council or housing association homes', total: 'ta_la_ha_stock', kids: 'ta_la_ha_stock_children' },
    { label: 'Other (including private landlords)', total: 'ta_other', kids: 'ta_other_children' },
  ];
  const typeRows = latestTA ? types.map((t) => ({ label: t.label, total: combine(latestTA, t.total), kids: combine(latestTA, t.kids) })) : [];

  const trend = periods.map((p) => ({ p, ta: combine(p, 'ta_total'), owed: combine(p, 'owed_duty_total') }));
  const maxTA = Math.max(1, ...trend.map((t) => t.ta ?? 0));
  const gaps = trend.filter((t) => t.ta == null).map((t) => labelOf(t.p));
  const per1000 = (n: number | null, hh: number | null) => (n != null && hh ? n / hh : null);

  const stat = (label: string, value: number | null, sub: string | null) =>
    value != null && (
      <div style={{ flex: '1 1 200px', borderLeft: `3px solid ${INK}`, padding: '4px 0 4px 12px' }}>
        <div style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: SERIF, fontSize: '30px', lineHeight: 1.1, color: INK }}><strong>{fmtNum(value)}</strong></div>
        {sub && <div style={{ fontFamily: MONO, fontSize: '14px', color: INK }}>{sub}</div>}
      </div>
    );

  const preventionRate = per1000(prevention, hhA1);
  const reliefRate = per1000(relief, hhA1);
  const taRate = per1000(ta, hhTA);

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Homelessness
      </h2>

      {latestA1 && owed != null && (
        <>
          <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
            <strong>{fmtNum(owed)}</strong> households were owed help by the council because they were homeless or at risk, {labelOf(latestA1)}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '12px 0 18px' }}>
            {stat('Threatened with homelessness', prevention, preventionRate != null ? `${fmtRate(preventionRate)} per 1,000 households${s21 != null ? ` · ${fmtNum(s21)} after a section 21 (“no-fault”) eviction notice` : ''}` : null)}
            {stat('Already homeless', relief, reliefRate != null ? `${fmtRate(reliefRate)} per 1,000 households` : null)}
          </div>
        </>
      )}

      {latestTA && ta != null && (
        <>
          <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
            <strong>{fmtNum(ta)}</strong> households in temporary accommodation on {quarterEnd(latestTA)}
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
            {[
              taRate != null ? `${fmtRate(taRate)} per 1,000 households` : null,
              taKids != null ? `${fmtNum(taKids)} with children` : null,
              children != null ? `${fmtNum(children)} children` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </>
      )}

      {trend.some((t) => t.ta != null) && (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '6px' }}>Households in temporary accommodation at the end of each quarter</figcaption>
          <div
            role="img"
            aria-label={`Households in temporary accommodation at the end of each quarter, ${labelOf(trend[0].p)} to ${labelOf(newest)}. Full figures are in the Quarterly figures table below.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px', borderBottom: `1px solid ${INK}` }}
          >
            {trend.map((t) => (
              <div
                key={t.p}
                title={t.ta != null ? `${quarterEnd(t.p)}: ${fmtNum(t.ta)} households` : `${labelOf(t.p)}: not published`}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
              >
                {t.ta != null
                  ? <div style={{ width: '100%', height: `${Math.max(2, (t.ta / maxTA) * 100)}%`, background: INK, borderRadius: '2px 2px 0 0' }} />
                  : <div style={{ width: '100%', height: '100%', borderBottom: `2px dotted ${INK_HAIRLINE}` }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '13px', color: INK, marginTop: '4px' }}>
            <span>{shortQ(trend[0].p)}</span>
            <span>{shortQ(newest)}</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '14px', color: ACCENT, cursor: 'pointer' }}>Quarterly figures</summary>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '6px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '2px 16px 2px 0', fontWeight: 'bold' }}>Quarter</th>
                  <th style={{ textAlign: 'right', padding: '2px 16px 2px 0', fontWeight: 'bold' }}>Owed help</th>
                  <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 'bold' }}>In temporary accommodation</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.p}>
                    <td style={{ padding: '2px 16px 2px 0' }}>{labelOf(t.p)}</td>
                    <td style={{ padding: '2px 16px 2px 0', textAlign: 'right' }}>{t.owed != null ? fmtNum(t.owed) : 'not published'}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{t.ta != null ? fmtNum(t.ta) : 'not published'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>
      )}

      {latestTA && typeRows.some((t) => t.total != null) && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, paddingBottom: '6px' }}>
            Type of temporary accommodation, {quarterEnd(latestTA)}
          </caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 'bold' }}>Type</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'bold' }}>Households</th>
              <th style={{ textAlign: 'right', padding: '6px 0 6px 8px', fontWeight: 'bold' }}>With children</th>
            </tr>
          </thead>
          <tbody>
            {typeRows.map((t) => (
              <tr key={t.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 8px 6px 0' }}>{t.label}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{t.total != null ? fmtNum(t.total) : 'not published'}</td>
                <td style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>{t.kids != null ? fmtNum(t.kids) : 'not published'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {latestTA && (anotherLA != null || noAccom != null) && (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>
          {[
            anotherLA != null ? `${fmtNum(anotherLA)} households placed in temporary accommodation in another council's area` : null,
            noAccom != null ? `${fmtNum(noAccom)} owed temporary accommodation but none yet secured` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Housing and homelessness are district council responsibilities, so figures for this county are the total of its district councils; a quarter is shown only when every district reported it. '}
        Councils must help households threatened with homelessness within 56 days (prevention duty) and those already homeless (relief duty), and may house them in temporary accommodation while longer-term housing is found.
        {latestA1 && latestA1 !== newest && ` Figures for ${labelOf(newest)} were not submitted, so the latest available quarter is shown.`}
        {latestTA && latestTA !== newest && latestA1 === newest && ` Temporary accommodation figures for ${labelOf(newest)} were not submitted, so the latest available quarter is shown.`}
        {provisional && ` Figures for ${labelOf(newest)} are provisional and may be revised.`}
        {' '}&ldquo;Not published&rdquo; means the council did not submit figures or MHCLG suppressed small numbers to protect households.
        {gaps.length > 0 && ` No temporary accommodation figure is available for: ${gaps.join(', ')}.`}
        {periods[0] > '2019-04-01' && ` Figures start in ${labelOf(periods[0])}, when this council was created.`}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '13px', color: INK, margin: 0 }}>
        Source: Ministry of Housing, Communities and Local Government, Statutory homelessness: detailed local authority level tables (accredited official statistics). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
