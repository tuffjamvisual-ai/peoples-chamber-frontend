'use client';

// Phone and tablet header and menu (owner's choice, 25 Oct 2026, report 47; the TaxPayers' Alliance pattern; under 768px
// at first, under 1180px since report 57, where the one-row desktop header does not fit at 14px): below 1180px the
// header is one row, the wordmark with a search icon and a menu icon, and the menu icon opens a full screen panel
// listing the 13 top level sections as large links, with "Commission research" as the one call to action. Each section's
// landing page lists that section's pages ("In this section", SectionLinks.tsx), so every page in a section
// is two taps away. Hidden from 1180px up (opengov-shell.css), where the one-row desktop header (DesktopNav.tsx) shows.
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

type Section = { label: string; href: string };
const PANEL_ID = 'og-menu-panel';

export default function MobileMenu({ sections }: { sections: Section[] }) {
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
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button')];
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
    panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
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
        <button ref={buttonRef} type="button" className="og-mbar-btn" aria-label="Menu" aria-expanded={open} aria-controls={PANEL_ID} onClick={openMenu}>
          <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h20M3 12h20M3 18h20" /></svg>
        </button>
      </div>
      {mounted && createPortal(
      <div ref={panelRef} id={PANEL_ID} className="og-menu-panel" role="dialog" aria-modal="true" aria-label="Site menu" hidden={!open}>
        <button type="button" className="og-menu-close" aria-label="Close menu" onClick={closeMenu}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 5l16 16M21 5 5 21" /></svg>
        </button>
        <nav aria-label="Sections">
          <ul className="og-menu-list">
            {sections.map((s) => (
              <li key={s.href}><a href={s.href} onClick={(e) => follow(e, s.href)}>{s.label}</a></li>
            ))}
          </ul>
        </nav>
        <a href="/commission" className="og-menu-cta" onClick={(e) => follow(e, '/commission')}>Commission research</a>
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
