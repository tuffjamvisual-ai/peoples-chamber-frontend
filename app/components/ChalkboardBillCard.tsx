'use client';

// Hand-drawn chalkboard bill card. SVG with feTurbulence +
// feDisplacementMap distorts the borders, vote bar, and buttons so
// straight lines render with irregular wobble (rough-style without
// the dep). Heavier chalk texture overlay on the dark panel.

type Bill = {
  id: number;
  title: string;
  vote_count_yes?: number | null;
  vote_count_no?: number | null;
  vote_count_abstain?: number | null;
};

type Props = {
  bill: Bill;
  userVote?: 'yes' | 'no' | null;
  onClick: () => void;
  onVote: (choice: 'yes' | 'no') => void;
};

// Palette extracted from the reference image.
const PARCHMENT = '#e8dcc1';
const INK = '#1a1612';
const CHALK_BG = '#2a2826';
const CHALK_BG_DARK = '#15140f';
const CHALK_TEXT = '#e6d9bc';
const CHALK_GREEN = '#5e8a3a';
const CHALK_RED = '#a64030';

const PAPER_GRAIN = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='0.12'/%3E%3C/svg%3E\")";

// Inline SVG with feDisplacementMap filter — distorts a straight rect
// into a wobbly hand-drawn one. Each call uses a distinct seed so each
// card has slightly different irregularity.
function WobbleBorder({ seed, strokeWidth = 1.2 }: { seed: number; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <filter id={`wob-${seed}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </defs>
      <rect
        x="0.6" y="0.6"
        width="98.8" height="98.8"
        fill="none"
        stroke={INK}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        filter={`url(#wob-${seed})`}
      />
    </svg>
  );
}

// Chalk-textured vote bar — straight rects pass through a chalky
// displacement so the edges look hand-rubbed, and an overlay of chalky
// scratches sells the crayon-on-slate effect.
function ChalkBar({ yesPct, noPct, seed }: { yesPct: number; noPct: number; seed: number }) {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '16px', display: 'block' }}
      aria-hidden
    >
      <defs>
        <filter id={`bar-${seed}`} x="-2%" y="-30%" width="104%" height="160%">
          <feTurbulence type="turbulence" baseFrequency="0.7" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <pattern id={`scratch-${seed}`} patternUnits="userSpaceOnUse" width="6" height="14" patternTransform="rotate(-12)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="0.4" opacity="0.18" />
          <line x1="3" y1="0" x2="3" y2="14" stroke="#000000" strokeWidth="0.3" opacity="0.25" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="200" height="14" fill={CHALK_BG_DARK} filter={`url(#bar-${seed})`} />
      {yesPct > 0 && (
        <>
          <rect x="0" y="0" width={(yesPct / 100) * 200} height="14" fill={CHALK_GREEN} filter={`url(#bar-${seed})`} />
          <rect x="0" y="0" width={(yesPct / 100) * 200} height="14" fill={`url(#scratch-${seed})`} />
        </>
      )}
      {noPct > 0 && (
        <>
          <rect x={(yesPct / 100) * 200} y="0" width={(noPct / 100) * 200} height="14" fill={CHALK_RED} filter={`url(#bar-${seed})`} />
          <rect x={(yesPct / 100) * 200} y="0" width={(noPct / 100) * 200} height="14" fill={`url(#scratch-${seed})`} />
        </>
      )}
    </svg>
  );
}

