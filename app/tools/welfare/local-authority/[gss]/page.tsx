import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../../../components/OpenGovShell'
import BackLink from '../../../../components/BackLink'
import WelfareLocalAuthorityDetail from '../../../../components/WelfareLocalAuthorityDetail'
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

const INK = '#14100d'

async function areaName(gssCode: string): Promise<string | null> {
  const { data, error: dataErr } = await cachedQuery(['q:app/tools/welfare/local-authority/[gss]/page.tsx:f5d7937afe', JSON.stringify([gssCode])], tableTags('welfare_local_authority_metrics'), () => supabase
    .from('welfare_local_authority_metrics')
    .select('council_name')
    .eq('council_gss_code', gssCode)
    .eq('metric_key', 'population_mid_year')
    .limit(1)
    .maybeSingle())
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/tools/welfare/local-authority/[gss] welfare_local_authority_metrics: ${dataErr.message}`);
  return (data as { council_name?: string | null } | null)?.council_name || null
}

export async function generateMetadata({ params }: { params: Promise<{ gss: string }> }): Promise<Metadata> {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  const name = await areaName(gssCode)
  // An address with no area: a real 404, not a 200 page saying so (Search Console, Cowork ENTRY 364).
  if (!name) notFound()
  return {
    title: titleWithin(`${name}: Welfare Spending`),
    description: `Universal Credit, Housing Benefit, PIP, DLA, Carer's Allowance and ESA spending and caseloads for ${name}.`,
    alternates: { canonical: `/tools/welfare/local-authority/${gssCode}` },
  }
}

export default async function WelfareLocalAuthorityPage({ params }: { params: Promise<{ gss: string }> }) {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  // The same check as the metadata, here too: a page's metadata can arrive after its status is sent (ENTRY 364).
  if (!(await areaName(gssCode))) notFound()

  return (
    <OpenGovShell pageStamp="Welfare Explorer">
      <BackLink
        fallbackHref="/tools/welfare"
        label="← Back to search"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      <WelfareLocalAuthorityDetail gss={gssCode} />
    </OpenGovShell>
  )
}
