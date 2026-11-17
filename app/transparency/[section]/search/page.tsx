import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import SectionListing from '../SectionListing'
import { SECTIONS, cleanSearch, sectionCount, sectionRows } from '../sectionData'

// Search results for /transparency/<section>?q= (next.config.ts rewrites that address here; A16 exception: search results,
// ILIKE over the dataset tables). Read per request, at most one page (F05: one cache entry per visitor search would grow
// without bound). Not indexed; the canonical is the section. An empty search goes back to the list.
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const config = SECTIONS[section]
  if (!config) notFound()
  return { title: titleWithin(config.title), alternates: { canonical: `/transparency/${section}` }, robots: { index: false, follow: true } }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function SectionSearch({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { section } = await params
  if (!SECTIONS[section]) notFound()
  const sp = await searchParams
  const q = one(sp.q)
  const page = Math.max(1, parseInt(one(sp.page) || '1', 10) || 1)
  const term = cleanSearch(section, q)
  if (!term) redirect(page > 1 ? `/transparency/${section}/page/${page}` : `/transparency/${section}`)
  const [total, rows] = await Promise.all([sectionCount(section, term), sectionRows(section, term, page)])
  return <SectionListing section={section} page={page} q={q} searched={{ total, rows }} />
}
