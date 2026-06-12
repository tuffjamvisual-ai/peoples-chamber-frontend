'use client';

// Department profile tabs — mirrors the MP bio template
// (app/mps/[id]/MagazineProfileSections.tsx): a sticky left sidebar of
// chip-buttons and a content column that swaps on click. Each section's
// content is passed in as a server-rendered slot, so every tab's markup
// ships in the static HTML (good for crawlers) and the client component
// only toggles which slot is visible.

import { useState } from 'react';
import type { ReactNode } from 'react';

type Tab = { id: string; label: string; rotate: string };

export default function DepartmentTabs({
  tabs,
  slots,
}: {
  tabs: Tab[];
  slots: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');

  return (
    <div className="pca-dept-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
      {/* Fixed-width sidebar so the content column (Assessment etc.) uses the
          full remaining page width to the right of the menu, rather than a
          quarter-width grid column that leaves a large empty gutter. */}
      <style>{`@media (min-width: 1024px){ .pca-dept-tabs { grid-template-columns: 200px minmax(0, 1fr) !important; gap: 28px !important; } }`}</style>
      <aside style={{ marginLeft: '-13%' }}>
        <div className="lg:sticky lg:top-16">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
            {tabs.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #7a1612' : '4px solid transparent',
                    background: isActive ? 'rgba(122,22,18,0.08)' : 'transparent',
                    boxShadow: isActive ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: isActive ? 'bold' : 'normal',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#14100d',
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
        </div>
      </aside>

      <div className="py-6 sm:py-8" style={{ color: '#14100d', fontFamily: 'Special Elite, monospace', minWidth: 0 }}>
        {tabs.map((t) => (
          <div key={t.id} style={{ display: t.id === active ? 'block' : 'none' }}>
            {slots[t.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
