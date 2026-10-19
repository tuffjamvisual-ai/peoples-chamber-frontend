// "Ratings" tab for council pages (server component, England only). Reads the area
// league table data through lib/council-league.ts (area_ratings, Statistical
// Neighbours, finance events and reserves, Ofsted children's services).
//
// District, unitary, metropolitan and London councils: area rating with every topic
// and the figures behind it, council services score, similar councils, financial
// health. County councils have no area rating of their own: they show their Ofsted
// children's services grade, financial health, similar county councils and the
// ratings of their districts. Councils outside England render nothing, so the tab
// hides itself.
//
// Wording rule: the area rating describes the area, not how well the council is run.

import type { CSSProperties } from 'react';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';
import { getLeagueData, getCouncilFinance, TOPIC_NAMES, SERVICE_PARTS, MEASURE_TOPIC, formatPeriod, bandLabel, ordinal } from '@/lib/council-league';
import type { LeagueRow, LeagueFlag, FinanceEvent, ReserveDetail } from '@/lib/council-league';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
const small: CSSProperties = { fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 10px', maxWidth: '46em' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };
const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', verticalAlign: 'bottom' };
const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

const NARROW_CSS = `@media (max-width: 760px) {
  .cr-table { font-size: 14px !important; }
  .cr-table th, .cr-table td { padding-right: 5px !important; overflow-wrap: anywhere; }
  .cr-table th { white-space: normal !important; }
}`;

const GRADE_WORDS = ['', 'Outstanding', 'Good', 'Requires improvement', 'Inadequate'];
const fmt1 = (v: number | null | undefined) => (v == null ? 'n/a' : (Math.round(v * 10) / 10).toFixed(1));
const gbpM = (thousands: number | null) => (thousands == null ? 'n/a' : `${thousands < 0 ? '−' : ''}£${(Math.abs(thousands) / 1000).toFixed(1)}m`);

function measureValue(key: string, value: number): string {
  if (key === 'childrens_services') return GRADE_WORDS[Math.round(value)] ?? String(value);
  return fmt1(value);
}

// The stored label for children's services describes the 1-4 scale; the page shows the grade in words.
function measureLabel(key: string, label: string): string {
  return key === 'childrens_services' ? "Ofsted children's services grade" : label;
}

function Bar({ score }: { score: number | null }) {
  const w = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <span aria-hidden="true" style={{ display: 'inline-block', width: '120px', height: '9px', border: `1px solid ${INK}`, verticalAlign: 'middle', marginRight: '8px', position: 'relative' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${w}%`, background: INK }} />
    </span>
  );
}

function Flags({ flags }: { flags: LeagueFlag[] }) {
  if (!flags.length) return null;
  return <>{flags.map((f) => <div key={f.label + f.county} style={{ color: ACCENT }}>{f.label}{f.county ? ' (county)' : ''}</div>)}</>;
}

function eventLabel(e: FinanceEvent): string {
  if (e.event_type === 'section_114') return `Section 114 notice${e.event_date ? `, ${new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`;
  if (e.event_type === 'intervention') return `Government intervention since ${e.period}`;
  if (e.event_type === 'best_value_inspection') return `Best value inspection, ${e.period}`;
  if (e.event_type === 'exceptional_support') return `Exceptional financial support, ${e.period}${e.amount_gbp != null ? ` (£${(e.amount_gbp / 1e6).toFixed(1)}m)` : ''}`;
  return `${e.event_type}, ${e.period}`;
}

function FinanceHealth({ events, reserves, name }: { events: FinanceEvent[]; reserves: ReserveDetail | null; name: string }) {
  const pctChange = reserves && reserves.usable_start != null && reserves.usable_start > 0 && reserves.usable_change != null
    ? Math.round((reserves.usable_change / reserves.usable_start) * 100) : null;
  return (
    <section style={section}>
      <h2 style={h2}>Financial health</h2>
      {reserves ? (
        <p style={para}>
          Usable reserves (money the council holds that is not tied to schools or public health): <strong>{gbpM(reserves.usable_end)}</strong> at 31 March {`20${reserves.financial_year.slice(5, 7)}`}, from {gbpM(reserves.usable_start)} a year earlier
          {pctChange != null && ` (${pctChange > 0 ? 'up' : 'down'} ${Math.abs(pctChange)}%)`}.
          {reserves.usable_end_pct_of_spending != null && ` That is ${fmt1(reserves.usable_end_pct_of_spending)}% of a year’s spending on services.`}
          {reserves.usable_end != null && reserves.usable_end < 0 && <span style={{ color: ACCENT }}> Usable reserves are below zero.</span>}
        </p>
      ) : (
        <p style={para}>{name}’s reserves figures are not in the government’s published return for the latest year.</p>
      )}
      {events.length > 0 ? (
        <ul style={{ ...para, paddingLeft: '1.2em' }}>
          {events.map((e) => (
            <li key={`${e.event_type}-${e.period}`} style={{ marginBottom: '4px' }}>
              {eventLabel(e)} · <a href={e.source_url} style={{ color: INK }} rel="noopener noreferrer" target="_blank">source</a>
            </li>
          ))}
        </ul>
      ) : (
        <p style={para}>No section 114 notice, government intervention or exceptional financial support is on the record for this council.</p>
      )}
      {reserves && <p style={small}>Reserves: {reserves.source}, figures in the council’s own return.</p>}
    </section>
  );
}

export default async function CouncilRatingsSection({
  gssCode,
  type,
  name,
  districtCodes,
}: {
  gssCode: string | null;
  type: string;
  name: string;
  districtCodes: string[];
}) {
  if (!gssCode || !gssCode.startsWith('E')) return null;
  let data: Awaited<ReturnType<typeof getLeagueData>>;
  let finance: Awaited<ReturnType<typeof getCouncilFinance>>;
  try {
    [data, finance] = await Promise.all([getLeagueData(), getCouncilFinance(gssCode)]);
  } catch {
    return null;
  }
  const all = [...data.rows, ...data.separate];
  const byCode = new Map(all.map((r) => [r.code, r]));
  const councilByCode = new Map(data.councils.filter((c) => c.gss_code).map((c) => [c.gss_code, c]));
  const link = (code: string, label?: string) => {
    const c = councilByCode.get(code);
    const text = label ?? c?.short_name ?? c?.name ?? code;
    return c ? <a href={`/councils/${c.slug}`} style={{ color: INK }}>{text}</a> : text;
  };
  const row = byCode.get(gssCode);
  const neighbours = data.neighboursOf.get(gssCode) ?? [];
  const isCounty = type === 'county';
  if (!row && !isCounty) return null;

  // With the league table hidden (lib/feature-flags.ts), the tab keeps what is not a league score, topic score or
  // rank: Ofsted grades, warning flags, similar councils and financial health.
  const show = SHOW_LEAGUE_TABLE;
  const linkToTable = show && (
    <p style={small}>
      <a href="/councils/league-table" style={{ color: INK }}>See every area in the council area league table</a>, with how the scores are worked out and where every figure comes from.
    </p>
  );

  if (isCounty) {
    const ofsted = data.ofstedByCouncil.get(gssCode);
    const districts = districtCodes.map((c) => byCode.get(c)).filter((r): r is LeagueRow => !!r)
      // by rank when the league table is shown; by name when it is hidden, so the order does not give the ranking away
      .sort((a, b) => (SHOW_LEAGUE_TABLE ? (a.areaRank ?? 999) - (b.areaRank ?? 999) : a.name.localeCompare(b.name)));
    return (
      <div>
        <style>{NARROW_CSS}</style>
        <section style={section}>
          <h2 style={h2}>Ratings</h2>
          <p style={para}>
            County councils run services such as schools, children’s services and adult social care across their districts.{show && ' The area league table rates each district area, so the county’s picture is the districts below.'}
          </p>
          {ofsted?.grade && (
            <p style={para}>Ofsted children’s services: <strong style={ofsted.rank === 4 ? { color: ACCENT } : undefined}>{ofsted.grade}</strong> (inspection outcomes as at 31 March 2026).</p>
          )}
        </section>
        {districts.length > 0 && (
          <section style={section}>
            <h2 style={h2}>District areas</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="cr-table" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%' }}>
                <thead><tr><th style={th}>Area</th>{show && <><th style={th}>Area rating</th><th style={th}>Council services</th></>}<th style={th}>Warning flags</th></tr></thead>
                <tbody>
                  {districts.map((d) => (
                    <tr key={d.code}>
                      <td style={td}>{link(d.code, d.name)}</td>
                      {show && <td style={td}>{d.areaRank ? `${ordinal(d.areaRank)} · band ${d.areaBand}${d.nearBoundary ? ' ≈' : ''}` : 'Not ranked'}</td>}
                      {show && <td style={td}>{d.servicesRank ? `${ordinal(d.servicesRank)} · band ${d.servicesBand}` : 'n/a'}</td>}
                      <td style={{ ...td, fontSize: '14px' }}><Flags flags={d.flags.filter((f) => !f.county)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {show && <p style={small}>Ranks are out of {data.stability.ranked} areas in England. ≈ means close to the edge of its band.</p>}
          </section>
        )}
        <FinanceHealth events={finance.events} reserves={finance.reserves} name={name} />
        {neighbours.length > 0 && (
          <section style={section}>
            <h2 style={h2}>Similar county councils</h2>
            <p style={para}>The councils the government’s Statistical Neighbours model (1 July 2026) judges most like {name}, most similar first.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="cr-table" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%' }}>
                <thead><tr><th style={th}>Council</th><th style={th}>Ofsted children’s services</th><th style={th}>Warning flags</th></tr></thead>
                <tbody>
                  {[gssCode, ...neighbours].map((code) => (
                    <tr key={code} style={code === gssCode ? { fontWeight: 'bold' } : undefined}>
                      <td style={td}>{code === gssCode ? name : link(code)}</td>
                      <td style={td}>{data.ofstedByCouncil.get(code)?.grade ?? 'n/a'}</td>
                      <td style={{ ...td, fontSize: '14px', fontWeight: 'normal' }}><Flags flags={data.flagsByCouncil.get(code) ?? []} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {linkToTable}
      </div>
    );
  }

  const r = row as LeagueRow;
  const ranked = data.stability.ranked;
  return (
    <div>
      <style>{NARROW_CSS}</style>
      {!show && r.flags.length > 0 && (
        <section style={section}>
          <h2 style={h2}>Warning flags</h2>
          <div style={para}><Flags flags={r.flags} /></div>
        </section>
      )}
      {show && <>
      <section style={section}>
        <h2 style={h2}>Area rating</h2>
        {r.areaRank != null ? (
          <p style={{ fontFamily: MONO, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 10px' }}>
            <strong>{ordinal(r.areaRank)}</strong> of {ranked} areas in England · band {r.areaBand} ({bandLabel(r.areaBand)}) · score {fmt1(r.areaScore)}
          </p>
        ) : (
          <p style={para}><strong>Not ranked.</strong> {r.excludedReason} Area score {fmt1(r.areaScore)}.</p>
        )}
        <p style={para}>
          How the area compares with the rest of England. Much of this depends on things no council controls, such as local incomes and history, so it describes the area, not how well the council is run.
          {r.nearBoundary && r.bandChanges != null && ` The area is close to the edge of its band: in the weight test its band changed in ${r.bandChanges} of ${r.bandVersions} versions.`}
        </p>
        {TOPIC_NAMES.map((t) => {
          const ms = Object.keys(MEASURE_TOPIC).filter((k) => MEASURE_TOPIC[k] === t && r.measures[k]).map((k) => [k, r.measures[k]] as const);
          return (
            <div key={t} style={{ marginBottom: '14px' }}>
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>
                <Bar score={r.topics[t] ?? null} /><strong>{t}</strong>: {r.topics[t] != null ? fmt1(r.topics[t]) : 'no figures'}
              </div>
              {ms.map(([k, m]) => (
                <div key={k} style={{ ...small, margin: '2px 0 0 16px' }}>
                  {measureLabel(k, m.label)}: <strong>{measureValue(k, m.value)}</strong>{m.period ? ` (${formatPeriod(m.period)})` : ''}{m.score != null ? ` · score ${fmt1(m.score)}` : ''}
                </div>
              ))}
            </div>
          );
        })}
        <p style={small}>Scores run from 0 (lowest of all areas in England) to 100 (highest). For a district, services run by the county and health figures published only for the county come from its county.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>Council services</h2>
        {r.servicesRank != null ? (
          <p style={{ fontFamily: MONO, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 10px' }}>
            <strong>{ordinal(r.servicesRank)}</strong> of {r.servicesRanked} · band {r.servicesBand} ({bandLabel(r.servicesBand)}) · score {fmt1(r.servicesScore)}
            {r.peer && <> · <strong>{ordinal(r.peer.rank)} of {r.peer.of}</strong> among similar councils</>}
          </p>
        ) : (
          <p style={para}>{r.servicesScore != null ? `Not ranked (score ${fmt1(r.servicesScore)}).` : 'No council services score: figures for fewer than three of the four parts.'}</p>
        )}
        {SERVICE_PARTS.map((p) => (
          <div key={p.key} style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '6px' }}>
            <Bar score={r.services[p.key] ?? null} />{p.label}: {r.services[p.key] != null ? fmt1(r.services[p.key]) : 'no figures'}
          </div>
        ))}
        <p style={small}>
          {type === 'district' ? 'Schools and children’s services in this area are run by the county council; recycling and planning by this council. ' : ''}
          Planning averages major and other decisions made on time. Adult social care will join when the Care Quality Commission’s ratings can be added.
        </p>
        {r.flags.length > 0 && (
          <div style={{ ...para, marginTop: '10px' }}><strong>Warning flags</strong><Flags flags={r.flags} /></div>
        )}
      </section>
      </>}

      {neighbours.length > 0 && (
        <section style={section}>
          <h2 style={h2}>Similar councils</h2>
          <p style={para}>The 15 councils the government’s Statistical Neighbours model (1 July 2026) judges most like {name}, most similar first.{show && ' This is the fairest comparison.'}</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="cr-table" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%' }}>
              <thead>
                <tr><th style={th}>Council</th>{show && <><th style={th}>Area band</th><th style={{ ...th, textAlign: 'right' }}>Services score</th></>}<th style={th}>Warning flags</th></tr>
              </thead>
              <tbody>
                {[gssCode, ...neighbours].map((code) => {
                  const n = byCode.get(code);
                  return (
                    <tr key={code} style={code === gssCode ? { fontWeight: 'bold' } : undefined}>
                      <td style={td}>{code === gssCode ? name : link(code, n?.name)}</td>
                      {show && <td style={td}>{n?.areaBand != null ? `${n.areaBand}${n.nearBoundary ? ' ≈' : ''}` : 'n/a'}</td>}
                      {show && <td style={tdNum}>{fmt1(n?.servicesScore)}</td>}
                      <td style={{ ...td, fontSize: '14px', fontWeight: 'normal' }}><Flags flags={n ? n.flags : data.flagsByCouncil.get(code) ?? []} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {show && <p style={small}>≈ means close to the edge of its band.</p>}
        </section>
      )}

      <FinanceHealth events={finance.events} reserves={finance.reserves} name={name} />
      {linkToTable}
    </div>
  );
}
