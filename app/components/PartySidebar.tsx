import React from 'react';

// Shared left-nav sidebar for the four per-party pages (Manifesto vs Record,
// People's verdict, Money, Whip), plus cross links to the party's MPs and the
// comparison index. Same vintage chip style as the MP dossier: slight rotation
// per item, red-ink active rail on the left, Special Elite uppercase.
//
// Renders the 220px / 1fr grid wrapper and drops `children` into the content
// column, so a page just wraps its body:
//   <PartySidebar party={party} active="money">{...page body...}</PartySidebar>

const INK = '#14100d';

type ActiveKey = 'manifesto' | 'bio' | 'money' | 'whip' | 'mps' | 'compare';

export default function PartySidebar({
  party,
  active,
  children,
}: {
  party: { slug: string; name: string; mp_party_string?: string | null };
  active: ActiveKey;
  children: React.ReactNode;
}) {
  // The /mps listing groups by the raw `mps.party` string (e.g. "Liberal
  // Democrat", "Alliance"), which differs from both the slug and the
  // display name for several parties. Drive the expand link off
  // mp_party_string so it lands on this party's MP group, not the index.
  const mpsExpand = party.mp_party_string || party.name;
  const items: { key: ActiveKey; label: string; href: string; rotate: string }[] = [
    { key: 'manifesto', label: 'Manifesto vs Record', href: `/parties/${party.slug}`,        rotate: '0.15deg'  },
    { key: 'bio',       label: "People's verdict",     href: `/parties/${party.slug}/bio`,    rotate: '-0.2deg'  },
    { key: 'money',     label: 'Money',                href: `/parties/${party.slug}/money`,  rotate: '0.1deg'   },
    { key: 'whip',      label: 'Whip',                 href: `/parties/${party.slug}/whip`,   rotate: '-0.12deg' },
    { key: 'mps',       label: `${party.name} MPs`,    href: `/mps?expand=${encodeURIComponent(mpsExpand)}#mps-list`, rotate: '0.1deg' },
    { key: 'compare',   label: 'Compare Parties',      href: '/parties',                      rotate: '-0.1deg'  },
  ];

  return (
    <div
      className="pca-party-sidebar-grid"
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}
    >
      <style>{`
        @media (min-width: 1024px) {
          .pca-party-sidebar-grid { grid-template-columns: 220px 1fr !important; gap: 36px !important; }
        }
      `}</style>

      <aside style={{ marginLeft: '-13%' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
          {items.map((item) => {
            const on = item.key === active;
            return (
              <a
                key={item.key}
                href={item.href}
                className="no-hover-scale"
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  borderLeft: on ? '4px solid #7a1612' : '4px solid transparent',
                  background: on ? 'rgba(122,22,18,0.08)' : 'transparent',
                  boxShadow: on ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                  fontWeight: on ? 'bold' : 'normal',
                  fontSize: '14px',
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
            );
          })}
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
