// "Schools" section for council pages (server component, England). Reads
// school_inspections — Ofsted's most recent inspection outcomes for every
// open state school; see scripts/migrations/2026-10-11k-school-inspections.sql.
//
// Shown on education authorities (county, unitary, metropolitan and London
// borough councils). District councils have no education role, so a
// district page gets one line pointing to its county council instead.
//
// Report card grades (renewed framework, from 10 November 2025) and grades
// from the previous framework are never combined: Ofsted says they are not
// comparable.

import Link from 'next/link';
import { pageDb } from '@/lib/page-reads';
import { readAll } from '@/lib/read-all';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type School = {
  urn: string;
  school_name: string;
  phase: string | null;
  school_type: string | null;
  pupils: number | null;
  web_link: string | null;
  rc_inspection_date: string | null;
  rc_relates_to_current: boolean | null;
  rc_safeguarding: string | null;
  rc_inclusion: string | null;
  rc_curriculum_teaching: string | null;
  rc_achievement: string | null;
  rc_attendance_behaviour: string | null;
  rc_personal_development: string | null;
  rc_early_years: string | null;
  rc_post16: string | null;
  rc_leadership: string | null;
  oeif_inspection_date: string | null;
  oeif_relates_to_current: boolean | null;
  oeif_overall: string | null;
  ungraded_date: string | null;
  ungraded_relates_to_current: boolean | null;
  ungraded_outcome: string | null;
  most_recent_category: string | null;
  snapshot_date: string;
};

const SELECT = 'urn, school_name, phase, school_type, pupils, web_link, rc_inspection_date, rc_relates_to_current, rc_safeguarding, rc_inclusion, rc_curriculum_teaching, rc_achievement, rc_attendance_behaviour, rc_personal_development, rc_early_years, rc_post16, rc_leadership, oeif_inspection_date, oeif_relates_to_current, oeif_overall, ungraded_date, ungraded_relates_to_current, ungraded_outcome, most_recent_category, snapshot_date';

const RC_GRADES = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement'] as const;
const RC_AREAS: { key: keyof School; label: string }[] = [
  { key: 'rc_inclusion', label: 'Inclusion' },
  { key: 'rc_curriculum_teaching', label: 'Curriculum and teaching' },
  { key: 'rc_achievement', label: 'Achievement' },
  { key: 'rc_attendance_behaviour', label: 'Attendance and behaviour' },
  { key: 'rc_personal_development', label: 'Personal development and wellbeing' },
  { key: 'rc_leadership', label: 'Leadership and governance' },
  { key: 'rc_early_years', label: 'Early years' },
  { key: 'rc_post16', label: 'Provision after age 16' },
];
const OEIF_LABELS: Record<string, string> = { '1': 'Outstanding', '2': 'Good', '3': 'Requires improvement', '4': 'Inadequate', 'Not judged': 'Not judged (no overall grade given)' };
const OEIF_ORDER = ['1', '2', '3', '4', 'Not judged'];
const CATEGORY: Record<string, string> = { SM: 'Special measures', SWK: 'Serious weaknesses', RSI: 'Requires significant improvement' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');

// Most recent event for a school, for the list.
function latest(s: School): { date: string | null; text: string; predecessor: boolean } {
  const events = [
    s.rc_inspection_date ? { date: s.rc_inspection_date, text: 'Report card', predecessor: s.rc_relates_to_current === false } : null,
    s.oeif_inspection_date ? { date: s.oeif_inspection_date, text: s.oeif_overall ? OEIF_LABELS[s.oeif_overall] ?? s.oeif_overall : 'Graded inspection', predecessor: s.oeif_relates_to_current === false } : null,
    s.ungraded_date ? { date: s.ungraded_date, text: s.ungraded_outcome ?? 'Ungraded inspection', predecessor: s.ungraded_relates_to_current === false } : null,
  ].filter(Boolean) as { date: string; text: string; predecessor: boolean }[];
  if (events.length === 0) return { date: null, text: 'Not yet inspected', predecessor: false };
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events[0];
}

async function fetchSchools(code: string): Promise<School[]> {
  // (24 Oct 2026, report 36): every row via lib/read-all.ts, which throws on a failed page instead of stopping
  // quietly, so the page keeps its last good version rather than showing part of the figures. urn (the primary key) breaks ties between schools with the same name.
  return readAll<School>(() => pageDb().from('school_inspections'), {
    columns: SELECT,
    filter: (q) => q.eq('la_gss_code', code),
    orderBy: [{ column: 'school_name' }, { column: 'urn' }],
    label: 'CouncilSchoolInspectionsSection',
  });
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 'bold' };
const thR: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '6px 8px 6px 0', verticalAlign: 'top' };
const tdR: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Schools
    </h2>
  );
}

