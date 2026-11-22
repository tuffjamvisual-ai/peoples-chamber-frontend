'use client';
// The bottom app bar on phones (Cowork ENTRY 507, owner approved a DEMO, 22 Nov 2026; preview only until the owner says):
// Home, Find your MP, Search, Archive and Menu, fixed to the bottom of the screen under 768px, above the phone's home bar
// (safe area). Each is at least 48px tall with its label under its icon; the current one is marked (aria-current and the
// site's red). Menu opens the existing phone menu (MobileMenu.tsx listens for 'og:open-menu'), so there is still one
// menu. Hidden from 768px up (opengov-shell.css). Pages get room at the bottom so nothing sits behind the bar.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePagePath } from '@/lib/use-page-path';

const ICON = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const ITEMS = [
  { label: 'Home', href: '/', icon: <svg {...ICON}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg> },
  { label: 'Your MP', href: '/find-your-mp', icon: <svg {...ICON}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg> },
  { label: 'Search', href: '/search', icon: <svg {...ICON}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg> },
  { label: 'Archive', href: '/archive', icon: <svg {...ICON}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v11h14V9" /><path d="M10 13h4" /></svg> },
];

export default function PhoneAppBar() {
  const path = usePagePath();
  // The header slims once the page is scrolled (ENTRY 507 (3)): a mark on <html> that the phone CSS reads; passive, and
  // only written when it changes.
  useEffect(() => {
    const root = document.documentElement;
    const on = () => { const s = window.scrollY > 40; if ((root.dataset.scrolled === '1') !== s) root.dataset.scrolled = s ? '1' : ''; };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  // Whether the phone menu is open (MobileMenu.tsx says so): the Menu button is then marked and closes it.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setMenuOpen(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('og:menu', on);
    return () => window.removeEventListener('og:menu', on);
  }, []);
  const here = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  return (
    <nav aria-label="App" className="og-appbar">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} prefetch={false} className="og-appbar-item" aria-current={!menuOpen && here(it.href) ? 'page' : undefined}>
          {it.icon}
          <span>{it.label}</span>
        </Link>
      ))}
      <button type="button" className="og-appbar-item og-appbar-menu" onClick={() => window.dispatchEvent(new Event(menuOpen ? 'og:close-menu' : 'og:open-menu'))}
        aria-controls="og-menu-panel" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Menu'}>
        <svg {...ICON}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <span>Menu</span>
      </button>
    </nav>
  );
}
