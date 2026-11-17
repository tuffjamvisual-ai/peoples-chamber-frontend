import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions'
import SectionListing from './SectionListing'
import { SECTIONS } from './sectionData'

// The six dataset lists, page 1 (F04 batch 3, A16): static, rebuilt only when the section's table changes, or on a deploy. Later
// pages are /transparency/<section>/page/<n>; a search (?q=) is rewritten to /transparency/<section>/search.
export const revalidate = false

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const config = SECTIONS[section]
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!config) notFound()
  return {
    title: titleWithin(config.title),
    description: PAGE_DESCRIPTIONS[`/transparency/${section}`] ?? `${config.title}: public record data for UK government transparency.`,
    alternates: { canonical: `/transparency/${section}` },
  }
}

export default async function TransparencySectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  return <SectionListing section={section} page={1} q={null} />
}
