import type { Metadata } from 'next'
import PollsClient from './PollsClient'
import ScrollToTopButton from '../components/ScrollToTopButton'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: "OpenGovt Polls",
  description:
    'Public opinion polls on the big questions in British politics. Have your say and see where the public stands.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <OpenGovShell pageStamp="OpenGovt Polls">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          OpenGovt Polls
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on the big questions in British politics. These are public opinion polls, not votes in Parliament. Log in or create an account to vote, then see where the public stands.
        </p>
        <a href="/polls/archive" className="no-hover-scale" style={{ display: 'inline-block', marginTop: '10px', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a1612', textDecoration: 'underline' }}>
          View archived polls →
        </a>
      </header>

      <PollsClient />

      <ScrollToTopButton />
    </OpenGovShell>
  )
}
