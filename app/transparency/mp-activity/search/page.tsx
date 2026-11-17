import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import MpActivityListing, { readParams, type SP } from '../MpActivityListing'
import { activityHref } from '../MpActivityTable'

// Search results for /transparency/mp-activity?q= (next.config.ts rewrites that address here; A16 exception: search results,
// an MP name or constituency typed by the reader, over the cached rows). The view, party and page are read as before. Not
// indexed; the canonical is the main ranking. An empty search goes to the same view without it.
export const metadata: Metadata = {
  title: { absolute: 'MP Activity: Most Active and Fewest Commons Contributions' },
  description: 'Every current MP ranked by how often they have spoken in Parliament since the July 2024 general election, and how many words, from the official Hansard record.',
  alternates: { canonical: '/transparency/mp-activity' },
  robots: { index: false, follow: true },
}

export default async function MpActivitySearch({ searchParams }: { searchParams: Promise<SP> }) {
  const p = readParams(await searchParams)
  if (!p.q) permanentRedirect(activityHref(p.view, p.party, null, p.page))
  return <MpActivityListing params={p} />
}
