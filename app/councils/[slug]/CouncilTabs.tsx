'use client';

// Council profile tabs — the same pattern as the department and MP pages
// (app/departments/[slug]/DepartmentTabs.tsx, app/mps/[id]/MagazineProfileSections.tsx):
// chip-buttons in a sidebar and a content column that swaps on click. Each
// tab's content is a server-rendered slot, so every tab's markup ships in
// the static HTML (good for crawlers) and this component only toggles which
// slot is visible.
//
// Empty tabs: several council sections render nothing when a council has no
// figures from that source (e.g. Scottish councils have no Ofsted or MHCLG
// data). A tab whose slot is empty is hidden — by CSS :has() before the
// page is interactive, and by the effect below once it is.
//
// Each tab has an address ending (#schools, #housing, ...) so a tab can be
// linked to directly; switching tabs updates it.
//
// The council page isn't zoomed (unlike the department page), so the
// desktop sidebar uses plain CSS position: sticky.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Tab = { id: string; label: string; rotate: string };

const ACCENT = '#7a1612';
const INK = '#14100d';

export default function CouncilTabs({ tabs, slots }: { tabs: Tab[]; slots: Record<string, ReactNode> }) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  const [visible, setVisible] = useState<string[]>(tabs.map((t) => t.id));
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // After hydration: drop empty tabs, then open the tab named in the address (if any).
  useEffect(() => {
    const nonEmpty = tabs.map((t) => t.id).filter((id) => {
      const el = panelRefs.current[id];
      return !!el && el.childElementCount > 0;
    });
    setVisible(nonEmpty);
    const fromHash = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (h && nonEmpty.includes(h)) setActive(h);
      else setActive((cur) => (nonEmpty.includes(cur) ? cur : nonEmpty[0] ?? cur));
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [tabs]);

  // On phones the chips are a sideways-scrolling row: keep the open tab's chip in view
  // (moves the row only, never the page).
  const navRef = useRef<HTMLElement | null>(null);

  // Soft fade at the right edge of the phone chip row while there are more
  // tabs off to the right; it goes once the row is scrolled to the end.
  const [moreRight, setMoreRight] = useState(false);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const check = () => setMoreRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
    check();
    nav.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      nav.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [visible]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const btn = nav.querySelector<HTMLButtonElement>(`[data-council-tab="${active}"]`);
    if (!btn) return;
    const left = btn.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + btn.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, left - 16);
    }
  }, [active, visible]);

  const choose = (id: string) => {
    setActive(id);
    try {
      window.history.replaceState(null, '', `#${id}`);
    } catch {
      // Address update is a convenience only.
    }
  };

  const hideEmptyCss = tabs
    .map((t) => `.council-tabs:has(#council-panel-${t.id}:empty) [data-council-tab="${t.id}"]{display:none}`)
    .join('');

  return (
    // minmax(0, 1fr): without it a wide table or chart widens the column past
    // the screen on phones instead of scrolling inside its own box.
    <div className="council-tabs" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' }}>
      <style>{`
        .council-tabs nav { display:flex; flex-direction:row; gap:4px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding:4px 0 8px; border-bottom:1px solid rgba(20,16,13,0.2); scrollbar-width:none; }
        .council-tabs nav::-webkit-scrollbar { display:none; }
        .council-tabs nav.more-right { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent); }
        .council-tabs nav button { white-space:nowrap; flex:0 0 auto; }
        @media (min-width: 1024px) {
          .council-tabs { grid-template-columns: 200px minmax(0, 1fr) !important; gap: 28px !important; }
          .council-tabs aside { position: relative; }
          .council-tabs nav { position: sticky; top: 24px; flex-direction:column; overflow:visible; border-bottom:none; padding:8px; -webkit-mask-image:none !important; mask-image:none !important; }
          .council-tabs nav button { white-space:normal; }
        }
        ${hideEmptyCss}
      `}</style>
      <aside>
        <nav ref={navRef} aria-label="Council information" className={moreRight ? 'more-right' : undefined}>
          {tabs.filter((t) => visible.includes(t.id)).map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                data-council-tab={t.id}
                aria-pressed={isActive}
                onClick={() => choose(t.id)}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  borderLeft: isActive ? `4px solid ${ACCENT}` : '4px solid transparent',
                  background: isActive ? 'rgba(122,22,18,0.08)' : 'transparent',
                  boxShadow: isActive ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontSize: '15px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: INK,
                  fontFamily: 'Special Elite, monospace',
                  transform: `rotate(${t.rotate})`,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div style={{ color: INK, minWidth: 0 }}>
        {tabs.map((t) => (
          <div
            key={t.id}
            id={`council-panel-${t.id}`}
            ref={(el) => { panelRefs.current[t.id] = el; }}
            role="region"
            aria-label={t.label}
            style={{ display: t.id === active ? 'block' : 'none' }}
          >{slots[t.id]}</div>
        ))}
      </div>
    </div>
  );
}
