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

export default function MagazineLayout({
  children,
  variant = "blank",
  eyebrow,
  title,
  subtitle,
  meta,
}: MagazineLayoutProps) {
  const hasPageHead = Boolean(eyebrow || title || subtitle || meta);

  return (
    <div className="magazine-shell">
      <div className="magazine-page" data-variant={variant}>
        <div className="magazine-art-band">
          <Image
            className="magazine-art"
            src="/magazine-template.png?v=1778690087"
            alt=""
            fill
            priority
            sizes="1024px"
          />
          <div className="magazine-nav-cover" aria-hidden="true" />
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
        </div>

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
