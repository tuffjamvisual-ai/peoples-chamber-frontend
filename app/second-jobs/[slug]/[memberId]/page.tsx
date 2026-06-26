// /second-jobs/[slug]/[memberId] — single MP's second-jobs detail.
// Reached from the party MP list. Shows the MP header + every
// registered role with payer, start date and itemised payment lines
// (date + hours + amount + ultimate-payer override).

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import { fmtMoney, loadAll, parseParent, parsePayment, slugToLabel } from '../../_lib/data';

export function generateStaticParams() { return []; }
export const revalidate = 86400;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const PARCHMENT_CREAM = '#efe6d2';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; memberId: string }> }): Promise<Metadata> {
  const { slug, memberId } = await params;
  const { bySlug } = await loadAll();
  const items = bySlug.get(slug) || [];
  const item = items.find((i) => i.mp.member_id === Number(memberId));
  const name = item?.mp.display_name || item?.mp.name || 'MP';
  return {
    title: `${name}, second jobs`,
    description: `${name}: declared outside earnings, roles, payers and individual payments from the Register of Members’ Financial Interests.`,
    alternates: { canonical: `/second-jobs/${slug}/${memberId}` },
  };
}

export default async function MpSecondJobsDetail({ params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params;
  const memberIdNum = Number(memberId);
  if (!Number.isFinite(memberIdNum)) notFound();

  const { bySlug } = await loadAll();
  const items = bySlug.get(slug);
  if (!items || items.length === 0) notFound();
  const item = items.find((i) => i.mp.member_id === memberIdNum);
  if (!item) notFound();

  const label = slugToLabel(slug);
  const name = item.mp.display_name || item.mp.name || '';
  const partyColour = item.mp.party_colour ? '#' + item.mp.party_colour.replace('#', '') : '#7697a2';

  return (
    <OpenGovShell pageStamp="Second Jobs">
      <BackLink
        fallbackHref={`/second-jobs/${slug}`}
        label="← Back"
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
            borderLeft: `4px solid ${partyColour}`,
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '12px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Second Jobs · {label}{item.mp.constituency ? ` · ${item.mp.constituency}` : ''}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {name}
          </h1>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontFamily: MONO, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', color: INK_SOFT }}>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '14px' }}>{fmtMoney(item.total)}</span> · Declared total</span>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '14px' }}>{item.claimCount}</span> · Payments on record</span>
            <span><span style={{ color: INK, fontWeight: 700, fontSize: '14px' }}>{item.rows.length}</span> · Role{item.rows.length === 1 ? '' : 's'} registered</span>
          </div>
        </header>

        <h2 style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 16px' }}>
          Every registered role and payment
        </h2>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {item.rows.map((row, ri) => {
            const parsed = parseParent(row.interest_text);
            const payments = (row.child_interests || []).map((c) => parsePayment(c.interest || ''));
            const rowTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
            return (
              <li key={ri} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '14px' }}>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 1.7vw, 19px)', fontWeight: 600, color: INK, marginBottom: '6px' }}>
                  {parsed.role || row.interest_text.split('\n')[0].slice(0, 100)}
                </div>
                {parsed.payer && (
                  <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginBottom: '4px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', marginRight: '6px' }}>Payer</span>
                    {parsed.payer}
                  </div>
                )}
                {parsed.startDate && (
                  <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginBottom: '6px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', marginRight: '6px' }}>From</span>
                    {parsed.startDate}
                  </div>
                )}
                {parsed.acoba && (
                  <div style={{ fontFamily: MONO, fontSize: '13px', color: INK_SOFT, marginBottom: '6px' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', marginRight: '6px' }}>ACOBA</span>
                    Consulted
                  </div>
                )}
                {payments.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', borderTop: `1px dotted ${INK_HAIRLINE}` }}>
                    {payments.map((p, pi) => (
                      <li key={pi} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', padding: '8px 0', borderBottom: `1px dotted ${INK_HAIRLINE}`, alignItems: 'baseline', fontFamily: MONO, fontSize: '12px', color: INK }}>
                        <div>
                          {p.receivedOn && <span>{p.receivedOn}</span>}
                          {p.hours && <span style={{ color: INK_SOFT, marginLeft: '8px' }}>· {p.hours}</span>}
                          {p.ultimatePayer && (
                            <div style={{ color: INK_SOFT, fontSize: '13px', marginTop: '2px' }}>
                              Ultimate payer: {p.ultimatePayer}
                            </div>
                          )}
                        </div>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {p.amount != null ? fmtMoney(p.amount) : <span style={{ color: INK_SOFT, fontStyle: 'italic' }}>not specified</span>}
                        </div>
                      </li>
                    ))}
                    {rowTotal > 0 && (
                      <li style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '8px 0', fontFamily: MONO, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_SOFT }}>
                        <span>Subtotal for this role</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: INK, fontWeight: 700 }}>{fmtMoney(rowTotal)}</span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, fontStyle: 'italic', margin: '6px 0 0' }}>
                    Role registered without an itemised payment. Salaried or ongoing arrangement.
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '12px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Totals are the sum of explicit “Payment: £X” amounts in
          registered child entries. Ranges and salaried roles without a per-payment
          figure are not summed but the underlying roles still appear above.
        </section>

        <div style={{ marginTop: '20px', fontFamily: MONO, fontSize: '12px' }}>
          <a href={`/mps/${item.mp.member_id}#expenses`} style={{ color: ACCENT, textDecoration: 'none', borderBottom: `1px solid ${ACCENT}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            See {name}&rsquo;s full bio &amp; expenses →
          </a>
        </div>

        <ScrollToTopButton />
      </article>
    </OpenGovShell>
  );
}
