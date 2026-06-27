'use client';

import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import Link from 'next/link';


import { usePathname, useRouter } from 'next/navigation';

export default function Navigation() {
  const { user, logout } = useAuth();
  
  if (typeof window !== 'undefined' && user) {
    const lastActive = localStorage.getItem('lastActive')
    const now = Date.now()
    if (lastActive && now - parseInt(lastActive) > 2 * 60 * 60 * 1000) {
      logout()
    }
    localStorage.setItem('lastActive', now.toString())
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const openLogin = () => {
    setMobileMenuOpen(false);
    const here = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(`/login?mode=login&returnTo=${encodeURIComponent(here)}`);
  };

  const openSignup = () => {
    setMobileMenuOpen(false);
    const here = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(`/login?mode=signup&returnTo=${encodeURIComponent(here)}`);
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
      <nav className="bg-[#505050] border-b border-[#5a5a5a]/50 relative mb-2">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 relative z-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex-shrink-0" style={{marginLeft: "-16px"}}>
              <div className="flex flex-col items-center">
                <img
                  src="/logo.png"
                  alt="Open Govt"
                  style={{ height: '240px', width: 'auto', objectFit: 'contain' }}
                />
                <span className="text-2xl uppercase tracking-widest text-white text-center">
                  The People&apos;s Chamber
                </span>
              </div>
            </Link>
            
            <div className="hidden lg:flex flex-col items-end gap-2">
              <div className="flex items-center space-x-3">
              <Link href="/" className={`px-3 py-1.5 text-sm ${isActive('/') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                Home
              </Link>
              <Link href="/bills" className={`px-3 py-1.5 text-sm ${isActive('/bills') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                Bills
              </Link>
              <Link href="/laws" className={`px-3 py-1.5 text-sm ${isActive('/laws') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                Laws
              </Link>
              <Link href="/polls" className={`px-3 py-1.5 text-sm ${isActive('/polls') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                People's Polls
              </Link>
              <Link href="/mps" className={`px-3 py-1.5 text-sm ${isActive('/mps') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                MPs
              </Link>
              <Link href="/departments" className={`px-3 py-1.5 text-sm ${isActive('/departments') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Departments</Link>
              <Link href="/money" className={`px-3 py-1.5 text-sm ${isActive('/money') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Money</Link>
              <Link href="/transparency" className={`px-3 py-1.5 text-sm ${isActive('/transparency') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Transparency</Link>
              <Link href="/search" className={`px-3 py-1.5 text-sm ${isActive('/search') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Search</Link>
              <Link href="/about" className={`px-3 py-1.5 text-sm ${isActive('/about') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>
                About
              </Link>
              
              {user ? (
                <>
                  <span className="text-white text-sm truncate max-w-[150px]">{user.email}</span>
                  <button onClick={logout} className="px-3 py-1.5 text-[#c9c9c9] hover:text-white text-sm">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={openLogin} className="px-3 py-1.5 text-[#c9c9c9] hover:text-white text-sm">
                    Login
                  </button>

                </>
              )}
              </div>
        
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-white hover:text-white flex-shrink-0"
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
            <div className="lg:hidden pb-4 border-t border-[#5a5a5a]/50 mt-2">
              <div className="flex flex-col space-y-1 py-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  Home
                </Link>
                <Link href="/bills" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/bills') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  Bills
                </Link>
                <Link href="/laws" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/laws') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  Laws
                </Link>
                <Link href="/polls" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/polls') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  People's Polls
                </Link>
                <Link href="/mps" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/mps') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  MPs
                </Link>
                <Link href="/departments" className={`px-3 py-1.5 text-sm ${isActive('/departments') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Departments</Link>
              <Link href="/money" className={`px-3 py-1.5 text-sm ${isActive('/money') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Money</Link>
              <Link href="/transparency" className={`px-3 py-1.5 text-sm ${isActive('/transparency') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Transparency</Link>
              <Link href="/search" className={`px-3 py-1.5 text-sm ${isActive('/search') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Search</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/about') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  About
                </Link>
                
                <div className="border-t border-[#5a5a5a]/50 mt-2 pt-2">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-white text-sm truncate">{user.email}</div>
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[#c9c9c9] text-sm">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={openLogin} className="w-full text-left px-3 py-2 text-[#c9c9c9] text-sm">
                        Login
                      </button>

                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      <div className="border-b border-[#5a5a5a]/50">
  
      </div>

      </nav>
    </>
  );
}
