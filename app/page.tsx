import { getAllBills } from '@/lib/data';
import BillsGrid from './components/BillsGrid';
import Navigation from './components/Navigation';

export const revalidate = 86400;

export default async function HomePage() {
  const bills = await getAllBills();

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <BillsGrid initialBills={bills} />
      </main>
    </div>
  );
}
