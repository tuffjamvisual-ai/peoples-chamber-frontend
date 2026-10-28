// "Blue Badges" section for English council pages, Work & benefits tab (server component; owner's approval, 28 Oct
// 2026). Reads council_blue_badges (scripts/migrations/2026-10-28d-council-blue-badges.sql; DfT Blue Badge scheme
// statistics). Badges are issued by county, unitary, metropolitan and London borough councils and the Isles of Scilly;
// a district page gets one line pointing to its county. Compared with England only (no similar or nearby councils:
// owner's decision, 28 Oct 2026). Wording in lib/blue-badges.ts. No lost or stolen figures here: DfT has published none by council since 2021 (England's are on /councils/blue-badges).

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

  const { data: engData, error: engErr } = await supabase.from('council_blue_badges').select('ons_code, area_name, area_level, year, held, held_automatic, held_discretionary, issued, held_per_1000_population, lost, stolen, low_fields, rounded_to, source_url')
    .eq('ons_code', 'E92000001').in('year', [cur.year, prevYear]);
  if (engErr) throw new Error(`council_blue_badges England: ${engErr.message}`);
  const eng = (engData ?? []) as BlueBadgeRow[];
  const engCur = eng.find((r) => r.year.slice(0, 10) === cur.year.slice(0, 10));
  const engPrev = eng.find((r) => r.year.slice(0, 10) === prevYear);
  const engChange = engCur ? change(engCur, engPrev) : null;
  // DfT's "[low]" wording is explained only where a figure shown here is low.
  const SHOWN = ['held', 'held_automatic', 'held_discretionary', 'issued'];
  const hasLow = cur.low_fields.some((f) => SHOWN.includes(f));
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
      {changeLine && <p style={line}>Change on the year: {changeLine}{engChange ? `; England ${pctChangeText(engChange)}` : ''}</p>}

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