// Chalk-stamped button — SVG so the border wobbles. The fill is solid
// colour + the same scratch pattern as the bar for visual unity.
function ChalkButton({
  colour, label, dimmed, disabled, onClick, seed,
}: {
  colour: string; label: string; dimmed: boolean; disabled: boolean; onClick: () => void; seed: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        position: 'relative',
        padding: '14px 8px',
        background: 'transparent',
        border: 'none',
        color: CHALK_TEXT,
        fontFamily: 'Special Elite, monospace',
        fontSize: '17px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: disabled ? 'default' : 'pointer',
        opacity: dimmed ? 0.45 : 1,
        textShadow: '0 0 1.5px rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.5)',
      }}
    >
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <filter id={`btn-${seed}`} x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale="1.8" />
          </filter>
          <pattern id={`btn-scratch-${seed}`} patternUnits="userSpaceOnUse" width="5" height="40" patternTransform="rotate(-15)">
            <line x1="0" y1="0" x2="0" y2="40" stroke="#ffffff" strokeWidth="0.4" opacity="0.18" />
            <line x1="2.5" y1="0" x2="2.5" y2="40" stroke="#000000" strokeWidth="0.3" opacity="0.28" />
          </pattern>
        </defs>
        {/* drop shadow rect (offset down, ink) */}
        <rect x="1" y="3" width="98" height="36" fill={INK} filter={`url(#btn-${seed})`} />
        {/* fill rect */}
        <rect x="1" y="0.5" width="98" height="36" fill={colour} filter={`url(#btn-${seed})`} />
        {/* chalk scratches on top */}
        <rect x="1" y="0.5" width="98" height="36" fill={`url(#btn-scratch-${seed})`} />
        {/* ink outline */}
        <rect x="1" y="0.5" width="98" height="36" fill="none" stroke={INK} strokeWidth="1.5" filter={`url(#btn-${seed})`} />
      </svg>
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  );
}

export default function ChalkboardBillCard({ bill, userVote, onClick, onVote }: Props) {
  const yes = bill.vote_count_yes || 0;
  const no = bill.vote_count_no || 0;
  const abstain = bill.vote_count_abstain || 0;
  const total = yes + no + abstain;
  const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPercent = total > 0 ? Math.round((no / total) * 100) : 0;
  const hasVoted = !!userVote;
  // Deterministic seed per bill so each card looks slightly different
  // but stable across re-renders.
  const seed = (bill.id % 97) + 1;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: PARCHMENT,
        backgroundImage: PAPER_GRAIN,
        padding: '18px',
        cursor: 'pointer',
        fontFamily: 'Special Elite, monospace',
        boxShadow: '0 3px 8px rgba(0,0,0,0.18)',
      }}
      className="no-hover-scale"
    >
      <WobbleBorder seed={seed} strokeWidth={1.3} />

      {/* Chalkboard inner panel */}
      <div
        style={{
          position: 'relative',
          background: CHALK_BG,
          padding: '22px 24px 22px 24px',
          color: CHALK_TEXT,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.55), inset 0 0 6px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* chalk-dust noise overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
            mixBlendMode: 'overlay',
          }}
        />
        <WobbleBorder seed={seed + 11} strokeWidth={1.0} />

        <h3
          style={{
            position: 'relative',
            fontSize: '22px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '18px',
            color: CHALK_TEXT,
            lineHeight: 1.15,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            textShadow: '0 0 1.5px rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.6)',
          }}
        >
          {bill.title}
        </h3>

        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <ChalkBar yesPct={yesPercent} noPct={noPercent} seed={seed + 23} />
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: '17px',
            color: CHALK_TEXT,
            marginBottom: '20px',
            textShadow: '0 0 1px rgba(255,255,255,0.15)',
          }}
        >
          <span>✓ {yesPercent}%</span>
          <span style={{ opacity: 0.85 }}>{total.toLocaleString()} votes</span>
          <span>✗ {noPercent}%</span>
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: '14px' }} onClick={(e) => e.stopPropagation()}>
          <ChalkButton
            colour={CHALK_GREEN}
            label={hasVoted && userVote === 'yes' ? '✓ Supported' : 'Support'}
            dimmed={hasVoted && userVote !== 'yes'}
            disabled={hasVoted}
            onClick={() => onVote('yes')}
            seed={seed + 37}
          />
          <ChalkButton
            colour={CHALK_RED}
            label={hasVoted && userVote === 'no' ? '✓ Opposed' : 'Oppose'}
            dimmed={hasVoted && userVote !== 'no'}
            disabled={hasVoted}
            onClick={() => onVote('no')}
            seed={seed + 53}
          />
        </div>
      </div>
    </div>
  );
}
