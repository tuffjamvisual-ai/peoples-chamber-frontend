import type { Metadata } from 'next';
import { getAllBills } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import MagazineLayout from '../components/MagazineLayout';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
  alternates: { canonical: '/bills' },
};

export default async function BillsPage() {
  const bills = await getAllBills();

  return (
    <MagazineLayout>
      <div className="md:hidden">
        <BillsGridMobile initialBills={bills} />
      </div>
      <div className="hidden md:block">
        <BillsGrid initialBills={bills} />
      </div>
    </MagazineLayout>
  );
}
