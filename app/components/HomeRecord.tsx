import Link from 'next/link';
import { archiveSessions } from '@/lib/pmqs-archive';
import { pmqsSet } from '@/lib/pmqs';

const INK = '#14100d';
const para = { fontSize: '16px', lineHeight: 1.6, color: INK, margin: 0 };
const link = { color: INK, textDecoration: 'underline' };

// The homepage's "The record, going back decades" (owner, 6 Nov 2026). Items are added only when they are live. The PMQs count is read live,
// as /pmqs counts it: the current sessions and the archive. If that read fails the sentence goes without the count, and the page still shows.
export default async function HomeRecord() {
  const sessions = await Promise.all([pmqsSet(), archiveSessions()]).then(([set, archive]) => set.sessions.length + archive.length).catch(() => null);
  const items = [
    <Link key="pmqs" href="/pmqs" prefetch={false} style={link}>
      Every Prime Minister&rsquo;s Questions since October 1961{sessions ? `: ${sessions.toLocaleString('en-GB')} sessions,` : ','} from Macmillan to Burnham, with every question and answer as Hansard recorded it.
    </Link>,
    <Link key="petitions" href="/petitions" prefetch={false} style={link}>Every petition this Parliament that reached 10,000 signatures, with the government&rsquo;s full response.</Link>,
    <span key="seats">
      <Link href="/constituencies" prefetch={false} style={link}>Every constituency&rsquo;s 2024 result and byelections</Link>,{' '}
      <Link href="/edms" prefetch={false} style={link}>every early day motion</Link>, and{' '}
      <Link href="/mps" prefetch={false} style={link}>every MP&rsquo;s votes, questions and interests</Link>.
    </span>,
    <Link key="questions" href="/questions" prefetch={false} style={link}>Every written question and answer this Parliament, including corrected answers and what they first said.</Link>,
  ];
  return (
    <section className="og-record" aria-labelledby="og-record-head" style={{ margin: '20px 0 8px', paddingTop: '14px', borderTop: '2px solid rgba(20,16,13,0.18)' }}>
      <h2 id="og-record-head" style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: INK, margin: '0 0 10px' }}>The record, going back decades</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontFamily: 'var(--font-special-elite), monospace' }}>
        {items.map((item, i) => <li key={i} style={{ marginBottom: '10px' }}><p style={para}>{item}</p></li>)}
      </ul>
    </section>
  );
}
