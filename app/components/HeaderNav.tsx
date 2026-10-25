'use client';

// The desktop header's top level links (25 Oct 2026, report 60): the same row and styling as before, with no dropdowns.
// A section with several pages links to its section page, which lists them all (lib/site-nav.ts menuHref). The item the
// current page belongs to carries aria-current ("page" on that address itself, "true" below it).
import { usePathname } from 'next/navigation';
import { NAV, menuHref, currentSection } from '@/lib/site-nav';

export default function HeaderNav() {
  const pathname = usePathname() ?? '/';
  const current = currentSection(pathname);
  return (
    <ul className="ng-nav">
      {NAV.map((item) => {
        const href = menuHref(item);
        return (
          <li key={item.label}>
            <a href={href} aria-current={item.label === current ? (pathname === href ? 'page' : 'true') : undefined}>{item.label}</a>
          </li>
        );
      })}
    </ul>
  );
}
