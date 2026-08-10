import Link from 'next/link';

// Site-wide nav for the magazine-template pages. Renders 8 transparent
// click rectangles overlaid on the painted nav strip in preview-header.webp
// (1023×330 native). Positions below are %-of-container-width for `left`
// and `width`, re-measured from the painted text bounds so each hotspot
// wraps its label with a small click-padding and adjacent hotspots leave
// a visible gap. Vertical band uses aspectRatio:1023/330 to match the
// painted chrome; top:80% + height:18% lands on the painted nav row.
//
// Single source of truth — every magazine page imports this. Future
// position tweaks (or new routes) happen here once.

const HOTSPOTS = [
  { href: '/',            label: 'Home',           left: 7,    width: 6   },
  { href: '/bills',       label: 'Bills',          left: 18,   width: 6.5 },
  { href: '/laws',        label: 'Laws',           left: 27,   width: 6.5 },
  { href: '/polls',       label: "opengovt Polls", left: 37,   width: 15  },
  { href: '/mps',         label: 'MPs',            left: 55,   width: 5.5 },
  { href: '/departments', label: 'Departments',    left: 63.5, width: 16  },
  { href: '/login',       label: 'Login',          left: 82,   width: 6.5 },
  { href: '/about',       label: 'About',          left: 90.5, width: 6.5 },
] as const;

export default function MagazineNav() {
  return (
    <nav
      aria-label="Site"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        aspectRatio: '1023 / 330',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      {HOTSPOTS.map(({ href, label, left, width }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          style={{
            position: 'absolute',
            top: '80%',
            left: `${left}%`,
            width: `${width}%`,
            height: '18%',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        />
      ))}
    </nav>
  );
}
