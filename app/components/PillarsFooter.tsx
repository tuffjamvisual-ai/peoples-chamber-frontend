// New magazine-style footer: 4 typewriter pillars (no static image, all
// rendered HTML/SVG). Designed to sit at the bottom of MP profile,
// department, and similar long pages. Cream paper, ink text, Special
// Elite, slight per-pillar rotation for the hand-set-type feel.

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM = '#f4e8d4';

type IconName = 'circle' | 'heart' | 'people' | 'magnifier';

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 44,
    height: 44,
    fill: 'none',
    stroke: INK,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'circle':
      return (
        <svg viewBox="0 0 40 40" {...common} aria-hidden>
          <circle cx="20" cy="20" r="14" />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fontFamily="Special Elite, monospace"
            fontSize="14"
            fill={INK}
            stroke="none"
          >
            1
          </text>
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 40 40" {...common} aria-hidden>
          <path d="M20 32 C 20 32, 6 24, 6 15 a 6 6 0 0 1 12 -2 a 6 6 0 0 1 12 2 c 0 9 -10 17 -10 17 z" />
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 40 40" {...common} aria-hidden>
          <circle cx="14" cy="14" r="4" />
          <circle cx="26" cy="14" r="4" />
          <path d="M6 30 c 1 -5 6 -8 8 -8 s 7 3 8 8" />
          <path d="M18 30 c 1 -5 6 -8 8 -8 s 7 3 8 8" />
        </svg>
      );
    case 'magnifier':
      return (
        <svg viewBox="0 0 40 40" {...common} aria-hidden>
          <circle cx="17" cy="17" r="9" />
          <line x1="24" y1="24" x2="33" y2="33" />
        </svg>
      );
  }
}

type Pillar = { icon: IconName; title: string; body: string; tilt: number };

const PILLARS: Pillar[] = [
  {
    icon: 'circle',
    title: '100% INDEPENDENT',
    body: 'No party affiliation. No corporate funding. No advertisers. Just public records and plain words.',
    tilt: -0.4,
  },
  {
    icon: 'heart',
    title: 'CONTACT / DONATE',
    body: 'Tip us off about a story, or help us keep the lights on. Readers fund this site.',
    tilt: 0.3,
  },
  {
    icon: 'people',
    title: 'OPEN TO ALL',
    body: 'Free to read, free to share. No paywall, no login required, no surveillance.',
    tilt: -0.2,
  },
  {
    icon: 'magnifier',
    title: 'ACCOUNTABILITY FIRST',
    body: 'Watching the watchers. Tracking every vote, every interest, every pound.',
    tilt: 0.4,
  },
];

export default function PillarsFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        background: CREAM,
        color: INK,
        fontFamily: 'Special Elite, monospace',
        padding: '56px 64px 28px 64px',
        marginTop: '64px',
      }}
    >
      <div style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginBottom: '40px' }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '48px',
          marginBottom: '40px',
        }}
      >
        {PILLARS.map((p) => (
          <div
            key={p.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              transform: `rotate(${p.tilt}deg)`,
              transformOrigin: 'top left',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <Icon name={p.icon} />
            </div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '0.18em',
                marginBottom: '10px',
                color: INK,
                lineHeight: 1.25,
              }}
            >
              {p.title}
            </h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: INK,
                opacity: 0.85,
                maxWidth: '24ch',
              }}
            >
              {p.body}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: `1px solid ${INK_HAIRLINE}`,
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}
      >
        <span>© 2026 The People&apos;s Chamber</span>
        <span style={{ transform: 'rotate(-0.3deg)' }}>Made by readers, for readers.</span>
      </div>
    </footer>
  );
}
