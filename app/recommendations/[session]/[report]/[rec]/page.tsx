import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../../components/OpenGovShell';
import BackLink from '../../../../components/BackLink';
import {
  RECOMMENDATIONS_PUBLIC, recommendationDetail, wording, sessionWords, dayMonthYear, asPublished, documentWords, departmentWords, recommendationFor,
  targetPassed, effectiveStatus, bodyNotes, laterEvidence, targetSource, type StatusRow, type StatusLink, type EventRow, type SourceDocument,
} from '@/lib/pac';

// /recommendations/[session]/[report]/[rec], e.g. /recommendations/2024-26/54/4b (owner's approval, 29 Oct 2026,
// "go stage 4"): one Committee of Public Accounts recommendation, the government's statements about it in date order,
// any delivery evidence, and its status in plain words. Only exists when RECOMMENDATIONS_PUBLIC=1.
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

type Params = { session: string; report: string; rec: string };
const INK = '#14100d';
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK };
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '12px', maxWidth: '46em', overflowWrap: 'anywhere' };
const quote: React.CSSProperties = { ...p, borderLeft: '3px solid rgba(20,16,13,0.3)', paddingLeft: '14px', margin: '0 0 16px' };
const small: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: INK, overflowWrap: 'anywhere' };
const link: React.CSSProperties = { color: INK, textDecoration: 'underline', textUnderlineOffset: '2px' };

async function load(params: Promise<Params>) {
  if (!RECOMMENDATIONS_PUBLIC) return null;
  const { session, report, rec } = await params;
  if (!/^\d{4}(-\d{2})?$/.test(session) || !/^\d{1,3}$/.test(report) || !/^\d{1,2}[a-z]?$/.test(rec)) return null;
  return recommendationDetail(session, Number(report), rec);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  const { row } = d;
  return {
    title: `${row.report_title}: recommendation ${row.rec_number}`,
    description: `Committee of Public Accounts recommendation ${row.rec_number} in report ${row.report_number} of the ${sessionWords(row.session)}, and what the government has said about it in Treasury Minutes.`,
    alternates: { canonical: `/recommendations/${row.session}/${row.report_number}/${row.rec_number}` },
  };
}

const RESPONSE: Record<string, string> = { agree: 'Agreed', partly: 'Partly agreed', disagree: 'Disagreed', notes: 'Noted' };
const paragraphs = (t: string | null) => asPublished(t).split('\n').map((x) => x.trim()).filter(Boolean);

// A target line as the document writes it, with "Target passed" once the month its period ends in is over.
function targetLine(label: string, text: string | null, month: string | null): string | null {
  if (!text) return null;
  return `${label}: “${text}”${targetPassed(month) ? '. Target passed' : ''}`;
}

// Later evidence named in the source line: each publication by its publisher ("Ministry of Justice letter to the
// Committee of Public Accounts", "Ministry of Justice on GOV.UK") or, when the row has no publisher, by its site.
function laterSource(url: string | null, publisher: string | null, title: string | null): string | null {
  if (!url) return null;
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  if (host === 'committees.parliament.uk' && /^letter\b/i.test(title ?? '')) return publisher ? `${publisher} letter to the Committee of Public Accounts` : 'Letter to the Committee of Public Accounts';
  if (host === 'gov.uk') return publisher ? `${publisher} on GOV.UK` : 'GOV.UK';
  return publisher ? `${publisher} (${host})` : host;
}
const listWords = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const linked = (parts: StatusLink[]) => parts.map((s, i) => (s.href ? <a key={i} href={s.href} style={link}>{s.text}</a> : <span key={i}>{s.text}</span>));

// A target set after the Treasury Minutes, in a department's letter (pac_target_updates): the last entry in the
// timeline, as "Revised in a letter from the Ministry of Justice, 23 July 2026". Not a Treasury Minute or progress report.
function TargetUpdate({ row, docs }: { row: StatusRow; docs: SourceDocument[] }) {
  const source = targetSource(row, docs);
  if (!source) return null;
  return (
    <li style={{ borderLeft: '2px solid rgba(20,16,13,0.25)', padding: '0 0 18px 16px', margin: 0 }}>
      <span style={{ display: 'block', ...small, fontSize: '16px', fontWeight: 600 }}>
        <a href={source.href} style={link}>{source.text}</a>
      </span>
      {row.target_source_title && (
        <span style={{ display: 'block', ...small, marginTop: '4px' }}>
          {row.target_source_title}{row.target_source_published_on ? `, published ${dayMonthYear(row.target_source_published_on)}` : ''}
        </span>
      )}
      {row.latest_target_text && <span style={{ display: 'block', ...small }}>{targetLine('Revised target', row.latest_target_text, row.latest_target_month)}</span>}
      {row.target_source_quote && (
        <details open style={{ marginTop: '6px' }}>
          <summary style={{ ...small, cursor: 'pointer' }}>The letter’s words</summary>
          <p style={{ ...p, fontSize: '15px', marginTop: '8px' }}>{asPublished(row.target_source_quote)}</p>
        </details>
      )}
    </li>
  );
}