// For the area summary (/your-area): the same school and pupil counts this section
// leads with, plus the number of schools in a category of concern. gssCode is the
// education authority (the county council in two tier areas).
export async function loadSchoolsHeadline(gssCode: string | null) {
  if (!gssCode || !gssCode.startsWith('E')) return null;
  const schools = await fetchSchools(gssCode);
  if (schools.length === 0) return null;
  return {
    count: schools.length,
    pupils: schools.reduce((t, s) => t + (s.pupils ?? 0), 0),
    snapshot: fmtDate(schools[0].snapshot_date),
    concern: schools.filter((s) => s.most_recent_category && CATEGORY[s.most_recent_category]).length,
  };
}

export default async function CouncilSchoolInspectionsSection({
  gssCode,
  isDistrict,
  countyName,
  countySlug,
  fullListHref,
}: {
  gssCode: string | null;
  isDistrict: boolean;
  countyName?: string | null;
  countySlug?: string | null;
  /** On the council page: link the full list of schools (its own page) instead of including it (owner's approval,
   * 21 Oct 2026; the list was a third of Kent's 1.9 MB page). Omitted on /councils/[slug]/schools itself. */
  fullListHref?: string;
}) {
  if (!gssCode || !gssCode.startsWith('E')) return null;

  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>
          Schools here are the responsibility of{' '}
          <a href={`/councils/${countySlug}#schools`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</a>
          , which publishes Ofsted inspection results for every state school in the county.
        </p>
      </section>
    );
  }

  const schools = await fetchSchools(gssCode);
  if (schools.length === 0) return null;
  const snapshot = schools[0].snapshot_date;
  const pupils = schools.reduce((t, s) => t + (s.pupils ?? 0), 0);

  const withRC = schools.filter((s) => s.rc_inspection_date);
  const areaRows = RC_AREAS.map((a) => {
    const counts = RC_GRADES.map((g) => withRC.filter((s) => s[a.key] === g).length);
    return { label: a.label, counts, total: counts.reduce((t, n) => t + n, 0) };
  }).filter((r) => r.total > 0);
  const sgMet = withRC.filter((s) => s.rc_safeguarding === 'Met').length;
  const sgNotMet = withRC.filter((s) => s.rc_safeguarding === 'Not met').length;

  const earlier = schools.filter((s) => !s.rc_inspection_date && s.oeif_overall);
  const oeifCounts = OEIF_ORDER.map((k) => ({ key: k, n: earlier.filter((s) => s.oeif_overall === k).length })).filter((x) => x.n > 0);
  // Schools without a report card or a previous-framework graded result in Ofsted's file:
  // most have an ungraded inspection on record; the rest have no inspection at all.
  const ungradedOnly = schools.filter((s) => !s.rc_inspection_date && !s.oeif_overall && s.ungraded_outcome);
  const ungradedCounts = [...ungradedOnly.reduce((m, s) => m.set(s.ungraded_outcome as string, (m.get(s.ungraded_outcome as string) || 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const notInspected = schools.filter((s) => !s.rc_inspection_date && !s.oeif_inspection_date && !s.ungraded_date && !s.oeif_overall).length;

  const concern = schools.filter((s) => s.most_recent_category && CATEGORY[s.most_recent_category]);
  const hasPredecessor = schools.some((s) => latest(s).predecessor);

  const link = (s: School, text: string) =>
    s.web_link ? <a href={s.web_link} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>{text}</a> : text;

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 16px' }}>
        <strong>{fmtNum(schools.length)}</strong> open state schools with <strong>{fmtNum(pupils)}</strong> pupils, Ofsted snapshot as at {fmtDate(snapshot)}
      </p>

      {withRC.length > 0 && (
        <>
          <h3 style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Report cards (inspections since 10 November 2025)</h3>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 8px' }}>
            {fmtNum(withRC.length)} {withRC.length === 1 ? 'school has' : 'schools have'} a report card. Safeguarding: {fmtNum(sgMet)} met{sgNotMet ? `, ${fmtNum(sgNotMet)} not met` : ''}.
          </p>
          {areaRows.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, minWidth: '560px', width: '100%' }}>
                <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>Number of schools at each grade, by area</caption>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    <th style={th}>Area</th>
                    {RC_GRADES.map((g) => <th key={g} style={thR}>{g}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {areaRows.map((r) => (
                    <tr key={r.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                      <td style={td}>{r.label}</td>
                      {r.counts.map((n, i) => <td key={i} style={tdR}>{n}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {oeifCounts.length > 0 && (
        <>
          <h3 style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Earlier inspections (schools without a report card yet)</h3>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '8px' }}>
            <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>Overall effectiveness at the last graded inspection</caption>
            <tbody>
              {oeifCounts.map((x) => (
                <tr key={x.key} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ padding: '6px 20px 6px 0' }}>{OEIF_LABELS[x.key]}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtNum(x.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {ungradedCounts.length > 0 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '8px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>
            Schools whose only inspection in Ofsted&rsquo;s file is an ungraded one ({fmtNum(ungradedOnly.length)}), by outcome
          </caption>
          <tbody>
            {ungradedCounts.map(([outcome, n]) => (
              <tr key={outcome} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 20px 6px 0' }}>{outcome}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtNum(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {notInspected > 0 && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 18px' }}>
          {fmtNum(notInspected)} {notInspected === 1 ? 'school has' : 'schools have'} no inspection on record yet (for example, newly opened schools).
        </p>
      )}

      {concern.length > 0 && (
        <>
          <h3 style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Schools in a category of concern</h3>
          <ul style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 18px', paddingLeft: '18px' }}>
            {concern.map((s) => (
              <li key={s.urn}>{link(s, s.school_name)} ({s.phase ?? 'school'}): {CATEGORY[s.most_recent_category as string]}</li>
            ))}
          </ul>
        </>
      )}

      {fullListHref ? (
        <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 14px' }}>
          <Link href={fullListHref} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All {fmtNum(schools.length)} schools, with each one&rsquo;s latest inspection →</Link>
        </p>
      ) : (
      <details style={{ marginBottom: '14px' }}>
        <summary style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, cursor: 'pointer' }}>All {fmtNum(schools.length)} schools</summary>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '6px', width: '100%', minWidth: '520px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <th style={th}>School</th>
                <th style={th}>Phase</th>
                <th style={th}>Latest inspection</th>
                <th style={th}>Result</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => {
                const l = latest(s);
                return (
                  <tr key={s.urn} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    <td style={td}>{link(s, s.school_name)}</td>
                    <td style={td}>{s.phase ?? 'n/a'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.date ? fmtDate(l.date) : 'n/a'}</td>
                    <td style={td}>{l.text}{l.predecessor ? ' *' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasPredecessor && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '6px 0 0' }}>* Inspection of a predecessor school (for example, before it became an academy).</p>}
      </details>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        Since 10 November 2025 Ofsted inspects schools under a renewed framework and publishes a report card grading up to eight areas on a scale of five points, plus whether safeguarding standards are met. Ofsted says these grades cannot be compared with grades from the previous framework, so they are shown separately. Graded inspections between 1 September 2024 and 9 November 2025 gave no overall grade (&ldquo;Not judged&rdquo;). Ungraded inspections check whether a school is still at its previous grade; the &ldquo;Earlier inspections&rdquo; figures use the last graded inspection.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        Source: Ofsted, State-funded schools inspections and outcomes as at {fmtDate(snapshot)} (official statistics). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
