import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
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

const footerColumns: Array<Array<{ label: string; href: string }>> = [
  [
    { label: "BILLS", href: "/bills" },
    { label: "MPS", href: "/mps" },
    { label: "DEPARTMENTS", href: "/departments" },
    { label: "TRANSPARENCY", href: "/transparency" },
  ],
  [
    { label: "EXPENSES", href: "/expenses" },
    { label: "EARNINGS", href: "/earnings" },
    { label: "DONATIONS", href: "/donations" },
    { label: "CONTRACTS", href: "/contracts" },
  ],
  [
    { label: "ABOUT & METHODOLOGY", href: "/about" },
    { label: "SOURCES", href: "/sources" },
    { label: "PRIVACY", href: "/privacy" },
  ],
  [
    { label: "TERMS", href: "/terms" },
    { label: "CONTACT", href: "/contact" },
    { label: "GITHUB ↗", href: "https://github.com/tuffjamvisual-ai/peoples-chamber-frontend" },
  ],
];

const proofItems = [
  {
    icon: "100%",
    title: "100% Independent",
    body: "Not funded by government or political parties.",
  },
  {
    icon: "◷",
    title: "Real-time Data",
    body: "Live updates from official sources across the UK.",
  },
  {
    icon: "●●●",
    title: "Open to All",
    body: "Built for everyone. Built to be trusted.",
  },
  {
    icon: "⌕",
    title: "Accountability First",
    body: "Making power visible. Putting people first.",
  },
];

export default function MagazineLayout({ children }: MagazineLayoutProps) {
  return (
    <div className="magazine-stage">
      <div className="magazine-paper">
        <header className="magazine-header" aria-label="The People's Chamber header">
          {/* Issue sticker — small decorative asset (only next/image use) */}
          <Image
            src="/chrome/paperclip.png"
            alt="Issue 23, May 16–22, 2025"
            width={70}
            height={102}
            priority
            className="issue-sticker-image"
          />

          {/* Masthead — pure HTML/CSS */}
          <div className="masthead">
            <h1 className="masthead-title">
              <span>THE</span>
              <span>PEOPLE&apos;S</span>
              <span>CHAMBER</span>
            </h1>
            <p className="masthead-strapline">
              — UK GOVERNMENT. IN PUBLIC VIEW.
            </p>
          </div>

          {/* Truth note (top-right) — HTML/CSS */}
          <aside className="truth-note" aria-label="No spin, no paywall, just the truth">
            <span>NO SPIN.</span>
            <span>NO PAYWALL.</span>
            <span>JUST</span>
            <strong>THE TRUTH.</strong>
          </aside>

          {/* Megaphone — HTML/CSS (Unicode glyph) */}
          <div className="megaphone" aria-hidden="true">
            📣
          </div>

          {/* Democracy note — HTML/CSS */}
          <aside className="democracy-note" aria-label="Democracy works better when people watch">
            <span>Democracy</span>
            <span>works better</span>
            <span>when people</span>
            <span>watch.</span>
          </aside>

          {/* Navigation — editable HTML */}
          <nav className="magazine-nav" aria-label="Primary navigation">
            <span className="nav-star" aria-hidden="true">
              ✱
            </span>
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={index === 0 ? "is-active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="magazine-content">{children}</main>

        <footer className="magazine-footer">
          <div className="footer-rule" aria-hidden="true" />

          <div className="footer-main">
            <section className="footer-brand" aria-label="The People's Chamber">
              <div className="footer-crest" aria-hidden="true">
                ♜
              </div>
              <div>
                <h2>
                  <span>THE</span>
                  <span>PEOPLE&apos;S</span>
                  <span>CHAMBER</span>
                </h2>
                <p>— UK GOVERNMENT. IN PUBLIC VIEW.</p>
              </div>
            </section>

            <p className="footer-description">
              UK political transparency. Built from official sources: Parliament,
              IPSA, Companies House, Electoral Commission, Cabinet Office.
              Updated daily.
            </p>

            {footerColumns.map((links, index) => (
              <FooterColumn key={index} links={links} />
            ))}
          </div>

          <div className="footer-proof-strip">
            {proofItems.map((item) => (
              <section key={item.title} className="proof-item">
                <span className="proof-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </section>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

function FooterColumn({
  links,
}: {
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <nav className="footer-column" aria-label="Footer links">
      {links.map((link) => {
        const isExternal = link.href.startsWith("http");

        if (isExternal) {
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
  );
}
