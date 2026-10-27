// /second-jobs — landing page. Rolls every current MP with declared
// outside earnings up to their party and renders a clickable grid;
// the per-MP detail (role, payer, every payment) lives at
// /second-jobs/[slug] so the landing stays scannable.

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { fmtMoney, fmtUpdated, loadLanding } from './_lib/data';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "UK MPs with Second Jobs, Outside Earnings by Party",
  description:
    "Every current UK MP with declared outside earnings from the Register of Members' Financial Interests, grouped by party. Hours worked, total declared, employer named.",
  alternates: { canonical: '/second-jobs' },
};

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

export default async function SecondJobsLanding() {
  const { partyTotals, grandTotal, grandClaims, totalMps, mpsWithPayments, summaryUpdated } = await loadLanding();
  const asOf = fmtUpdated(summaryUpdated);

  return (
    <OpenGovShell pageStamp="Second Jobs">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {/* No parchment card: content sits directly on the page, like the
          council, department and MP pages. */}
      <article
        style={{
          padding: 'clamp(15px, 2vw, 24px) 0',
          color: '#14100d',
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
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Register of Members’ Financial Interests
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            MPs with second jobs
          </h1>
        </header>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 'clamp(15px, 1.15vw, 15px)',
            lineHeight: 1.75,
            margin: '0 auto 28px',
            maxWidth: '46em',
            color: INK,
          }}
        >
          Every current MP with a paid employment outside Parliament, organised
          by party. Choose a party to see each MP, the role, the payer and every
          individual payment registered. Headline totals are a conservative lower
          bound: only one-off payments with an explicit £ figure are summed. Regular
          pay (an amount a month, a quarter or a year), ranges and roles without
          amounts are not in the totals, but are in the underlying lists.
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
          <Stat label="MPs with paid outside roles" value={totalMps.toString()} />
          <Stat label="Payments with a £ figure" value={grandClaims.toLocaleString('en-GB')} />
          <Stat label="Total of those payments (lower bound)" value={fmtMoney(grandTotal)} />
        </div>
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '-18px 0 28px', maxWidth: '46em' }}>
          What these count: <strong>MPs with paid outside roles</strong> is every current MP with at least one entry under “Employment and earnings” in the current Register (roles that have ended are not counted). {mpsWithPayments} of them have at least one payment registered with a £ figure; the rest declare a role, salary or range without itemised payments. <strong>Payments with a £ figure</strong> and the <strong>total</strong> add up only those itemised payments in current entries, so the total is a lower bound.{asOf ? ` Figures as of ${asOf}.` : ''}
        </p>

        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          By party · click through for detail
        </h2>

        {/* Party list: plain rows on the folder (no cards), separated by
            hairlines, with a light tint on hover. */}
        <style>{`
          .pca-party-tile {
            display: block;
            padding: 14px 4px 16px;
            color: ${INK};
            text-decoration: none;
            font-family: ${SERIF};
            border-bottom: 1px solid ${INK_HAIRLINE};
            transition: background 150ms ease;
          }
          .pca-party-tile:hover { background: rgba(122,22,18,0.06); }
          .pca-party-tile .pca-tile-head {
            font-family: ${MONO};
            font-size: 15px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: ${INK_SOFT};
            margin: 0 0 6px;
          }
        `}</style>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            columnGap: '28px',
            borderTop: `1px solid ${INK_HAIRLINE}`,
          }}
        >
          {partyTotals.map((p) => (
            <Link
              key={p.slug}
              href={`/second-jobs/${p.slug}`}
              className="no-hover-scale pca-party-tile"
            >
              <div className="pca-tile-head">
                {p.mps} MP{p.mps === 1 ? '' : 's'}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 600, marginBottom: '6px', lineHeight: 1.2 }}>
                {p.label} <span >→</span>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: INK }}>
                {fmtMoney(p.total)}
              </div>
              {p.topMp && (
                <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, marginTop: '8px', letterSpacing: '0.04em' }}>
                  Top earner: {p.topMp.name} · {fmtMoney(p.topMp.total)}
                </div>
              )}
            </Link>
          ))}
        </div>

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '15px', color: INK_SOFT, lineHeight: 1.7 }}>
          <strong style={{ color: INK }}>Methodology.</strong> Drawn from the Members’
          Register of Financial Interests (members-api.parliament.uk) for current MPs
          only. Roles are taken from category “1. Employment and earnings”.
          Only entries in the current Register are used; roles that have ended are
          left out. Each MP’s headline total is the sum of one-off “Payment: £X”
          amounts in the registered payment entries. Regular pay (an amount a month, a
          quarter or a year) is listed separately on each MP’s page with its period and is
          not added to the total or to other rates. Ranges and roles without a figure are
          not summed. Totals are rebuilt every night from the latest Register.
        </section>

      </article>
    </OpenGovShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: `2px solid ${INK}`, padding: '10px 0 4px' }}>
      <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', color: INK_SOFT, margin: '0 0 6px', fontWeight: 'bold', fontFamily: MONO }}>
        {label}
      </p>
      <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, letterSpacing: '-0.01em', color: INK, fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.1, fontFamily: SERIF }}>
        {value}
      </p>
    </div>
  );
}
