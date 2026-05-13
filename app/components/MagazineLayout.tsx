/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import './magazine-layout.css';

export default function MagazineLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bills-template-page">
      <div className="bills-template-frame">
        <header className="mag-header">
          <img src="/chrome/issue-sticker.png" alt="" aria-hidden="true" className="mag-deco mag-deco-sticker" />
          <img src="/chrome/paperclip.png" alt="" aria-hidden="true" className="mag-deco mag-deco-paperclip" />
          <img src="/chrome/megaphone-man.png" alt="" aria-hidden="true" className="mag-deco mag-deco-megaphone" />
          <img src="/chrome/truth-note.png" alt="" aria-hidden="true" className="mag-deco mag-deco-truth-note" />
          <img src="/chrome/democracy-note.png" alt="" aria-hidden="true" className="mag-deco mag-deco-democracy" />

          <span className="mag-crown" aria-hidden="true">♛</span>

          <h1 className="mag-masthead">
            <span className="mag-masthead-the">The</span>
            <span className="mag-masthead-line">People&apos;s</span>
            <span className="mag-masthead-line">Chamber</span>
          </h1>

          <p className="mag-strapline">UK Government. In public. View.</p>

          <nav className="mag-nav" aria-label="Primary">
            <Link href="/" className="mag-nav-link">Home</Link>
            <Link href="/bills" className="mag-nav-link">Bills</Link>
            <Link href="/laws" className="mag-nav-link">Laws</Link>
            <Link href="/polls" className="mag-nav-link">People&apos;s Polls</Link>
            <Link href="/mps" className="mag-nav-link">MPs</Link>
            <Link href="/departments" className="mag-nav-link">Departments</Link>
            <Link href="/signup" className="mag-nav-link">Login</Link>
            <Link href="/about" className="mag-nav-link">About</Link>
          </nav>
        </header>

        <div className="bt-content">{children}</div>

        <footer className="mag-footer">
          <div className="mag-footer-top">
            <Link href="/" className="mag-footer-brand">
              <span className="mag-footer-brand-crown" aria-hidden="true">♛</span>
              <span className="mag-footer-brand-name">
                The People&apos;s<br />Chamber
              </span>
            </Link>

            <p className="mag-footer-tagline">
              Plain-English transparency on UK Parliament. Built by citizens, for citizens.
              Independent. Free to read. No paywall, no spin, no ads.
            </p>

            <ul className="mag-footer-col">
              <li className="mag-footer-col-head">Records</li>
              <li><Link href="/bills">Bills</Link></li>
              <li><Link href="/mps">MPs</Link></li>
              <li><Link href="/departments">Departments</Link></li>
              <li><Link href="/transparency">Transparency</Link></li>
            </ul>

            <ul className="mag-footer-col">
              <li className="mag-footer-col-head">Money</li>
              <li><Link href="/expenses">Expenses</Link></li>
              <li><Link href="/earnings">Earnings</Link></li>
              <li><Link href="/donations">Donations</Link></li>
              <li><Link href="/contracts">Contracts</Link></li>
            </ul>

            <ul className="mag-footer-col">
              <li className="mag-footer-col-head">About</li>
              <li><Link href="/about">About &amp; Methodology</Link></li>
              <li><Link href="/sources">Sources</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>

            <ul className="mag-footer-col">
              <li className="mag-footer-col-head">Legal</li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/support">Contact</Link></li>
              <li><Link href="/github">GitHub</Link></li>
            </ul>
          </div>

          <div className="mag-footer-proof">
            <span className="mag-proof-item">
              <img src="/chrome/proof-independent.png" alt="" aria-hidden="true" className="mag-proof-icon" />
              <span>Independent</span>
            </span>
            <span className="mag-proof-item">
              <img src="/chrome/proof-realtime.png" alt="" aria-hidden="true" className="mag-proof-icon" />
              <span>Real-time</span>
            </span>
            <span className="mag-proof-item">
              <img src="/chrome/proof-open.png" alt="" aria-hidden="true" className="mag-proof-icon" />
              <span>Open data</span>
            </span>
            <span className="mag-proof-item">
              <img src="/chrome/proof-accountability.png" alt="" aria-hidden="true" className="mag-proof-icon" />
              <span>Accountability</span>
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
