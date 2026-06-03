// /second-jobs/[slug] — per-party detail. Every MP in that party
// with declared outside earnings, their roles, payers and each
// itemised payment. Reached from the /second-jobs landing tile.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import { fmtMoney, loadAll, parseParent, parsePayment, slugToLabel } from '../_lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const PARCHMENT_CREAM = '#efe6d2';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = slugToLabel(slug);
  return {
    title: `${label} MPs with second jobs`,
    description: `Every ${label} MP with declared outside earnings: roles, payers, individual payments.`,
    alternates: { canonical: `/second-jobs/${slug}` },
  };
}

export default async function PartySecondJobs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { bySlug } = await loadAll();
  const items = bySlug.get(slug);
  if (!items || items.length === 0) notFound();

  const label = slugToLabel(slug);
  const partyTotal = items.reduce((s, i) => s + i.total, 0);
  const partyClaims = items.reduce((s, i) => s + i.claimCount, 0);

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/second-jobs"
        label="← All parties"
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
            Register of Members’ Financial Interests · {label}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {label} MPs with second jobs
          </h1>
        </header>

        {/* Party headline trio */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <Stat label={`${label} MPs with second jobs`} value={items.length.toString()} />
          <Stat label="Individual payments declared" value={partyClaims.toLocaleString('en-GB')} />
          <Stat label="Party total (lower bound)" value={fmtMoney(partyTotal)} />
        </div>

        <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 16px' }}>
          Every {label} MP, every payment
        </h2>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {items.map((item, idx) => {
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
                      {item.mp.constituency || ''}
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

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '12px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Headline totals are the sum of explicit “Payment: £X” amounts
          in registered child entries. Ranges and salaried roles without a per-payment
          figure are not summed.
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
