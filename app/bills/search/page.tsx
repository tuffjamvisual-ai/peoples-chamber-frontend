import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BillsListing from '../BillsListing';
import { cleanBillQuery } from '@/lib/bill-search';

// "Find a bill" results (owner's brief, 8 Nov 2026, BS1). Readers reach it as /bills?q=<text>[&page=N]: next.config.ts
// rewrites that address here, so /bills itself stays cached and only a search is rendered for each request. Not
// indexed; the canonical is /bills. An empty search goes back to /bills.
export const metadata: Metadata = {
  title: { absolute: 'Find a bill: UK Parliament Bills Tracker' },
  robots: { index: false, follow: true },
  alternates: { canonical: '/bills' },
};

export default async function BillsSearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = cleanBillQuery(sp.q);
  if (!q) redirect('/bills');
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = raw && /^[1-9][0-9]{0,3}$/.test(raw) ? Number(raw) : 1;
  return <BillsListing page={page} q={q} />;
}
