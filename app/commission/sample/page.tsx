import { SubFold } from '@/app/components/PhoneFolds';
import type { Metadata } from 'next';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { ShowAll } from '@/app/components/NoJsPager';

// A sample commissioned report (owner's brief and approval, 8 Nov 2026, HP1), linked from /commission so a client can see
// what they would receive. The wording is the owner's, word for word, from "Claude outputs/commission/sample-report-
// draft.md"; the spreadsheet is public/commission/sample-thamesmead-pride-in-place.csv, unchanged. Indexed on purpose:
// its title and description say it is a sample.

export const metadata: Metadata = {
  title: 'Sample report: Pride in Place money in Thamesmead Birchmere Park',
  description: 'A sample of a commissioned opengovt report: the Pride in Place money confirmed and spent in Thamesmead Birchmere Park, with its findings, methodology, sources and data.',
  alternates: { canonical: '/commission/sample' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK };
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.8, margin: '0 0 10px', maxWidth: '720px' };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' };
const cell: React.CSSProperties = { textAlign: 'left', verticalAlign: 'top', padding: '6px 8px', borderBottom: '1px solid rgba(20,16,13,0.25)', fontSize: '15px', lineHeight: 1.5 };

// The draft, word for word.
const SAMPLE_LABEL = 'This is a sample. It shows what a commissioned opengovt report looks like. Nobody commissioned it; we chose the question ourselves from the public record.';
const QUESTION = "Thamesmead Birchmere Park was named for the Government's Pride in Place programme in March 2026. What money has been confirmed, what has been spent, and who is accountable for it?";
const CHECKED = 'Checked: 8 November 2026';
const FINDINGS: Array<{ heading: string; body: string }> = [
  {
    heading: 'The confirmed sum is £19.6 million over 11 years, not £20 million over 10.',
    body: "The Royal Borough of Greenwich's programme page says the area \"has been awarded £20 million to spend over 10 years\" and will have \"£2 million each year\". The Neighbourhood Board's own funding briefing of 17 September 2026 gives £19,600,000 over 11 years, 2025/26 to 2035/36: £7,174,000 revenue and £12,426,000 capital. Funding starts at £150,000 in 2025/26 and reaches £2,222,000 a year only from 2029/30. GOV.UK describes each place's funding as \"up to £20 million over a 10-year period\".",
  },
  {
    heading: 'Only the first four years are confirmed.',
    body: 'The briefing says funding beyond 2028/29 "will be reviewed at the next Spending Review", so the £2,222,000 a year from 2029/30 "is indicative rather than fully confirmed". The four years to 2028/29 add up to £4,047,000.',
  },
  {
    heading: '£48,421.87 had been spent or committed by September 2026, none of it on projects.',
    body: 'The briefing says this came from the capacity building allocation, "the majority of this is staff time, along with some publicity materials". No project spending had been published by 8 November 2026.',
  },
  {
    heading: 'The Neighbourhood Board decides; Greenwich Council answers for the money.',
    body: "GOV.UK's delivery guidance says \"Neighbourhood Boards are the decision makers for funding\" and that funding is paid to the accountable body, which is the local authority unless agreed otherwise. The Board's Terms of Reference say \"The Royal Borough of Greenwich will act as the Accountable Body\". The Board has six voting members, including the local MP, Abena Oppong-Asare, and three non voting members.",
  },
  {
    heading: 'Most of what the Government expects boards to publish was not online on 8 November 2026.',
    body: "GOV.UK says \"We expect Neighbourhood Boards to publish\" board papers \"in advance of the meeting within 5 working days\", draft minutes \"within 10 working days\" and \"transparent records of all Pride in Place spend\". It also says the first monitoring return (portal open 1 to 29 October 2026) must \"be made publicly available following submission\". On 8 November 2026 the Board's page listed papers for one meeting (22 September 2026) and no minutes, spend records or monitoring return. The Board's Conflict of Interest Policy says minutes will be published \"in line with the transparency arrangements set out in the Terms of Reference\"; the Terms of Reference contain no such arrangements.",
  },
];
const METHODOLOGY = "We read the Government's programme guidance on GOV.UK, the Royal Borough of Greenwich's programme and Board pages, and the Board's published papers and policies. We took every figure from the document that first published it and quote it exactly. We added up the funding table ourselves: the yearly revenue figures sum to £7,176,000, £2,000 more than the stated £7,174,000, and the yearly totals sum to £19,601,000, £1,000 more than the stated £19,600,000; the briefing says \"All figures are rounded to the nearest £1,000\", which explains the difference. We did not contact the council or the Board, and we made no Freedom of Information request. \"Not published\" means not found on the council's Pride in Place pages or GOV.UK on 8 November 2026.";
const SOURCES: Array<{ title: string; url: string; supports: string }> = [
  { title: 'Royal Borough of Greenwich: Pride in Place programme for Thamesmead Birchmere Park.', url: 'https://www.royalgreenwich.gov.uk/business-and-licences/economic-development/pride-in-place/thamesmead-birchmere-park', supports: '(findings 1)' },
  { title: 'Thamesmead Birchmere Park Neighbourhood Board: meeting papers, 22 September 2026, item 5.1, pages 51 to 53.', url: 'https://www.royalgreenwich.gov.uk/sites/default/files/2026-10/pride-in-place-combined-board-papers-mtng-20260922_0.pdf', supports: '(findings 1, 2, 3)' },
  { title: 'GOV.UK: Pride in Place Programme delivery guidance.', url: 'https://www.gov.uk/government/publications/pride-in-place-programme-prospectus/pride-in-place-programme-delivery-guidance', supports: '(findings 1, 4, 5)' },
  { title: 'GOV.UK: Pride in Place Programme monitoring guidance.', url: 'https://www.gov.uk/government/publications/pride-in-place-programme-prospectus/pride-in-place-programme-monitoring-guidance', supports: '(finding 5)' },
  { title: 'Royal Borough of Greenwich: The Pride in Place Board.', url: 'https://www.royalgreenwich.gov.uk/business-and-licences/economic-development/pride-in-place/pride-place-board', supports: '(findings 4, 5)' },
  { title: 'Pride in Place Board: Terms of Reference, adopted 22 September 2026.', url: 'https://www.royalgreenwich.gov.uk/sites/default/files/2026-10/pride-in-place-terms-of-reference-20260922_0.pdf', supports: '(findings 4, 5)' },
  { title: 'Pride in Place Board: Conflict of Interest Policy.', url: 'https://www.royalgreenwich.gov.uk/sites/default/files/2026-10/pride-in-place-conflict-of-interest-policy-20260922%20.pdf', supports: '(finding 5)' },
  { title: 'GOV.UK: Pride in Place Programme phase 2 expansion place selection methodology note, 20 March 2026.', url: 'https://www.gov.uk/government/publications/pride-in-place-programme-phase-2-expansion-place-selection-methodology-note/pride-in-place-programme-phase-2-expansion-place-selection-methodology-note', supports: '(question)' },
];
const DATA_CAPTION = '(first rows of the spreadsheet; £000s, as published)';
const DATA_HEAD = ['Year', 'Revenue', 'Capital', 'Total', 'Status', 'Source'];
const DATA_ROWS: string[][] = [
  ['2025/26', '150', '0', '150', 'Confirmed', 'Source 2, p.51'],
  ['2026/27', '273', '118', '391', 'Confirmed (second half of revenue conditional)', 'Source 2, pp.51 to 52'],
  ['2027/28', '692', '668', '1,359', 'Confirmed', 'Source 2, p.51'],
  ['2028/29', '692', '1,455', '2,147', 'Confirmed', 'Source 2, p.51'],
  ['2029/30', '767', '1,455', '2,222', 'Indicative (after next Spending Review)', 'Source 2, pp.51 to 52'],
];
const DATA_MORE = '... 2030/31 to 2035/36 continue at 767 | 1,455 | 2,222, indicative';
const DATA_SPENT = ['Spent or committed to September 2026: £48,421.87 (capacity building; mostly staff time)', 'Source 2, p.53'];
const CSV = '/commission/sample-thamesmead-pride-in-place.csv';

