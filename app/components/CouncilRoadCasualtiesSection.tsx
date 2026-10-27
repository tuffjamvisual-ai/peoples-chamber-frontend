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
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type Row = { year: number; measure: string; casualties: number | null; release_label: string };
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

// For the area summary (/your-area): the same latest year figures this section
// leads with. gssCode is the highway authority (the county council in two tier areas).
export async function loadRoadHeadline(gssCode: string | null) {
  if (!gssCode || !/^[EWS]/.test(gssCode)) return null;
  const { data, error: dataErr2 } = await supabase.from('council_road_casualties').select('year, measure, casualties').eq('council_gss_code', gssCode).order('year', { ascending: false }).limit(50);
  if (dataErr2 && dataErr2.code !== 'PGRST116') throw new Error(`CouncilRoadCasualtiesSection council_road_casualties: ${dataErr2.message}`);
  const rows = ((data ?? []) as { year: number; measure: string; casualties: number | null }[]);
  if (rows.length === 0) return null;
  const latest = rows[0].year;
  const get = (m: string) => {
    const v = rows.find((r) => r.year === latest && r.measure === m)?.casualties;
    return v == null ? null : Number(v);
  };
  // KSI as recorded, so "seriously injured" (KSI - killed) on Your area matches the council page's count
  // (owner's decision, 19 Oct 2026); the adjusted estimate is used only for the trend chart.
  return { year: latest, killed: get('killed'), ksi: get('ksi_unadjusted'), all: get('all') };
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

  const [{ data, error: dataErr }, { data: userData, error: userDataErr }] = await Promise.all([
    supabase.from('council_road_casualties').select('year, measure, casualties, release_label').eq('council_gss_code', gssCode).order('year').limit(1000),
    supabase.from('council_road_casualties_users').select('year, road_user, measure, casualties').eq('council_gss_code', gssCode).order('year', { ascending: false }).limit(1000),
  ]);
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [dataErr, userDataErr]) if (e && e.code !== 'PGRST116') throw new Error(`CouncilRoadCasualtiesSection (council_road_casualties, council_road_casualties_users): ${e.message}`);
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, casualties: r.casualties == null ? null : Number(r.casualties) }));
  if (rows.length === 0) return null;
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const latest = years[years.length - 1];
  const get = (y: number, m: string) => rows.find((r) => r.year === y && r.measure === m) ?? null;
  // Separate counts that add up to all casualties (owner's decision, 19 Oct 2026), from the figures as recorded by
  // the police: seriously injured = KSI as recorded - killed; slightly injured = all casualties - KSI as recorded.
  // No rates are shown (owner's rule: no "per X" figures).
  const cnt = (y: number, m: string) => get(y, m)?.casualties ?? null;
  const killedN = cnt(latest, 'killed');
  const ksiRec = cnt(latest, 'ksi_unadjusted');
  const allN = cnt(latest, 'all');
  const seriousN = ksiRec != null && killedN != null ? ksiRec - killedN : null;
  const slightN = allN != null && ksiRec != null ? allN - ksiRec : null;
  // Per year: killed; seriously injured as recorded (KSI as recorded - killed) and as DfT estimates it so that years
  // can be compared (KSI adjusted - killed), rounded to whole people; all casualties.
  const minus = (a: number | null, b: number | null) => (a != null && b != null ? Math.round(a - b) : null);
  const trend = years.map((y) => {
    const killed = cnt(y, 'killed');
    return { y, killed, seriousRecorded: minus(cnt(y, 'ksi_unadjusted'), killed), serious: minus(cnt(y, 'ksi_adjusted'), killed), all: cnt(y, 'all') };
  });
  const maxT = Math.max(1, ...trend.flatMap((t) => [t.killed ?? 0, t.serious ?? 0]));

  const users = ((userData ?? []) as UserRow[]).filter((u) => u.year === latest);
  const userRows = Object.keys(ROAD_USERS)
    .map((k) => ({
      label: ROAD_USERS[k],
      killed: users.find((u) => u.road_user === k && u.measure === 'killed')?.casualties ?? null,
      ksi: users.find((u) => u.road_user === k && u.measure === 'ksi_unadjusted')?.casualties ?? null,
    }))
    .map((u) => ({ ...u, serious: u.ksi != null && u.killed != null ? Number(u.ksi) - Number(u.killed) : null }))
    .filter((u) => u.killed != null || u.serious != null);
  const release = rows[rows.length - 1].release_label;
  const caveatYears: number[] = years.filter((y) => y === 2022 || y === 2023);

  const stat = (label: string, n: number | null) =>
    n != null && (
      <div style={{ flex: '1 1 150px', borderLeft: `3px solid ${INK}`, padding: '4px 0 4px 12px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: SERIF, fontSize: '30px', lineHeight: 1.1, color: INK }}><strong>{fmtNum(n)}</strong></div>
      </div>
    );

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 12px' }}>
        People killed or injured on roads reported to the police, {latest}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        {stat('Killed', killedN)}
        {stat('Seriously injured', seriousN)}
        {stat('Slightly injured', slightN)}
        {stat('All casualties', allN)}
      </div>

      {trend.some((t) => t.killed != null || t.serious != null) && (() => {
        // Two lines on one scale: killed, and seriously injured as DfT estimates it so that years can be compared
        // (KSI adjusted - killed; DfT guide to severity adjustments, Table 3). Rounded to whole people.
        const W = 600, H = 170, padL = 40, padR = 12, padT = 10, padB = 22;
        const xs = (i: number) => padL + (trend.length === 1 ? 0 : (i * (W - padL - padR)) / (trend.length - 1));
        const ys = (v: number) => padT + (H - padT - padB) * (1 - v / maxT);
        const line = (k: 'killed' | 'serious') => trend.map((t, i) => (t[k] == null ? null : `${xs(i).toFixed(1)},${ys(t[k] as number).toFixed(1)}`)).filter(Boolean).join(' ');
        const ticks = [0, Math.round(maxT / 2), Math.round(maxT)];
        return (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '6px' }}>Killed and seriously injured each year</figcaption>
          <svg
            role="img"
            aria-label={`Killed and seriously injured (estimated so that years can be compared) each year, ${years[0]} to ${latest}. Full figures are in the Yearly figures table below.`}
            viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: MONO }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={ys(t)} y2={ys(t)} stroke={INK_HAIRLINE} strokeWidth={1} />
                <text x={padL - 6} y={ys(t) + 4} textAnchor="end" fontSize="15" fill={INK}>{fmtNum(t)}</text>
              </g>
            ))}
            <polyline points={line('serious')} fill="none" stroke={INK} strokeWidth={2.5} />
            <polyline points={line('killed')} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeDasharray="6 4" />
            {trend.map((t, i) => (
              <g key={t.y}>
                {t.serious != null && <circle cx={xs(i)} cy={ys(t.serious)} r={3.5} fill={INK}><title>{`${t.y}: ${fmtNum(t.serious)} seriously injured (estimated so that years can be compared)`}</title></circle>}
                {t.killed != null && <circle cx={xs(i)} cy={ys(t.killed)} r={3.5} fill={ACCENT}><title>{`${t.y}: ${fmtNum(t.killed)} killed`}</title></circle>}
              </g>
            ))}
            <text x={padL} y={H - 4} fontSize="15" fill={INK}>{years[0]}</text>
            <text x={W - padR} y={H - 4} fontSize="15" fill={INK} textAnchor="end">{latest}</text>
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '6px' }}>
            <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `3px solid ${INK}`, verticalAlign: 'middle', marginRight: '6px' }} />Seriously injured (estimated so that years can be compared)</span>
            <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `3px dashed ${ACCENT}`, verticalAlign: 'middle', marginRight: '6px' }} />Killed</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, cursor: 'pointer' }}>Yearly figures</summary>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '6px', minWidth: '520px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Year</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Killed</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Seriously injured as recorded</th>
                    <th style={{ textAlign: 'right', padding: '2px 14px 2px 0', fontWeight: 'bold' }}>Seriously injured (estimated)</th>
                    <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 'bold' }}>All casualties</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trend].reverse().map((t) => {
                    const c = (v: number | null) => (v == null ? 'n/a' : fmtNum(v));
                    return (
                      <tr key={t.y}>
                        <td style={{ padding: '2px 14px 2px 0' }}>{t.y}{caveatYears.includes(t.y) ? ' *' : ''}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{c(t.killed)}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{c(t.seriousRecorded)}</td>
                        <td style={{ padding: '2px 14px 2px 0', textAlign: 'right' }}>{c(t.serious)}</td>
                        <td style={{ padding: '2px 0', textAlign: 'right' }}>{c(t.all)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {caveatYears.length > 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '6px 0 0' }}>* DfT flags unexpected data collection issues affecting some police forces&rsquo; figures for these years.</p>}
          </details>
        </figure>
        );
      })()}

      {userRows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>By road user, {latest}</caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Road user</th>
              <th style={{ textAlign: 'right', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Killed</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>Seriously injured</th>
            </tr>
          </thead>
          <tbody>
            {userRows.map((u) => (
              <tr key={u.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 20px 6px 0' }}>{u.label}</td>
                <td style={{ padding: '6px 20px 6px 0', textAlign: 'right' }}>{u.killed != null ? fmtNum(Number(u.killed)) : 'n/a'}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{u.serious != null ? fmtNum(u.serious) : 'n/a'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        These are casualties in collisions reported to the police on all roads in the council&rsquo;s area, including motorways and trunk roads it doesn&rsquo;t manage. Killed, seriously injured and slightly injured are counts as recorded by the police and add up to all casualties. Police forces have moved to an injury based recording system that classes more injuries as serious, so the Department for Transport estimates how many people would have been recorded as seriously injured if every force had used it. The chart uses that estimate, rounded to whole people, so that years can be compared.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        Source: Department for Transport, Reported road casualties Great Britain ({release}). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
