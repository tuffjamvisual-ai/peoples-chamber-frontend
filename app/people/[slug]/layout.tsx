import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const niceName = slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
  return {
    title: niceName,
    description: `${niceName}, current roles, financial interests and political career on The People’s Chamber.`,
    alternates: { canonical: `/people/${slug}` },
  }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return children
}
