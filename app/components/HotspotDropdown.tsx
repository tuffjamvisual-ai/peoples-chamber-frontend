'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

// Dropdown variant of the absolute-positioned hotspot.
// Same xPct/yPct/wPct/hPct as a plain hotspot in DossierShell — sits
// at the same coordinates over the masthead image — but expands a
// panel of sub-links below the nav label when hovered or focused.
//
// Behaviour:
//   - mouse enter (desktop)        -> open
//   - mouse leave                  -> close
//   - focus inside (keyboard nav)  -> open
//   - blur outside                 -> close
//   - click on the label itself    -> navigate to the top-level href
//     (e.g. clicking PARTIES still goes to /parties; the dropdown is
//     a shortcut, not a gate). Mobile gets degraded-but-functional
//     experience: tap navigates; submenu isn't reachable without a
//     hamburger refactor.
//
// Style: parchment-cream panel with ink hairline divisions and a
// soft drop shadow so it reads as a paper insert pulled from the
// masthead rather than a system menu.

type SubItem = { label: string; href: string };

type Props = {
  href: string;
  label: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  children: SubItem[];
};

export default function HotspotDropdown({
  href,
  label,
  xPct,
  yPct,
  wPct,
  hPct,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click (touch / non-hover devices).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const containerStyle: CSSProperties = {
    position: 'absolute',
    left: `${xPct}%`,
    top: `${yPct}%`,
    width: `${wPct}%`,
    height: `${hPct}%`,
  };

  const triggerStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    borderRadius: 4,
  };

  const panelStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    // Centre the panel under its hotspot — left:50% + translateX(-50%)
    // anchors the panel's horizontal centre to the trigger's centre,
    // regardless of trigger width.
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: '220px',
    background: '#efe6d2',
    border: '1px solid rgba(26,20,14,0.4)',
    boxShadow: '0 14px 28px -8px rgba(20,16,13,0.45)',
    zIndex: 1000,
    padding: '4px 0',
    display: open ? 'block' : 'none',
    fontFamily: 'Special Elite, monospace',
  };

  const itemStyle = (first: boolean): CSSProperties => ({
    display: 'block',
    padding: '11px 18px',
    color: '#14100d',
    textDecoration: 'none',
    fontSize: '13px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderTop: first ? 'none' : '1px solid rgba(20,16,13,0.12)',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  });

  return (
    <div
      ref={ref}
      style={containerStyle}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        // Close only when focus leaves the whole wrapper, not when it
        // shifts between the trigger and a submenu item.
        if (!ref.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <a
        href={href}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="no-hover-scale"
        style={triggerStyle}
      />
      <div style={panelStyle} role="menu" aria-label={`${label} menu`}>
        {children.map((s, i) => (
          <a
            key={s.href + s.label}
            href={s.href}
            role="menuitem"
            className="no-hover-scale pca-dropdown-item"
            style={itemStyle(i === 0)}
          >
            {s.label}
          </a>
        ))}
      </div>
      <style>{`
        .pca-dropdown-item:hover { background: rgba(20,16,13,0.06); }
      `}</style>
    </div>
  );
}
