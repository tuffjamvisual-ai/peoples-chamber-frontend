// "Blue Badges" section for English council pages, Work & benefits tab (server component; owner's approval, 28 Oct
// 2026). Reads council_blue_badges (scripts/migrations/2026-10-28d-council-blue-badges.sql; DfT Blue Badge scheme
// statistics). Badges are issued by county, unitary, metropolitan and London borough councils and the Isles of Scilly;
// a district page gets one line pointing to its county. Compared with England and the council's five closest
// statistical neighbours (council_statistical_neighbours, MHCLG model). Wording in lib/blue-badges.ts. No lost or
// stolen figures here: DfT has published none by council since 2021 (England's are on /councils/blue-badges).

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  loadArea, count, shareText, change, changeText, pctChangeText, asAt, yearTo, releaseFor, OGL, OGL_URL,
  ROUNDING_NOTE, SHARE_NOTE, LOW_TEXT, RANKING_PATH, type BlueBadgeRow,
} from '@/lib/blue-badges';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 6px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;
const NEIGHBOURS_SHOWN = 5;

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Blue Badges
    </h2>
  );
}

export default async function CouncilBlueBadgesSection({ gssCode, country, isDistrict, countyName, countySlug }: {
  gssCode: string | null; country: string | null; isDistrict: boolean; countyName?: string | null; countySlug?: string | null;
}) {
  if (!gssCode || country !== 'England') return null;

  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0, lineHeight: 1.6 }}>
          Blue Badges here are issued by{' '}
          <Link href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</Link>
          , which shows the figures for the whole county.
        </p>
      </section>
    );
  }

  const rows = await loadArea(gssCode);
  const cur = rows[0];
  if (!cur) return null;
  const prevYear = `${Number(cur.year.slice(0, 4)) - 1}-03-31`;
  const prev = rows.find((r) => r.year.slice(0, 10) === prevYear);

  const [nbRes, engRes] = await Promise.all([
    supabase.from('council_statistical_neighbours').select('neighbour_rank, neighbour_gss_code').eq('council_gss_code', gssCode).order('neighbour_rank').limit(NEIGHBOURS_SHOWN),
    supabase.from('council_blue_badges').select('ons_code, area_name, area_level, year, held, held_automatic, held_discretionary, issued, held_per_1000_population, lost, stolen, low_fields, rounded_to, source_url')
      .eq('ons_code', 'E92000001').in('year', [cur.year, prevYear]),
  ]);
  if (nbRes.error) throw new Error(`council_statistical_neighbours ${gssCode}: ${nbRes.error.message}`);
  if (engRes.error) throw new Error(`council_blue_badges England: ${engRes.error.message}`);
  const nbCodes = (nbRes.data ?? []).map((n) => n.neighbour_gss_code as string);
  let nbRows: BlueBadgeRow[] = [];
  let slugs = new Map<string, string>();
  if (nbCodes.length) {
    const [b, c] = await Promise.all([
      supabase.from('council_blue_badges').select('ons_code, area_name, area_level, year, held, held_automatic, held_discretionary, issued, held_per_1000_population, lost, stolen, low_fields, rounded_to, source_url')
        .in('ons_code', nbCodes).in('year', [cur.year, prevYear]),
      supabase.from('councils').select('gss_code, slug, short_name, name').in('gss_code', nbCodes),
    ]);
    if (b.error) throw new Error(`council_blue_badges neighbours of ${gssCode}: ${b.error.message}`);
    if (c.error) throw new Error(`councils neighbours of ${gssCode}: ${c.error.message}`);
    nbRows = (b.data ?? []) as BlueBadgeRow[];
    slugs = new Map((c.data ?? []).map((r) => [r.gss_code as string, r.slug as string]));
  }
  const eng = (engRes.data ?? []) as BlueBadgeRow[];
  const pick = (list: BlueBadgeRow[], code: string, year: string) => list.find((r) => r.ons_code === code && r.year.slice(0, 10) === year.slice(0, 10));
  const engCur = pick(eng, 'E92000001', cur.year);
  const engPrev = pick(eng, 'E92000001', prevYear);
  const compare = [
    { code: gssCode, name: cur.area_name, href: null as string | null, cur, prev, own: true },
    ...nbCodes.map((code) => {
      const c = pick(nbRows, code, cur.year);
      return c ? { code, name: c.area_name, href: slugs.get(code) ? `/councils/${slugs.get(code)}` : null, cur: c, prev: pick(nbRows, code, prevYear), own: false } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x),
    ...(engCur ? [{ code: 'E92000001', name: 'England', href: null, cur: engCur, prev: engPrev, own: false }] : []),
  ];
  // DfT's "[low]" wording is explained only where a figure shown here is low.
  const SHOWN = ['held', 'held_automatic', 'held_discretionary', 'issued'];
  const hasLow = compare.some((r) => r.cur.low_fields.includes('held')) || cur.low_fields.some((f) => SHOWN.includes(f));
  const rel = releaseFor(cur.year);
  const changeLine = changeText(cur, prev);

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={line}>Badges held at {asAt(cur.year)}: <strong>{count(cur, 'held')}</strong></p>
      <p style={line}>Share of residents: <strong>{shareText(cur)}</strong>{engCur ? ` (England ${shareText(engCur)})` : ''}</p>
      {cur.held_automatic != null && cur.held_discretionary != null && (
        <p style={line}>Of these, {count(cur, 'held_automatic')} qualified automatically and {count(cur, 'held_discretionary')} were assessed by the council.</p>
      )}
      <p style={line}>Issued in {yearTo(cur.year)}: <strong>{count(cur, 'issued')}</strong></p>
      {changeLine && <p style={line}>Change on the year: {changeLine}</p>}

      {compare.length > 1 && (
        <>
          <p style={{ ...small, margin: '14px 0 6px' }}>Compared with its {compare.length - 2 > 0 ? `${compare.length - 2} closest statistical neighbours (MHCLG model) and ` : ''}England:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {compare.map((r) => {
              const c = change(r.cur, r.prev);
              return (
                <li key={r.code} style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, padding: '6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, overflowWrap: 'break-word' }}>
                  <span style={{ fontWeight: r.own ? 'bold' : 'normal' }}>{r.href ? <Link href={r.href} style={{ color: INK }}>{r.name}</Link> : r.name}</span>
                  <span style={{ display: 'block' }}>
                    {shareText(r.cur)} of residents{c ? `, ${pctChangeText(c)} on the year` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p style={small}>
        {SHARE_NOTE}
        {cur.rounded_to === 100 ? ` ${ROUNDING_NOTE}` : ''}
        {hasLow ? ` Where DfT gives no figure it describes it as ${LOW_TEXT}.` : ''}
      </p>
      <p style={small}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council in England</Link>, with who qualifies automatically and who is assessed by the council.
      </p>
      <p style={small}>
        Source: <a href={rel.url} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>Department for Transport, {rel.label}</a>.{' '}
        <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
      </p>
    </section>
  );
}
