import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import SectionListing from '../../SectionListing'
import { SECTIONS } from '../../sectionData'

// Later pages of the six dataset lists (F04 batch 3, pattern P, as app/bills/page/[page]): static, built on the first visit and
// rebuilt only when the section's table changes, or on a deploy. Not indexed (T1-PAGENOINDEX); the canonical is page 1.
export const revalidate = false
export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const config = SECTIONS[section]
  if (!config) notFound()
  return { title: titleWithin(config.title), alternates: { canonical: `/transparency/${section}` }, robots: { index: false, follow: true } }
}

export default async function SectionPageN({ params }: { params: Promise<{ section: string; page: string }> }) {
  const { section, page } = await params
  if (!SECTIONS[section] || !/^[1-9][0-9]{0,4}$/.test(page)) notFound()
  if (page === '1') permanentRedirect(`/transparency/${section}`)
  return <SectionListing section={section} page={Number(page)} q={null} />
}
