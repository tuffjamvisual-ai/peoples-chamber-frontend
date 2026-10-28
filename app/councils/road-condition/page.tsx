// /councils/road-condition: road condition in every English highway authority (owner's approval, 28 Oct 2026). One
// ranking per road type: the share of road where maintenance should have been considered (red) in the year to March
// 2026, the last year of DfT's red, amber and green series. Figures DfT flags as surveyed by an alternative method are
// left out of the rankings and listed with DfT's warning. England is DfT's figure as published. Data:
// council_road_condition (migration 2026-10-28g), wording in lib/road-condition.ts.

import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import LastUpdated from '../../components/LastUpdated';
import '../../components/phone-table.css';
import { supabase } from '@/lib/supabase';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import {
  loadLatestTwoYears, value, valueText, notComparable, changeText, fye, ROAD_TYPES, EXPLAINER, NOT_COMPARABLE_WARNING,
  LAST_YEAR_NOTE, ENGLAND_NOTE, SOURCE_PAGE, SOURCE_LABEL, PUBLICATION, OGL, OGL_URL, RANKING_PATH, SYMBOL_MEANING, type RoadRow,
} from '@/lib/road-condition';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Road condition by council',
  description: PAGE_DESCRIPTIONS[RANKING_PATH],
  alternates: { canonical: RANKING_PATH },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';
const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap' };
const thWrap: CSSProperties = { ...th, whiteSpace: 'normal' };
const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` };
const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const tdNote: CSSProperties = { ...td, textAlign: 'right' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };

type Area = { code: string; name: string; slug: string; cur: RoadRow; prev: RoadRow | undefined };

export default async function RoadConditionPage() {
  const [{ latest, rows }, councilsRes] = await Promise.all([
    loadLatestTwoYears(),
    supabase.from('councils').select('gss_code, slug, short_name, name').eq('country', 'England').neq('type', 'district'),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  if (!latest) return null;
  const prevYear = `${Number(latest.slice(0, 4)) - 1}-03-31`;
  const at = (code: string, y: string) => rows.find((r) => r.ons_code === code && r.year.slice(0, 10) === y.slice(0, 10));
  const eng = at('E92000001', latest);
  const engPrev = at('E92000001', prevYear);
  const list: Area[] = (councilsRes.data ?? []).map((c) => {
    const cur = at(c.gss_code as string, latest);
    return cur ? { code: c.gss_code as string, name: (c.short_name as string) || (c.name as string), slug: c.slug as string, cur, prev: at(c.gss_code as string, prevYear) } : null;
  }).filter((x): x is Area => !!x);

  return (
    <OpenGovShell pageStamp="Road condition">
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · Councils · Roads
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Road Condition by Council
          </h1>
        </header>

        <p style={para}>
          County, unitary, metropolitan and London borough councils are the highway authorities for local roads; district councils are not. These are the shares of each council&rsquo;s roads where maintenance should have been considered, in {fye(latest)}.
        </p>
        {eng && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
            {ROAD_TYPES.map((t) => {
              const ch = changeText(eng, engPrev, t.field);
              return (
                <li key={t.key} style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' }}>
                  England, {t.label}: <strong>{valueText(eng, t.field)}</strong>{ch ? <span style={{ fontSize: '15px' }}> ({ch})</span> : null}
                </li>
              );
            })}
          </ul>
        )}
        <p style={para}>{ENGLAND_NOTE}</p>
        <p style={{ ...para, borderLeft: `3px solid ${ACCENT}`, paddingLeft: '12px' }}>
          <strong>The last year of this series.</strong> {LAST_YEAR_NOTE} (<a href={PUBLICATION} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>DfT, Road conditions in England to March 2026</a>.)
        </p>

        <section style={section}>
          <h2 style={h2}>What the figures mean</h2>
          {EXPLAINER.map((p) => <p key={p.slice(0, 20)} style={para}>{p}</p>)}
          <p style={para}>This is from the notes to DfT&rsquo;s <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>road condition data tables</a>.</p>
        </section>

        {ROAD_TYPES.map((t) => {
          const ranked = list.filter((r) => value(r.cur, t.field) != null && !notComparable(r.cur, t.field))
            .sort((a, b) => value(a.cur, t.field)! - value(b.cur, t.field)! || a.name.localeCompare(b.name));
          // Lowest share of red road first; equal figures share a rank.
          const rk: number[] = [];
          ranked.forEach((r, i) => rk.push(i > 0 && value(ranked[i - 1].cur, t.field) === value(r.cur, t.field) ? rk[i - 1] : i + 1));
          const flagged = list.filter((r) => notComparable(r.cur, t.field)).sort((a, b) => a.name.localeCompare(b.name));
          const none = list.filter((r) => value(r.cur, t.field) == null).sort((a, b) => a.name.localeCompare(b.name));
          return (
            <section key={t.key} style={section}>
              <h2 style={h2}>{t.label}</h2>
              <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={th}>Rank</th>
                    <th style={th}>Council</th>
                    <th style={{ ...thWrap, textAlign: 'right' }}>Red (per cent)</th>
                    <th style={{ ...thWrap, textAlign: 'right' }}>Change on the year</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, i) => {
                    const ch = notComparable(r.prev, t.field) ? null : changeText(r.cur, r.prev, t.field);
                    return (
                      <tr key={r.code}>
                        <td data-label="Rank" style={td}>{rk[i]}</td>
                        <td data-label="" className="pt-card-title" style={td}><Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link></td>
                        <td data-label="Red (per cent)" style={tdNum}>{value(r.cur, t.field)}</td>
                        <td data-label="Change on the year" style={tdNote}>{ch ? ch.replace(/ on the year to March \d{4}$/, '') : 'not published'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ ...para, marginTop: '10px' }}>
                Lowest share of red road first, {fye(latest)}; change in percentage points on {fye(prevYear)}. England: {valueText(eng, t.field)}.
                {t.key === 'u' ? ' Councils survey unclassified roads in different ways, so DfT advises caution comparing them.' : ''}
              </p>
              {flagged.length > 0 && (
                <p style={para}>
                  Not ranked, because DfT flags the figure as not comparable ({flagged.length}): {flagged.map((r, i) => (
                    <span key={r.code}>{i > 0 && ', '}<Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link> {value(r.cur, t.field)}</span>
                  ))}. {NOT_COMPARABLE_WARNING}
                </p>
              )}
              {none.length > 0 && (
                <p style={para}>
                  No figure ({none.length}): {none.map((r) => `${r.name}, ${valueText(r.cur, t.field)}`).join('; ')}.
                </p>
              )}
            </section>
          );
        })}

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <p style={para}>
            Figures are collected from highway authorities each year, and councils can revise the year before, so earlier years may change (DfT). Where DfT gives no figure it uses shorthand: {Object.values(SYMBOL_MEANING).join('; ')}.
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Source: <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{SOURCE_LABEL}</a> (RDC0120, RDC0122, RDC0130, RDC0321).{' '}
            <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="road_condition" />
    </OpenGovShell>
  );
}
