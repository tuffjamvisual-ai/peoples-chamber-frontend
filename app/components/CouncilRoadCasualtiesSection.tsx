// "Road casualties" section for council pages (server component, Great
// Britain). Reads council_road_casualties and council_road_casualties_users —
// DfT table RAS0403; see scripts/migrations/2026-10-11m-council-road-casualties.sql.
//
// Figures are by highway authority (county, unitary, metropolitan and
// London borough, Scottish and Welsh councils). District councils are not
// highway authorities, so a district page gets one line pointing to its
// county council instead.
//
// The trend is a single-series bar chart (killed or seriously injured,
// adjusted, so years are comparable), one ink colour, native tooltips, with
// every year and measure in the table under "Yearly figures".

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

type Row = { year: number; measure: string; casualties: number | null; rate_per_bn_miles: number | null; release_label: string };
type UserRow = { year: number; road_user: string; measure: string; casualties: number | null };

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const ROAD_USERS: Record<string, string> = {
  'Pedestrian': 'Pedestrians',
  'Pedal Cyclist': 'Cyclists',
  'Motor Cyclist': 'Motorcyclists',
  'Car Occupant': 'Car occupants',
  'Bus Occupant': 'Bus or coach occupants',
  'Van Occupant': 'Van occupants',
  'HGV Occupant': 'Lorry (HGV) occupants',
  'Other Veh Occupant': 'Other vehicle occupants',
};

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Road casualties
    </h2>
  );
}

export default async function CouncilRoadCasualtiesSection({
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
  if (!gssCode || !/^[EWS]/.test(gssCode)) return null;

  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>
          Roads here (apart from motorways and major trunk roads) are the responsibility of{' '}
          <a href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</a>
          , which shows road casualty figures for the whole county.
        </p>
      </section>
    );
  }

  const [{ data }, { data: userData }] = await Promise.all([
    supabase.from('council_road_casualties').select('year, measure, casualties, rate_per_bn_miles, release_label').eq('council_gss_code', gssCode).order('year').limit(1000),
    supabase.from('council_road_casualties_users').select('year, road_user, measure, casualties').eq('council_gss_code', gssCode).order('year', { ascending: false }).limit(1000),
  ]);
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, casualties: r.casualties == null ? null : Number(r.casualties), rate_per_bn_miles: r.rate_per_bn_miles == null ? null : Number(r.rate_per_bn_miles) }));
  if (rows.length === 0) return null;
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const latest = years[years.length - 1];
  const get = (y: number, m: string) => rows.find((r) => r.year === y && r.measure === m) ?? null;
  const killed = get(latest, 'killed');
  const ksi = get(latest, 'ksi_adjusted') ?? get(latest, 'ksi_unadjusted');
  const all = get(latest, 'all');
  const trend = years.map((y) => ({ y, v: get(y, 'ksi_adjusted')?.casualties ?? null }));
  const maxT = Math.max(1, ...trend.map((t) => t.v ?? 0));

  const users = ((userData ?? []) as UserRow[]).filter((u) => u.year === latest);
  const userRows = Object.keys(ROAD_USERS)
    .map((k) => ({
      label: ROAD_USERS[k],
      killed: users.find((u) => u.road_user === k && u.measure === 'killed')?.casualties ?? null,
      ksi: users.find((u) => u.road_user === k && u.measure === 'ksi_unadjusted')?.casualties ?? null,
    }))
    .filter((u) => u.killed != null || u.ksi != null);
  const release = rows[rows.length - 1].release_label;
  const caveatYears: number[] = years.filter((y) => y === 2022 || y === 2023);

  const stat = (label: string, r: Row | null, decimals = 0) =>
    r?.casualties != null && (
      <div style={{ flex: '1 1 180px', borderLeft: `3px solid ${INK}`, padding: '4px 0 4px 12px' }}>
        <div style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: SERIF, fontSize: '30px', lineHeight: 1.1, color: INK }}><strong>{decimals ? r.casualties.toFixed(decimals) : fmtNum(r.casualties)}</strong></div>
        {r.rate_per_bn_miles != null && <div style={{ fontFamily: MONO, fontSize: '14px', color: INK }}>{r.rate_per_bn_miles.toFixed(1)} per billion vehicle miles</div>}
      </div>
    );

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 12px' }}>
        People killed or injured on roads reported to the police, {latest}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        {stat('Killed', killed)}
        {stat('Killed or seriously injured', ksi)}
        {stat('All casualties', all)}
      </div>

      {trend.some((t) => t.v != null) && (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '6px' }}>Killed or seriously injured each year (adjusted)</figcaption>
          <div
            role="img"
            aria-label={`Killed or seriously injured each year (adjusted), ${years[0]} to ${latest}. Full figures are in the Yearly figures table below.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '90px', borderBottom: `1px solid ${INK}` }}
          >
            {trend.map((t) => (
              <div key={t.y} title={t.v != null ? `${t.y}: ${t.v.toFixed(0)} killed or seriously injured (adjusted)` : `${t.y}: not available`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}>
                {t.v != null && <div style={{ width: '100%', height: `${Math.max(2, (t.v / maxT) * 100)}%`, background: INK, borderRadius: '2px 2px 0 0' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '4px' }}>
            <span>{years[0]}</span>
            <span>{latest}</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '14px', color: ACCENT, cursor: 'pointer' }}>Yearly figures</summary>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '6px', minWidth: '460px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Year</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Killed</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>KSI as recorded</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>KSI adjusted</th>
                    <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 'bold' }}>All casualties</th>
                  </tr>
                </thead>
                <tbody>
                  {[...years].reverse().map((y) => {
                    const cell = (m: string, d = 0) => { const v = get(y, m)?.casualties; return v == null ? '—' : d ? v.toFixed(d) : fmtNum(v); };
                    return (
                      <tr key={y}>
                        <td style={{ padding: '2px 14px 2px 0' }}>{y}{caveatYears.includes(y) ? ' *' : ''}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{cell('killed')}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{cell('ksi_unadjusted')}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{cell('ksi_adjusted', 1)}</td>
                        <td style={{ padding: '2px 0', textAlign: 'right' }}>{cell('all')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {caveatYears.length > 0 && <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '6px 0 0' }}>* DfT flags unexpected data collection issues affecting some police forces&rsquo; figures for these years.</p>}
          </details>
        </figure>
      )}

      {userRows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, paddingBottom: '6px' }}>By road user, {latest}</caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Road user</th>
              <th style={{ textAlign: 'right', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Killed</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>Killed or seriously injured</th>
            </tr>
          </thead>
          <tbody>
            {userRows.map((u) => (
              <tr key={u.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 20px 6px 0' }}>{u.label}</td>
                <td style={{ padding: '6px 20px 6px 0', textAlign: 'right' }}>{u.killed != null ? fmtNum(Number(u.killed)) : '—'}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{u.ksi != null ? fmtNum(Number(u.ksi)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        These are casualties in collisions reported to the police on all roads in the council&rsquo;s area, including motorways and trunk roads it doesn&rsquo;t manage. Police forces have moved to an injury-based recording system that classes more injuries as serious, so the Department for Transport publishes an adjusted &ldquo;killed or seriously injured&rdquo; estimate to allow fair comparison between years; the trend uses the adjusted figure, and the road-user table uses figures as recorded. Rates are per billion miles driven by motor vehicles in the area.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: 0 }}>
        Source: Department for Transport, Reported road casualties Great Britain ({release}). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