function Event({ e, open }: { e: EventRow & { document: SourceDocument }; open: boolean }) {
  const pdf = `${e.document.url}${e.page ? `#page=${e.page}` : ''}`;
  const lines = [
    targetLine('Target', e.target_text, e.target_month),
    targetLine('Original target', e.original_target_text, e.original_target_month),
    targetLine('Revised target', e.revised_target_text, e.revised_target_month),
    e.implemented_text ? (e.implemented_text === 'Recommendation implemented' ? 'Recommendation implemented' : `Recommendation implemented: “${e.implemented_text}”`) : null,
  ].filter((l): l is string => !!l);
  const words = [...paragraphs(e.response_text), ...paragraphs(e.progress_text)];
  return (
    <li style={{ borderLeft: '2px solid rgba(20,16,13,0.25)', padding: '0 0 18px 16px', margin: 0 }}>
      <span style={{ display: 'block', ...small, fontSize: '16px', fontWeight: 600 }}>
        <a href={pdf} style={link}>{documentWords(e.document)}</a>{e.page ? `, PDF page ${e.page}` : ''}
      </span>
      {e.response && <span style={{ display: 'block', ...small, marginTop: '4px' }}>Response: {RESPONSE[e.response] ?? `“${e.response}”`}</span>}
      {lines.map((l) => <span key={l} style={{ display: 'block', ...small }}>{l}</span>)}
      {words.length > 0 && (
        <details open={open} style={{ marginTop: '6px' }}>
          <summary style={{ ...small, cursor: 'pointer' }}>The government’s words</summary>
          {words.map((w, i) => <p key={i} style={{ ...p, fontSize: '15px', marginTop: '8px' }}>{w}</p>)}
        </details>
      )}
    </li>
  );
}

export default async function RecommendationPage({ params }: { params: Promise<Params> }) {
  const d = await load(params);
  if (!d) notFound();
  const { events, evidence } = d;
  const row = { ...d.row, status: effectiveStatus(d.row) }; // the target passed rule against today's date
  const w = await wording();
  const status = w.words(row);
  const addressedTo = recommendationFor(d.recommendation, row.department);
  const later = laterEvidence(row);
  const hasUpdate = !!row.target_source_url;
  // What the delivered_elsewhere publication shows (the first evidence row, the one the status line names).
  const shows = row.status === 'delivered_elsewhere' ? evidence.find((e) => e.evidence_url === row.evidence_url)?.note ?? null : null;
  const laterSources = [...new Set([
    ...(row.status === 'delivered_elsewhere' ? evidence.map((e) => laterSource(e.evidence_url, e.publisher, e.evidence_title)) : []),
    // A target read from a Treasury document itself (2024-26/3/6b) is covered by the HM Treasury sentence.
    hasUpdate && !w.documents.some((d) => (row.target_source_title ?? '').includes(`(${d.cp_number})`))
      ? laterSource(row.target_source_url, row.target_source_publisher, row.target_source_title) : null,
    later ? row.review_publisher ?? laterSource(row.review_url, null, null) : null,
  ].filter((x): x is string => !!x))];

  return (
    <OpenGovShell pageStamp="Recommendations">
      <BackLink
        fallbackHref="/recommendations"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '3%' }}>
        <p style={{ ...small, margin: '0 0 6px' }}>Report {row.report_number} of the {sessionWords(row.session)}</p>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 8px', color: INK, overflowWrap: 'anywhere' }}>
          {row.report_title}: recommendation {row.rec_number}
        </h1>
        {row.department && <p style={{ ...small, margin: '0 0 4px' }}>Report department: {departmentWords(row.department)}</p>}
        {bodyNotes(row.department).map((n) => <p key={n} style={{ ...small, margin: '0 0 4px' }}>{n}</p>)}
        {addressedTo && <p style={{ ...small, margin: '0 0 4px' }}>Recommendation for: {addressedTo}, as named in the recommendation</p>}
      </header>

      <section style={{ color: INK }}>
        <p style={{ ...p, fontSize: '18px', fontWeight: 600, border: '1px solid rgba(20,16,13,0.3)', padding: '12px 14px' }}>
          {linked(status)}
        </p>
        {shows && <p style={p}>What it shows: {shows}</p>}
        {later && <p style={p}>{linked(later)}</p>}
        {/* A partly delivered check is shown once, as the Later evidence line above. */}
        {row.review_checked_on && row.review_outcome !== 'partly_delivered' && (
          <p style={p}>Checked by opengovt on {dayMonthYear(row.review_checked_on)}{row.review_note ? `: ${row.review_note}` : '.'}</p>
        )}

        {d.conclusion && (<>
          <h2 style={h2}>What the Committee concluded</h2>
          <p style={quote}>{asPublished(d.conclusion)}</p>
        </>)}
        {d.recommendation && (<>
          <h2 style={h2}>What the Committee recommended</h2>
          <p style={quote}>{asPublished(d.recommendation)}</p>
        </>)}

        {evidence.length > 0 && (<>
          <h2 style={h2}>Evidence of delivery</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {evidence.map((e) => (
              <li key={e.id} style={{ ...small, fontSize: '16px', marginBottom: '8px' }}>
                <a href={e.evidence_url} style={link}>{e.evidence_title}</a>
                {e.publisher ? `, ${e.publisher}` : ''}{e.delivered_on ? `, ${dayMonthYear(e.delivered_on)}` : ''}{e.note && e.note !== shows ? `. ${e.note}` : ''}
              </li>
            ))}
          </ul>
        </>)}

        <h2 style={h2}>What the government has said</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.map((e, i) => <Event key={e.id} e={e} open={!hasUpdate && i === events.length - 1} />)}
          <TargetUpdate row={row} docs={w.documents} />
        </ol>
        <p style={{ ...small, marginTop: '28px' }}>
          Source: HM Treasury, Treasury Minutes and Treasury Minutes Progress Reports, on GOV.UK under the Open Government Licence v3.0. Quoted text is as published.{' '}
          {laterSources.length > 0 && <>Later evidence: {listWords(laterSources)}, linked above.{' '}</>}
          <Link href="/recommendations" style={link}>All recommendations</Link>
        </p>
      </section>
    </OpenGovShell>
  );
}
