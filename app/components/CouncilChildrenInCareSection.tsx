// "Children in care" section for English council pages, Schools tab (server component; owner's approval, 28 Oct 2026).
// Reads council_children_in_care (scripts/migrations/2026-10-28g; DfE Children looked after in England including
// adoptions). Children's services are run by county, unitary, metropolitan and London borough councils and the Isles of
// Scilly; a district page gets one line pointing to its county. Compared with England only. Wording in
// lib/children-in-care.ts.

import Link from 'next/link';
import {
  loadArea, text, rateText, n, changeText, change, pctChangeText, asAt, yearTo, releaseLabel, SOURCE_PAGE, OGL, OGL_URL,
  RANKING_PATH, ROUNDING_NOTE,
} from '@/lib/children-in-care';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 6px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Children in care
    </h2>
  );
}

export default async function CouncilChildrenInCareSection({ gssCode, country, isDistrict, countyName, countySlug }: {
  gssCode: string | null; country: string | null; isDistrict: boolean; countyName?: string | null; countySlug?: string | null;
}) {
  if (!gssCode || country !== 'England') return null;
  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0, lineHeight: 1.6 }}>
          Children&rsquo;s services here are run by{' '}
          <Link href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</Link>
          , which shows the figures for children in care.
        </p>
      </section>
    );
  }

  const rows = await loadArea(gssCode);
  const own = rows.filter((r) => r.ons_code === gssCode);
  const cur = own[0];
  if (!cur) return null;
  const prevYear = `${Number(cur.year.slice(0, 4)) - 1}-03-31`;
  const prev = own.find((r) => r.year.slice(0, 10) === prevYear);
  const eng = rows.find((r) => r.ons_code === 'E92000001' && r.year.slice(0, 10) === cur.year.slice(0, 10));
  const engPrev = rows.find((r) => r.ons_code === 'E92000001' && r.year.slice(0, 10) === prevYear);
  const changeLine = changeText(cur, prev);
  const engChange = change(eng, engPrev);
  const outside = n(cur, 'placed_outside_area_pct');
  const engOutside = n(eng, 'placed_outside_area_pct');

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={line}>Children looked after at {asAt(cur.year)}: <strong>{text(cur, 'looked_after')}</strong></p>
      <p style={line}>Rate: <strong>{rateText(cur)}</strong>{eng ? ` (England ${rateText(eng)})` : ''}</p>
      {changeLine && <p style={line}>Change on the year: {changeLine}{engChange ? `; England ${pctChangeText(engChange)}` : ''}</p>}
      <p style={line}>
        Placed outside the council&rsquo;s area: <strong>{outside != null ? `${outside} per cent` : text(cur, 'placed_outside_area_pct')}</strong>
        {outside != null && n(cur, 'placed_outside_area') != null ? ` (${text(cur, 'placed_outside_area')} children)` : ''}
        {engOutside != null ? `; England ${engOutside} per cent` : ''}
      </p>
      <p style={line}>Adopted in {yearTo(cur.year)}: <strong>{text(cur, 'adopted')}</strong></p>
      <p style={line}>Unaccompanied asylum seeking children: <strong>{text(cur, 'uasc')}</strong></p>
      <p style={line}>Started to be looked after in {yearTo(cur.year)}: {text(cur, 'started')}; ceased: {text(cur, 'ceased')}</p>

      <p style={small}>The rate is children looked after per 10,000 children in the area. {ROUNDING_NOTE}</p>
      <p style={small}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council in England</Link>, with what &ldquo;looked after&rdquo; means.
      </p>
      <p style={small}>
        Source: <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>Department for Education, {releaseLabel(cur.year)}</a>.{' '}
        <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
      </p>
    </section>
  );
}
