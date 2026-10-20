// "Ombudsman complaints" section for the Ratings tab on council pages (server component, England). Reads
// council_ombudsman: the Local Government and Social Care Ombudsman's annual review data (migration
// 2026-10-20l-council-ombudsman.sql, loaded by scripts/import-lgsco.js). Owner's decisions (20 Oct 2026):
//   - complaints received (with the top categories and the Ombudsman's caution), decided by outcome, investigated and
//     upheld (count and %), satisfactory remedy (% of upheld), recommendations carried out (% of N cases) and on time
//     (N of N, %); the change on the previous year in counts, with a percentage only when the earlier figure is 20 or more;
//   - never the per-100,000-resident rates or the similar-authority averages (they are not stored);
//   - where the Ombudsman publishes text instead of a figure ("None upheld", "no comp outcomes"), that text is shown.
// Every council has its own figures: a county's are about county services, a district's about district services.

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const SOURCE_URL = 'https://www.lgo.org.uk/information-centre/reports/annual-review-reports/local-government-complaint-reviews';
const GUIDE_URL = 'https://www.lgo.org.uk/information-centre/reports/annual-review-reports/interpreting-local-authority-statistics';

type Row = {
  year: string;
  received_total: number;
  received_adult_social_care: number;
  received_benefits_tax: number;
  received_corporate_other: number;
  received_education_children: number;
  received_environment: number;
  received_highways_transport: number;
  received_housing: number;
  received_planning: number;
  received_other: number;
  decided_total: number;
  decided_invalid_incomplete: number;
  decided_advice_given: number;
  decided_referred_back: number;
  decided_closed_after_enquiries: number;
  not_upheld: number;
  upheld: number;
  uphold_pc: number | null;
  satisfactory_remedy_pc: number | null;
  compliance_cases: number;
  compliance_pc: number | null;
  on_time_cases: number | null;
  on_time_pc: number | null;
  notes: string | null;
};

// The Ombudsman's categories, in the file's order, as they read in a sentence.
const CATEGORIES: [keyof Row, string][] = [
  ['received_adult_social_care', 'adult social care'],
  ['received_benefits_tax', 'benefits and tax'],
  ['received_corporate_other', 'corporate and other services'],
  ['received_education_children', "education and children's services"],
  ['received_environment', 'environmental services, public protection and regulation'],
  ['received_highways_transport', 'highways and transport'],
  ['received_housing', 'housing'],
  ['received_planning', 'planning and development'],
  ['received_other', 'other matters'],
];

const fmt = (n: number) => n.toLocaleString('en-GB');
const pcText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

// The text the Ombudsman published in place of a percentage, from notes ('compliance_pc: "no comp outcomes"').
function publishedText(notes: string | null, column: string): string | null {
  const m = (notes || '').match(new RegExp(`(?:^|; )${column}: "([^"]*)"`));
  return m ? m[1] : null;
}
// A percentage as published, or the published text in quotes; null if neither.
function pcOrText(value: number | null, notes: string | null, column: string): string | null {
  if (value != null) return pcText(value);
  const t = publishedText(notes, column);
  return t ? `“${t}”` : null;
}

// "96 more (up 30.4%)", "5 fewer", "the same". No percentage when the earlier figure is under 20 (owner's decision).
const MIN_BASE_FOR_PCT = 20;
function change(cur: number, prev: number): string {
  const d = cur - prev;
  if (d === 0) return 'the same';
  const pct = prev >= MIN_BASE_FOR_PCT ? ` (${d > 0 ? 'up' : 'down'} ${(Math.abs(d) / prev * 100).toFixed(1)}%)` : '';
  return `${fmt(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'}${pct}`;
}

const P = ({ children, small }: { children: React.ReactNode; small?: boolean }) => (
  <p style={{ fontFamily: MONO, fontSize: small ? '14px' : '15px', lineHeight: small ? 1.6 : 1.7, color: INK, margin: '0 0 10px' }}>{children}</p>
);

