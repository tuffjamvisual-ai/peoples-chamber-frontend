import HomePageNew from '../page-new'

export const revalidate = 3600

export const metadata = {
  title: 'Preview — The People’s Chamber',
  description: 'Editorial-redesign preview of the landing page.',
  alternates: { canonical: '/preview' },
  robots: { index: false, follow: false },
}

export default async function PreviewRoute() {
  return <HomePageNew />
}
