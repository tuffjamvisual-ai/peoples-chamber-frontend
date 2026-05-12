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

const ACCENT = '#ffffff';

export default async function BillsPage() {
  const bills = await getAllBills();

  return (
    <div className="min-h-screen bg-[#606060] text-white">
      <MagazineNav />

      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#5a5a5a] pb-10 mb-10">
          <p className="text-[13px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Bills
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Bills in Parliament
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-2xl">
            Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px border border-[#5a5a5a] mt-10">
            <Stat label="Bills tracked" value={bills.length} />
            <Stat label="Acts" value={bills.filter((b: any) => b.is_act).length} />
            <Stat label="Refresh" value="Daily" accent />
          </div>
        </header>

        <div className="md:hidden">
          <BillsGridMobile initialBills={bills} />
        </div>
        <div className="hidden md:block">
          <BillsGrid initialBills={bills} />
        </div>
      </main>

      <MagazineFooter />
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <p className="text-[13px] uppercase tracking-[0.25em] text-white font-medium mb-2">{label}</p>
      <p className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${accent ? 'text-[#ffffff]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
