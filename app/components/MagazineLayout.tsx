import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import "./magazine-layout.css";

type MagazineLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { label: "HOME", href: "/" },
  { label: "BILLS", href: "/bills" },
  { label: "LAWS", href: "/laws" },
  { label: "PEOPLE'S POLLS", href: "/polls" },
  { label: "MPS", href: "/mps" },
  { label: "DEPARTMENTS", href: "/departments" },
  { label: "LOGIN", href: "/login" },
  { label: "ABOUT", href: "/about" },
];

const megaphoneSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 142 104'%3E%3Crect width='142' height='104' fill='none'/%3E%3Cg fill='%2314100d'%3E%3Cpath d='M95 31c8-17 29-8 31 10 3 22-10 39-29 34 9-9 11-32-2-44Z'/%3E%3Cpath d='M33 49 79 28v50L33 60V49Z'/%3E%3Cpath d='M21 46h14v18H21c-7 0-12-4-12-9s5-9 12-9Z'/%3E%3Cpath d='M39 62h19l9 30H48L39 62Z'/%3E%3Ccircle cx='111' cy='32' r='9'/%3E%3Cpath d='M91 29c12 7 14 38 0 48 12 2 25-8 28-24 3-16-8-28-28-24Z' fill='%23f4e8d4'/%3E%3C/g%3E%3Cg fill='none' stroke='%2314100d' stroke-width='4' stroke-linecap='round'%3E%3Cpath d='M88 17c9-10 25-9 33 3'/%3E%3Cpath d='M84 88c13 4 28 0 36-11'/%3E%3Cpath d='M126 16l10-9M130 51h10M124 85l10 8'/%3E%3C/g%3E%3C/svg%3E";

export default function MagazineLayout({ children }: MagazineLayoutProps) {
  return (
    <div className="magazine-shell">
      <div className="magazine-page">
        <header className="magazine-header" aria-label="The People's Chamber">
          <div className="paperclip paperclip-left" aria-hidden="true" />
          <div className="paperclip paperclip-top" aria-hidden="true" />

          <aside className="issue-sticker" aria-label="Issue information">
            <span>ISSUE 23</span>
            <strong>MAY 16-22,<br />2025</strong>
          </aside>

          <div className="truth-card">
            <p>NO SPIN.</p>
            <p>NO PAYWALL.</p>
            <p>JUST</p>
            <strong>THE TRUTH.</strong>
          </div>

          <Image
            className="megaphone"
            src={megaphoneSvg}
            width={142}
            height={104}
            alt=""
            aria-hidden="true"
            priority
          />

          <div className="watch-note">
            <span>Democracy.</span>
            <span>works better</span>
            <span>when people</span>
            <span>watch.</span>
          </div>

          <div className="masthead">
            <span className="masthead-the">THE</span>
            <span className="masthead-line">PEOPLE&apos;S</span>
            <span className="masthead-line chamber">CHAMBER</span>
            <span className="crown" aria-hidden="true">
              ♕
            </span>
          </div>

          <p className="tagline">UK GOVERNMENT. IN PUBLIC VIEW.</p>

          <nav className="magazine-nav" aria-label="Primary navigation">
            <span className="nav-star" aria-hidden="true">
              *
            </span>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="magazine-content">{children}</main>

        <footer className="magazine-footer">
          <div className="footer-topline" />
          <div className="footer-main">
            <div className="footer-brand">
              <div className="crest" aria-hidden="true">
                ♛
              </div>
              <div>
                <span className="brand-kicker">THE</span>
                <strong>PEOPLE&apos;S<br />CHAMBER</strong>
                <em>OF GOVERNMENT. IN PUBLIC VIEW.</em>
              </div>
            </div>
            <p className="footer-source">
              UK political transparency. Built from official sources:
              Parliament, IPSA, Companies House, Electoral Commission, Cabinet
              Office. Updated daily.
            </p>
            <ul>
              <li>BILLS</li>
              <li>MPS</li>
              <li>DEPARTMENTS</li>
              <li>TRANSPARENCY</li>
            </ul>
            <ul>
              <li>EXPENSES</li>
              <li>EARNINGS</li>
              <li>DONATIONS</li>
              <li>CONTRACTS</li>
            </ul>
            <ul>
              <li>ABOUT &amp;</li>
              <li>METHODOLOGY</li>
              <li>SOURCES</li>
              <li>PRIVACY</li>
            </ul>
            <ul>
              <li>TERMS</li>
              <li>CONTACT</li>
              <li>GITHUB ↗</li>
            </ul>
          </div>
          <div className="footer-rules">
            <div className="rule-badge">100%<br />FREE PRESS</div>
            <p>Not funded by government or political parties.</p>
            <p><span>◷</span> REAL-TIME DATA<br />Live updates from official sources across the UK</p>
            <p><span>☷</span> OPEN TO ALL<br />Built for everyone. Built to be trusted.</p>
            <p><span>⌕</span> ACCOUNTABILITY FIRST<br />Making power visible. Putting people first.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
