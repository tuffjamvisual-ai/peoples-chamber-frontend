import type { Metadata } from 'next'
import LawsListing from './LawsListing'
// Render on demand — large Supabase query (all Acts) hits the 60s
// build-budget under concurrent worker pressure. Same pattern as
// /bills, /departments, /earnings, /expenses.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export const metadata: Metadata = {
  title: 'UK Laws, every Act of Parliament',
  description:
    'Browse Acts of the UK Parliament that have received Royal Assent, searchable, filterable, with original sponsor and stage history.',
  alternates: { canonical: '/laws' },
}

// Page 1 of the Acts; pages 2 onwards are /laws/page/<n>, and an old /laws?page=N moves there (proxy.ts, 308).
export default function LawsPage() {
  return <LawsListing page={1} />
}
