import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../../../components/OpenGovShell'
import BackLink from '../../../../components/BackLink'
import WelfareConstituencyDetail from '../../../../components/WelfareConstituencyDetail'

const INK = '#14100d'

export async function generateMetadata({ params }: { params: Promise<{ gss: string }> }): Promise<Metadata> {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  const { data } = await supabase
    .from('mps')
    .select('constituency')
    .eq('constituency_gss_code', gssCode)
    .maybeSingle()
  const name = data?.constituency || null
  if (!name) return { title: 'Constituency not found' }
  return {
    title: `${name} — Welfare Spending`,
    description: `Universal Credit, Housing Benefit, PIP, DLA, Carer's Allowance and ESA spending and caseloads for ${name}.`,
    alternates: { canonical: `/tools/welfare/constituency/${gssCode}` },
  }
}

export default async function WelfareConstituencyPage({ params }: { params: Promise<{ gss: string }> }) {
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
      <WelfareConstituencyDetail gss={gssCode} />
    </OpenGovShell>
  )
}
