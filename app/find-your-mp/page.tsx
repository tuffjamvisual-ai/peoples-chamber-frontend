import type { Metadata } from 'next'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import PostcodeLookup from '../components/PostcodeLookup'

export const metadata: Metadata = {
  title: 'Find Your MP',
  description: 'Enter your postcode to find your Member of Parliament, their voting record, expenses, declared interests and spoken contributions.',
  alternates: { canonical: '/find-your-mp' },
}

const INK = '#14100d'

export default function FindYourMpPage() {
  return (
    <OpenGovShell pageStamp="Find Your MP">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Find Your MP
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '640px', color: INK }}>
          Enter your postcode to find your Member of Parliament, their voting record, expenses, declared interests and spoken contributions.
        </p>
      </header>

      <div style={{ maxWidth: '560px' }}>
        <PostcodeLookup heading="Who is your MP?" />
      </div>
    </OpenGovShell>
  )
}
