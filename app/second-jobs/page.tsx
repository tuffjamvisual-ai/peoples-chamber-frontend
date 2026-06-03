// /second-jobs — landing page. Rolls every current MP with declared
// outside earnings up to their party and renders a clickable grid;
// the per-MP detail (role, payer, every payment) lives at
// /second-jobs/[slug] so the landing stays scannable.

import type { Metadata } from 'next';
import Link from 'next/link';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { fmtMoney, loadAll } from './_lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'MPs with second jobs',
  description:
    'Every current MP with declared outside earnings from the Register of Members’ Financial Interests, organised by party.',
  alternates: { canonical: '/second-jobs' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const PARCHMENT_CREAM = '#efe6d2';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

export default async function SecondJobsLanding() {
  const { partyTotals, grandTotal, grandClaims, totalMps } = await loadAll();

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
          Every current MP with a paid employment outside Parliament, organised
          by party. Choose a party to see each MP, the role, the payer and every
          individual payment registered. Headline totals are a conservative lower
          bound — only payments with an explicit £ figure are summed, so
          ranges and salaried roles without per-payment amounts are not in the
          numbers but are in the underlying lists.
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
          <Stat label="MPs with second jobs" value={totalMps.toString()} />
          <Stat label="Individual payments declared" value={grandClaims.toLocaleString('en-GB')} />
          <Stat label="Declared total (lower bound)" value={fmtMoney(grandTotal)} />
        </div>

        <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          By party · click through for detail
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
          }}
        >
          {partyTotals.map((p) => (
            <Link
              key={p.slug}
              href={`/second-jobs/${p.slug}`}
              className="no-hover-scale"
              style={{
                display: 'block',
                padding: '16px 18px',
                background: 'rgba(255,247,228,0.5)',
                border: `1px solid ${INK_HAIRLINE}`,
                borderLeft: `4px solid ${ACCENT}`,
                color: INK,
                textDecoration: 'none',
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.22em', color: INK_SOFT, marginBottom: '6px' }}>
                {p.mps} MP{p.mps === 1 ? '' : 's'}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 600, marginBottom: '6px' }}>
                {p.label} <span style={{ opacity: 0.55 }}>→</span>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: INK }}>
                {fmtMoney(p.total)}
              </div>
              {p.topMp && (
                <div style={{ fontFamily: MONO, fontSize: '11px', color: INK_SOFT, marginTop: '6px' }}>
                  Top earner: {p.topMp.name} · {fmtMoney(p.topMp.total)}
                </div>
              )}
            </Link>
          ))}
        </div>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '12px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Roles are taken from category “1. Employment and earnings”.
          Each MP’s headline total is the sum of explicit “Payment: £X”
          amounts found in the registered child entries. Ranges and salaried roles
          without a per-payment figure are not summed.
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
