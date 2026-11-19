import { namedTitle } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../../../components/OpenGovShell'
import BackLink from '../../../../components/BackLink'
import WelfareConstituencyDetail from '../../../../components/WelfareConstituencyDetail'
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

const INK = '#14100d'

async function areaName(gssCode: string): Promise<string | null> {
  const { data, error: dataErr } = await cachedQuery(['q:app/tools/welfare/constituency/[gss]/page.tsx:21a21828ed', JSON.stringify([gssCode])], tableTags('mps'), () => supabase
    .from('mps')
    .select('constituency')
    .eq('constituency_gss_code', gssCode)
    .maybeSingle())
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/tools/welfare/constituency/[gss] mps: ${dataErr.message}`);
  return (data as { constituency?: string | null } | null)?.constituency || null
}

export async function generateMetadata({ params }: { params: Promise<{ gss: string }> }): Promise<Metadata> {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  const name = await areaName(gssCode)
  // An address with no area: a real 404, not a 200 page saying so (Search Console, Cowork ENTRY 364).
  if (!name) notFound()
  return {
    title: namedTitle(name, (n) => [`${n}: Welfare Spending`, `${n}: welfare`, n]),
    description: `Universal Credit, Housing Benefit, PIP, DLA, Carer's Allowance and ESA spending and caseloads for ${name}.`,
    alternates: { canonical: `/tools/welfare/constituency/${gssCode}` },
  }
}

export default async function WelfareConstituencyPage({ params }: { params: Promise<{ gss: string }> }) {
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
      <WelfareConstituencyDetail gss={gssCode} />
    </OpenGovShell>
  )
}
