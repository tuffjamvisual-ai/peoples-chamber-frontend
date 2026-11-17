import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import SectionListing from '../SectionListing'
import { SECTIONS, cleanSearch, dayKey, sectionCount, sectionRows, sectionTags } from '../sectionData'
import { searchKey } from '@/lib/list-path'
import { tagged } from '@/lib/tagged-read'

// Search results for /transparency/<section>?q= (next.config.ts rewrites that address here; A16 exception: search results,
// ILIKE over the dataset tables). The page answers each visit, but its data is read only from the tagged cache (owner's rule
// for the exceptions, ENTRY 187; Cowork ENTRY 226): one entry per normalised search, section and page (and day, for the two
// sections that hide future dates) under the section table's tag, so every entry is dropped at that table's next sync. Not
// indexed; the canonical is the section. A search of fewer than two characters goes back to the list with no read.
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
  const term = cleanSearch(section, searchKey(q))
  if (!term || term.length < 2) redirect(page > 1 ? `/transparency/${section}/page/${page}` : `/transparency/${section}`)
  const searched = await tagged(['transparency-search-v2', section, term, page, dayKey(section)], sectionTags(section), async () => {
    const [total, rows] = await Promise.all([sectionCount(section, term), sectionRows(section, term, page)])
    return { total, rows }
  })
  return <SectionListing section={section} page={page} q={q} searched={searched} />
}
