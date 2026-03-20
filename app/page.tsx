import { getAllBills } from '@/lib/data';
import BillsGrid from './components/BillsGrid';
import Navigation from './components/Navigation';

// Server Component - fetches data at build time
// Rebuilds every 24 hours (86400 seconds)
export const revalidate = 86400;

export default async function HomePage() {
  // Fetch ALL bills at build time - fast, single query
  const bills = await getAllBills();

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <BillsGrid initialBills={bills} />
      </main>
    </div>
  );
}
