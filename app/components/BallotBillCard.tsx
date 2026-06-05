'use client';

// Bill card in the People's Polls ballot style: a double-ruled card with a
// perforated tear-off stub, a serif title, the running people's count and —
// where the House has divided — how Parliament itself voted. The card carries
// no description and no vote of its own (you can't fairly vote on a title
// alone): the whole card links through to the bill's page for the full text
// and to cast a vote.

type Bill = {
  id: number;
  parliament_id?: number | null;
  title: string;
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
  // Retained for call-site compatibility; voting now happens on the bill page.
  onVote?: (choice: 'yes' | 'no') => void;
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

export default function BallotBillCard({ bill, userVote = null, onClick }: Props) {
  const yes = bill.vote_count_yes || 0;
  const no = bill.vote_count_no || 0;
  const total = yes + no;
  const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPercent = total > 0 ? 100 - yesPercent : 0;
  const hasVoted = userVote !== null;
  const tilt = TILTS[bill.id % TILTS.length];
  // Parliament's real bill identifier (bills.parliament.uk/bills/<id>); hidden
  // on the rare bill where it's missing rather than falling back to our DB id.
  const serial = bill.parliament_id != null ? String(bill.parliament_id).padStart(4, '0') : null;

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
        {serial && (
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.06em', color: ACCENT, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            No. {serial}
          </span>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {eyebrow && (
          <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '6px' }}>
            {eyebrow}
          </div>
        )}

        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
          {bill.title}
        </h3>

        {/* The people's count (read-only) */}
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '8px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>The people&apos;s count</span>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.08em', color: INK_SOFT }}>{total.toLocaleString()} {total === 1 ? 'vote' : 'votes'}</span>
          </div>

          {total > 0 ? (
            <>
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
            </>
          ) : (
            <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '13px', fontStyle: 'italic', color: INK_SOFT, letterSpacing: '0.03em' }}>
              No public votes yet, be the first.
            </div>
          )}

          {/* How Parliament itself voted — only shown where the House divided */}
          {hasDivision && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px', borderTop: `1px dotted ${INK_HAIRLINE}`, paddingTop: '7px' }}>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>How Parliament voted</span>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', letterSpacing: '0.04em', color: INK }}>
                {(cAye || 0).toLocaleString()} Ayes &middot; {(cNo || 0).toLocaleString()} Noes
              </span>
            </div>
          )}
        </div>

        {/* Through to the bill's page for the full text + to cast a vote */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '8px', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold' }}>
          <span>Read the full bill &amp; vote</span>
          <span aria-hidden>→</span>
        </div>
      </div>

      {/* "Voted" stamp where the reader has already cast a vote on this bill */}
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
