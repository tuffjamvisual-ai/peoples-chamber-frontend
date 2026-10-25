'use client';

// Department profile tabs — mirrors the MP bio template
// (app/mps/[id]/MagazineProfileSections.tsx): a sticky left sidebar of
// chip-buttons and a content column that swaps on click. Each section's
// content is passed in as a server-rendered slot, so every tab's markup
// ships in the static HTML (good for crawlers) and the client component
// only toggles which slot is visible.
//
// CSS position:sticky is broken under the zoom:1.18 wrapper in page.tsx,
// so we use the same JS translateY trick as the landing-page MP folder.

import { pageview } from '@vercel/analytics';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// The dept page wraps DepartmentTabs in <div style={{ zoom: 1.18 }}>.
// getBoundingClientRect returns visual (zoomed) px; dividing by this
// scale converts back to the element's local (CSS) px for translateY.
const ZOOM = 1.18;
const TOP_GAP = 24;

type Tab = { id: string; label: string; rotate: string };

export default function DepartmentTabs({
  tabs,
  slots,
}: {
  tabs: Tab[];
  slots: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  const stickyRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Open the tab named in the address: ?tab=<id>, or the hash (e.g. /departments/home-office#transparency), as the
  // council tabs do. Back and Forward reopen the tab that address names.
  useEffect(() => {
    const fromUrl = () => {
      const t = new URLSearchParams(window.location.search).get('tab') || window.location.hash.replace(/^#/, '');
      setActive(t && tabs.some((x) => x.id === t) ? t : (tabs[0]?.id ?? ''));
    };
    fromUrl();
    window.addEventListener('hashchange', fromUrl);
    window.addEventListener('popstate', fromUrl);
    return () => {
      window.removeEventListener('hashchange', fromUrl);
      window.removeEventListener('popstate', fromUrl);
    };
  }, [tabs]);

  // A tab change is a page view (owner's approval, 21 Oct 2026): ?tab=<id> through history.pushState (no reload) and
  // Vercel Analytics is told, because its own tracking only counts a change of path.
  const choose = (id: string) => {
    if (id === active) return;
    setActive(id);
    window.history.pushState(null, '', `${window.location.pathname}?tab=${id}`);
    pageview({ path: window.location.pathname });
  };

  useEffect(() => {
    const el = stickyRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    const compute = () => {
      // Below 1024px the tabs sit above the content in one column, so sticking would slide them over the cards.
      if (!window.matchMedia('(min-width: 1024px)').matches) { setOffset(0); return; }
      const pr = container.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const maxVisual = Math.max(0, pr.height - er.height - 8);
      const visualDelta = Math.max(0, Math.min(TOP_GAP - pr.top, maxVisual));
      setOffset(visualDelta / ZOOM);
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [active]);

  return (
    <div ref={containerRef} className="pca-dept-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
      {/* Fixed-width sidebar so the content column uses the full remaining
          page width rather than a quarter-width grid column. */}
      <style>{`@media (min-width: 1024px){ .pca-dept-tabs { grid-template-columns: 200px minmax(0, 1fr) !important; gap: 28px !important; } }`}</style>
      <aside>
        <div
          ref={stickyRef}
          style={{ transform: `translateY(${offset}px)`, willChange: 'transform' }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
            {tabs.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => choose(t.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #7a1612' : '4px solid transparent',
                    background: isActive ? 'rgba(122,22,18,0.08)' : 'transparent',
                    boxShadow: isActive ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: isActive ? 'bold' : 'normal',
                    fontSize: '15px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#14100d',
                    fontFamily: 'var(--font-special-elite), monospace',
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
        </div>
      </aside>

      <div className="py-6 sm:py-8" style={{ color: '#14100d', fontFamily: 'var(--font-special-elite), monospace', minWidth: 0 }}>
        {tabs.map((t) => (
          <div key={t.id} style={{ display: t.id === active ? 'block' : 'none' }}>
            {slots[t.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
