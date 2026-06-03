'use client';

// Bills listing card styled as a Victorian-era UK Parliamentary Bill
// cover sheet (Representation of the People Bill template):
//   - thin-ruled title bar
//   - [AS INTRODUCED] small caps
//   - the iconic "A / BILL / TO" centrepiece
//   - justified italic description
//   - "Presented by [Sponsor], supported by..." sponsor block
//   - "Ordered, by The House of Commons, to be Printed, [date]" framed box
//   - © Parliamentary copyright italic line
//   - PUBLISHED BY THE AUTHORITY OF THE HOUSE OF COMMONS footer
//
// The whole card links to /bills/<id> for the full text + voting.
// People's count and Parliament's division are tucked into the footer rules.

type Bill = {
  id: number;
  parliament_id?: number | null;
  title: string;
  current_stage?: string | null;
  originating_house?: string | null;
  plain_summary?: string | null;
  description?: string | null;
  sponsor_name?: string | null;
  introduced_date?: string | null;
  stage_date?: string | null;
  last_update?: string | null;
  vote_count_yes?: number | null;
  vote_count_no?: number | null;
  vote_count_abstain?: number | null;
  commons_ayes?: number | null;
  commons_noes?: number | null;
  is_act?: boolean | null;
};

type Props = {
  bill: Bill;
  userVote?: 'yes' | 'no' | null;
  onClick: () => void;
};

const INK = '#1a140e';
const INK_SOFT = 'rgba(26,20,14,0.7)';
const INK_FAINT = 'rgba(26,20,14,0.45)';
const INK_HAIRLINE = 'rgba(26,20,14,0.3)';
const PARCHMENT = '#efe6d2';
const PARCHMENT_DEEP = '#e6dbc0';
const ACCENT = '#7a1612';
const SUCCESS = '#3f5a2a';
const DANGER = '#7a2a1f';

const SERIF = '"EB Garamond","Cormorant Garamond","Garamond",Georgia,"Times New Roman",serif';
const SERIF_DISPLAY = '"EB Garamond","Cormorant Garamond","Garamond",Georgia,"Times New Roman",serif';
const MONO = '"Special Elite", "Courier New", monospace';

function fmtDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export default function BillCoverCard({ bill, userVote = null, onClick }: Props) {
  const yes = bill.vote_count_yes || 0;
  const no = bill.vote_count_no || 0;
  const total = yes + no;
  const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPercent = total > 0 ? 100 - yesPercent : 0;
  const hasVoted = userVote !== null;
  const cAye = bill.commons_ayes ?? null;
  const cNo = bill.commons_noes ?? null;
  const hasDivision = cAye != null && cNo != null && cAye + cNo > 0;

  // Trim summary to a digestible cover-paragraph length.
  const summarySrc = (bill.plain_summary || bill.description || '').trim();
  const summary = summarySrc.length > 360 ? summarySrc.slice(0, 357).trim() + '…' : summarySrc;

  const orderedDate = fmtDate(bill.introduced_date || bill.last_update);

  return (
    <div
      onClick={onClick}
      className="no-hover-scale"
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: `${PARCHMENT} url('/bill-parchment.webp') center/cover no-repeat`,
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 14px 28px -16px rgba(26,20,14,0.35)',
        padding: '26px 30px 22px',
        fontFamily: SERIF,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minHeight: '520px',
      }}
    >
      {/* Ruled title bar (matches the template's top boxed header) */}
      <div
        style={{
          borderTop: `1px solid ${INK}`,
          borderBottom: `1px solid ${INK}`,
          padding: '12px 4px',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: SERIF_DISPLAY,
            fontSize: 'clamp(15px, 1.6vw, 17px)',
            fontWeight: 500,
            letterSpacing: '0.005em',
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {bill.title}
        </h3>
      </div>

      {/* [AS INTRODUCED] */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: SERIF,
          fontSize: '11.5px',
          letterSpacing: '0.1em',
          fontVariant: 'small-caps',
          color: INK_SOFT,
          marginTop: '2px',
        }}
      >
        [As Introduced]
      </div>

      {/* "A / B I L L / TO" centrepiece */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px' }}>
        <div style={{ fontFamily: SERIF_DISPLAY, fontSize: '14px', fontStyle: 'italic', color: INK, marginBottom: '2px' }}>A</div>
        <div
          style={{
            fontFamily: SERIF_DISPLAY,
            fontSize: 'clamp(34px, 4.6vw, 46px)',
            fontWeight: 500,
            letterSpacing: '0.42em',
            lineHeight: 1,
            color: INK,
            marginLeft: '0.42em', // optical-centre the wide letter-spacing
          }}
        >
          BILL
        </div>
        <div style={{ fontFamily: SERIF_DISPLAY, fontSize: '14px', fontStyle: 'italic', color: INK, marginTop: '4px' }}>to</div>
      </div>

      {/* Justified typewriter description */}
      {summary && (
        <p
          style={{
            margin: '4px 0 0',
            fontFamily: MONO,
            fontSize: '12px',
            lineHeight: 1.65,
            textAlign: 'justify',
            color: INK,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 6,
            overflow: 'hidden',
          }}
        >
          {summary}
        </p>
      )}

      {/* Sponsor block — typewriter italic, centred */}
      {bill.sponsor_name && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: MONO,
            fontStyle: 'italic',
            fontSize: '11.5px',
            color: INK,
            marginTop: 'auto',
            paddingTop: '6px',
          }}
        >
          <div>Presented by {bill.sponsor_name}.</div>
        </div>
      )}

      {/* Ordered to be Printed framed box */}
      {orderedDate && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: '13px',
            lineHeight: 1.55,
            color: INK,
            border: `1px solid ${INK}`,
            padding: '8px 12px',
            margin: '4px auto 0',
            maxWidth: '85%',
          }}
        >
          Ordered, by The House of Commons, to be Printed, {orderedDate}.
        </div>
      )}

      {/* People's count + Parliament's division row (folded into the lower rules) */}
      <div
        style={{
          borderTop: `1px solid ${INK_HAIRLINE}`,
          paddingTop: '10px',
          marginTop: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: MONO,
          fontSize: '13px',
          color: INK_SOFT,
          gap: '12px',
        }}
      >
        <span style={{ fontStyle: 'italic' }}>
          {total > 0 ? (
            <>
              <span style={{ color: SUCCESS, fontWeight: 600 }}>{yesPercent}% Aye</span>
              {' · '}
              <span style={{ color: DANGER, fontWeight: 600 }}>{noPercent}% No</span>
              {' · '}
              {total.toLocaleString()} {total === 1 ? 'vote' : 'votes'}
            </>
          ) : (
            <span>No public votes yet.</span>
          )}
        </span>
        {hasDivision && (
          <span style={{ fontStyle: 'italic', whiteSpace: 'nowrap' }}>
            Parliament: {(cAye || 0).toLocaleString()}–{(cNo || 0).toLocaleString()}
          </span>
        )}
      </div>

      {/* © Parliamentary copyright — typewriter italic */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: '12px',
          fontStyle: 'italic',
          color: INK_FAINT,
          marginTop: '4px',
        }}
      >
        © Parliamentary copyright House of Commons {new Date().getFullYear()}
      </div>

      {/* PUBLISHED BY THE AUTHORITY OF THE HOUSE OF COMMONS — typewriter, letter-spaced */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: '12px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK,
          paddingTop: '6px',
          borderTop: `0.5px solid ${INK_FAINT}`,
        }}
      >
        Published by the Authority of the House of Commons
      </div>

      {/* Royal Assent stamp — only for Acts (bill.is_act). Sits opposite
          the Voted stamp so they don't collide. */}
      {bill.is_act && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '18px',
            left: '14px',
            transform: 'rotate(-9deg)',
            border: `2.5px double ${ACCENT}`,
            padding: '3px 10px',
            color: ACCENT,
            background: PARCHMENT_DEEP,
            fontFamily: SERIF,
            fontSize: '13px',
            fontVariant: 'small-caps',
            letterSpacing: '0.14em',
            fontWeight: 'bold',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          ✓ Royal Assent
        </div>
      )}

      {/* "Voted" stamp — discreet tag in the corner where reader has cast a vote */}
      {hasVoted && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            transform: 'rotate(-12deg)',
            border: `2px solid ${ACCENT}`,
            padding: '2px 9px',
            color: ACCENT,
            background: PARCHMENT_DEEP,
            fontFamily: SERIF,
            fontSize: '13px',
            fontVariant: 'small-caps',
            letterSpacing: '0.14em',
            fontWeight: 'bold',
            opacity: 0.75,
            pointerEvents: 'none',
          }}
        >
          Voted
        </div>
      )}
    </div>
  );
}
