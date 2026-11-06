import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '@/app/components/OpenGovShell';
import BackLink from '@/app/components/BackLink';
import NoJsPager from '@/app/components/NoJsPager';
import RegisterCredit from '@/app/components/RegisterCredit';
import MEMBERS from '@/lib/register-history-members.json';

// Who has a register history (owner, 6 Nov 2026): the homepage's link to the Register of Members' Financial Interests back to 2000. The entries themselves are
// on each member's page. The list is generated from register_archive_entries, which does not change: reading it here would scan the table on every render.
export const metadata: Metadata = {
  title: "Register of Members' Financial Interests, 2000 to 2024",
  description: "Every published edition of the Register of Members' Financial Interests from November 2000 to March 2024, by MP, with each entry as published.",
  alternates: { canonical: '/register-history' },
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
// Michael Martin's 12 entries: Parliament's record for 614 has no house history, so /mps/614 is not found and the name is listed without a link.
const NO_PAGE = new Set([614]);
const initial = (name: string) => (name.trim().split(/\s+/).pop() ?? '').charAt(0).toUpperCase();

export default function RegisterHistoryPage() {
  const rows = MEMBERS as [number, string, number][];
  const letters = new Map<string, [number, string, number][]>();
  for (const r of rows) letters.set(initial(r[1]), [...(letters.get(initial(r[1])) ?? []), r]);
  return (
    <OpenGovShell pageStamp="Register history">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: '15px', minHeight: '44px' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 12px', color: INK }}>Register of Members&rsquo; Financial Interests, 2000 to 2024</h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: '0 0 12px', color: INK }}>
        362 editions from 10 November 2000 to 4 March 2024: 112,929 entries as published, on each member&rsquo;s page under &ldquo;Register history&rdquo;. Choose a letter of the surname to find an MP. Editions before 2004 are few, only 1 or 2 a year. <Link href="/transparency/register-of-interests" prefetch={false} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>The current register</Link>.
      </p>
      {[...letters.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([letter, members]) => (
        <details key={letter} className="pa-fold">
          <summary>{letter} ({members.length})</summary>
          <NoJsPager id={`rl-${letter.charCodeAt(0)}`} always count={members.length} rows="> li" size={50}>
            <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
              {members.map(([id, name, entries]) => (
                <li key={id} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  {NO_PAGE.has(id)
                    ? <span style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '15px', color: INK }}>{name} ({entries.toLocaleString('en-GB')})</span>
                    : <Link href={`/mps/${id}#register-history`} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '15px', color: INK, textDecoration: 'none' }}>{name} ({entries.toLocaleString('en-GB')})</Link>}
                </li>
              ))}
            </ul>
          </NoJsPager>
        </details>
      ))}
      <RegisterCredit />
    </OpenGovShell>
  );
}
