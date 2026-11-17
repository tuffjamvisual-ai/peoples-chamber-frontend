import type { Metadata } from 'next';
import RegisterListing, { type SP } from '../RegisterListing';

// /transparency/register-of-interests with any filter (A16 exception: search results, full text over the register with its
// MP, category and date filters): next.config.ts rewrites ?q=, ?mp=, ?cat=, ?from= and ?to= here, so the address is unchanged.
// Not indexed (mp and cat are not in the header rule's keys); the canonical is the register.
export const metadata: Metadata = {
  title: { absolute: "Register of Members' Financial Interests: Search Every MP" },
  description:
    "Search the Register of Members' Financial Interests: gifts, hospitality, employment, overseas visits, property and shareholdings declared by every UK MP.",
  alternates: { canonical: '/transparency/register-of-interests' },
  robots: { index: false, follow: true },
};

export default async function RegisterSearch({ searchParams }: { searchParams: Promise<SP> }) {
  return <RegisterListing sp={await searchParams} />;
}
