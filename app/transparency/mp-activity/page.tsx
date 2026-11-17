import type { Metadata } from 'next'
import MpActivityListing, { readParams } from './MpActivityListing'

// MP Activity, the main ranking (F04 batch 3, A16): static, rebuilt only when its tables' tags are refreshed or on a deploy.
// Other views, parties and pages are /transparency/mp-activity/filter/...; a search (?q=) is rewritten to .../search.
// The six month by-election cut-off is taken when the page is built (the totals are rewritten daily, so a day at most).
export const revalidate = false

export const metadata: Metadata = {
  title: { absolute: 'MP Activity: Most Active and Fewest Commons Contributions' },
  description: 'Every current MP ranked by how often they have spoken in Parliament since the July 2024 general election, and how many words, from the official Hansard record.',
  alternates: { canonical: '/transparency/mp-activity' },
}

export default function MpActivityPage() {
  return <MpActivityListing params={readParams({})} />
}
