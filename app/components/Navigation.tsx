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
  const pathname = usePathname();

  const openLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  // Helper to check if link is active
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-600 rounded"></div>
              <h1 className="text-lg font-bold text-white">People's Chamber</h1>
            </div>
            
            <div className="flex space-x-1">
              <Link 
                href="/" 
                className={`px-3 py-1.5 text-sm font-medium ${
                  isActive('/') && !isActive('/laws') && !isActive('/mps') && !isActive('/about')
                    ? 'text-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Bills
              </Link>
              <Link 
                href="/laws" 
                className={`px-3 py-1.5 text-sm ${
                  isActive('/laws') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'
                }`}
              >
                Laws
              </Link>
              <span className="px-3 py-1.5 text-gray-600 text-sm cursor-not-allowed">
                Polls
              </span>
              <Link 
                href="/mps" 
                className={`px-3 py-1.5 text-sm ${
                  isActive('/mps') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'
                }`}
              >
                MPs
              </Link>
              <Link 
                href="/about" 
                className={`px-3 py-1.5 text-sm ${
                  isActive('/about') ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'
                }`}
              >
                About
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <span className="text-gray-400 text-sm">{user.email}</span>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-gray-300 hover:text-white text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={openLogin}
                    className="px-3 py-1.5 text-gray-300 hover:text-white text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={openSignup}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
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
