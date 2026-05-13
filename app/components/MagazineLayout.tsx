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
        <div className="magazine-art-band" aria-hidden="true">
          <Image
            className="magazine-art"
            src="/magazine-template.png"
            alt=""
            fill
            priority
            sizes="1024px"
          />
        </div>

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
      </div>
    </div>
  );
}
