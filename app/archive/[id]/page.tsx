// /archive/<id>: one record of the archive on the Mac's SSD (Cowork ENTRY 480 PART A, owner approved 21 Nov 2026 22:44).
// The record (title, date, dataset, source link, full text) comes from the SSD's SQLite index through the tunnel on every
// visit: no cache, 5 s at most, nothing in Supabase (owner's rule 18:12). When the Mac does not answer: 'Archive search is
// offline. Please try again later.' Not linked, noindex, 404 unless ARCHIVE_ENABLED is '1', signed in readers only.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import PageSources from '../../components/PageSources';
import { archiveRecord, archiveEnabled, archiveLimited, archiveUserId, ID_RE, licenceFor, longDate, OFFLINE } from '../archive';
import ArchiveSignedOut from '../SignedOut';

export const metadata: Metadata = {
  title: 'Archive record | opengovt',
  robots: { index: false, follow: false, nocache: true },
};

const INK = '#14100d';
const back = <Link href="/archive" prefetch={false} style={{ display: 'inline-block', marginBottom: '12px', color: INK, fontSize: '16px' }}>← Archive search</Link>;

export default async function ArchiveRecordPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await archiveEnabled())) notFound();
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();
  // Signed in readers only, checked here on the server before the call to the Mac (ENTRY 480 ADDENDUM).
  const userId = await archiveUserId();
  if (!userId) return <ArchiveSignedOut returnTo={`/archive/${id}`} />;
  if (await archiveLimited('record', userId)) {
    return <OpenGovShell>{back}<p style={{ fontSize: '16px', fontWeight: 'bold', color: INK }}>Too many records opened for now. Please wait a minute and open it again.</p></OpenGovShell>;
  }
  const r = await archiveRecord(id);
  if (!r.ok && r.reason === 'not found') notFound();
  if (!r.ok) return <OpenGovShell>{back}<p role="status" style={{ fontSize: '16px', fontWeight: 'bold', color: INK }}>{OFFLINE}</p></OpenGovShell>;
  const rec = r.data;
  const paragraphs = rec.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <OpenGovShell>
      {back}
      <header style={{ marginBottom: '18px', color: INK }}>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{rec.title || 'Untitled record'}</h1>
        <p style={{ fontSize: '16px', margin: 0 }}>{[rec.dataset, longDate(rec.date)].filter(Boolean).join(', ')}</p>
      </header>
      <section style={{ maxWidth: '46em', color: INK }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{p}</p>
        ))}
        {rec.cut && <p style={{ fontSize: '16px', fontWeight: 'bold' }}>This record is long: the first 300,000 characters are shown. The whole record is at its source, in the Sources below.</p>}
      </section>
      <PageSources sources={[
        ...(/^https?:\/\//.test(rec.url) ? [{ label: `This record at its source: ${rec.dataset}`, href: rec.url }] : []),
        licenceFor(rec.dataset),
      ]} />
    </OpenGovShell>
  );
}