export default function CommissionSamplePage() {
  return (
    <OpenGovShell pageStamp="Commission">
      <BackLink
        fallbackHref="/commission"
        label="← Commission research"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {/* The sample label, first and in its own box (owner, HP1). */}
      <aside aria-label="Sample report" style={{ border: `2px solid ${ACCENT}`, padding: '12px 16px', margin: '0 0 22px', maxWidth: '720px' }}>
        <p style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.14em', color: ACCENT, margin: '0 0 6px' }}>Sample report</p>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: 0 }}>{SAMPLE_LABEL}</p>
      </aside>

      <header style={{ marginBottom: '2%' }}>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Sample report: Pride in Place money in Thamesmead Birchmere Park
        </h1>
      </header>

      {/* The sample report's text, from the question to the methodology (T1-GUARD, 13 Nov 2026, as Cowork's option a for bill
          text): the length checks leave it out. A plain div with no padding or border, so the margins and what a reader sees
          are as before. */}
      <div data-article-body="">
      <h2 style={h2}>Question</h2>
      <p style={p}>{QUESTION}</p>
      <p style={{ ...p, fontWeight: 'bold' }}>{CHECKED}</p>

      <h2 style={h2}>Findings</h2>
      <ShowAll id="sample-findings" count={(FINDINGS).length} rows="> li">
      <ol style={{ margin: 0, paddingLeft: '1.6em', maxWidth: '720px' }}>
        {FINDINGS.map((f) => (
          <li key={f.heading} style={{ fontSize: '16px', lineHeight: 1.8, marginBottom: '14px' }}>
            <strong>{f.heading}</strong>
            <br />
            {f.body}
          </li>
        ))}
      </ol>
      </ShowAll>

      <h2 style={h2}>Methodology</h2>
      <p style={p}>{METHODOLOGY}</p>
      </div>

      <h2 style={h2}>Sources</h2>
      {/* T1-GUARD (owner approved 13 Nov 2026): on phones the sources and the supporting data fold under their headings;
          from 768px as before. */}
      <SubFold label={`The ${SOURCES.length} sources`}>
      <ol style={{ margin: 0, paddingLeft: '1.6em', maxWidth: '720px' }}>
        {SOURCES.map((s) => (
          <li key={s.url} style={{ fontSize: '16px', lineHeight: 1.7, marginBottom: '10px' }}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="og-tap" style={link}>{s.title}</a> {s.supports}
          </li>
        ))}
      </ol>
      </SubFold>

      <h2 style={h2}>Supporting data</h2>
      <SubFold label="The table and spreadsheet">
      <p style={{ ...p, fontSize: '15px' }}>{DATA_CAPTION}</p>
      {/* Wider than a phone: the table scrolls inside its own box, so the page itself never scrolls sideways. */}
      <div style={{ overflowX: 'auto', maxWidth: '100%', margin: '0 0 12px' }}>
        <table data-pt-table="keep" style={{ borderCollapse: 'collapse', minWidth: '640px', width: '100%' }}>
          <thead>
            <tr>{DATA_HEAD.map((h) => <th key={h} scope="col" style={{ ...cell, borderBottom: `2px solid ${INK}` }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {DATA_ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={cell}>{c}</td>)}</tr>)}
            <tr><td colSpan={6} style={cell}>{DATA_MORE}</td></tr>
            <tr><td colSpan={5} style={cell}>{DATA_SPENT[0]}</td><td style={cell}>{DATA_SPENT[1]}</td></tr>
          </tbody>
        </table>
      </div>
      <p style={p}>
        <a href={CSV} download className="og-tap" style={link}>Download the full spreadsheet (CSV)</a>
      </p>
      </SubFold>

    </OpenGovShell>
  );
}
