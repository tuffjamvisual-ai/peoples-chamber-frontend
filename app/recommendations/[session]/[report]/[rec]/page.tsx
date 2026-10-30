import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../../components/OpenGovShell';
import BackLink from '../../../../components/BackLink';
import {
  RECOMMENDATIONS_PUBLIC, recommendationDetail, statusContext, statusWords, sessionWords, monthYear, dayMonthYear, asPublished, type EventRow,
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

function Event({ e }: { e: EventRow & { document: { title: string; cp_number: string; url: string; published_on: string; kind: string } } }) {
  const pdf = `${e.document.url}${e.page ? `#page=${e.page}` : ''}`;
  const lines: string[] = [];
  if (e.target_text) lines.push(`Target: “${e.target_text}”`);
  if (e.original_target_text) lines.push(`Original target: “${e.original_target_text}”`);
  if (e.revised_target_text) lines.push(`Revised target: “${e.revised_target_text}”`);
  if (e.implemented_text) lines.push(e.implemented_text === 'Recommendation implemented' ? 'Recommendation implemented' : `Recommendation implemented: “${e.implemented_text}”`);
  const words = [...paragraphs(e.response_text), ...paragraphs(e.progress_text)];
  return (
    <li style={{ borderLeft: '2px solid rgba(20,16,13,0.25)', padding: '0 0 18px 16px', margin: 0 }}>
      <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK }}>{monthYear(e.document.published_on)}</span>
      <span style={{ display: 'block', ...small }}>
        <a href={pdf} style={link}>{e.document.title}</a> ({e.document.cp_number}{e.page ? `, PDF page ${e.page}` : ''})
      </span>
      {e.response && <span style={{ display: 'block', ...small, marginTop: '4px' }}>Response: {RESPONSE[e.response] ?? `“${e.response}”`}</span>}
      {lines.map((l) => <span key={l} style={{ display: 'block', ...small }}>{l}</span>)}
      {words.length > 0 && (
        <details style={{ marginTop: '6px' }}>
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
  const { row, events, evidence } = d;
  const { ctx, implementedDocFor } = await statusContext();
  const status = statusWords(row, { ...ctx, implementedDocument: implementedDocFor(row.recommendation_id) });

  return (
    <OpenGovShell pageStamp="Recommendations">
      <BackLink
        fallbackHref="/recommendations"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '3%' }}>
        <p style={{ ...small, margin: '0 0 6px' }}>
          Report {row.report_number} of the {sessionWords(row.session)}{row.department ? `. ${row.department}` : ''}
        </p>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 8px', color: INK, overflowWrap: 'anywhere' }}>
          {row.report_title}: recommendation {row.rec_number}
        </h1>
      </header>

      <section style={{ color: INK }}>
        <p style={{ ...p, fontSize: '18px', fontWeight: 600, border: '1px solid rgba(20,16,13,0.3)', padding: '12px 14px' }}>
          {status.map((s, i) => (s.href ? <a key={i} href={s.href} style={link}>{s.text}</a> : <span key={i}>{s.text}</span>))}
        </p>
        {row.review_checked_on && (
          <p style={p}>Checked by Open Govt on {dayMonthYear(row.review_checked_on)}{row.review_note ? `: ${row.review_note}` : '.'}</p>
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
                {e.publisher ? `, ${e.publisher}` : ''}{e.delivered_on ? `, ${dayMonthYear(e.delivered_on)}` : ''}{e.note ? `. ${e.note}` : ''}
              </li>
            ))}
          </ul>
        </>)}

        <h2 style={h2}>What the government has said</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.map((e) => <Event key={e.id} e={e} />)}
        </ol>
        {row.split_into && row.split_into.length > 0 && (
          <p style={p}>
            Later documents answer this recommendation in parts:{' '}
            {row.split_into.map((part, i) => (
              <span key={part}>{i > 0 ? (i === row.split_into!.length - 1 ? ' and ' : ', ') : ''}<Link href={`/recommendations/${row.session}/${row.report_number}/${part}`} style={link}>{part}</Link></span>
            ))}.
          </p>
        )}

        <p style={{ ...small, marginTop: '28px' }}>
          Source: HM Treasury, Treasury Minutes and Treasury Minutes Progress Reports, on GOV.UK under the Open Government Licence v3.0. Quoted text is as published.{' '}
          <Link href="/recommendations" style={link}>All recommendations</Link>
        </p>
      </section>
    </OpenGovShell>
  );
}
