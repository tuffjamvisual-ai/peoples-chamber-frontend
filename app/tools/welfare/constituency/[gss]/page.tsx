import { namedTitle } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../../../components/OpenGovShell'
import BackLink from '../../../../components/BackLink'
import WelfareConstituencyDetail from '../../../../components/WelfareConstituencyDetail'
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

const INK = '#14100d'

export async function generateMetadata({ params }: { params: Promise<{ gss: string }> }): Promise<Metadata> {
  const { gss } = await params
  const gssCode = (gss || '').toUpperCase()
  const { data, error: dataErr } = await cachedQuery(['q:app/tools/welfare/constituency/[gss]/page.tsx:21a21828ed', JSON.stringify([gssCode])], tableTags('mps'), () => supabase
    .from('mps')
    .select('constituency')
    .eq('constituency_gss_code', gssCode)
    .maybeSingle())
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/tools/welfare/constituency/[gss] mps: ${dataErr.message}`);
  const name = data?.constituency || null
  if (!name) return { title: 'Constituency not found' }
  return {
    title: namedTitle(name, (n) => [`${n}: Welfare Spending`, `${n}: welfare`, n]),
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
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      <WelfareConstituencyDetail gss={gssCode} />
    </OpenGovShell>
  )
}
