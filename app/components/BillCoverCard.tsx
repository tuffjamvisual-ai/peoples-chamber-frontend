'use client';

import Link from 'next/link';
import { billStageLine, billSummary, NO_SUMMARY_TEXT } from '@/lib/bill-summary';

// Bills listing card styled as a Victorian-era UK Parliamentary Bill
// cover sheet (Representation of the People Bill template):
//   - thin-ruled title bar
//   - [Stage, date] small caps: the bill's current stage and its date
//   - the iconic "A / BILL / TO" centrepiece
//   - justified italic description
//   - "Presented by [Sponsor], supported by..." sponsor block
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
  summary?: string | null; // already cut to card length on the server (lib/data.ts toCardBill)
  description?: string | null;
  long_title?: string | null;
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
};

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(26,20,14,0.3)';
const PARCHMENT = '#efe6d2';
const PARCHMENT_DEEP = '#e6dbc0';
const ACCENT = '#7a1612';

const SERIF = 'var(--font-special-elite), monospace';
const SERIF_DISPLAY = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), "Courier New", monospace';

export default function BillCoverCard({ bill, userVote = null }: Props) {
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
  const summarySrc = bill.summary ?? billSummary(bill);
  // "[Committee stage, 1 September 2026]"; either part alone if the other is missing; nothing if both are.
  const stageLine = billStageLine(bill);
  const summary = summarySrc.length > 360 ? summarySrc.slice(0, 357).trim() + '…' : summarySrc;

  // A real link to the bill (23 Oct 2026): opens in a new tab, shows its address, and is reachable by keyboard
  // with a visible focus ring (.bill-card-link in globals.css). The card inside keeps its layout.
  return (
    <Link href={`/bills/${bill.id}`} className="bill-card-link no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
    <div
      style={{
        position: 'relative',
        background: PARCHMENT, // plain cream (parchment texture removed)
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 14px 28px -16px rgba(26,20,14,0.35)',
        padding: '26px 30px 22px',
        fontFamily: SERIF,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
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
          className="line-clamp-3 md:line-clamp-2"
          style={{
            margin: 0,
            fontFamily: SERIF_DISPLAY,
            fontSize: 'clamp(15px, 1.6vw, 17px)',
            fontWeight: 500,
            letterSpacing: '0.005em',
            lineHeight: 1.25,
          }}
        >
          {bill.title}
        </h3>
      </div>

      {/* [Stage, date] */}
      {stageLine && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: SERIF,
            fontSize: '14px',
            letterSpacing: '0.1em',
            fontVariant: 'small-caps',
            color: INK_SOFT,
            marginTop: '2px',
          }}
        >
          [{stageLine}]
        </div>
      )}

      {/* "A / B I L L / TO" centrepiece */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px' }}>
        <div style={{ fontFamily: SERIF_DISPLAY, fontSize: '15px', fontStyle: 'italic', color: INK, marginBottom: '2px' }}>A</div>
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
        <div style={{ fontFamily: SERIF_DISPLAY, fontSize: '15px', fontStyle: 'italic', color: INK, marginTop: '4px' }}>to</div>
      </div>

      {/* Justified typewriter description, or a note that Parliament has published none */}
      {summary ? (
        <p
          style={{
            margin: '4px 0 0',
            fontFamily: MONO,
            fontSize: '15px',
            lineHeight: 1.65,
            color: INK,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 6,
            overflow: 'hidden',
          }}
        >
          {summary}
        </p>
      ) : (
        <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.65, fontStyle: 'italic', color: INK_SOFT, textAlign: 'center' }}>
          {NO_SUMMARY_TEXT}
        </p>
      )}

      {/* Sponsor block — typewriter italic, centred */}
      {bill.sponsor_name && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: MONO,
            fontStyle: 'italic',
            fontSize: '14px',
            color: INK,
            marginTop: 'auto',
            paddingTop: '6px',
          }}
        >
          <div>Presented by {bill.sponsor_name}.</div>
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
          fontSize: '15px',
          color: INK_SOFT,
          gap: '12px',
        }}
      >
        <span style={{ fontStyle: 'italic' }}>
          {total > 0 ? (
            <>
              <span style={{ color: INK, fontWeight: 600 }}>{yesPercent}% Aye</span>
              {' · '}
              <span style={{ color: INK, fontWeight: 600 }}>{noPercent}% No</span>
              {' · '}
              {total.toLocaleString()} {total === 1 ? 'vote' : 'votes'}
            </>
          ) : (
            <span>No public votes yet.</span>
          )}
        </span>
        {hasDivision && (
          <span style={{ fontStyle: 'italic', whiteSpace: 'nowrap' }}>
            Parliament: {(cAye || 0).toLocaleString()}-{(cNo || 0).toLocaleString()}
          </span>
        )}
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
            fontSize: '15px',
            fontVariant: 'small-caps',
            letterSpacing: '0.14em',
            fontWeight: 'bold',
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
            fontSize: '15px',
            fontVariant: 'small-caps',
            letterSpacing: '0.14em',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          Voted
        </div>
      )}
    </div>
    </Link>
  );
}
