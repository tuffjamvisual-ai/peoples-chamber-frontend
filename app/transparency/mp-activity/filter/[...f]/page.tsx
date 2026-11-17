import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import MpActivityListing, { readParams } from '../../MpActivityListing'
import { VIEWS } from '../../MpActivityTable'
import { listChoices, listPath } from '@/lib/list-path'

// MP Activity by view, party and page (F04 batch 3, pattern P+): each variant static, built on its first visit and rebuilt only
// when its tables' tags are refreshed or on a deploy. An unknown view, party or key order, or a page past the end, is 404.
// Not indexed (as the other views were).
export const revalidate = false
export function generateStaticParams() { return [] }

export const metadata: Metadata = {
  title: { absolute: 'MP Activity: Most Active and Fewest Commons Contributions' },
  description: 'Every current MP ranked by how often they have spoken in Parliament since the July 2024 general election, and how many words, from the official Hansard record.',
  alternates: { canonical: '/transparency/mp-activity' },
  robots: { index: false, follow: true },
}

const BASE = '/transparency/mp-activity'

export default async function MpActivityFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params
  const c = listChoices(BASE, f)
  if (!c || (c.view && !(c.view in VIEWS))) notFound()
  const canon = listPath(BASE, c)
  if (canon !== `${BASE}/filter/${f.join('/')}`) permanentRedirect(canon)
  return <MpActivityListing params={readParams(c)} strict />
}
