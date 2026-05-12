import './preview-8.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function PreviewEightLayout({ children }: { children: ReactNode }) {
  return (
    <main className="pixel-stage">
      <div className="pixel-shell">
        {/* ────── Shared pixel-perfect HEADER (cropped from landing-v2.png) ────── */}
        <div className="pix-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-v2-header.png"
            alt="The People's Chamber — masthead"
          />

          {/* Top stamps */}
          <Link href="/about" className="hot h-issue" aria-label="Issue 13" />
          <Link href="/about" className="hot h-truth" aria-label="No spin, no paywall, just the truth" />

          {/* Masthead */}
          <Link href="/" className="hot h-masthead" aria-label="The People's Chamber — home" />

          {/* Speech bubble */}
          <Link href="/about" className="hot h-bubble" aria-label="Democracy works better when people watch" />

          {/* Nav strip */}
          <Link href="/bills"        className="hot h-n-cover"  aria-label="Cover Story" />
          <Link href="/polls"        className="hot h-n-street" aria-label="Street View" />
          <Link href="/bills"        className="hot h-n-bills"  aria-label="Bills to Watch" />
          <Link href="/transparency" className="hot h-n-money"  aria-label="Follow the Money" />
          <Link href="/mps"          className="hot h-n-who"    aria-label="MPs">MP&apos;s</Link>
          <Link href="/polls"        className="hot h-n-pulse"  aria-label="The People's Pulse" />
          <Link href="/search"       className="hot h-n-search" aria-label="Search" />
          <Link href="/support"      className="hot h-n-about"  aria-label="About" />
        </div>

        {/* ────── Page-specific body ────── */}
        <div className="pix-body">{children}</div>

        {/* ────── Shared pixel-perfect FOOTER (cropped from landing-v2.png) ────── */}
        <div className="pix-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-v2-footer.png"
            alt="The People's Chamber — footer"
          />

          <Link href="/"        className="hot f-brand"   aria-label="The People's Chamber" />
          <Link href="/about"   className="hot f-copy"    aria-label="Copyright" />
          <Link href="/about"   className="hot f-tagline" aria-label="Watch. Question. Share. Repeat." />
          <Link href="/support" className="hot f-email"   aria-label="Get our weekly brief" />
          <Link href="/support" className="hot f-social"  aria-label="Social links" />
        </div>
      </div>
    </main>
  );
}
