import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search opengovt, bills, MPs, departments, contracts, donations and the rest of the public record, in one place.',
  alternates: { canonical: '/search' },
  // Not indexed (owner, 31 Oct 2026: Search Console called the empty search page a soft 404); its links are followed.
  robots: { index: false, follow: true },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
