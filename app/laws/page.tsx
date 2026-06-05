import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import ScrollToTopButton from '../components/ScrollToTopButton'
import DossierShell from '../components/DossierShell'
import BackLink from '../components/BackLink';
// Render on demand — large Supabase query (all Acts) hits the 60s
// build-budget under concurrent worker pressure. Same pattern as
// /bills, /departments, /earnings, /expenses.
export const dynamic = 'force-dynamic'
export const revalidate = 600

export const metadata: Metadata = {
  title: 'UK Laws, every Act of Parliament',
  description:
    'Browse Acts of the UK Parliament that have received Royal Assent, searchable, filterable, with original sponsor and stage history.',
  alternates: { canonical: '/laws' },
}

export default async function LawsPage() {
  const { data: laws, error } = await supabase
    .from('bill')
    .select(
      // Same select shape as /bills so the shared BillCoverCard
      // renders identically on /laws (with an extra Royal Assent stamp).
      'id, parliament_id, title, plain_summary, description, current_stage, originating_house, sponsor_name, sponsor_party, sponsor_party_colour, last_update, stage_date, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, is_act'
    )
    .eq('is_act', true)
    .order('last_update', { ascending: false })
    .range(0, 4999)

  if (error) console.error('Error fetching laws:', error)

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
          Laws of the Land
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Bills that have received Royal Assent. The Acts that govern the country, ordered by most recent.
        </p>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          {(laws?.length || 0).toLocaleString()} Acts on the statute book
        </p>
      </header>

      <LawsClient laws={laws || []} />

      <ScrollToTopButton />
    </DossierShell>
  )
}
