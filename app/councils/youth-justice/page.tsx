// /councils/youth-justice: children's first caution or conviction in every council area of England and Wales (owner
// approved 18 Nov 2026, Cowork ENTRY 303; Welsh councils on this page only). Ranked by the rate per 100,000 children aged
// 10 to 17, with the number and the change on the year. Compared with England and Wales. Data: council_youth_first_entrants
// (migration 2026-11-18a), wording in lib/youth-justice.ts.
import PageSources from '@/app/components/PageSources';
import NoJsPager from '@/app/components/NoJsPager';
import { SubFold } from '@/app/components/PhoneFolds';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import LastUpdated from '../../components/LastUpdated';
import '../../components/phone-table.css';
import { supabase } from '@/lib/supabase';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { loadRanking, fteText, rateText, val, yearLabel, EW, EXPLAINER, SOURCE_PAGE, SOURCE_LABEL, OGL, OGL_URL, RANKING_PATH, type FteRow } from '@/lib/youth-justice';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';

export const revalidate = false; // A16: rebuilt only when council data changes (council-data and table tags), or on a deploy

export const metadata: Metadata = {
  title: 'Youth justice by council',
  description: PAGE_DESCRIPTIONS[RANKING_PATH],
  alternates: { canonical: RANKING_PATH },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'normal' };
const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` };
const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };
const big: CSSProperties = { fontFamily: MONO, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' };

type Ranked = { code: string; name: string; slug: string | null; country: string; cur: FteRow; prev: FteRow | undefined };

export default async function YouthJusticePage() {
  const [{ latest, rows }, councilsRes] = await Promise.all([
    loadRanking(),
    cachedQuery(['q:app/councils/youth-justice/page.tsx:councils'], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('gss_code, slug, short_name, name').in('country', ['England', 'Wales']).neq('type', 'district')),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  if (latest == null) return null;
  const bySlug = new Map((councilsRes.data ?? []).map((c) => [c.gss_code as string, c]));
  const at = (code: string, y: number) => rows.find((r) => r.area_code === code && r.year === y);
  const ew = at(EW, latest), ewPrev = at(EW, latest - 1);
  // Councils of England and Wales with a figure this year (old areas before a boundary change are not current councils).
  const list: Ranked[] = rows.filter((r) => r.area_level === 'council' && r.year === latest && bySlug.has(r.area_code)).map((r) => {
    const c = bySlug.get(r.area_code)!;
    return { code: r.area_code, name: (c.short_name as string) || (c.name as string), slug: (c.slug as string) ?? null, country: r.country, cur: r, prev: at(r.area_code, latest - 1) };
  });
  const rate = (r: Ranked) => val(r.cur.fte_rate);
  const byRate = [...list].sort((a, b) => (rate(b) ?? -1) - (rate(a) ?? -1) || a.name.localeCompare(b.name));
  const ranks: number[] = [];
  byRate.forEach((r, i) => ranks.push(i > 0 && Math.round(rate(byRate[i - 1]) ?? -1) === Math.round(rate(r) ?? -1) ? ranks[i - 1] : i + 1));
  const change = (r: Ranked) => (val(r.cur.fte_rate) != null && val(r.prev?.fte_rate) != null ? Math.round(val(r.cur.fte_rate)! - val(r.prev!.fte_rate)!) : null);

  return (
    <OpenGovShell pageStamp="Youth justice">
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: MONO }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', marginBottom: '4px' }}>England and Wales · Councils · Youth justice</div>
          <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, lineHeight: 1.18, margin: 0 }}>Youth Justice by Council</h1>
        </header>

        {ew && (
          <>
            <p style={big}>England and Wales, {yearLabel(latest)}: <strong>{fteText(ew)} children given their first caution or conviction</strong>, {rateText(ew)}</p>
            {ewPrev && <p style={{ ...para, margin: '0 0 24px' }}>In {yearLabel(latest - 1)}: {fteText(ewPrev)}, {Math.round(val(ewPrev.fte_rate) ?? 0)} per 100,000.</p>}
          </>
        )}

        <section style={section}>
          <h2 style={h2}>First caution or conviction, rate per 100,000 children, {latest}</h2>
          <NoJsPager id="yj-a" count={byRate.length} rows="> tbody > tr" size={15}>
          <table className="pt-cards" style={{ borderCollapse: 'collapse', fontSize: '15px', color: INK, width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Rank</th>
                <th style={th}>Council</th>
                <th style={{ ...th, textAlign: 'right' }}>Rate per 100,000</th>
                <th style={{ ...th, textAlign: 'right' }}>Children</th>
                <th style={{ ...th, textAlign: 'right' }}>On the year</th>
              </tr>
            </thead>
            <tbody>
              {byRate.map((r, i) => {
                const d = change(r);
                return (
                  <tr key={r.code}>
                    <td data-label="Rank" style={td}>{rate(r) == null ? 'not ranked' : ranks[i]}</td>
                    <td data-label="" className="pt-card-title" style={td}>{r.country === 'England' && r.slug ? <Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link> : r.name}{r.country === 'Wales' ? ' (Wales)' : ''}</td>
                    <td data-label="Rate per 100,000" style={tdNum}>{rate(r) == null ? rateText(r.cur) : Math.round(rate(r)!)}</td>
                    <td data-label="Children" style={tdNum}>{fteText(r.cur)}</td>
                    <td data-label="On the year" style={tdNum}>{d == null ? 'not published' : d === 0 ? 'no change' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </NoJsPager>
          <p style={{ ...para, marginTop: '10px' }}>England and Wales: {rateText(ew)}. A council with fewer than ten is not published and not ranked. A small council&rsquo;s rate can move a lot with a few children.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>What the figures mean</h2>
          <SubFold label="Read it">
          {EXPLAINER.map((p) => <p key={p.slice(0, 20)} style={para}>{p}</p>)}
          </SubFold>
        </section>

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <p style={{ ...para, margin: 0 }}>
            Each English council page shows its youth justice service&rsquo;s caseload and funding.
          </p>
        </section>
        {/* Cowork ENTRY 410: the source and its licence only in the Sources fold. */}
        <PageSources sources={[{ label: `${SOURCE_LABEL}, tables 2.10 and 2.11`, href: SOURCE_PAGE }]}>
          <a href={OGL_URL} style={{ color: INK }}>{OGL}</a>
        </PageSources>
      </article>
      <LastUpdated sourceKey="youth_justice" />
    </OpenGovShell>
  );
}
