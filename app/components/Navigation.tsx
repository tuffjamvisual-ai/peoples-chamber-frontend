'use client';

import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

type NavigationProps = {
  onFiltersChange?: (filters: {
    house: string;
    session: string;
    stage: string;
    sortBy: string;
    parliamentVoted: boolean;
    youVoted: boolean;
  }) => void;
  showFilters?: boolean;
};

export default function Navigation({ onFiltersChange, showFilters = false }: NavigationProps) {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const [house, setHouse] = useState('');
  const [session, setSession] = useState('');
  const [stage, setStage] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [parliamentVoted, setParliamentVoted] = useState(false);
  const [youVoted, setYouVoted] = useState(false);

  const openLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  const handleFilterChange = (updates: any) => {
    const newFilters = {
      house,
      session,
      stage,
      sortBy,
      parliamentVoted,
      youVoted,
      ...updates
    };
    
    Object.keys(updates).forEach(key => {
      const value = updates[key];
      if (key === 'house') setHouse(value);
      if (key === 'session') setSession(value);
      if (key === 'stage') setStage(value);
      if (key === 'sortBy') setSortBy(value);
      if (key === 'parliamentVoted') setParliamentVoted(value);
      if (key === 'youVoted') setYouVoted(value);
    });
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  return (
    <>
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50 relative mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="People's Chamber"
                width={512}
                height={512}
                className="w-80 sm:w-96 h-auto"
                priority
              />
            </Link>
            
            <div className="hidden lg:flex flex-col items-end space-y-3">
              <div className="flex items-center space-x-3">
                <Link href="/" className={`px-3 py-1.5 text-sm font-medium ${isActive('/') && !isActive('/laws') && !isActive('/mps') && !isActive('/about') ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
                  Bills
                </Link>
                <Link href="/laws" className={`px-3 py-1.5 text-sm ${isActive('/laws') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'}`}>
                  Laws
                </Link>
                <span className="px-3 py-1.5 text-gray-600 text-sm cursor-not-allowed">Polls</span>
                <Link href="/mps" className={`px-3 py-1.5 text-sm ${isActive('/mps') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'}`}>
                  MPs
                </Link>
                <Link href="/about" className={`px-3 py-1.5 text-sm ${isActive('/about') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'}`}>
                  About
                </Link>
                
                {user ? (
                  <>
                    <span className="text-gray-400 text-sm truncate max-w-[150px]">{user.email}</span>
                    <button onClick={logout} className="px-3 py-1.5 text-gray-300 hover:text-white text-sm">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={openLogin} className="px-3 py-1.5 text-gray-300 hover:text-white text-sm">
                      Login
                    </button>
                    <button onClick={openSignup} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">
                      Sign Up
                    </button>
                  </>
                )}
              </div>

              {showFilters && (
                <>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <select
                      value={sortBy}
                      onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                      className="px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="newest">📅 Date Updated (Newest First)</option>
                      <option value="oldest">📅 Date Updated (Oldest First)</option>
                    </select>

                    <select
                      value={house}
                      onChange={(e) => handleFilterChange({ house: e.target.value })}
                      className="px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">🏛️ House: All</option>
                      <option value="Commons">Commons</option>
                      <option value="Lords">Lords</option>
                    </select>

                    <select
                      value={session}
                      onChange={(e) => handleFilterChange({ session: e.target.value })}
                      className="px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">📊 Session: All</option>
                      <option value="39">Session 39</option>
                      <option value="38">Session 38</option>
                      <option value="37">Session 37</option>
                      <option value="36">Session 36</option>
                      <option value="35">Session 35</option>
                    </select>

                    <select
                      value={stage}
                      onChange={(e) => handleFilterChange({ stage: e.target.value })}
                      className="px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">🎯 Stage: All</option>
                      <option value="1st reading">1st Reading</option>
                      <option value="2nd reading">2nd Reading</option>
                      <option value="Committee stage">Committee Stage</option>
                      <option value="Report stage">Report Stage</option>
                      <option value="3rd reading">3rd Reading</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => handleFilterChange({ parliamentVoted: !parliamentVoted })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        parliamentVoted
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      ✓ Parliament Voted
                    </button>

                    <button
                      onClick={() => handleFilterChange({ youVoted: !youVoted })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        youVoted
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      ✓ You Voted
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white flex-shrink-0"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 border-t border-gray-800/50 mt-2">
              <div className="flex flex-col space-y-1 py-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/') && !isActive('/laws') && !isActive('/mps') && !isActive('/about') ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400'}`}>
                  Bills
                </Link>
                <Link href="/laws" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/laws') ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400'}`}>
                  Laws
                </Link>
                <span className="px-3 py-2 text-gray-600 text-sm">Polls (Coming Soon)</span>
                <Link href="/mps" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/mps') ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400'}`}>
                  MPs
                </Link>
                <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/about') ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400'}`}>
                  About
                </Link>
                
                <div className="border-t border-gray-800/50 mt-2 pt-2">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-gray-400 text-sm truncate">{user.email}</div>
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-gray-300 text-sm">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={openLogin} className="w-full text-left px-3 py-2 text-gray-300 text-sm">
                        Login
                      </button>
                      <button onClick={openSignup} className="w-full text-center px-3 py-2 bg-blue-600 text-white rounded mx-3 mt-2 text-sm font-medium">
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </>
  );
}
