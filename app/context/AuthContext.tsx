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
  authLoading: boolean;
  login: (email: string, password: string) => Promise<{ needsPasswordReset: true; email: string } | undefined>;
  signup: (email: string, password: string, postcode?: string, username?: string, returnTo?: string) => Promise<{ needsVerification: boolean }>;
  logout: () => void;
  setAuthedUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // True until the /api/auth/me check resolves. Vote handlers must not redirect
  // to /login while this is true — null during loading means "not confirmed yet",
  // not "definitely logged out". Without this guard, stale localStorage entries
  // (valid user object, expired cookie) cause a /polls→/login→/polls loop: the
  // vote API returns 401 before /me resolves, the login page sees user≠null and
  // auto-redirects back, and the loop repeats until /me finally clears the stale entry.
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Hydrate from the og_session cookie. Two outcomes:
    //   1. /me returns a user (200) — update state + localStorage (authoritative).
    //   2. Anything else (401, 500, network failure) — keep whatever localStorage
    //      had; the session cookie is the real auth gate and the vote/action APIs
    //      will surface expiry errors when the user actually does something.
    //      Never wipe localStorage here — that created a sign-out loop where a
    //      transient /me failure would clear state and every subsequent action
    //      would redirect to login.
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        // Non-200 responses: leave user/localStorage unchanged.
      })
      .catch(() => {
        // Network failure — keep localStorage user untouched.
      })
      .finally(() => {
        setAuthLoading(false);
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
    <AuthContext.Provider value={{ user, authLoading, login, signup, logout, setAuthedUser }}>
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
