// /councils/children-in-care: children looked after in every English children's services council (owner's approval, 28
// Oct 2026). Two rankings: by rate per 10,000 children, and by change on the year in the number looked after. A plain
// explainer of what "looked after" means, from DfE's release. Compared with England only. Data:
// council_children_in_care (migration 2026-10-28g), wording in lib/children-in-care.ts.

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
  loadLatestTwoYears, text, rateText, n, change, changeText, pctChangeText, asAt, yearOf, releaseLabel, SOURCE_PAGE, OGL, OGL_URL,
  RANKING_PATH, EXPLAINER, ROUNDING_NOTE, SYMBOL_MEANING, type CareRow,
} from '@/lib/children-in-care';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Children in care by council',
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
const big: CSSProperties = { fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' };

type Ranked = { code: string; name: string; slug: string; cur: CareRow; prev: CareRow | undefined };

// Equal figures share a rank; a council with no figure is not ranked.
function ranks<T>(arr: T[], val: (x: T) => number | null): (number | null)[] {
  const out: (number | null)[] = [];
  arr.forEach((x, i) => { const v = val(x); out.push(v == null ? null : i > 0 && val(arr[i - 1]) === v ? out[i - 1] : i + 1); });
  return out;
}

export default async function ChildrenInCarePage() {
  const [{ latest, rows }, councilsRes] = await Promise.all([
    loadLatestTwoYears(),
    supabase.from('councils').select('gss_code, slug, short_name, name').eq('country', 'England').neq('type', 'district'),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  if (!latest) return null;
  const prevYear = `${yearOf(latest) - 1}-03-31`;
  const at = (code: string, y: string) => rows.find((r) => r.ons_code === code && r.year.slice(0, 10) === y.slice(0, 10));
  const eng = at('E92000001', latest);
  const engPrev = at('E92000001', prevYear);
  const list: Ranked[] = (councilsRes.data ?? []).map((c) => {
    const cur = at(c.gss_code as string, latest);
    return cur ? { code: c.gss_code as string, name: (c.short_name as string) || (c.name as string), slug: c.slug as string, cur, prev: at(c.gss_code as string, prevYear) } : null;
  }).filter((x): x is Ranked => !!x);
  const rateOf = (r: Ranked) => n(r.cur, 'rate_per_10000');
  const changeOf = (r: Ranked) => change(r.cur, r.prev)?.pct ?? null;
  const byRate = [...list].sort((a, b) => (rateOf(b) ?? -1) - (rateOf(a) ?? -1) || a.name.localeCompare(b.name));
  const byChange = [...list].sort((a, b) => (changeOf(b) ?? -Infinity) - (changeOf(a) ?? -Infinity) || a.name.localeCompare(b.name));
  const rateRanks = ranks(byRate, rateOf);
  const changeRanks = ranks(byChange, changeOf);
  const usedSymbols = [...new Set(list.flatMap((r) => Object.values(r.cur.symbols ?? {})))].filter((s) => SYMBOL_MEANING[s]);

  return (
    <OpenGovShell pageStamp="Children in care">
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · Councils · Children&rsquo;s services
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Children in Care by Council
          </h1>
        </header>

        {eng && (
          <>
            <p style={big}>England, {asAt(latest)}: <strong>{text(eng, 'looked_after')} children looked after</strong>, {rateText(eng)}</p>
            {changeText(eng, engPrev) && <p style={{ ...para, margin: '0 0 6px' }}>{changeText(eng, engPrev)}.</p>}
            <p style={{ ...para, margin: '0 0 24px' }}>
              {n(eng, 'placed_outside_area_pct') != null && `${n(eng, 'placed_outside_area_pct')} per cent were placed outside their council's area. `}
              {n(eng, 'adopted') != null && `${text(eng, 'adopted')} were adopted in the year. `}
              {n(eng, 'uasc') != null && `${text(eng, 'uasc')} were unaccompanied asylum seeking children.`}
            </p>
          </>
        )}

        <section style={section}>
          <h2 style={h2}>What &ldquo;looked after&rdquo; means</h2>
          {EXPLAINER.map((p) => <p key={p.slice(0, 20)} style={para}>{p}</p>)}
          <p style={para}>This summary is from DfE&rsquo;s <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>release and its notes</a>.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>Rate per 10,000 children</h2>
          <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Rank</th>
                <th style={th}>Council</th>
                <th style={{ ...thWrap, textAlign: 'right' }}>Children looked after</th>
                <th style={{ ...thWrap, textAlign: 'right' }}>Rate per 10,000</th>
              </tr>
            </thead>
            <tbody>
              {byRate.map((r, i) => (
                <tr key={r.code}>
                  <td data-label="Rank" style={td}>{rateRanks[i] ?? 'not ranked'}</td>
                  <td data-label="" className="pt-card-title" style={td}><Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link></td>
                  <td data-label="Children looked after" style={n(r.cur, 'looked_after') == null ? tdNote : tdNum}>{text(r.cur, 'looked_after')}</td>
                  <td data-label="Rate per 10,000" style={rateOf(r) == null ? tdNote : tdNum}>{rateOf(r) == null ? text(r.cur, 'rate_per_10000') : rateOf(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...para, marginTop: '10px' }}>Children looked after at {asAt(latest)}. England: {rateText(eng)}.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>Change on the year</h2>
          <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Rank</th>
                <th style={th}>Council</th>
                <th style={{ ...thWrap, textAlign: 'right' }}>Change (per cent)</th>
                <th style={{ ...thWrap, textAlign: 'right' }}>Looked after, {yearOf(prevYear)} to {yearOf(latest)}</th>
              </tr>
            </thead>
            <tbody>
              {byChange.map((r, i) => {
                const c = change(r.cur, r.prev);
                return (
                  <tr key={r.code}>
                    <td data-label="Rank" style={td}>{changeRanks[i] ?? 'not ranked'}</td>
                    <td data-label="" className="pt-card-title" style={td}><Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link></td>
                    <td data-label="Change (per cent)" style={c ? tdNum : tdNote}>{c ? `${c.pct > 0 ? 'up' : c.pct < 0 ? 'down' : 'no change'}${c.pct ? ` ${Math.abs(c.pct).toFixed(1)}` : ''}` : 'not published'}</td>
                    <td data-label={`Looked after, ${yearOf(prevYear)} to ${yearOf(latest)}`} style={tdNote}>{r.prev ? text(r.prev, 'looked_after') : 'not published'} to {text(r.cur, 'looked_after')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ ...para, marginTop: '10px' }}>England: {pctChangeText(change(eng, engPrev))}. A small council&rsquo;s percentage can move a lot with a few children.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <p style={para}>
            Children looked after on 31 March, from the SSDA903 return each council makes to DfE. Unless stated, the figures leave out children looked after under an agreed series of short term placements (DfE). {ROUNDING_NOTE}
            {usedSymbols.length ? ` Where DfE gives no figure it shows a symbol: ${usedSymbols.map((s) => SYMBOL_MEANING[s]).join('; ')}. A council with no figure is not ranked.` : ''}
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Source: <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>Department for Education, {releaseLabel(latest)}</a>.{' '}
            <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="children_in_care" />
    </OpenGovShell>
  );
}
