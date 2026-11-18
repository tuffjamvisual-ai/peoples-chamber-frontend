// "Free school meals" section for English council pages, Schools tab (owner approved 18 Nov 2026, Cowork ENTRY 303).
// Reads area_free_school_meals (DfE school census through its statistics API). Schools data is by the local authority
// that runs education (county, unitary, metropolitan and London borough councils); a district page gets one line pointing
// to its county. England beside each figure. Wording in lib/free-school-meals.ts.
import Link from 'next/link';
import { addPanelSource } from '@/lib/panel-sources';
import { loadArea, summarise, pctText, count, tookShare, changeText, sinceText, censusLabel, SOURCE_PAGE, SOURCE_LABEL, OGL, OGL_URL, RANKING_PATH } from '@/lib/free-school-meals';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 6px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;

function Heading() {
  return <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>Free school meals</h2>;
}

export default async function CouncilFreeSchoolMealsSection({ gssCode, country, isDistrict, countyName, countySlug }: {
  gssCode: string | null; country: string | null; isDistrict: boolean; countyName?: string | null; countySlug?: string | null;
}) {
  if (!gssCode || country !== 'England') return null;
  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0, lineHeight: 1.6 }}>
          Schools here are the responsibility of{' '}
          <Link href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</Link>
          , which shows the figures for free school meals.
        </p>
      </section>
    );
  }
  const s = summarise(await loadArea(gssCode), gssCode);
  if (!s) return null;
  const { cur, prev, first, primary, secondary, eng, engPrimary, engSecondary } = s;
  const when = censusLabel(cur.academic_year);
  const took = tookShare(cur), engTook = tookShare(eng);
  const notTaking = cur.fsm_eligible != null && cur.fsm_taking_meal != null ? cur.fsm_eligible - cur.fsm_taking_meal : null;

  addPanelSource({ label: SOURCE_LABEL, href: SOURCE_PAGE });
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={line}>Pupils eligible for free school meals, {when}: <strong>{count(cur.fsm_eligible)}</strong>, <strong>{pctText(cur)}</strong> of {count(cur.pupils)} pupils{eng ? ` (England ${pctText(eng)})` : ''}</p>
      {changeText(cur, prev) && <p style={line}>On the year: {changeText(cur, prev)}</p>}
      {first && first.academic_year !== cur.academic_year && sinceText(cur, first) && <p style={line}>Since {censusLabel(first.academic_year)}: {sinceText(cur, first)}</p>}
      <p style={line}>
        Primary: <strong>{pctText(primary)}</strong>{engPrimary ? ` (England ${pctText(engPrimary)})` : ''}; secondary: <strong>{pctText(secondary)}</strong>{engSecondary ? ` (England ${pctText(engSecondary)})` : ''}
      </p>
      <p style={line}>
        Eligible pupils who took a free meal on census day: <strong>{count(cur.fsm_taking_meal)}</strong>
        {took != null ? ` (${took.toFixed(1)} per cent of those eligible${engTook != null ? `; England ${engTook.toFixed(1)} per cent` : ''})` : ''}
        {notTaking != null ? `; ${count(notTaking)} did not` : ''}
      </p>
      <p style={small}>Shares are of all pupils in the council&rsquo;s state funded and non maintained special schools, from the January school census.</p>
      <p style={small}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council in England</Link>, with what eligible means.
      </p>
      <p style={small}>
        Source: Department for Education, Schools, pupils and their characteristics (in Sources at the end of this tab).{' '}
        <a href={OGL_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{OGL}</a>
      </p>
    </section>
  );
}
