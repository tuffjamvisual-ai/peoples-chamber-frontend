'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import './mobile-nav.css';

// Mobile-only navigation (Priority 1 responsiveness fix): hamburger + drawer
// shown below 768px. The desktop painted-header hotspots (MagazineNav) are
// hidden below the breakpoint via mobile-nav.css. Keep this list in sync with
// the HOTSPOTS array in MagazineNav.tsx (the desktop nav source of truth).
const NAV_ITEMS = [
  { href: '/',            label: 'Home' },
  { href: '/bills',       label: 'Bills' },
  { href: '/laws',        label: 'Laws' },
  { href: '/polls',       label: "People's Polls" },
  { href: '/mps',         label: 'MPs' },
  { href: '/departments', label: 'Departments' },
  { href: '/login',       label: 'Login' },
  { href: '/about',       label: 'About' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span /><span /><span />
      </button>

      {open && (
        <div
          className="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <nav className="mobile-nav-links">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
