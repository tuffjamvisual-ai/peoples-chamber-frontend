// /councils/blue-badges: Blue Badges in every English council area (owner's approval, 28 Oct 2026). Two rankings of
// the councils that issue badges (counties, unitaries, metropolitan and London boroughs, Isles of Scilly): by share of
// residents holding a badge, and by change on the year. A short explainer of who qualifies automatically and who is
// assessed by the council, from DfT's table notes, and England's lost and stolen badges (the only lost and stolen
// figures DfT now publishes). Data: council_blue_badges (migration 2026-10-28d), wording in lib/blue-badges.ts.

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
  loadLatestTwoYears, loadEnglandLostStolen, count, shareText, sharePct, change, changeText, pctChangeText, asAt, yearTo,
  releaseFor, yearOf, OGL, OGL_URL, ROUNDING_NOTE, SHARE_NOTE, LOW_TEXT, RANKING_PATH, type BlueBadgeRow,
} from '@/lib/blue-badges';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Blue Badges by council',
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
const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` };
const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const tdNote: CSSProperties = { ...td, textAlign: 'right' }; // DfT's "[low]" wording, allowed to wrap
const thWrap: CSSProperties = { ...th, whiteSpace: 'normal' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };

type Ranked = { code: string; name: string; slug: string; cur: BlueBadgeRow; prev: BlueBadgeRow | undefined };

export default async function BlueBadgesPage() {
  const [{ latest, rows }, lostStolen, councilsRes] = await Promise.all([
    loadLatestTwoYears(),
    loadEnglandLostStolen(),
    supabase.from('councils').select('gss_code, slug, short_name, name').eq('country', 'England').neq('type', 'district'),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  if (!latest) return null;
  const prevYear = `${Number(latest.slice(0, 4)) - 1}-03-31`;
  const at = (code: string, y: string) => rows.find((r) => r.ons_code === code && r.year.slice(0, 10) === y.slice(0, 10));
  const eng = at('E92000001', latest);
  const engPrev = at('E92000001', prevYear);
  // Current councils only: old county codes are not in the councils table, so they are not ranked.
  const list: Ranked[] = (councilsRes.data ?? []).map((c) => {
    const cur = at(c.gss_code as string, latest);
    return cur ? { code: c.gss_code as string, name: (c.short_name as string) || (c.name as string), slug: c.slug as string, cur, prev: at(c.gss_code as string, prevYear) } : null;
  }).filter((x): x is Ranked => !!x);

  const byShare = [...list].sort((a, b) => (sharePct(b.cur) ?? -1) - (sharePct(a.cur) ?? -1) || a.name.localeCompare(b.name));
  const byChange = [...list].sort((a, b) => (change(b.cur, b.prev)?.pct ?? -Infinity) - (change(a.cur, a.prev)?.pct ?? -Infinity) || a.name.localeCompare(b.name));
  const rankOf = <T,>(arr: T[], val: (x: T) => number | null) => {
    // Equal figures share a rank.
    const out: (number | null)[] = [];
    arr.forEach((x, i) => { const v = val(x); out.push(v == null ? null : i > 0 && val(arr[i - 1]) === v ? out[i - 1] : i + 1); });
    return out;
  };
  const shareRanks = rankOf(byShare, (r) => sharePct(r.cur));
  const changeRanks = rankOf(byChange, (r) => change(r.cur, r.prev)?.pct ?? null);
  const rel = releaseFor(latest);
  const lsRel = lostStolen ? releaseFor(lostStolen.year) : null;
  const rounded = list.some((r) => r.cur.rounded_to === 100);
  const anyLow = list.some((r) => r.cur.low_fields.includes('held'));

  return (
    <OpenGovShell pageStamp="Blue Badges">
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }}
      />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · Councils · Disabled parking
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Blue Badges by Council
          </h1>
        </header>

        <p style={para}>
          Blue Badges are disabled parking cards that councils issue to help people with mobility issues park closer to the goods and services they need to use, in DfT&rsquo;s words. They are issued by county councils, unitary councils, and metropolitan and London boroughs, not by district councils.
        </p>

        {eng && (
          <>
            <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' }}>
              England, {asAt(latest)}: <strong>{count(eng, 'held')} badges held</strong>, {shareText(eng)} of residents
            </p>
            <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' }}>
              Issued in {yearTo(latest)}: <strong>{count(eng, 'issued')}</strong>
            </p>
            {changeText(eng, engPrev) && <p style={{ ...para, margin: '0 0 6px' }}>Badges held: {changeText(eng, engPrev)}</p>}
          </>
        )}
        {lostStolen?.lost != null && lostStolen.stolen != null && (
          <p style={{ ...para, margin: '0 0 24px' }}>
            In {yearTo(lostStolen.year)}, {(lostStolen.lost + lostStolen.stolen).toLocaleString('en-GB')} badges were reported lost or stolen in England: {lostStolen.lost.toLocaleString('en-GB')} lost and {lostStolen.stolen.toLocaleString('en-GB')} stolen (<a href={lsRel!.url} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>DfT</a>). DfT does not publish these figures by council.
          </p>
        )}

        <section style={section}>
          <h2 style={h2}>Who qualifies</h2>
          <p style={para}>
            Some people qualify automatically, which DfT calls &ldquo;without further assessment&rdquo;: people who get the higher rate of the mobility part of Disability Living Allowance, or who meet the moving around or journey planning criteria of Personal Independence Payment, and people who are registered blind, get the War Pensioner&rsquo;s Supplement or are covered by the Armed Forces and Reserve Forces Compensation Scheme.
          </p>
          <p style={para}>
            Everyone else who applies is assessed by their council against the scheme&rsquo;s criteria, which DfT calls &ldquo;subject to further assessment&rdquo;. Since 30 August 2019 this has included people whose disabilities cannot be seen. Each council page shows how many of its badges were held each way.
          </p>
          <p style={para}>
            This summary is from the notes to DfT&rsquo;s <a href="https://www.gov.uk/government/statistical-data-sets/blue-badge-scheme-statistics-data-tables-dis" target="_blank" rel="noopener noreferrer" style={{ color: INK }}>Blue Badge data tables</a>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2}>Share of residents holding a badge</h2>
          {/* Phones (under 768px): one card per council (phone-table.css .pt-cards); four columns did not fit 320px. */}
            <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
              <thead>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={th}>Council</th>
                  <th style={{ ...thWrap, textAlign: 'right' }}>Badges held</th>
                  <th style={{ ...thWrap, textAlign: 'right' }}>Share (per cent)</th>
                </tr>
              </thead>
              <tbody>
                {byShare.map((r, i) => (
                  <tr key={r.code}>
                    <td data-label="Rank" style={td}>{shareRanks[i] ?? 'not ranked'}</td>
                    <td data-label="" className="pt-card-title" style={td}><Link href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</Link></td>
                    <td data-label="Badges held" style={r.cur.held == null ? tdNote : tdNum}>{count(r.cur, 'held')}</td>
                    <td data-label="Share (per cent)" style={sharePct(r.cur) == null ? tdNote : tdNum}>{sharePct(r.cur) == null ? shareText(r.cur) : sharePct(r.cur)!.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          <p style={{ ...para, marginTop: '10px' }}>Badges held at {asAt(latest)}. England: {shareText(eng)}.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>Change on the year</h2>
          {/* Phones: one card per council, as above. */}
            <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
              <thead>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={th}>Council</th>
                  <th style={{ ...thWrap, textAlign: 'right' }}>Change (per cent)</th>
                  <th style={{ ...thWrap, textAlign: 'right' }}>Badges held, {yearOf(prevYear)} to {yearOf(latest)}</th>
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
                      <td data-label={`Badges held, ${yearOf(prevYear)} to ${yearOf(latest)}`} style={tdNote}>{r.prev ? count(r.prev, 'held') : 'not published'} to {count(r.cur, 'held')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          <p style={{ ...para, marginTop: '10px' }}>England: {pctChangeText(eng ? change(eng, engPrev) : null)}.</p>
        </section>

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <p style={para}>
            Badges held are valid badges at 31 March. Badges can also be issued to organisations that transport disabled people, and these are included. Badges issued in the year to 31 March include badges for people who did not hold one before and badges from reapplications by existing holders (badges usually last three years). {SHARE_NOTE}
            {rounded ? ` ${ROUNDING_NOTE}` : ''}
            {anyLow ? ` Where DfT gives no figure it describes it as ${LOW_TEXT}, and the council is not ranked.` : ''}
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Source: <a href={rel.url} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>Department for Transport, {rel.label}</a>.{' '}
            <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="blue_badges" />
    </OpenGovShell>
  );
}
