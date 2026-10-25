'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

// Auth-aware account tab for the OpenGovShell header. Renders as a fragment so
// its <a>/<span> sit as direct children of .ng-tab and inherit its styling
// (.ng-tab a, .ng-tab > span). Logged out: a Log in / Sign up link. Logged in:
// a fixed "My Account" link (we don't let users pick a username — the DB
// username column just holds the full name from signup, which we don't want to
// surface in the nav), plus a Log out action.
const SEP = { display: 'inline-block', width: '1px', height: '0.95em', background: 'currentColor', opacity: 0.5, margin: '0 7px' } as const;

export default function AccountTab() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    // The page the visitor is on goes with them (25 Oct 2026, report 70), so signing in, or confirming a new account's
    // email, brings them back here. Not from the account pages themselves.
    const here = pathname && !/^\/(login|signup|reset-password|account)(\/|$)/.test(pathname) && pathname !== '/' ? pathname : null;
    return <Link href={here ? `/login?returnTo=${encodeURIComponent(here)}` : '/login'}>Log in<span className="ng-tab-signup"> / Sign up</span></Link>;
  }

  return (
    <>
      <Link href="/account">My Account</Link>
      <span aria-hidden style={SEP} />
      <a href="/login" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a>
    </>
  );
}
