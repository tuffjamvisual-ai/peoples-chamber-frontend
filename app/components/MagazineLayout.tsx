import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import "./magazine-layout.css";

type Variant = "blank" | "article" | "dashboard" | "profile" | "list";

type MagazineLayoutProps = {
  children: ReactNode;
  variant?: Variant;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  meta?: ReactNode;
  /**
   * Verification mode. When true, overlays /public/reference.png on top of
   * the magazine page at 50% opacity, 1024px wide, anchored to the page's
   * top-left. Use for pixel-level alignment during development. Keep false
   * in production.
   */
  debug?: boolean;
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

const footerColumns: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "RECORDS",
    links: [
      { label: "Bills", href: "/bills" },
      { label: "MPs", href: "/mps" },
      { label: "Departments", href: "/departments" },
      { label: "Transparency", href: "/transparency" },
    ],
  },
  {
    heading: "MONEY",
    links: [
      { label: "Expenses", href: "/expenses" },
      { label: "Earnings", href: "/earnings" },
      { label: "Donations", href: "/donations" },
      { label: "Contracts", href: "/contracts" },
    ],
  },
  {
    heading: "ABOUT",
    links: [
      { label: "About & Methodology", href: "/about" },
      { label: "Sources", href: "/sources" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
  {
    heading: "LEGAL",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "/contact" },
      { label: "GitHub ↗", href: "https://github.com/tuffjamvisual-ai/peoples-chamber-frontend" },
    ],
  },
];

const proofItems = [
  { tag: "100%", title: "Independent", body: "Not funded by government or political parties." },
  { tag: "◷", title: "Real-time", body: "Live updates from official UK sources." },
  { tag: "○", title: "Open", body: "Built for everyone. Built to be trusted." },
  { tag: "⌕", title: "Accountable", body: "Making power visible. People first." },
];

const megaphoneSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 142 104'%3E%3Crect width='142' height='104' fill='none'/%3E%3Cg fill='%2314100d'%3E%3Cpath d='M95 31c8-17 29-8 31 10 3 22-10 39-29 34 9-9 11-32-2-44Z'/%3E%3Cpath d='M33 49 79 28v50L33 60V49Z'/%3E%3Cpath d='M21 46h14v18H21c-7 0-12-4-12-9s5-9 12-9Z'/%3E%3Cpath d='M39 62h19l9 30H48L39 62Z'/%3E%3Ccircle cx='111' cy='32' r='9'/%3E%3Cpath d='M91 29c12 7 14 38 0 48 12 2 25-8 28-24 3-16-8-28-28-24Z' fill='%23f4e8d4'/%3E%3C/g%3E%3Cg fill='none' stroke='%2314100d' stroke-width='4' stroke-linecap='round'%3E%3Cpath d='M88 17c9-10 25-9 33 3'/%3E%3Cpath d='M84 88c13 4 28 0 36-11'/%3E%3Cpath d='M126 16l10-9M130 51h10M124 85l10 8'/%3E%3C/g%3E%3C/svg%3E";

export default function MagazineLayout({
  children,
  variant = "blank",
  eyebrow,
  title,
  subtitle,
  meta,
  debug = false,
}: MagazineLayoutProps) {
  const hasPageHead = Boolean(eyebrow || title || subtitle || meta);
  const pageClass = debug ? "magazine-page debug-overlay" : "magazine-page";

  return (
    <div className="magazine-shell">
      <div className={pageClass} data-variant={variant}>
        <header className="magazine-header" aria-label="The People's Chamber">
          {/* Yellow issue sticker top-left */}
          <aside className="issue-sticker" aria-label="Issue information">
            <span>ISSUE 23</span>
            <strong>MAY 16-22,<br />2025</strong>
          </aside>

          {/* Paperclip details */}
          <div className="paperclip paperclip-left" aria-hidden="true" />
          <div className="paperclip paperclip-top" aria-hidden="true" />

          {/* Truth card top-right */}
          <div className="truth-card">
            <p>NO SPIN.</p>
            <p>NO PAYWALL.</p>
            <p>JUST</p>
            <strong>THE TRUTH.</strong>
          </div>

          {/* Megaphone illustration */}
          <Image
            className="megaphone"
            src={megaphoneSvg}
            width={142}
            height={104}
            alt=""
            aria-hidden="true"
            priority
          />

          {/* Teal democracy note */}
          <div className="watch-note">
            <span>Democracy</span>
            <span>works better</span>
            <span>when people</span>
            <span>watch.</span>
          </div>

          {/* Masthead */}
          <div className="masthead">
            <span className="masthead-the">THE</span>
            <span className="masthead-line">PEOPLE&apos;S</span>
            <span className="masthead-line chamber">CHAMBER</span>
            <span className="crown" aria-hidden="true">♕</span>
          </div>

          {/* Red strapline */}
          <p className="tagline">— UK GOVERNMENT. IN PUBLIC VIEW.</p>

          {/* Nav (editable HTML, exact order from brief) */}
          <nav className="magazine-nav" aria-label="Primary navigation">
            <span className="nav-star" aria-hidden="true">*</span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === "/" ? "is-active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="magazine-content" data-variant={variant}>
          {hasPageHead && (
            <header className="magazine-page-head">
              {eyebrow && <p className="magazine-kicker">{eyebrow}</p>}
              {title && <h1 className="magazine-title">{title}</h1>}
              {subtitle && <p className="magazine-subtitle">{subtitle}</p>}
              {meta && <div className="magazine-meta">{meta}</div>}
            </header>
          )}
          {children}
        </main>

        <footer className="magazine-footer">
          <div className="footer-rule" aria-hidden="true" />

          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-crest" aria-hidden="true">♛</div>
              <div>
                <p className="footer-brand-name">
                  <span>THE</span>
                  <span>PEOPLE&apos;S</span>
                  <span>CHAMBER</span>
                </p>
                <p className="footer-brand-strap">— UK GOVERNMENT. IN PUBLIC VIEW.</p>
              </div>
            </div>

            <p className="footer-description">
              UK political transparency. Built from official sources: Parliament,
              IPSA, Companies House, Electoral Commission, Cabinet Office. Updated
              daily.
            </p>

            {footerColumns.map((col) => (
              <nav key={col.heading} className="footer-column" aria-label={col.heading}>
                <p className="footer-column-head">{col.heading}</p>
                {col.links.map((link) => {
                  if (link.href.startsWith("http")) {
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    );
                  }
                  return (
                    <Link key={link.label} href={link.href}>
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ))}
          </div>

          <div className="footer-proof">
            {proofItems.map((item) => (
              <div key={item.title} className="footer-proof-item">
                <span className="footer-proof-tag" aria-hidden="true">{item.tag}</span>
                <div>
                  <p className="footer-proof-title">{item.title}</p>
                  <p className="footer-proof-body">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
