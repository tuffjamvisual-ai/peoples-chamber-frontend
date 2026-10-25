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
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      <Suspense fallback={<p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d' }}>Loading…</p>}>
        <WelfareSearchResults />
      </Suspense>
    </OpenGovShell>
  )
}
