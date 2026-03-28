'use client';

import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

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
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-24 sm:h-28">
            {/* Logo - 3x bigger */}
            <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="People's Chamber"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white hidden sm:block">
                People's Chamber
              </h1>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-1">
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
            </div>

            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center space-x-3">
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

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
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
