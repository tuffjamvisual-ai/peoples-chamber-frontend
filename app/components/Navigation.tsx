'use client';

import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useState } from 'react';
import Link from 'next/link';


import { usePathname } from 'next/navigation';

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <>
      <nav className="bg-[#1a1a1a] border-b border-[#333333]/50 relative mb-10 overflow-hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 800 200"
          preserveAspectRatio="xMaxYMid meet"
          className="absolute inset-y-0 right-0 h-full w-auto pointer-events-none"
          style={{ opacity: 0.06 }}
          fill="#ffffff"
        >
          <path d="M 0,200 L 0,140 L 30,140 L 30,128 L 50,128 L 50,140 L 70,140 L 70,134 L 78,134 L 78,140 L 80,140 L 80,55 L 85,55 L 85,50 L 90,50 L 90,55 L 95,55 L 95,50 L 100,50 L 100,55 L 105,55 L 105,50 L 110,50 L 110,55 L 115,55 L 115,50 L 120,50 L 120,55 L 125,55 L 125,50 L 130,50 L 130,55 L 135,55 L 135,50 L 140,50 L 140,55 L 145,55 L 145,50 L 150,50 L 150,55 L 155,55 L 155,50 L 160,50 L 160,55 L 160,140 L 200,140 L 200,132 L 240,132 L 240,140 L 280,140 L 280,126 L 340,126 L 340,140 L 360,140 L 360,115 L 380,115 L 380,108 L 388,108 L 388,55 L 400,15 L 412,55 L 412,108 L 420,108 L 420,115 L 440,115 L 440,140 L 480,140 L 480,134 L 540,134 L 540,140 L 580,140 L 580,128 L 640,128 L 640,140 L 670,140 L 670,85 L 665,85 L 665,55 L 685,15 L 705,55 L 705,85 L 700,85 L 700,140 L 720,140 L 720,135 L 760,135 L 760,140 L 800,140 L 800,200 Z" />
        </svg>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex-shrink-0" style={{marginLeft: "-16px"}}>
              <div className="flex flex-col items-center">
                <img
                  src="/logo.png"
                  alt="People's Chamber"
                  style={{ height: '240px', width: 'auto', objectFit: 'contain' }}
                />
                <span className="text-xs uppercase tracking-widest text-white text-center">
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
            <div className="lg:hidden pb-4 border-t border-[#333333]/50 mt-2">
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
              <Link href="/transparency" className={`px-3 py-1.5 text-sm ${isActive('/transparency') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Transparency</Link>
              <Link href="/search" className={`px-3 py-1.5 text-sm ${isActive('/search') ? 'text-[#ffffff] font-medium' : 'text-white hover:text-white'}`}>Search</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/about') ? 'text-[#ffffff] bg-transparent/10' : 'text-white'}`}>
                  About
                </Link>
                
                <div className="border-t border-[#333333]/50 mt-2 pt-2">
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
      <div className="border-b border-[#333333]/50">
  
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
