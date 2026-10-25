// /second-jobs/[slug]/[memberId] — single MP's second-jobs detail.
// Reached from the party MP list. Shows the MP header + every
// registered role with payer, start date and itemised payment lines
// (date + hours + amount + ultimate-payer override).

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import { fmtAmount, fmtMoney, isOneOff, loadMember, parseParent, parsePayment, slugToLabel } from '../../_lib/data';
import { displayMpName } from '@/lib/mp-name';

export function generateStaticParams() { return []; }
export const revalidate = 86400;

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; memberId: string }> }): Promise<Metadata> {
  const { slug, memberId } = await params;
  const item = Number.isFinite(Number(memberId)) ? await loadMember(slug, Number(memberId)) : null;
  const name = displayMpName(item?.mp.display_name || item?.mp.name) || 'MP';
  return {
    title: `${name}, second jobs`,
    description: `${name}: declared outside earnings, roles, payers and individual payments from the Register of Members’ Financial Interests.`,
    alternates: { canonical: `/second-jobs/${slug}/${memberId}` },
    // Not indexed when there is no money to show: no one-off payment and no regular pay with a £ figure
    // (owner's approval, 23 Oct 2026). Pages with either stay indexed.
    ...(item && item.total === 0 && item.claimCount === 0 && item.regularPay.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function MpSecondJobsDetail({ params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params;
  const memberIdNum = Number(memberId);
  if (!Number.isFinite(memberIdNum)) notFound();

  const item = await loadMember(slug, memberIdNum);
  if (!item) notFound();

  const label = slugToLabel(slug);
  const name = displayMpName(item.mp.display_name || item.mp.name || '');
  const partyColour = item.mp.party_colour ? '#' + item.mp.party_colour.replace('#', '') : '#7697a2';

  return (
    <OpenGovShell pageStamp="Second Jobs">
      <BackLink
        fallbackHref={`/second-jobs/${slug}`}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {/* No parchment card: content sits directly on the page, like the
          council, department and MP pages. */}
      <article
        style={{
          padding: 'clamp(8px, 2vw, 24px) 0',
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
            borderLeft: `4px solid ${partyColour}`,
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Second Jobs · {label}{item.mp.constituency ? ` · ${item.mp.constituency}` : ''}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {name}
          </h1>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', color: INK_SOFT }}>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '15px' }}>{fmtMoney(item.total)}</span> · Declared total</span>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '15px' }}>{item.claimCount}</span> · Payments with a £ figure</span>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '15px' }}>{item.rows.length}</span> · Role{item.rows.length === 1 ? '' : 's'} registered</span>
          </div>
          {/* Rates, each with its period and payer, listed apart from the one-off total and never added to it;
              ones whose end date has passed are listed as past regular pay. */}
          {([['Regular pay declared', item.regularPay.filter((r) => !r.ended)], ['Past regular pay', item.regularPay.filter((r) => r.ended)]] as const).map(([heading, list]) =>
            list.length > 0 && (
              <div key={heading} style={{ marginTop: '12px', fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.18em' }}>{heading} · </span>
                <span style={{ color: INK }}>
                  {list.map((r) => `${fmtAmount(r)}${r.payer ? ` (${r.payer})` : ''}`).join('; ')}
                </span>
              </div>
            ))}
        </header>

        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 16px' }}>
          Every registered role and payment
        </h2>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {item.rows.map((row, ri) => {
            const parsed = parseParent(row.interest_text);
            const payments = (row.child_interests || []).map((c) => parsePayment(c.interest || '', row.interest_text));
            // One-off "Payment: £X" amounts only; rates are shown with their period and never added up.
            const rowTotal = payments.reduce((s, p) => s + (isOneOff(p) ? (p.amount as number) : 0), 0);
            return (
              <li key={ri} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '14px' }}>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 1.7vw, 19px)', fontWeight: 600, color: INK, marginBottom: '6px' }}>
                  {parsed.role || row.interest_text.split('\n')[0].slice(0, 100)}
                </div>
                {parsed.payer && (
                  <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, marginBottom: '4px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '15px', marginRight: '6px' }}>Payer</span>
                    {parsed.payer}
                  </div>
                )}
                {parsed.startDate && (
                  <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, marginBottom: '6px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '15px', marginRight: '6px' }}>From</span>
                    {parsed.startDate}
                  </div>
                )}
                {parsed.acoba && (
                  <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, marginBottom: '6px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '15px', marginRight: '6px' }}>ACOBA</span>
                    Consulted
                  </div>
                )}
                {payments.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', borderTop: `1px dotted ${INK_HAIRLINE}` }}>
                    {payments.map((p, pi) => (
                      <li key={pi} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', padding: '8px 0', borderBottom: `1px dotted ${INK_HAIRLINE}`, alignItems: 'baseline', fontFamily: MONO, fontSize: '15px', color: INK }}>
                        <div>
                          {p.receivedOn && <span>{p.receivedOn}</span>}
                          {p.hours && <span style={{ color: INK_SOFT, marginLeft: '8px' }}>· {p.hours}</span>}
                          {p.ultimatePayer && (
                            <div style={{ color: INK_SOFT, fontSize: '15px', marginTop: '2px' }}>
                              Ultimate payer: {p.ultimatePayer}
                            </div>
                          )}
                        </div>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {p.amount != null ? fmtAmount(p) : <span style={{ color: INK_SOFT, fontStyle: 'italic' }}>not specified</span>}
                        </div>
                      </li>
                    ))}
                    {rowTotal > 0 && (
                      <li style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '8px 0', fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_SOFT }}>
                        <span>One-off payments for this role</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: INK, fontWeight: 700 }}>{fmtMoney(rowTotal)}</span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, fontStyle: 'italic', margin: '6px 0 0' }}>
                    Role registered without an itemised payment. Salaried or ongoing arrangement.
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '15px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. The declared total is the sum of one-off “Payment: £X” amounts in
          registered payment entries. Regular pay (an amount a month, a quarter or a year)
          is listed separately with its period and is not added to the total or to other
          rates. Regular pay whose end date has passed is listed as past regular pay, and pay the
          Register records as going to a charity is marked “donated to charity”. Ranges and roles
          without a figure are not summed, but every role appears above.
        </section>

        <div style={{ marginTop: '20px', fontFamily: MONO, fontSize: '15px' }}>
          <a href={`/mps/${item.mp.member_id}#expenses`} style={{ color: ACCENT, textDecoration: 'none', borderBottom: `1px solid ${ACCENT}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            See {name}&rsquo;s full bio &amp; expenses →
          </a>
        </div>

      </article>
    </OpenGovShell>
  );
}
