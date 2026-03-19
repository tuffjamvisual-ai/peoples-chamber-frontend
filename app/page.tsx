import { getAllBills } from '@/lib/data';
import BillsGrid from './components/BillsGrid';

// Server Component - fetches data at build time
// Rebuilds every 24 hours (86400 seconds)
export const revalidate = 86400;

export default async function HomePage() {
  // Fetch ALL bills at build time - fast, single query
  const bills = await getAllBills();

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-600 rounded"></div>
              <h1 className="text-lg font-bold text-white">People's Chamber</h1>
            </div>
            
            <div className="flex space-x-1">
              <a href="#" className="px-3 py-1.5 text-blue-400 font-medium text-sm">Bills</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Laws</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Polls</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">MPs</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">About</a>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-3 py-1.5 text-gray-300 text-sm">Login</button>
              <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Sign Up</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <BillsGrid initialBills={bills} />
      </main>
    </div>
  );
}
