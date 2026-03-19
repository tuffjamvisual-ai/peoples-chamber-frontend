'use client';

import { useState, useEffect } from 'react';
import BillsGrid from './components/BillsGrid';

type Bill = {
  id: number;
  title: string;
  description: string;
  category: string;
  current_stage: string;
  stage_date: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_party_colour: string | null;
  sponsor_photo: string | null;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
};

type ApiResponse = {
  bills: Bill[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
};

export default function HomePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllBills() {
      try {
        // Fetch first 100 bills (5 pages)
        const allBills: Bill[] = [];
        
        for (let page = 1; page <= 5; page++) {
          const response = await fetch(
            `https://peoples-chamber-1.onrender.com/api/bills?page=${page}&per_page=21`
          );
          
          if (response.ok) {
            const data: ApiResponse = await response.json();
            allBills.push(...data.bills);
          }
        }
        
        setBills(allBills);
      } catch (error) {
        console.error('Error fetching bills:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllBills();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-6">Loading bills...</p>
        </div>
      </div>
    );
  }

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
