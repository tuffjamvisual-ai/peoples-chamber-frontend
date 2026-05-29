'use client';

// Ballot-paper bill card — the same vintage format as the People's Polls
// (PollsClient.PollCard): a double-ruled card with a perforated tear-off
// stub, a serif proposition, Aye/No cross boxes, a running count bar and a
// "Voted" stamp. Adapted for bills: it carries the bill's stage, an optional
// plain-English summary, and — where Parliament has actually divided — how
// the House itself voted, so the gap between the two is visible at a glance.

type Bill = {
  id: number;
  title: string;
  plain_summary?: string | null;
  current_stage?: string | null;
  originating_house?: string | null;
  vote_count_yes?: number | null;
  vote_count_no?: number | null;
  vote_count_abstain?: number | null;
  commons_ayes?: number | null;
  commons_noes?: number | null;
};

type Props = {
  bill: Bill;
  userVote?: 'yes' | 'no' | null;
  onClick: () => void;
  onVote: (choice: 'yes' | 'no') => void;
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM_DEEP = '#dcd4c0';
const ACCENT = '#7a1612';
const SUCCESS = '#4e6b34';
const DANGER = '#8a2f20';

// Stable per-bill tilt so each card sits slightly askew but never shifts.
const TILTS = [-0.4, 0.3, -0.2, 0.5, -0.3];

export default function BallotBillCard({ bill, userVote = null, onClick, onVote }: Props) {
  const yes = bill.vote_count_yes || 0;
  const no = bill.vote_count_no || 0;
  const total = yes + no;
  const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPercent = total > 0 ? 100 - yesPercent : 50;
  const hasVoted = userVote !== null;
  const tilt = TILTS[bill.id % TILTS.length];

  const cAye = bill.commons_ayes ?? null;
  const cNo = bill.commons_noes ?? null;
  const hasDivision = cAye != null && cNo != null && cAye + cNo > 0;

  const eyebrow = [bill.current_stage, bill.originating_house].filter(Boolean).join(' · ');

  return (
    <div
      onClick={onClick}
      className="no-hover-scale"
      style={{
        position: 'relative',
        background: 'transparent',
        color: INK,
        border: `3px double ${INK}`,
        boxShadow: '2px 3px 6px rgba(20,16,13,0.14)',
        transform: `rotate(${tilt}deg)`,
        display: 'flex',
        overflow: 'hidden',
        cursor: 'pointer',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Tear-off stub: perforated edge, vertical title + serial number */}
      <div
        style={{
          flexShrink: 0,
          width: '34px',
          borderRight: '2px dashed rgba(20,16,13,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0',
        }}
      >
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_SOFT, whiteSpace: 'nowrap' }}>
          The People&apos;s Bill
        </span>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '11px', letterSpacing: '0.06em', color: ACCENT, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          No. {String(bill.id).padStart(4, '0')}
        </span>
      </div>

      {/* Main ballot */}
      <div style={{ flex: 1, minWidth: 0, padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {eyebrow && (
          <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
            {eyebrow}
          </div>
        )}

        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
          {bill.title}
        </h3>

        {bill.plain_summary && (
          <p style={{ fontSize: '13px', lineHeight: 1.5, color: INK_SOFT, margin: 0, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
            {bill.plain_summary}
          </p>
        )}

        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '11px', fontStyle: 'italic', color: INK_SOFT, letterSpacing: '0.03em', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '6px' }}>
          Do you back this bill? Mark one box with a cross.
        </div>

        {/* Vote buttons sit inside a propagation guard so casting a vote
            never triggers the card's navigate-to-detail click. */}
        <div onClick={(e) => e.stopPropagation()}>
          <BallotRow label="Aye" marked={userVote === 'yes'} disabled={hasVoted} onClick={() => onVote('yes')} />
          <BallotRow label="No" marked={userVote === 'no'} disabled={hasVoted} onClick={() => onVote('no')} />
        </div>

        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '6px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>The people&apos;s count</span>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.08em', color: INK_SOFT }}>{total.toLocaleString()} votes</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: SUCCESS, lineHeight: 1 }}>
              {yesPercent}%<span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', color: INK_SOFT, letterSpacing: '0.12em', marginLeft: '4px' }}>AYE</span>
            </span>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: DANGER, lineHeight: 1 }}>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', color: INK_SOFT, letterSpacing: '0.12em', marginRight: '4px' }}>NO</span>{noPercent}%
            </span>
          </div>
          <div style={{ display: 'flex', height: '10px', background: CREAM_DEEP, border: `1px solid ${INK_HAIRLINE}`, overflow: 'hidden' }} aria-hidden>
            <div style={{ width: `${yesPercent}%`, background: SUCCESS }} />
            <div style={{ width: `${noPercent}%`, background: DANGER }} />
          </div>

          {/* How Parliament itself voted — only shown where the House divided */}
          {hasDivision && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '9px', borderTop: `1px dotted ${INK_HAIRLINE}`, paddingTop: '8px' }}>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>How Parliament voted</span>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', letterSpacing: '0.04em', color: INK }}>
                {(cAye || 0).toLocaleString()} Ayes &middot; {(cNo || 0).toLocaleString()} Noes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* "Voted" stamp, slapped on once the ballot is cast */}
      {hasVoted && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            transform: 'rotate(-13deg)',
            border: `3px double ${ACCENT}`,
            padding: '2px 9px',
            color: ACCENT,
            fontFamily: 'Special Elite, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          Voted
        </div>
      )}
    </div>
  );
}

function BallotRow({
  label,
  marked,
  disabled,
  onClick,
}: {
  label: string;
  marked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Vote ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        padding: '4px 0',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '17px', fontWeight: 'bold', color: INK, minWidth: '52px' }}>{label}</span>
      <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${INK_HAIRLINE}`, alignSelf: 'flex-end', marginBottom: '7px' }} />
      <span
        style={{
          width: '30px',
          height: '30px',
          border: `1.5px solid ${INK}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          lineHeight: 1,
          color: ACCENT,
          flexShrink: 0,
        }}
      >
        {marked ? '✗' : ''}
      </span>
    </button>
  );
}
