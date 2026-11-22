'use client';

// Phone header and menu (owner's choice, 25 Oct 2026, report 47; the TaxPayers' Alliance pattern): under 768px the
// header is one row, the wordmark with a search icon and a menu icon, and the menu icon opens a full screen panel
// listing the menu's headings as folds (ENTRY 502: the same headings as the desktop row, from lib/site-nav.ts), with "Commission research" as the one call to action,
// first in the panel with "Get the weekly email" so both show without scrolling on a 320 by 740 phone (MOB1, 8 Nov 2026). Each section's
// page (/sections/<slug>) lists that section's pages, so every page in the desktop menu is two taps away. Hidden from 768px up (opengov-shell.css), where the desktop header and dropdowns are unchanged.
//
// The panel closes on a link, the X, Escape and the browser's Back button. Opening it adds a history entry that keeps
// Next.js's own router state (a bare entry would make Next.js reload the page on Back); a link first removes that entry,
// then navigates, so Back from the new page returns here. Focus stays inside the panel while it is open and goes back to
// the menu button when it closes; the page behind does not scroll. The panel is rendered into <body> (a portal): inside
// the header, whose container-type makes it the containing block for fixed elements, it would only cover the header.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AccountTab from './AccountTab';
import { PHONE_MENU_GROUPS } from '@/lib/site-nav';

const PANEL_ID = 'og-menu-panel';
// The account row's links, at least 44px tall to tap (owner, 4 Nov 2026). The panel shows only under 768px.
const ACCOUNT_CSS = '.og-menu-account a { display: inline-block; box-sizing: border-box; min-height: 44px; line-height: 24px; }';
// The phone menu (Cowork ENTRY 502, owner approved 22 Nov 2026): the same headings as the desktop row, each a closed fold
// that opens to its links, built from lib/site-nav.ts (PHONE_MENU_GROUPS is made from NAV), so the two menus always
// match at every phone width. A native <details>: no script needed to open a heading. Search and A to Z follow.
const GROUPS_CSS = `.og-menu-groups { display: block; width: 100%; box-sizing: border-box; padding: 0 16px; text-align: left; }
.og-menu-group { border-bottom: 1px solid rgba(20,16,13,0.35); }
.og-menu-group > summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; min-height: 48px; font-size: 18px; font-weight: bold; color: #14100d; }
.og-menu-group > summary::-webkit-details-marker { display: none; }
.og-menu-group > summary::after { content: '+'; font-size: 22px; color: #7a1612; }
.og-menu-group[open] > summary::after { content: '\\2212'; }
.og-menu-group > summary:focus-visible { outline: 2px solid #7a1612; outline-offset: 1px; }
.og-menu-group ul { list-style: none; margin: 0 0 10px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; }
.og-menu-group a, .og-menu-more a { display: block; box-sizing: border-box; min-height: 44px; align-content: center; color: #14100d; text-decoration: none; font-size: 17px; line-height: 1.2; }
.og-menu-group a:active, .og-menu-more a:active { color: #7a1612; }
.og-menu-group a:focus-visible, .og-menu-more a:focus-visible { outline: 2px solid #7a1612; outline-offset: 1px; }
.og-menu-more { display: flex; gap: 24px; padding: 4px 0 0; }
.og-menu-account { margin-top: 14px; }`;

