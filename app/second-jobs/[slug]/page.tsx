// /second-jobs/[slug] — list of MPs in this party who have declared
// outside earnings. Just names, constituencies and totals; each row
// links through to /second-jobs/[slug]/[memberId] for the full
// role-by-role detail.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import { fmtMoney, loadAll, slugToLabel } from '../_lib/data';

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
    description: `Every ${label} MP with declared outside earnings — click through for each MP's full payment breakdown.`,
    alternates: { canonical: `/second-jobs/${slug}` },
  };
}

export default async function PartySecondJobsList({ params }: { params: Promise<{ slug: string }> }) {
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
          <Stat label="MPs with second jobs" value={items.length.toString()} />
          <Stat label="Individual payments declared" value={partyClaims.toLocaleString('en-GB')} />
          <Stat label="Party total (lower bound)" value={fmtMoney(partyTotal)} />
        </div>

        <h2 style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 16px' }}>
          Click an MP for their full payment breakdown
        </h2>

        {/* Ruled top + bottom, list of MPs each as a whole-row Link */}
        <style>{`
          .pca-sj-row { transition: background-color 140ms ease; }
          .pca-sj-row:hover { background: rgba(122,22,18,0.08); }
          .pca-sj-row:hover [data-pca-leader] { border-bottom-color: rgba(122,22,18,0.55); }
        `}</style>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            borderTop: `2px solid ${INK}`,
            borderBottom: `2px solid ${INK}`,
          }}
        >
          {items.map((item, idx) => {
            const partyColour = item.mp.party_colour ? '#' + item.mp.party_colour.replace('#', '') : '#7697a2';
            const name = item.mp.display_name || item.mp.name || '';
            return (
              <li
                key={item.mp.member_id}
                className="pca-sj-row"
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: '14px',
                  alignItems: 'baseline',
                  padding: '12px 12px 12px 14px',
                  borderBottom: `1px solid ${INK_HAIRLINE}`,
                  borderLeft: `3px solid ${partyColour}`,
                }}
              >
                <Link
                  href={`/second-jobs/${slug}/${item.mp.member_id}`}
                  aria-label={`${name} second jobs detail`}
                  className="no-hover-scale"
                  style={{
                    position: 'absolute',
                    top: 0, right: 0, bottom: 0, left: 0,
                    display: 'block',
                    cursor: 'pointer',
                    zIndex: 2,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
                    {name} second jobs detail
                  </span>
                </Link>

                <span style={{ fontFamily: MONO, fontSize: '13px', color: INK_SOFT, fontVariantNumeric: 'tabular-nums', width: '28px', textAlign: 'right' }}>
                  {idx + 1}.
                </span>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 1.8vw, 19px)', fontWeight: 600, color: INK, lineHeight: 1.2 }}>
                    {name}
                  </div>
                  {item.mp.constituency && (
                    <div style={{ fontFamily: MONO, fontSize: '12px', color: INK_SOFT, marginTop: '2px' }}>
                      {item.mp.constituency}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 'clamp(15px, 1.7vw, 18px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: INK }}>
                    {fmtMoney(item.total)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '2px' }}>
                    {item.claimCount} payment{item.claimCount === 1 ? '' : 's'}
                  </div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, whiteSpace: 'nowrap' }}>
                  Detail →
                </span>
              </li>
            );
          })}
        </ol>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '12px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Totals are the sum of explicit “Payment: £X” amounts in
          registered child entries. Ranges and salaried roles without a per-payment
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
      <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.22em', color: INK_SOFT, margin: '0 0 6px', fontWeight: 'bold', fontFamily: MONO }}>
        {label}
      </p>
      <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, letterSpacing: '-0.01em', color: INK, fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.1, fontFamily: SERIF }}>
        {value}
      </p>
    </div>
  );
}
