'use client';

// Bill card matching the chalkboard reference: cream/parchment outer
// frame with sketched border, dark chalkboard inner panel, chalk-
// textured vote bar and Support/Oppose buttons. Used by BillsGrid
// (desktop) and BillsGridMobile.

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

// Inline SVG noise — gives the colored chalk rectangles their dusty,
// hand-rubbed texture. Two intensities: heavy for the bar/buttons,
// light for the chalkboard panel itself.
const CHALK_NOISE = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")";
const SLATE_TEXTURE = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E\")";
const PAPER_GRAIN = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='0.10'/%3E%3C/svg%3E\")";

// Palette extracted from the reference image.
const PARCHMENT = '#e8dcc1';
const PARCHMENT_DARK = '#c9b88f';
const INK = '#1a1612';
const CHALK_BG = '#2a2826';
const CHALK_BG_DARK = '#1a1817';
const CHALK_TEXT = '#e6d9bc';
const CHALK_GREEN = '#5e8a3a';
const CHALK_RED = '#a64030';

export default function ChalkboardBillCard({ bill, userVote, onClick, onVote }: Props) {
  const yes = bill.vote_count_yes || 0;
  const no = bill.vote_count_no || 0;
  const abstain = bill.vote_count_abstain || 0;
  const total = yes + no + abstain;
  const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPercent = total > 0 ? Math.round((no / total) * 100) : 0;
  const hasVoted = !!userVote;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: PARCHMENT,
        backgroundImage: PAPER_GRAIN,
        padding: '14px',
        cursor: 'pointer',
        fontFamily: 'Special Elite, monospace',
        // Sketched double-border: outer ink line + slight inset shadow
        // imitating the hand-drawn frame in the reference.
        border: `1.5px solid ${INK}`,
        boxShadow: `inset 0 0 0 4px ${PARCHMENT}, inset 0 0 0 5px ${PARCHMENT_DARK}, 0 2px 6px rgba(0,0,0,0.25)`,
      }}
      className="no-hover-scale"
    >
      {/* Chalkboard inner panel */}
      <div
        style={{
          position: 'relative',
          background: CHALK_BG,
          backgroundImage: SLATE_TEXTURE,
          padding: '18px 22px 20px 22px',
          border: `2px solid ${INK}`,
          boxShadow: 'inset 0 0 25px rgba(0,0,0,0.55)',
          color: CHALK_TEXT,
        }}
      >
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginBottom: '12px',
            color: CHALK_TEXT,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            textShadow: '0 0 1px rgba(255,255,255,0.15)',
          }}
        >
          {bill.title}
        </h3>

        {/* Vote bar — chalk-textured green/red */}
        <div
          style={{
            position: 'relative',
            height: '14px',
            background: CHALK_BG_DARK,
            border: `1px solid ${INK}`,
            marginBottom: '6px',
            display: 'flex',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {yesPercent > 0 && (
            <div
              style={{
                width: `${yesPercent}%`,
                background: CHALK_GREEN,
                backgroundImage: CHALK_NOISE,
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
              }}
            />
          )}
          {noPercent > 0 && (
            <div
              style={{
                width: `${noPercent}%`,
                background: CHALK_RED,
                backgroundImage: CHALK_NOISE,
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
              }}
            />
          )}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: '13px',
            color: CHALK_TEXT,
            marginBottom: '16px',
          }}
        >
          <span>✓ {yesPercent}%</span>
          <span style={{ opacity: 0.85 }}>{total.toLocaleString()} votes</span>
          <span>✗ {noPercent}%</span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
          <ChalkButton
            colour={CHALK_GREEN}
            label={hasVoted && userVote === 'yes' ? '✓ Supported' : 'Support'}
            dimmed={hasVoted && userVote !== 'yes'}
            disabled={hasVoted}
            onClick={() => onVote('yes')}
          />
          <ChalkButton
            colour={CHALK_RED}
            label={hasVoted && userVote === 'no' ? '✓ Opposed' : 'Oppose'}
            dimmed={hasVoted && userVote !== 'no'}
            disabled={hasVoted}
            onClick={() => onVote('no')}
          />
        </div>
      </div>
    </div>
  );
}

function ChalkButton({
  colour,
  label,
  dimmed,
  disabled,
  onClick,
}: {
  colour: string;
  label: string;
  dimmed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '11px 8px',
        background: colour,
        backgroundImage: CHALK_NOISE,
        border: `2px solid ${INK}`,
        color: CHALK_TEXT,
        fontFamily: 'inherit',
        fontSize: '15px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: `0 3px 0 ${INK}, inset 0 0 8px rgba(0,0,0,0.3)`,
        opacity: dimmed ? 0.45 : 1,
        textShadow: '0 0 1px rgba(255,255,255,0.15)',
      }}
    >
      {label}
    </button>
  );
}