export default function MobileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingHref = useRef<string | null>(null);
  const ownEntry = useRef(false);
  const [mounted, setMounted] = useState(false);
  // The portal needs document.body, so the panel is added after the first render in the browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const openMenu = () => {
    window.history.pushState({ ...(window.history.state ?? {}), ogMenu: true }, '');
    ownEntry.current = true;
    setOpen(true);
  };

  // Close by going back over the menu's own history entry; the popstate handler below finishes the job.
  const closeMenu = useCallback(() => {
    if (ownEntry.current) window.history.back();
    else setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      ownEntry.current = false;
      setOpen(false);
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Only what shows (links inside a closed heading are hidden), in the order it shows.
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button')].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    // The page behind keeps its place and its width while the panel is open.
    const html = document.documentElement;
    const gap = window.innerWidth - html.clientWidth;
    const prev = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = 'hidden';
    if (gap > 0) html.style.paddingRight = `${gap}px`;
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    // Focus starts on Close menu, the first control in the panel (T1-MOB, owner 11 Nov 2026, accessibility); Tab then
    // follows the visible order and Escape closes and returns focus to Menu.
    panelRef.current?.querySelector<HTMLElement>('.og-menu-close')?.focus();
    const button = buttonRef.current;
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prev.overflow;
      html.style.paddingRight = prev.paddingRight;
      button?.focus({ preventScroll: true });
    };
  }, [open, closeMenu, router]);

  const follow = (e: React.MouseEvent<HTMLElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // a new tab: leave the menu open here
    e.preventDefault();
    pendingHref.current = href;
    closeMenu();
    if (!ownEntry.current) { pendingHref.current = null; router.push(href); }
  };

  return (
    <>
      <div className="og-mbar">
        <Link href="/search" className="og-mbar-btn" aria-label="Search">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
        </Link>
        {/* Without JavaScript the menu cannot open: the same button is a link to the full list of pages (globals.css hides the real one). */}
        <noscript>
          <a href="/directory" className="og-mbar-btn" aria-label="Menu">
            <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h20M3 12h20M3 18h20" /></svg>
          </a>
        </noscript>
        <button ref={buttonRef} type="button" className="og-mbar-btn og-mbar-js" aria-label="Menu" aria-expanded={open} aria-controls={PANEL_ID} onClick={openMenu}>
          <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h20M3 12h20M3 18h20" /></svg>
        </button>
      </div>
      {mounted && createPortal(
      <div ref={panelRef} id={PANEL_ID} className="og-menu-panel" role="dialog" aria-modal="true" aria-label="Site menu" hidden={!open}>
        <button type="button" className="og-menu-close" aria-label="Close menu" onClick={closeMenu}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 5l16 16M21 5 5 21" /></svg>
        </button>
        <style>{GROUPS_CSS}</style>
        {/* First, above the sections (MOB1, owner's mobile audit, 8 Nov 2026): at the foot of the list they began about
            760px down on a 320 by 740 phone, below the screen, and there was no newsletter link at all. */}
        <div className="og-menu-top">
          <a href="/commission" className="og-menu-cta" onClick={(e) => follow(e, '/commission')}>Commission research</a>
          <a href="/newsletter" className="og-menu-email" onClick={(e) => follow(e, '/newsletter')}>Get the weekly email</a>
        </div>
        <nav aria-label="Sections" className="og-menu-groups">
          {PHONE_MENU_GROUPS.map((g) => (
            <details key={g.label} className="og-menu-group">
              <summary>{g.label}</summary>
              <ul>
                <li><a href={g.href} onClick={(e) => follow(e, g.href)}>All in {g.label}</a></li>
                {g.links.map((l) => <li key={l.href}><a href={l.href} onClick={(e) => follow(e, l.href)}>{l.label}</a></li>)}
              </ul>
            </details>
          ))}
          <div className="og-menu-more">
            <Link href="/" onClick={(e) => follow(e, '/')}>Home</Link>
            <a href="/directory" onClick={(e) => follow(e, '/directory')}>A to Z</a>
          </div>
        </nav>
        <style>{ACCOUNT_CSS}</style>
        {/* The account links and Support Us, which sit on the folder tab on larger screens. */}
        <div
          className="og-menu-account"
          onClickCapture={(e) => {
            const a = (e.target as HTMLElement).closest('a');
            if (!a) return;
            if (a.textContent === 'Log out') { closeMenu(); return; } // AccountTab's own handler logs out
            const href = a.getAttribute('href');
            if (href) follow(e, href);
          }}
        >
          <AccountTab />
          <span aria-hidden className="og-menu-sep" />
          <Link href="/donate">Support Us</Link>
        </div>
      </div>,
      document.body)}
    </>
  );
}
