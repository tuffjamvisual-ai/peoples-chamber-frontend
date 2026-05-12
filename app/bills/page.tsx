import type { Metadata } from 'next';
import { getAllBills } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import MagazineNav from '../components/MagazineNav';
import MagazineFooter from '../components/MagazineFooter';

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
    <main style={{ background: '#7a1612', minHeight: '100vh', padding: '24px 16px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '1024px',
          margin: '0 auto',
          background: '#f5e7cd',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.45)',
        }}
      >
        <MagazineNav />

        <div style={{ padding: '24px 28px 40px' }}>
          <div className="md:hidden">
            <BillsGridMobile initialBills={bills} />
          </div>
          <div className="hidden md:block">
            <BillsGrid initialBills={bills} />
          </div>
        </div>

        <MagazineFooter />
      </div>
    </main>
  );
}
