import type { Metadata } from 'next'
import { Suspense } from 'react'
import OpenGovShell from '../../../components/OpenGovShell'
import BackLink from '../../../components/BackLink'
import WelfareSearchResults from '../../../components/WelfareSearchResults'

export const metadata: Metadata = {
  title: 'Welfare Explorer Search Results',
  description: 'Search results for the welfare spending explorer: matching constituencies, local authorities, counties and boroughs.',
  robots: { index: false, follow: true },
}

const INK = '#14100d'

export default function WelfareSearchPage() {
  return (
    <OpenGovShell pageStamp="Welfare Explorer">
      <BackLink
        fallbackHref="/tools/welfare"
        label="← Back to search"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <Suspense fallback={<p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: 'rgba(20,16,13,0.65)' }}>Loading…</p>}>
        <WelfareSearchResults />
      </Suspense>
    </OpenGovShell>
  )
}
