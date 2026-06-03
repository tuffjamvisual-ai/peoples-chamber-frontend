// /second-jobs — every current MP with declared outside earnings
// or registered employment-category interests, drawn from the
// Members API's Register of Members' Financial Interests.
//
// Data sources:
//   - mp_registered_interests.category_name ILIKE 'Employment%'
//     gives the parent role/payer text per registered interest.
//   - The same row's child_interests JSONB array carries the
//     individual 'Payment: £X' lines.
//   - mp_outside_earnings_summary is the pre-computed lower-bound
//     total (regex over child_interests) used to rank MPs and as
//     the headline 'declared total' per MP.
//
// Render on demand (the parsing is non-trivial; cache 24h via ISR).

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'MPs with second jobs',
  description:
    'Every current MP with declared outside earnings from the Register of Members’ Financial Interests. Role, payer, individual payments.',
  alternates: { canonical: '/second-jobs' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const PARCHMENT_CREAM = '#efe6d2';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

type ChildPayment = {
  interest?: string;
};

type InterestRow = {
  member_id: number;
  interest_text: string;
  child_interests: ChildPayment[] | null;
};

type MpRow = {
  member_id: number;
  display_name: string | null;
  name: string | null;
  constituency: string | null;
  party: string | null;
  party_colour: string | null;
};

type Summary = {
  member_id: number;
  total_extracted: number;
  claim_count: number;
};

function fmtMoney(n: number): string {
  if (!n) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

// Parse parent-interest text. The Members API serialises a role-line,
// optional From: date, Payer: line, ACOBA flag, etc. We pluck what's
// useful for display and let the rest fall through verbatim.
type ParentParsed = {
  role: string | null;
  payer: string | null;
  startDate: string | null;
  acoba: boolean;
  extra: string[];
};
function parseParent(text: string): ParentParsed {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParentParsed = { role: null, payer: null, startDate: null, acoba: false, extra: [] };
  for (const line of lines) {
    const m1 = /^Role, work or services:\s*(.*)$/i.exec(line);
    if (m1) { out.role = m1[1]; continue; }
    const m2 = /^Payer:\s*(.*)$/i.exec(line);
    if (m2) { out.payer = m2[1]; continue; }
    const m3 = /^From:\s*(.*?)\.?$/i.exec(line);
    if (m3) { out.startDate = m3[1]; continue; }
    if (/^ACOBA consulted:\s*yes/i.test(line)) { out.acoba = true; continue; }
    if (/^\(Registered/i.test(line)) continue; // drop registry footer
    if (/^Additional information:/i.test(line)) continue;
    out.extra.push(line);
  }
  return out;
}

// Parse a child payment string. We're after the £ amount, the
// received-on date, the hours, and the ultimate-payer override
// (some payments route through a bureau but pay out of another body).
type Payment = { amount: number | null; raw: string; receivedOn: string | null; hours: string | null; ultimatePayer: string | null };
function parsePayment(text: string): Payment {
  const out: Payment = { amount: null, raw: text, receivedOn: null, hours: null, ultimatePayer: null };
  const amt = /Payment:\s*£([\d,]+(?:\.\d+)?)/i.exec(text) || /Remuneration:\s*£([\d,]+(?:\.\d+)?)/i.exec(text);
  if (amt) out.amount = Number(amt[1].replace(/,/g, ''));
  const rec = /Received on:\s*([^.\n]+)/i.exec(text);
  if (rec) out.receivedOn = rec[1].trim();
  const hrs = /Hours:\s*([0-9.]+\s*(?:hrs?|hours?)?(?:\s*a\s*year)?)/i.exec(text);
  if (hrs) out.hours = hrs[1].trim();
  const ult = /Ultimate payer:\s*([^\n|]+)/i.exec(text);
  if (ult) out.ultimatePayer = ult[1].trim();
  return out;
}

async function getData() {
  const [{ data: summaries }, { data: interests }, { data: mps }] = await Promise.all([
    supabase
      .from('mp_outside_earnings_summary')
      .select('member_id, total_extracted, claim_count'),
    supabase
      .from('mp_registered_interests')
      .select('member_id, interest_text, child_interests')
      .ilike('category_name', 'Employment%'),
    supabase
      .from('mps')
      .select('member_id, display_name, name, constituency, party, party_colour')
      .eq('current_member', true),
  ]);

  const summaryByMember = new Map<number, Summary>(
    ((summaries as Summary[]) || []).map((s) => [s.member_id, s])
  );
  const mpByMember = new Map<number, MpRow>(
    ((mps as MpRow[]) || []).map((m) => [m.member_id, m])
  );

  // Group interests by member_id, only keep MPs that are current.
  const interestsByMember = new Map<number, InterestRow[]>();
  for (const row of (interests as InterestRow[]) || []) {
    if (!mpByMember.has(row.member_id)) continue;
    if (!interestsByMember.has(row.member_id)) interestsByMember.set(row.member_id, []);
    interestsByMember.get(row.member_id)!.push(row);
  }

  // Build display list: MPs with any employment-category interest,
  // ordered by mp_outside_earnings_summary.total_extracted desc.
  const memberIds = Array.from(interestsByMember.keys());
  memberIds.sort((a, b) => {
    const ta = summaryByMember.get(a)?.total_extracted || 0;
    const tb = summaryByMember.get(b)?.total_extracted || 0;
    return tb - ta;
  });

  const list = memberIds.map((id) => {
    const mp = mpByMember.get(id)!;
    const summary = summaryByMember.get(id);
    const rows = interestsByMember.get(id) || [];
    return {
      mp,
      total: Number(summary?.total_extracted) || 0,
      claimCount: summary?.claim_count || 0,
      rows,
    };
  });

  const partyTotals = new Map<string, { mps: number; total: number }>();
  for (const item of list) {
    const party = item.mp.party || 'Other';
    if (!partyTotals.has(party)) partyTotals.set(party, { mps: 0, total: 0 });
    const cell = partyTotals.get(party)!;
    cell.mps += 1;
    cell.total += item.total;
  }
  const partyList = Array.from(partyTotals.entries())
    .map(([party, v]) => ({ party, mps: v.mps, total: v.total }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = list.reduce((s, x) => s + x.total, 0);
  const grandClaims = list.reduce((s, x) => s + x.claimCount, 0);

  return { list, partyList, grandTotal, grandClaims };
}

export default async function SecondJobsPage() {
  const { list, partyList, grandTotal, grandClaims } = await getData();

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <article
        style={{
          background: `${PARCHMENT_CREAM} url('/bill-parchment.webp') center top / 100% auto repeat-y`,
          border: '1px solid rgba(26,20,14,0.3)',
          boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
          padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
          color: '#1a140e',
          fontFamily: SERIF,
        }}
      >
        <header
          style={{
            borderTop: `1.5px solid ${INK}`,
            borderBottom: `1.5px solid ${INK}`,
            padding: '14px 12px',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '12px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Register of Members’ Financial Interests
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            MPs with second jobs
          </h1>
        </header>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 'clamp(13px, 1.15vw, 14px)',
            lineHeight: 1.75,
            textAlign: 'justify',
            margin: '0 auto 28px',
            maxWidth: '46em',
            color: INK,
          }}
        >
          Every current MP whose Register of Members’ Financial Interests includes
          a paid employment outside Parliament: the role, the payer, the amounts and
          dates of each individual payment. The headline totals shown beside each MP
          are a conservative lower bound — only payments registered with an
          explicit £ figure are summed, so ongoing salaries declared without a
          per-payment amount, ranges (“£200 to £500”), and unbanded
          entries do not appear in the totals but the underlying roles do appear in
          the list.
        </p>

        {/* Headline stats trio */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <Stat label="MPs with second jobs" value={list.length.toString()} />
          <Stat label="Individual payments declared" value={grandClaims.toLocaleString('en-GB')} />
          <Stat label="Declared total (lower bound)" value={fmtMoney(grandTotal)} />
        </div>

        {/* Party breakdown */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
            By party
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontFamily: MONO, fontSize: '13px', borderTop: `1px solid ${INK_HAIRLINE}` }}>
            {partyList.map((p) => (
              <li key={p.party} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', padding: '8px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, alignItems: 'baseline' }}>
                <span style={{ color: INK }}>{p.party}</span>
                <span style={{ color: INK_SOFT, fontSize: '12px' }}>{p.mps} MP{p.mps === 1 ? '' : 's'}</span>
                <span style={{ color: INK, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(p.total)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Per-MP detail */}
        <section>
          <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 16px' }}>
            Every MP, every payment
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {list.map((item, idx) => {
              const partyColour = item.mp.party_colour ? '#' + item.mp.party_colour.replace('#', '') : '#7697a2';
              const name = item.mp.display_name || item.mp.name || '';
              return (
                <li
                  key={item.mp.member_id}
                  id={`mp-${item.mp.member_id}`}
                  style={{
                    borderTop: `2px solid ${INK}`,
                    paddingTop: '14px',
                    borderLeft: `4px solid ${partyColour}`,
                    paddingLeft: '14px',
                  }}
                >
                  <header style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '10px 18px', alignItems: 'baseline', marginBottom: '14px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, fontVariantNumeric: 'tabular-nums', width: '28px' }}>{idx + 1}.</span>
                    <div>
                      <a href={`/mps/${item.mp.member_id}#expenses`} style={{ color: INK, textDecoration: 'none', fontFamily: SERIF, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 600 }}>
                        {name}
                      </a>
                      <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginTop: '2px' }}>
                        {item.mp.party}{item.mp.constituency ? ` · ${item.mp.constituency}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: INK }}>
                        {fmtMoney(item.total)}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '4px' }}>
                        {item.claimCount} payment{item.claimCount === 1 ? '' : 's'} on record
                      </div>
                    </div>
                  </header>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {item.rows.map((row, ri) => {
                      const parsed = parseParent(row.interest_text);
                      const payments = (row.child_interests || []).map((c) => parsePayment(c.interest || ''));
                      const rowTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
                      return (
                        <li key={ri} style={{ borderLeft: `1px solid ${INK_HAIRLINE}`, paddingLeft: '12px' }}>
                          <div style={{ fontFamily: SERIF, fontSize: '15px', color: INK, marginBottom: '4px' }}>
                            {parsed.role || row.interest_text.slice(0, 80) + '…'}
                          </div>
                          {parsed.payer && (
                            <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginBottom: '4px' }}>
                              <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '10px', marginRight: '6px' }}>Payer</span>
                              {parsed.payer}
                            </div>
                          )}
                          {parsed.startDate && (
                            <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginBottom: '6px' }}>
                              <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '10px', marginRight: '6px' }}>From</span>
                              {parsed.startDate}
                            </div>
                          )}
                          {payments.length > 0 && (
                            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', borderTop: `1px dotted ${INK_HAIRLINE}` }}>
                              {payments.map((p, pi) => (
                                <li key={pi} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', padding: '6px 0', borderBottom: `1px dotted ${INK_HAIRLINE}`, alignItems: 'baseline', fontFamily: MONO, fontSize: '12px', color: INK }}>
                                  <div>
                                    {p.receivedOn ? <span>{p.receivedOn}</span> : null}
                                    {p.hours ? <span style={{ color: INK_SOFT, marginLeft: '8px' }}>· {p.hours}</span> : null}
                                    {p.ultimatePayer ? <div style={{ color: INK_SOFT, fontSize: '11px', marginTop: '2px' }}>Ultimate payer: {p.ultimatePayer}</div> : null}
                                  </div>
                                  <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    {p.amount != null ? fmtMoney(p.amount) : <span style={{ color: INK_SOFT, fontStyle: 'italic' }}>not specified</span>}
                                  </div>
                                </li>
                              ))}
                              {rowTotal > 0 && (
                                <li style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '6px 0', fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_SOFT }}>
                                  <span>Subtotal for this role</span>
                                  <span style={{ fontVariantNumeric: 'tabular-nums', color: INK, fontWeight: 600 }}>{fmtMoney(rowTotal)}</span>
                                </li>
                              )}
                            </ul>
                          )}
                          {payments.length === 0 && (
                            <p style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, fontStyle: 'italic', margin: '4px 0 0' }}>
                              Role registered without an itemised payment. Salaried or ongoing arrangement.
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '12px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Roles are taken from category “Employment and earnings”. Each
          MP’s headline total is the sum of explicit “Payment: £X”
          amounts found in the registered child entries. Ranges and salaried roles
          without a per-payment figure are not summed. Where an entry shows an
          “Ultimate payer” (e.g. a speaker bureau routing fees from another
          body), the underlying payer is shown. Last refresh of the local cache:
          {' '}see <code style={{ fontFamily: MONO }}>mp_outside_earnings_summary.updated_at</code>.
        </section>

        <ScrollToTopButton />
      </article>
    </DossierShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '14px 16px', background: 'rgba(255,247,228,0.5)' }}>
      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.22em', color: INK_SOFT, margin: '0 0 6px', fontWeight: 'bold', fontFamily: MONO }}>
        {label}
      </p>
      <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, letterSpacing: '-0.01em', color: INK, fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.1, fontFamily: SERIF }}>
        {value}
      </p>
    </div>
  );
}
