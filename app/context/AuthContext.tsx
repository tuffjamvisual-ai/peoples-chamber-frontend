'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  id: number;
  email: string;
  username?: string;
  postcode?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ needsPasswordReset: true; email: string } | undefined>;
  signup: (email: string, password: string, postcode?: string, username?: string, returnTo?: string) => Promise<{ needsVerification: boolean }>;
  logout: () => void;
  setAuthedUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Hydrate from the og_session cookie. Handles three cases:
    //   1. Post-verify auto-login: localStorage is empty but a valid session
    //      cookie was set by the verify route — /me returns the user.
    //   2. Stale localStorage after session expiry: /me returns 401, clear it.
    //   3. Network failure: keep whatever localStorage had (don't log out).
    fetch('/api/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
        }
      })
      .catch(() => {
        // Network failure — keep localStorage user untouched.
      });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.needsPasswordReset) {
      return { needsPasswordReset: true as const, email };
    }

    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, postcode?: string, username?: string, returnTo?: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, postcode, username, returnTo })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    if (data.needsVerification) {
      return { needsVerification: true };
    }

    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return { needsVerification: false };
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    localStorage.removeItem('user');
  };

  const setAuthedUser = (u: User) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setAuthedUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
