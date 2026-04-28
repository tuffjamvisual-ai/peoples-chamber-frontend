import type { Metadata } from 'next';
import { getAllBills } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import Navigation from '../components/Navigation';
import { headers } from 'next/headers';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
  alternates: { canonical: '/bills' },
};

export default async function BillsPage() {
  const bills = await getAllBills();
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isMobile ? (
          <BillsGridMobile initialBills={bills} />
        ) : (
          <BillsGrid initialBills={bills} />
        )}
      </main>
    </div>
  );
}
