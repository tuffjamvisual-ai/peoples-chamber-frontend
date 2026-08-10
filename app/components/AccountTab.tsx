'use client';

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

  if (!user) {
    return <a href="/login">Log in / Sign up</a>;
  }

  return (
    <>
      <a href="/account">My Account</a>
      <span aria-hidden style={SEP} />
      <a href="/login" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a>
    </>
  );
}
