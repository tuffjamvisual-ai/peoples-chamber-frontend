import type { Metadata } from 'next'
import PollsClient from './PollsClient'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';
import SectionLinks from '../components/SectionLinks';
import { SubFold } from '../components/PhoneFolds';
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

      {/* Phones (UX2b, owner approved through Cowork, 10 Nov 2026): one line saying these are reader polls, then the first
          question. The full introduction and Voting Integrity are below the polls in one closed native
          fold; the archive link stays where it was, after the polls (PollsClient). From 640px up, as before. */}
      <style>{`.pl-phone { display: none; } @media ${PHONE} { .pl-wide { display: none !important; } .pl-phone { display: block; } .pl-head { margin-bottom: 16px !important; } }`}</style>
      <header className="pl-head" style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          opengovt Polls
        </h1>
        <p className="pl-phone" style={{ fontSize: '16px', lineHeight: 1.5, margin: 0 }}>Reader polls: the views of opengovt users who vote, not votes in Parliament.</p>
        <div className="pl-wide">
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on issues in Parliament and government. These polls show the views of opengovt users who choose to vote. They are not votes in Parliament or scientific opinion polls. Log in or create an account to vote, then see the results.
          </p>
          <a href="/polls/archive" className="no-hover-scale" style={{ display: 'inline-block', marginTop: '10px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a1612', textDecoration: 'underline' }}>
          View archived polls →
          </a>
        </div>
      </header>

      <div className="pl-wide"><VotingIntegrity /></div>

      <PollsClient />

      <div className="pl-phone">
        <SubFold label="About these polls and voting integrity">
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on issues in Parliament and government. These polls show the views of opengovt users who choose to vote. They are not votes in Parliament or scientific opinion polls. Log in or create an account to vote, then see the results.
          </p>
          <VotingIntegrity />
        </SubFold>
      </div>

    </OpenGovShell>
  )
}
