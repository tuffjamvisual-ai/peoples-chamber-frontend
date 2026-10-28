// "Road condition" section for English council pages, Crime & roads tab (server component; owner's approval, 28 Oct
// 2026). Reads council_road_condition (scripts/migrations/2026-10-28g; DfT road condition statistics, RDC tables).
// Highway authorities (county, unitary, metropolitan and London borough councils) show the share of each road type
// where maintenance should have been considered, against England, with the change on the year; a district page gets
// one line pointing to its county. A figure DfT flags as not comparable carries DfT's warning. Wording in
// lib/road-condition.ts.

import Link from 'next/link';
import {
  loadArea, value, valueText, notComparable, changeText, fye, ROAD_TYPES, RED_MEANING, NOT_COMPARABLE_WARNING, LAST_YEAR_NOTE,
  ENGLAND_NOTE, SOURCE_PAGE, SOURCE_LABEL, OGL, OGL_URL, RANKING_PATH,
} from '@/lib/road-condition';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 6px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Road condition
    </h2>
  );
}

export default async function CouncilRoadConditionSection({ gssCode, country, isDistrict, countyName, countySlug }: {
  gssCode: string | null; country: string | null; isDistrict: boolean; countyName?: string | null; countySlug?: string | null;
}) {
  if (!gssCode || country !== 'England') return null;
  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0, lineHeight: 1.6 }}>
          Roads here are looked after by{' '}
          <Link href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</Link>
          , the highway authority, which shows their condition.
        </p>
      </section>
    );
  }

  const rows = await loadArea(gssCode);
  const own = rows.filter((r) => r.ons_code === gssCode);
  const cur = own[0];
  if (!cur || ROAD_TYPES.every((t) => value(cur, t.field) == null) && !cur.symbols?.a_roads_red_pct) return null;
  const prevYear = `${Number(cur.year.slice(0, 4)) - 1}-03-31`;
  const prev = own.find((r) => r.year.slice(0, 10) === prevYear);
  const eng = rows.find((r) => r.ons_code === 'E92000001' && r.year.slice(0, 10) === cur.year.slice(0, 10));
  const flagged = ROAD_TYPES.some((t) => notComparable(cur, t.field));
  const treated = value(cur, 'treated_a_pct') != null || value(cur, 'treated_bcu_pct') != null;

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={{ ...line, marginBottom: '10px' }}>
        Share of the council&rsquo;s roads where maintenance should have been considered (red), in {fye(cur.year)}:
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
        {ROAD_TYPES.map((t) => {
          // No change on the year for a figure DfT flags: it advises against comparing those year on year.
          const flaggedHere = notComparable(cur, t.field) || notComparable(prev, t.field);
          const ch = flaggedHere ? null : changeText(cur, prev, t.field);
          return (
            <li key={t.key} style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, padding: '6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, overflowWrap: 'break-word' }}>
              {t.label}: <strong>{valueText(cur, t.field)}</strong>{notComparable(cur, t.field) ? ' (not comparable, see below)' : ''}
              <span style={{ display: 'block' }}>
                {[ch ? `${ch[0].toUpperCase()}${ch.slice(1)}` : null, eng ? `England ${valueText(eng, t.field)}` : null].filter(Boolean).join('. ')}
              </span>
            </li>
          );
        })}
      </ul>
      {treated && (
        <p style={line}>
          Road length treated in {fye(cur.year)} (resurfacing, strengthening or preservation): A roads {valueText(cur, 'treated_a_pct')}; B, C and unclassified roads {valueText(cur, 'treated_bcu_pct')}
          {eng ? ` (England ${valueText(eng, 'treated_a_pct')} and ${valueText(eng, 'treated_bcu_pct')})` : ''}.
        </p>
      )}

      {flagged && <p style={small}>{NOT_COMPARABLE_WARNING}</p>}
      <p style={small}>Red means the road {RED_MEANING} (DfT). Unclassified roads are surveyed in different ways by different councils, so DfT advises caution comparing them. {ENGLAND_NOTE}</p>
      <p style={small}>{LAST_YEAR_NOTE}</p>
      <p style={small}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every highway authority in England</Link>.
      </p>
      <p style={small}>
        Source: <a href={SOURCE_PAGE} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{SOURCE_LABEL}</a>.{' '}
        <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
      </p>
    </section>
  );
}
