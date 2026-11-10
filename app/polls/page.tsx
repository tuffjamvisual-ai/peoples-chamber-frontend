import type { Metadata } from 'next'
import PollsClient from './PollsClient'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';
import SectionLinks from '../components/SectionLinks';
import { PHONE } from '@/lib/breakpoints';
import VotingIntegrity from '../components/VotingIntegrity';

export const metadata: Metadata = {
  title: "opengovt Polls",
  description:
    'Polls on issues in Parliament and government. Have your say and see the results.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <OpenGovShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <SectionLinks section="Reader Polls" />

      {/* At every width (UX2b phones, 10 Nov 2026; UX4d desktop, owner approved, 10 Nov 2026): one line saying these are reader
          polls; then the search and sort (with a one line integrity statement beside them) and the polls, in PollsClient;
          then the archive link; then the full introduction and Voting Integrity in one closed native fold, "About these
          polls and voting integrity". On phones the polls come before the search (UX2b, PollsClient). */}
      <style>{`.pl-about { margin: 28px 0 0; } .pl-about > summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; font-size: 16px; font-weight: bold; color: #14100d; } .pl-about[open] > summary { margin-bottom: 8px; } @media ${PHONE} { .pl-head { margin-bottom: 16px !important; } }`}</style>
      <header className="pl-head" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          opengovt Polls
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.5, margin: 0 }}>Reader polls: the views of opengovt users who vote, not votes in Parliament.</p>
      </header>

      <PollsClient />

      <details id="polls-about" className="pl-about">
        <summary>About these polls and voting integrity</summary>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on issues in Parliament and government. These polls show the views of opengovt users who choose to vote. They are not votes in Parliament or scientific opinion polls. Log in or create an account to vote, then see the results.
        </p>
        <VotingIntegrity />
      </details>

    </OpenGovShell>
  )
}
