import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
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

const footerColumnOne = [
  { label: "BILLS", href: "/bills" },
  { label: "MPS", href: "/mps" },
  { label: "DEPARTMENTS", href: "/departments" },
  { label: "TRANSPARENCY", href: "/transparency" },
];

const footerColumnTwo = [
  { label: "EXPENSES", href: "/expenses" },
  { label: "EARNINGS", href: "/earnings" },
  { label: "DONATIONS", href: "/donations" },
  { label: "CONTRACTS", href: "/contracts" },
];

const footerColumnThree = [
  { label: "ABOUT & METHODOLOGY", href: "/about" },
  { label: "SOURCES", href: "/sources" },
  { label: "PRIVACY", href: "/privacy" },
];

const footerColumnFour = [
  { label: "TERMS", href: "/terms" },
  { label: "CONTACT", href: "/contact" },
  { label: "GITHUB ↗", href: "https://github.com" },
];

const proofItems = [
  {
    src: "/chrome/proof-independent.png",
    alt: "100% Independent",
    title: "100% Independent",
    body: "Not funded by government or political parties.",
  },
  {
    src: "/chrome/proof-realtime.png",
    alt: "Real-time Data",
    title: "Real-time Data",
    body: "Live updates from official sources across the UK.",
  },
  {
    src: "/chrome/proof-open.png",
    alt: "Open to All",
    title: "Open to All",
    body: "Built for everyone. Built to be trusted.",
  },
  {
    src: "/chrome/proof-accountability.png",
    alt: "Accountability First",
    title: "Accountability First",
    body: "Making power visible. Putting people first.",
  },
];

export default function MagazineLayout({ children }: MagazineLayoutProps) {
  return (
    <div className="magazine-stage">
      <div className="magazine-paper">
        <header className="magazine-header">
          <Image
            src="/chrome/issue-sticker.png"
            alt="Issue 23 May 16-22 2025"
            width={145}
            height={92}
            priority
            className="chrome issue-sticker"
          />
          <Image
            src="/chrome/paperclip.png"
            alt=""
            width={48}
            height={94}
            priority
            className="chrome paperclip"
            aria-hidden="true"
          />
          <div className="masthead-block" aria-label="The People's Chamber">
            <div className="masthead-crown" aria-hidden="true">
              ♕
            </div>
            <h1 className="masthead-title">
              <span>THE</span>
              <span>PEOPLE&apos;S</span>
              <span>CHAMBER</span>
            </h1>
            <p className="masthead-strapline">
              — UK GOVERNMENT. IN PUBLIC VIEW.
            </p>
          </div>
          <Image
            src="/chrome/truth-note.png"
            alt="No spin. No paywall. Just the truth."
            width={160}
            height={104}
            priority
            className="chrome truth-note"
          />
          <Image
            src="/chrome/megaphone-man.png"
            alt=""
            width={78}
            height={92}
            priority
            className="chrome megaphone-man"
            aria-hidden="true"
          />
          <Image
            src="/chrome/democracy-note.png"
            alt="Democracy works better when people watch."
            width={178}
            height={116}
            priority
            className="chrome democracy-note"
          />
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
              UK political transparency. Built from official sources:
              Parliament, IPSA, Companies House, Electoral Commission, Cabinet
              Office. Updated daily.
            </p>
            <FooterColumn links={footerColumnOne} />
            <FooterColumn links={footerColumnTwo} />
            <FooterColumn links={footerColumnThree} />
            <FooterColumn links={footerColumnFour} />
          </div>
          <div className="footer-proof-strip">
            {proofItems.map((item) => (
              <section key={item.title} className="proof-item">
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={48}
                  height={48}
                  className="proof-icon"
                />
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
