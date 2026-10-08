import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../../../components/OpenGovShell'
import BackLink from '../../../../components/BackLink'
import WelfareLocalAuthorityDetail from '../../../../components/WelfareLocalAuthorityDetail'

const INK = '#14100d'

export async function generateMetadata({ params }: { params: Promise<{ gss: string }> }): Promise<Metadata> {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  const { data } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_name')
    .eq('council_gss_code', gssCode)
    .eq('metric_key', 'population_mid_year')
    .limit(1)
    .maybeSingle()
  const name = data?.council_name || null
  if (!name) return { title: 'Local authority not found' }
  return {
    title: `${name} — Welfare Spending`,
    description: `Universal Credit, Housing Benefit, PIP, DLA, Carer's Allowance and ESA spending and caseloads for ${name}.`,
    alternates: { canonical: `/tools/welfare/local-authority/${gssCode}` },
  }
}

export default async function WelfareLocalAuthorityPage({ params }: { params: Promise<{ gss: string }> }) {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()

  return (
    <OpenGovShell pageStamp="Welfare Explorer">
      <BackLink
        fallbackHref="/tools/welfare"
        label="← Back to search"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      <WelfareLocalAuthorityDetail gss={gssCode} />
    </OpenGovShell>
  )
}
