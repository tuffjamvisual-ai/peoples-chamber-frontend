import type { Metadata } from 'next'
import PollsClient from './PollsClient'
import ScrollToTopButton from '../components/ScrollToTopButton'
import DossierShell from '../components/DossierShell'
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: "People's Polls",
  description:
    'Live public polls on every UK Parliament bill, see how the public would vote, then compare it to the official Commons tally.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          People&rsquo;s Polls
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Have your say on the issues that matter. Vote on questions about policy, politics and public life, then see how Westminster voted.
        </p>
      </header>

      <PollsClient />

      <ScrollToTopButton />
    </DossierShell>
  )
}
