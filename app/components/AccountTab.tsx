'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

// Auth-aware account links for the OpenGovShell header row (.og-dacct) and the
// phone menu panel (.og-menu-account). Renders as a fragment so its <a>/<span>
// take the styling of where they sit. Logged out: a Log in / Sign up link. Logged in:
// a fixed "My Account" link (we don't let users pick a username — the DB
// username column just holds the full name from signup, which we don't want to
// surface in the nav), plus a Log out action.
const SEP = { display: 'inline-block', width: '1px', height: '0.95em', background: 'currentColor', opacity: 0.5, margin: '0 7px' } as const;

export default function AccountTab() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Link href="/login">Log in<span className="ng-tab-signup"> / Sign up</span></Link>;
  }

  return (
    <>
      <Link href="/account">My Account</Link>
      <span aria-hidden style={SEP} />
      <a href="/login" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a>
    </>
  );
}
