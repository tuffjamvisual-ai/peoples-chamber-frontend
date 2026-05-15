// Magazine-style pillars footer — matches the kraft-paper mockup.
// Horizontal strip with 4 pillars, each: icon-in-circle on the left,
// title + body to the right. Vertical hairlines between pillars.

const INK = '#14100d';
const TAN = '#c9b890';          // kraft / brown-paper base
const TAN_GRAIN = '#b8a578';    // slightly darker overlay for grain
const HAIRLINE = 'rgba(20,16,13,0.35)';

type IconName = 'badge100' | 'heart' | 'people' | 'magnifier';

function PillarIcon({ name }: { name: IconName }) {
  const stroke = INK;
  const sw = 1.8;
  // 100% INDEPENDENT is a solid black stamp; the rest are outline-only.
  if (name === 'badge100') {
    return (
      <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden>
        <circle cx="32" cy="32" r="29" fill={INK} stroke={INK} strokeWidth="1.5" />
        <text
          x="32"
          y="30"
          textAnchor="middle"
          fontFamily="Special Elite, monospace"
          fontSize="15"
          fontWeight="bold"
          fill="#f4e8d4"
        >
          100%
        </text>
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fontFamily="Special Elite, monospace"
          fontSize="7.5"
          letterSpacing="0.1em"
          fill="#f4e8d4"
        >
          INDEPENDENT
        </text>
      </svg>
    );
  }
  const common = {
    width: 64,
    height: 64,
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'heart':
      return (
        <svg {...common} aria-hidden>
          <circle cx="32" cy="32" r="29" />
          <path d="M32 47 C 32 47, 18 38, 18 28 a 6.5 6.5 0 0 1 14 -3 a 6.5 6.5 0 0 1 14 3 c 0 10 -14 19 -14 19 z" />
        </svg>
      );
    case 'people':
      return (
        <svg {...common} aria-hidden>
          <circle cx="32" cy="32" r="29" />
          <circle cx="25" cy="26" r="4.5" />
          <circle cx="39" cy="26" r="4.5" />
          <path d="M16 46 c 1 -6 6 -10 9 -10 s 8 4 9 10" />
          <path d="M30 46 c 1 -6 6 -10 9 -10 s 8 4 9 10" />
        </svg>
      );
    case 'magnifier':
      return (
        <svg {...common} aria-hidden>
          <circle cx="32" cy="32" r="29" />
          <circle cx="28" cy="28" r="9" />
          <line x1="35" y1="35" x2="46" y2="46" />
        </svg>
      );
  }
}

type Pillar = { icon: IconName; title?: string; body: string };

const PILLARS: Pillar[] = [
  {
    icon: 'badge100',
    body: 'Not funded by government or political parties.',
  },
  {
    icon: 'heart',
    title: 'CONTACT / DONATE',
    body: 'Get in touch or support our work if you can.',
  },
  {
    icon: 'people',
    title: 'OPEN TO ALL',
    body: 'Built for citizens, not politicians.',
  },
  {
    icon: 'magnifier',
    title: 'ACCOUNTABILITY FIRST',
    body: 'Because transparency drives better government.',
  },
];

export default function PillarsFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        background: TAN,
        // Subtle paper-grain overlay so the tan reads as kraft, not flat.
        backgroundImage:
          `linear-gradient(0deg, ${TAN_GRAIN}33 0%, transparent 30%, transparent 70%, ${TAN_GRAIN}33 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
        backgroundSize: 'auto, 200px 200px',
        color: INK,
        fontFamily: 'Special Elite, monospace',
        padding: '36px 32px',
        marginTop: '64px',
        boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.06), inset 0 -1px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          alignItems: 'center',
        }}
      >
        {PILLARS.map((p, i) => (
          <div
            key={p.icon}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '0 24px',
              borderRight: i < PILLARS.length - 1 ? `1px solid ${HAIRLINE}` : 'none',
              minHeight: '88px',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <PillarIcon name={p.icon} />
            </div>
            <div style={{ minWidth: 0 }}>
              {p.title && (
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '0.14em',
                    marginBottom: '6px',
                    color: INK,
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </h3>
              )}
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: 1.45,
                  color: INK,
                  opacity: 0.92,
                  margin: 0,
                }}
              >
                {p.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