export default async function CouncilOmbudsmanSection({ gssCode }: { gssCode: string | null }) {
  if (!gssCode || !gssCode.startsWith('E')) return null;
  const { data, error } = await supabase
    .from('council_ombudsman')
    .select('year, received_total, received_adult_social_care, received_benefits_tax, received_corporate_other, received_education_children, received_environment, received_highways_transport, received_housing, received_planning, received_other, decided_total, decided_invalid_incomplete, decided_advice_given, decided_referred_back, decided_closed_after_enquiries, not_upheld, upheld, uphold_pc, satisfactory_remedy_pc, compliance_cases, compliance_pc, on_time_cases, on_time_pc, notes')
    .eq('gss', gssCode)
    .order('year', { ascending: false });
  if (error || !data || data.length === 0) return null;
  const rows = data as Row[];
  const cur = rows[0];
  const prevYear = `${Number(cur.year.slice(0, 4)) - 1}-${cur.year.slice(2, 4)}`;
  const prev = rows.find((r) => r.year === prevYear) ?? null;
  const investigated = cur.upheld + cur.not_upheld;

  const top = CATEGORIES
    .map(([k, label], i) => ({ label, n: cur[k] as number, i }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, 3);
  const topText = top.map((c) => `${c.label} (${fmt(c.n)})`);
  const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

  const uphold = pcOrText(cur.uphold_pc, cur.notes, 'uphold_pc');
  const remedy = pcOrText(cur.satisfactory_remedy_pc, cur.notes, 'satisfactory_remedy_pc');
  const compliance = pcOrText(cur.compliance_pc, cur.notes, 'compliance_pc');
  const onTime = cur.on_time_cases == null
    ? null
    : cur.on_time_pc != null
      ? `${fmt(cur.on_time_cases)} of ${fmt(cur.compliance_cases)} (${pcText(cur.on_time_pc)})`
      : pcOrText(null, cur.notes, 'on_time_pc');

  const changes = prev && [
    ['complaints and enquiries received', change(cur.received_total, prev.received_total)],
    ['decided', change(cur.decided_total, prev.decided_total)],
    ['investigated', change(investigated, prev.upheld + prev.not_upheld)],
    ['upheld', change(cur.upheld, prev.upheld)],
  ];

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Ombudsman complaints
      </h2>
      <P>
        Complaints and enquiries the Local Government and Social Care Ombudsman received about this council in {cur.year}:{' '}
        <strong>{fmt(cur.received_total)}</strong>.
        {topText.length > 0 && <> The most were about {list(topText)}.</>}
      </P>
      <P small>
        The Ombudsman cautions against reading this number on its own as a measure of how well a council performs: it also
        depends on how many people the council serves, one-off local events, people&rsquo;s expectations, and how well the
        council tells people they can complain to the Ombudsman.
      </P>
      <P>
        Decided in {cur.year}: <strong>{fmt(cur.decided_total)}</strong>. Invalid or incomplete {fmt(cur.decided_invalid_incomplete)};
        advice given {fmt(cur.decided_advice_given)}; referred back to the council to deal with first {fmt(cur.decided_referred_back)};
        closed after initial enquiries {fmt(cur.decided_closed_after_enquiries)}; investigated {fmt(investigated)}.
      </P>
      <P>
        {investigated > 0 && cur.upheld === 0
          ? <>Of the {fmt(investigated)} investigated, <strong>none upheld</strong>{uphold ? ` (${uphold})` : ''}.</>
          : investigated > 0
          ? <>Of the {fmt(investigated)} investigated, <strong>{fmt(cur.upheld)} upheld</strong>{uphold ? ` (${uphold})` : ''}: the Ombudsman found fault, or found the council had already offered a suitable remedy.</>
          : <>Upheld: <strong>{fmt(cur.upheld)}</strong>{uphold ? ` (${uphold})` : ''}.</>}
        {/* The percentage as published, out of the upheld count in the same file; no count is worked out from it. */}
        {cur.satisfactory_remedy_pc != null
          ? <> In <strong>{remedy}</strong> of the {fmt(cur.upheld)} upheld {cur.upheld === 1 ? 'case' : 'cases'}, the council had already put things right satisfactorily before the complaint reached the Ombudsman.</>
          : remedy && <> Upheld cases where the council had already put things right satisfactorily before the complaint reached the Ombudsman: <strong>{remedy}</strong>.</>}
      </P>
      {(compliance || onTime) && (
        <P>
          {compliance && (cur.compliance_pc != null
            ? <>Recommendations carried out: <strong>{compliance}</strong> of the {fmt(cur.compliance_cases)} {cur.compliance_cases === 1 ? 'case' : 'cases'} with an outcome recorded in {cur.year}.</>
            : <>Recommendations carried out: <strong>{compliance}</strong>.</>)}
          {onTime && <> Carried out on time: <strong>{onTime}</strong>.</>}
        </P>
      )}
      {changes && (
        <P>Change on {prev!.year}: {changes.map(([label, t]) => `${label} ${t}`).join('; ')}.</P>
      )}
      <p style={{ fontFamily: MONO, fontSize: '13px', lineHeight: 1.6, color: INK, margin: 0, opacity: 0.85 }}>
        Source: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>Local Government and Social Care Ombudsman, annual review data {cur.year}</a>{' '}
        (1 April to 31 March; <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>how to read these figures</a>).
        {' '}© Commission for Local Administration in England. &ldquo;Investigated&rdquo; (upheld plus not upheld) and the changes on {prev ? prev.year : 'the year before'} are our sums from the published figures.
      </p>
    </section>
  );
}
