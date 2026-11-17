import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import RegisterListing from '../../RegisterListing';

// Later unfiltered pages of the register (F04 batch 3, pattern P, as app/bills/page/[page]): static, built on the first visit and
// rebuilt only when its tags are refreshed or on a deploy. Past the end is 404. Not indexed; the canonical is page 1.
export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: { absolute: "Register of Members' Financial Interests: Search Every MP" },
  description:
    "Search the Register of Members' Financial Interests: gifts, hospitality, employment, overseas visits, property and shareholdings declared by every UK MP.",
  alternates: { canonical: '/transparency/register-of-interests' },
  robots: { index: false, follow: true },
};

export default async function RegisterPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(page)) notFound();
  if (page === '1') permanentRedirect('/transparency/register-of-interests');
  return <RegisterListing sp={{ page }} strict />;
}
