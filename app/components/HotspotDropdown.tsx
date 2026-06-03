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
//   - click on the label itself    -> TOGGLE the dropdown (does NOT
//     navigate). User wanted PARTIES to not default to its own page;
//     making the click toggle gives mobile users a tap-to-open path
//     too. Sub-items are the only navigation surface.
//
// Style: a vintage parchment slip pinned beneath the masthead.
// Uses the same /bill-parchment.webp texture as the bills/councils
// pages, a slight rotation for the hand-tacked feel, a tiny red
// star header rule echoing the masthead, and red-ink hairlines
// between items instead of the previous grey lines.

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

  // Outer wrapper that sits flush against the trigger (top: 100%, no
  // gap) so the cursor can travel from trigger → panel without ever
  // leaving the hover subtree. It carries an 8px transparent
  // padding-top, which forms an invisible hover bridge but doesn't
  // show a visible parchment edge at the join.
  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: '8px',
    display: open ? 'block' : 'none',
    zIndex: 1000,
  };

  const panelStyle: CSSProperties = {
    // No `position: absolute` — sits naturally below the bridge.
    transform: 'rotate(-0.4deg)',
    transformOrigin: 'top center',
    minWidth: '236px',
    // Parchment texture (same file as the bills + councils pages) over
    // a cream wash, so the panel reads as torn from the masthead paper
    // stock rather than as a system menu.
    background: "#efe6d2 url('/bill-parchment.webp') center top / 100% auto repeat",
    // No rectangle border: layered shadows instead — an inner cream
    // highlight + a soft outer ink halo + a deeper warm drop shadow.
    boxShadow: [
      'inset 0 0 0 1px rgba(255,247,228,0.35)',          // inner cream rim
      '0 0 0 1px rgba(60,42,28,0.35)',                   // crisp ink hairline
      '0 1px 0 rgba(255,247,228,0.5)',                   // top edge highlight
      '0 18px 32px -10px rgba(50,30,18,0.55)',           // warm drop shadow
    ].join(', '),
    padding: '6px 0 10px',
    fontFamily: 'Special Elite, monospace',
    color: '#14100d',
    // Safety net for long menus (PARTIES now lists all 15 parties +
    // Manifesto Comparisons). 70vh keeps the panel fully on-screen on
    // smaller viewports; overflow lets it scroll inside the parchment.
    maxHeight: '70vh',
    overflowY: 'auto',
  };

  const itemStyle = (first: boolean): CSSProperties => ({
    display: 'block',
    padding: '10px 22px',
    color: '#14100d',
    textDecoration: 'none',
    fontSize: '12px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    // Red-ink hairline echoing the divider rules on the masthead.
    borderTop: first ? 'none' : '1px solid rgba(122,22,18,0.28)',
    whiteSpace: 'nowrap',
    lineHeight: 1.35,
    position: 'relative',
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
        onClick={(e) => {
          // PARTIES (and any future dropdown trigger) must not navigate
          // on click — it only opens its dropdown. Sub-items handle the
          // actual navigation. The href is kept for semantic / SEO
          // discoverability (Googlebot can still follow it), but click
          // intent is to expand the menu.
          e.preventDefault();
          setOpen((v) => !v);
        }}
      />
      <div style={wrapperStyle}>
      <div style={panelStyle} role="menu" aria-label={`${label} menu`}>
        {/* Top header rule — small caps label + red star, echoes the
            masthead's "UK GOVERNMENT, IN PUBLIC VIEW" subtitle band. */}
        <div
          aria-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '4px 18px 8px',
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
            fontSize: '12px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(20,16,13,0.55)',
            borderBottom: '1px solid rgba(122,22,18,0.35)',
            margin: '0 12px',
          }}
        >
          <span style={{ color: '#7a1612' }}>★</span>
          <span>{label}</span>
          <span style={{ color: '#7a1612' }}>★</span>
        </div>
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
      </div>
      <style>{`
        .pca-dropdown-item {
          transition: letter-spacing 140ms ease, background-color 140ms ease, color 140ms ease;
        }
        .pca-dropdown-item:hover {
          background: rgba(122,22,18,0.08);
          color: #7a1612;
          letter-spacing: 0.22em;
        }
        .pca-dropdown-item:hover::before {
          content: '✦';
          position: absolute;
          left: 7px;
          top: 50%;
          transform: translateY(-50%);
          color: #7a1612;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}
