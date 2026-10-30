import type { Metadata } from 'next'
import PollsClient from './PollsClient'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';
import SectionLinks from '../components/SectionLinks';
import VotingIntegrity from '../components/VotingIntegrity';

export const metadata: Metadata = {
  title: "opengovt Polls",
  description:
    'Polls on issues in Parliament and government. Have your say and see the results.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <OpenGovShell pageStamp="opengovt Polls">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <SectionLinks section="Vote" />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          opengovt Polls
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on issues in Parliament and government. These polls show the views of opengovt users who choose to vote. They are not votes in Parliament or scientific opinion polls. Log in or create an account to vote, then see the results.
        </p>
        <a href="/polls/archive" className="no-hover-scale" style={{ display: 'inline-block', marginTop: '10px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a1612', textDecoration: 'underline' }}>
          View archived polls →
        </a>
      </header>

      <VotingIntegrity />

      <PollsClient />

    </OpenGovShell>
  )
}
