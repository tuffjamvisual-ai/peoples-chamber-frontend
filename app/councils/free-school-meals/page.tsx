// /councils/free-school-meals: pupils eligible for free school meals in every English council that runs schools (owner
// approved 18 Nov 2026, Cowork ENTRY 303). Ranked by the share of pupils eligible, with the number, the change on the
// year and the share who took a meal. Compared with England only. Data: area_free_school_meals (migration 2026-11-18a),
// wording in lib/free-school-meals.ts.
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
import { loadCouncilsLatest, pct, pctText, count, tookShare, censusLabel, SOURCE_PAGE, SOURCE_LABEL, OGL, OGL_URL, RANKING_PATH, EXPLAINER, ENGLAND, type FsmRow } from '@/lib/free-school-meals';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';

export const revalidate = false; // A16: rebuilt only when council data changes (council-data and table tags), or on a deploy

export const metadata: Metadata = {
  title: 'Free school meals by council',
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

type Ranked = { code: string; name: string; slug: string; cur: FsmRow; prev: FsmRow | undefined };

export default async function FreeSchoolMealsPage() {
  const [{ latest, prev, rows }, councilsRes] = await Promise.all([
    loadCouncilsLatest(),
    cachedQuery(['q:app/councils/free-school-meals/page.tsx:councils'], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('gss_code, slug, short_name, name').eq('country', 'England').neq('type', 'district')),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  if (!latest) return null;
  const at = (code: string, y: string | null) => (y ? rows.find((r) => r.area_code === code && r.academic_year === y) : undefined);
  const eng = at(ENGLAND, latest), engPrev = at(ENGLAND, prev);
  const list: Ranked[] = (councilsRes.data ?? []).map((c) => {
    const cur = at(c.gss_code as string, latest);
    return cur ? { code: c.gss_code as string, name: (c.short_name as string) || (c.name as string), slug: c.slug as string, cur, prev: at(c.gss_code as string, prev) } : null;
  }).filter((x): x is Ranked => !!x);
  const byShare = [...list].sort((a, b) => (pct(b.cur) ?? -1) - (pct(a.cur) ?? -1) || a.name.localeCompare(b.name));
  // Equal shares share a rank.
  const ranks: number[] = [];
  byShare.forEach((r, i) => ranks.push(i > 0 && pct(byShare[i - 1].cur) === pct(r.cur) ? ranks[i - 1] : i + 1));
  const pts = (r: Ranked) => (pct(r.cur) != null && pct(r.prev) != null ? Math.round((pct(r.cur)! - pct(r.prev)!) * 10) / 10 : null);
  const when = censusLabel(latest);

  return (
    <OpenGovShell pageStamp="Free school meals">
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: MONO }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', marginBottom: '4px' }}>England · Councils · Schools</div>
          <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, lineHeight: 1.18, margin: 0 }}>Free School Meals by Council</h1>
        </header>

        {eng && (
          <>
            <p style={big}>England, {when}: <strong>{count(eng.fsm_eligible)} pupils eligible for free school meals</strong>, {pctText(eng)} of {count(eng.pupils)} pupils</p>
            <p style={{ ...para, margin: '0 0 24px' }}>
              {engPrev ? `${censusLabel(engPrev.academic_year)}: ${pctText(engPrev)}. ` : ''}
              {eng.fsm_taking_meal != null ? `${count(eng.fsm_taking_meal)} eligible pupils took a free meal on census day (${tookShare(eng)!.toFixed(1)} per cent of those eligible).` : ''}
            </p>
          </>
        )}

        <section style={section}>
          <h2 style={h2}>Share of pupils eligible, {when}</h2>
          <NoJsPager id="fsm-a" count={byShare.length} rows="> tbody > tr" size={15}>
          <table className="pt-cards" style={{ borderCollapse: 'collapse', fontSize: '15px', color: INK, width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Rank</th>
                <th style={th}>Council</th>
                <th style={{ ...th, textAlign: 'right' }}>Share eligible</th>
                <th style={{ ...th, textAlign: 'right' }}>Pupils eligible</th>
                <th style={{ ...th, textAlign: 'right' }}>On the year (points)</th>
                <th style={{ ...th, textAlign: 'right' }}>Took a meal (of eligible)</th>
              </tr>
            </thead>
            <tbody>
              {byShare.map((r, i) => {
                const d = pts(r), took = tookShare(r.cur);
                return (
                  <tr key={r.code}>
                    <td data-label="Rank" style={td}>{pct(r.cur) == null ? 'not ranked' : ranks[i]}</td>
                    <td data-label="" className="pt-card-title" style={td}><Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link></td>
                    <td data-label="Share eligible" style={tdNum}>{pctText(r.cur)}</td>
                    <td data-label="Pupils eligible" style={tdNum}>{count(r.cur.fsm_eligible)}</td>
                    <td data-label="On the year (points)" style={tdNum}>{d == null ? 'not published' : d === 0 ? 'no change' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)}`}</td>
                    <td data-label="Took a meal (of eligible)" style={tdNum}>{took == null ? 'not published' : `${took.toFixed(1)} per cent`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </NoJsPager>
          <p style={{ ...para, marginTop: '10px' }}>England: {pctText(eng)}{engPrev ? `, ${pctText(engPrev)} in ${censusLabel(engPrev.academic_year)}` : ''}. The change is in percentage points of all pupils.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>What eligible means</h2>
          <SubFold label="Read it">
          {EXPLAINER.map((p) => <p key={p.slice(0, 20)} style={para}>{p}</p>)}
          </SubFold>
        </section>

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <p style={para}>
            Pupils on roll in the January school census in each council&rsquo;s area, by the council that runs education there. A figure DfE does not give is shown as not published.
          </p>
          <p style={{ ...para, margin: 0 }}>
            Source: Department for Education, Schools, pupils and their characteristics (in Sources at the end of the page).{' '}
            <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
          </p>
        </section>
        <PageSources sources={[{ label: SOURCE_LABEL, href: SOURCE_PAGE }]} />
      </article>
      <LastUpdated sourceKey="free_school_meals" />
    </OpenGovShell>
  );
}
