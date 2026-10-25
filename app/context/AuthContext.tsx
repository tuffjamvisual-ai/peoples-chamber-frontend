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
  login: (email: string, password: string) => Promise<{ needsPasswordReset: true; email: string } | { needsVerification: true; email: string; message: string } | undefined>;
  signup: (email: string, password: string, postcode?: string, username?: string, returnTo?: string, newsletterOptIn?: boolean) => Promise<{ needsVerification: boolean }>;
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
    // Hydrate from the og_session cookie. Three outcomes:
    //   1. /me returns a user (200): update state + localStorage (authoritative).
    //   2. 401: the session has ended (expired, signed out, password changed). /me has removed the cookies; forget the
    //      stored user too, so the header, bill pages and polls show the visitor as signed out and a vote leads to the
    //      sign in page (25 Oct 2026, report 58). Before this, a stored user outlived its session and every vote got
    //      "Your session has expired".
    //   3. Anything else (503 when the database cannot be read, a network failure): keep whatever localStorage had, so
    //      a passing outage never signs anyone out.
    // Visitors who have never signed in (no stored user, no og_signed_in marker from lib/session.ts) have no session
    // to check, so they make no call (owner's approval, 21 Oct 2026).
    const hasSignedInMarker = document.cookie.split('; ').some((c) => c.startsWith('og_signed_in='));
    if (!storedUser && !hasSignedInMarker) {
      setAuthLoading(false);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
          document.cookie = 'og_signed_in=; Path=/; Max-Age=0; SameSite=Lax';
        }
        // Other responses: leave user/localStorage unchanged.
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

    // Unconfirmed email address: no session; the page offers to resend the link.
    if (response.status === 403 && data.needsVerification) {
      return { needsVerification: true as const, email, message: data.error as string };
    }

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.needsPasswordReset) {
      return { needsPasswordReset: true as const, email };
    }

    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, postcode?: string, username?: string, returnTo?: string, newsletterOptIn?: boolean) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, postcode, username, returnTo, newsletterOptIn: newsletterOptIn ?? false })
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
