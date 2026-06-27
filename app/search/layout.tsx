import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Open Govt, bills, MPs, departments, contracts, donations and the rest of the public record, in one place.',
  alternates: { canonical: '/search' },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
