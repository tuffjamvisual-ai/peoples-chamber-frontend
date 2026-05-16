import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import '../components/magazine-layout.css'
import ScrollToTopButton from '../components/ScrollToTopButton'

import MagazineNav from '../components/MagazineNav';
// Render on demand — large Supabase query (all Acts) hits the 60s
// build-budget under concurrent worker pressure. Same pattern as
// /bills, /departments, /earnings, /expenses.
export const dynamic = 'force-dynamic'
export const revalidate = 600

export const metadata: Metadata = {
  title: 'UK Laws — every Act of Parliament',
  description:
    'Browse Acts of the UK Parliament that have received Royal Assent — searchable, filterable, with original sponsor and stage history.',
  alternates: { canonical: '/laws' },
}

export default async function LawsPage() {
  const { data: laws, error } = await supabase
    .from('bill')
    .select(
      'id, title, plain_summary, originating_house, sponsor_name, sponsor_party, sponsor_party_colour, last_update'
    )
    .eq('is_act', true)
    .order('last_update', { ascending: false })
    .range(0, 4999)

  if (error) console.error('Error fetching laws:', error)

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <MagazineNav />
      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: '#14100d',
          fontFamily: 'Special Elite, monospace',
        }}
      >
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#14100d',
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to home
        </a>

        <header style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
            }}
          >
            Laws of the Land
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
            Bills that have received Royal Assent. The Acts that govern the country, ordered by most recent.
          </p>
          <p
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginTop: '16px',
              opacity: 0.7,
            }}
          >
            {(laws?.length || 0).toLocaleString()} Acts on the statute book
          </p>
        </header>

        <LawsClient laws={laws || []} />

        <ScrollToTopButton />
      </div>
    </div>
  )
}
