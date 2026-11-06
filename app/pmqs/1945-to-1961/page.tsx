import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { longDateArchive } from '@/lib/pmqs-archive';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';
import PreFixedNotes, { ExperimentNote, UNCONFIRMED_NOTE } from './PreFixedNotes';

const INK = '#14100d';
const ACCENT = '#7a1612';
const TITLE = 'Questions to the Prime Minister, 1945 to 1961';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: 'Notes on the questions to the Prime Minister from 1945 to 1961, before PMQs had a fixed time: what is here, what is not, and where it comes from.',
  alternates: { canonical: '/pmqs/1945-to-1961' },
};

export const revalidate = 86400;

// The notes page for the questions before the fixed time. The questions themselves are listed on /pmqs, under the oldest session.
export default async function PreFixedNotesPage() {
  const s = await preFixedSummary();
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: "Prime Minister's Questions", path: '/pmqs' }, { name: '1945 to 1961', path: '/pmqs/1945-to-1961' }])} />
      <Link href="/pmqs#before-fixed-pmqs" prefetch={false} className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none' }}>← Back to the questions</Link>
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', color: INK }}>{TITLE}</h1>
      <div style={{ color: INK }}>
        <p style={{ fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px', fontWeight: 'bold' }}>{s.questions.toLocaleString('en-GB')} questions on {s.days.toLocaleString('en-GB')} days.</p>
        <PreFixedNotes answeredBySomeoneElse={s.answeredBySomeoneElse} />
        <ExperimentNote />
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
          {UNCONFIRMED_NOTE} This applies to {s.unconfirmedQuestions} questions, on{' '}
          {s.unconfirmedDates.map((d, i) => (
            <span key={d}>{i > 0 && (i === s.unconfirmedDates.length - 1 ? ' and ' : ', ')}<a href={`/pmqs/1945-to-1961/${d}`} className="og-tap" style={{ color: ACCENT, textDecoration: 'underline' }}>{longDateArchive(d)}</a></span>
          ))}.
        </p>
      </div>
    </OpenGovShell>
  );
}
