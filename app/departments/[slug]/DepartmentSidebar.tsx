'use client';

import React from 'react';

// Left-nav sidebar for a department page, matching the MP-dossier layout
// (220px rail + content column). Items are in-page anchors to the sections
// rendered in `children`. Scrolling is handled with scrollIntoView rather
// than native #hash jumps because the content sits inside a `zoom: 1.18`
// container, and browsers mis-compute native anchor scroll offsets under
// CSS zoom (the page would leap to the wrong place).

const INK = '#14100d';

export type DeptNavItem = { label: string; href: string; rotate: string };

export default function DepartmentSidebar({
  items,
  children,
}: {
  items: DeptNavItem[];
  children: React.ReactNode;
}) {
  const onNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    const el = typeof document !== 'undefined' ? document.getElementById(href.slice(1)) : null;
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="pca-dept-sidebar-grid"
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}
    >
      <style>{`
        @media (min-width: 1024px) {
          .pca-dept-sidebar-grid { grid-template-columns: 220px 1fr !important; gap: 36px !important; }
        }
      `}</style>

      <aside style={{ marginLeft: '-13%' }}>
        <nav className="lg:sticky lg:top-16" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => onNavClick(e, item.href)}
              className="no-hover-scale"
              style={{
                display: 'block',
                padding: '12px 16px',
                borderLeft: '4px solid transparent',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: INK,
                fontFamily: 'Special Elite, monospace',
                textDecoration: 'none',
                transform: `rotate(${item.rotate})`,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
