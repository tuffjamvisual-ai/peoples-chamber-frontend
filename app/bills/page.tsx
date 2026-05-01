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

const ACCENT = '#a8ff3e';

export default async function BillsPage() {
  const bills = await getAllBills();
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);

  return (
    <div className="min-h-screen bg-[#0a140a] text-white">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#1a2e1a] pb-10 mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Bills
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Bills in Parliament
          </h1>
          <p className="text-gray-200 text-[14px] leading-[1.7] max-w-2xl">
            Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#1a2e1a] border border-[#1a2e1a] mt-10">
            <Stat label="Bills tracked" value={bills.length} />
            <Stat label="Acts" value={bills.filter((b: any) => b.is_act).length} />
            <Stat label="Refresh" value="Daily" accent />
          </div>
        </header>

        {isMobile ? (
          <BillsGridMobile initialBills={bills} />
        ) : (
          <BillsGrid initialBills={bills} />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-[#0f1a0f] px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-200 font-medium mb-2">{label}</p>
      <p className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${accent ? 'text-[#a8ff3e]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
