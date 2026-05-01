'use client';

import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useState } from 'react';
import Link from 'next/link';


import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { user, logout } = useAuth();
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
      <nav className="bg-[#001520] border-b border-[#1c3849]/50 relative mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex-shrink-0" style={{marginLeft: "-16px"}}>
              <div className="flex flex-col items-center">
                <img
                  src="/logo.png"
                  alt="People's Chamber"
                  style={{ height: '300px', width: 'auto', objectFit: 'contain' }}
                />
                <div className="text-center -mt-12">
                  <div className="text-2xl font-bold text-white tracking-widest">THE PEOPLES CHAMBER</div>
                  <div className="text-xs text-[#7697a2] tracking-wider mt-0.5">VOTING ON UK PARLIAMENT BILLS</div>
                </div>
              </div>
            </Link>
            
            <div className="hidden lg:flex flex-col items-end gap-2">
              <div className="flex items-center space-x-3">
              <Link href="/" className={`px-3 py-1.5 text-sm ${isActive('/') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                Home
              </Link>
              <Link href="/bills" className={`px-3 py-1.5 text-sm ${isActive('/bills') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                Bills
              </Link>
              <Link href="/laws" className={`px-3 py-1.5 text-sm ${isActive('/laws') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                Laws
              </Link>
              <Link href="/polls" className={`px-3 py-1.5 text-sm ${isActive('/polls') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                People's Polls
              </Link>
              <Link href="/mps" className={`px-3 py-1.5 text-sm ${isActive('/mps') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                MPs
              </Link>
              <Link href="/departments" className={`px-3 py-1.5 text-sm ${isActive('/departments') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Departments</Link>
              <Link href="/transparency" className={`px-3 py-1.5 text-sm ${isActive('/transparency') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Transparency</Link>
              <Link href="/search" className={`px-3 py-1.5 text-sm ${isActive('/search') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Search</Link>
              <Link href="/about" className={`px-3 py-1.5 text-sm ${isActive('/about') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>
                About
              </Link>
              
              {user ? (
                <>
                  <span className="text-[#7697a2] text-sm truncate max-w-[150px]">{user.email}</span>
                  <button onClick={logout} className="px-3 py-1.5 text-[#c9c9c9] hover:text-white text-sm">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={openLogin} className="px-3 py-1.5 text-[#c9c9c9] hover:text-white text-sm">
                    Login
                  </button>
                  <button onClick={openSignup} className="px-4 py-1.5 border border-[#ffffff] bg-transparent text-[#ffffff] hover:bg-[#ffffff] hover:text-[#001520] rounded text-sm font-medium transition-colors">
                    Sign Up
                  </button>
                </>
              )}
              </div>
        
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-[#7697a2] hover:text-white flex-shrink-0"
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
            <div className="lg:hidden pb-4 border-t border-[#1c3849]/50 mt-2">
              <div className="flex flex-col space-y-1 py-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  Home
                </Link>
                <Link href="/bills" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/bills') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  Bills
                </Link>
                <Link href="/laws" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/laws') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  Laws
                </Link>
                <Link href="/polls" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/polls') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  People's Polls
                </Link>
                <Link href="/mps" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/mps') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  MPs
                </Link>
                <Link href="/departments" className={`px-3 py-1.5 text-sm ${isActive('/departments') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Departments</Link>
              <Link href="/transparency" className={`px-3 py-1.5 text-sm ${isActive('/transparency') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Transparency</Link>
              <Link href="/search" className={`px-3 py-1.5 text-sm ${isActive('/search') ? 'text-[#ffffff] font-medium' : 'text-[#7697a2] hover:text-white'}`}>Search</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 text-sm ${isActive('/about') ? 'text-[#ffffff] bg-white/10' : 'text-[#7697a2]'}`}>
                  About
                </Link>
                
                <div className="border-t border-[#1c3849]/50 mt-2 pt-2">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-[#7697a2] text-sm truncate">{user.email}</div>
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[#c9c9c9] text-sm">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={openLogin} className="w-full text-left px-3 py-2 text-[#c9c9c9] text-sm">
                        Login
                      </button>
                      <button onClick={openSignup} className="w-full text-center px-3 py-2 border border-[#ffffff] bg-transparent text-[#ffffff] hover:bg-[#ffffff] hover:text-[#001520] rounded mx-3 mt-2 text-sm font-medium transition-colors">
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      <div className="border-b border-[#1c3849]/50">
  
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
