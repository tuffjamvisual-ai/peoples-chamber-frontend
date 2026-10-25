'use client';

// The desktop header's section links (1180px and up; owner's choice, 25 Oct 2026, report 57): one row of plain links with
// no dropdowns, from lib/site-nav.ts. The section the page belongs to is underlined and carries aria-current.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DESKTOP_NAV, desktopSectionFor } from '@/lib/site-nav';

export default function DesktopNav() {
  const pathname = usePathname() ?? '/';
  const current = desktopSectionFor(pathname);
  return (
    <nav aria-label="Primary" className="og-dnav">
      <ul>
        {DESKTOP_NAV.map((item) => (
          <li key={item.label}>
            <Link href={item.href} prefetch={false} aria-current={item.label === current ? (pathname === item.href ? 'page' : 'true') : undefined}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
