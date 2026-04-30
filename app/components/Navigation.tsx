'use client';

import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/bills', label: 'Bills' },
  { href: '/laws', label: 'Laws' },
  { href: '/polls', label: "People's Polls" },
  { href: '/mps', label: 'MPs' },
  { href: '/departments', label: 'Departments' },
  { href: '/transparency', label: 'Transparency' },
  { href: '/search', label: 'Search' },
  { href: '/about', label: 'About' },
];

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
      <nav className="bg-[#0a0f1a] border-b border-[#1e2a3a] sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo / brand — left */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/logo.png"
                alt="People's Chamber"
                style={{ height: '300px', width: 'auto', objectFit: 'contain' }}
              />
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
                The People&apos;s Chamber
              </span>
            </Link>

            {/* Links — centre */}
            <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      'px-3 py-1.5 text-[12px] uppercase tracking-[0.15em] transition-colors ' +
                      (active
                        ? 'text-[#60a5fa] font-semibold'
                        : 'text-[#9ca3af] hover:text-white')
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth — right */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {user ? (
                <>
                  <span className="text-[#9ca3af] text-[12px] truncate max-w-[160px]">
                    {user.email}
                  </span>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-[12px] uppercase tracking-[0.15em] text-[#9ca3af] hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={openLogin}
                    className="px-3 py-1.5 text-[12px] uppercase tracking-[0.15em] text-[#9ca3af] hover:text-white transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={openSignup}
                    className="px-4 py-1.5 bg-[#60a5fa] hover:bg-[#7ab4fb] text-[#0a0f1a] text-[12px] uppercase tracking-[0.15em] font-bold transition-colors rounded-sm"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-[#9ca3af] hover:text-white flex-shrink-0"
              aria-label="Menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 border-t border-[#1e2a3a] mt-0">
              <div className="flex flex-col py-2">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={
                        'px-3 py-2.5 text-[12px] uppercase tracking-[0.15em] border-l-2 ' +
                        (active
                          ? 'text-[#60a5fa] border-l-[#60a5fa] bg-[#0d1520]'
                          : 'text-[#9ca3af] border-l-transparent hover:text-white')
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <div className="border-t border-[#1e2a3a] mt-2 pt-2">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-[#9ca3af] text-[12px] truncate">
                        {user.email}
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[#9ca3af] text-[12px] uppercase tracking-[0.15em] hover:text-white"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={openLogin}
                        className="w-full text-left px-3 py-2 text-[#9ca3af] text-[12px] uppercase tracking-[0.15em] hover:text-white"
                      >
                        Login
                      </button>
                      <button
                        onClick={openSignup}
                        className="w-[calc(100%-1.5rem)] mx-3 mt-2 text-center px-3 py-2 bg-[#60a5fa] text-[#0a0f1a] text-[12px] uppercase tracking-[0.15em] font-bold rounded-sm"
                      >
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
