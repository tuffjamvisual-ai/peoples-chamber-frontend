import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: "Top-Charging UK Councils 2026-27 — Band D Council Tax Rankings",
  description:
    "The ten UK local authorities with the highest Band D council tax for the 2026-27 financial year. Source: MHCLG council tax statistics. Ranking by authority-level Band D figure.",
  alternates: { canonical: '/council-tax' },
};

// Render on demand. Same rationale as /expenses — Vercel's 3-worker
// build saturates Supabase if every dynamic page tries to prerender
// concurrently.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const YEAR_LABEL = '2026 / 2027';

// Feature essay rendered below the Top 10 list. Same blank-line
// paragraph convention as /expenses; no em-dashes per site rule.
const FEATURE_TITLE = 'The Frozen Bill That Holds Up Local Government';
const FEATURE_BODY = `Council tax is a property tax based on what a home was worth on 1 April 1991. The valuation was supposed to be temporary. Thirty-five years later it is still the legal basis for the bill that lands on every household in England, Scotland and Wales.

No revaluation has been done in England or Scotland since the system began. Wales attempted one in 2003. Northern Ireland uses a different rateable-value system. Two houses on the same street, built the same decade, in the same band, can be worth very different amounts now and still pay the same bill. Two streets in different councils can have similar housing stock and very different bills.

The most expensive Band D in 2026 to 2027 is Gateshead at £2,396. Wandsworth, an inner London borough, charges £518. The gap is more than four times. Inner London boroughs, which contain some of the wealthiest streets in the country, sit at the bottom of the table because their tax base is so large the precept per household stays low. Metropolitan boroughs in the North East and West Midlands, which contain some of the most deprived, sit at the top because their tax base is small and central government grant has fallen.

A district council in a shire area is the billing authority but collects for the county council, the police and crime commissioner, the fire authority and any parish council. The district's own slice of the bill might be £150. The county council's slice can exceed £1,500. Police precepts have risen sharply over the last decade. Fire precepts are roughly flat. Parish precepts can add a pound or several hundred pounds.

Unitary authorities, metropolitan boroughs and London boroughs have no county tier above them. The headline figure absorbs that function. Every council in the top ten is a single-tier authority. They charge the full Band D because they deliver the full range of services.

Since 2018 the cap has been a 2.99 per cent annual increase plus a 2 per cent adult social care precept for upper-tier authorities, totalling roughly 4.99 per cent a year without triggering a referendum. Most councils take the full amount every year. Several in this top ten have applied to Westminster for permission to exceed it because they are in financial distress.

Eight English councils have issued Section 114 notices since 2018: Birmingham, Nottingham, Croydon, Slough, Thurrock, Northamptonshire, Hackney and Woking. A Section 114 is the technical equivalent of declaring the council unable to balance its books. The list crosses Labour, Conservative and independent administrations and includes areas that look affluent on paper. The common factor is the gap between rising statutory service costs and falling central government grant.

Most of the pressure comes from adult social care. Demand is growing as the population ages. Statutory duties require councils to provide care to anyone who meets a financial and clinical threshold. Costs have risen faster than the cap allows the tax to rise. The 2 per cent precept was added to address this and has not closed the gap.

A council could in principle charge less. Few do, because most spending is not theirs to choose. Statutory adult social care is owed to anyone who qualifies, and the cost falls on the council whether the cap moves or not.

Westminster City Council charges £538 at Band D against Gateshead's £2,396. The Westminster tax base is still enormous. The central government grant followed that pattern from the start. None of it has been adjusted for thirty-five years of demographic change.

Council tax replaced the poll tax in 1992 as a transitional measure. It has stayed in place because revaluation creates losers as well as winners. No government has wanted the losers' reaction. Wales revalued in 2003 and few in Wales remember it fondly.

The top ten therefore mixes housing wealth in 1991 with service pressure in 2026. The two do not line up. The councils at the top are not the councils with the most valuable houses; they are the councils whose statutory bills have grown fastest while their central grant has shrunk.`;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '£0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type CouncilRow = {
  slug: string;
  name: string;
  short_name: string | null;
  type_label: string;
  country: string;
  council_tax_band_d_pounds: number;
};

export default async function CouncilTaxPage() {
  const { data } = await supabase
    .from('councils')
    .select('slug, name, short_name, type_label, country, council_tax_band_d_pounds')
    .not('council_tax_band_d_pounds', 'is', null)
    .order('council_tax_band_d_pounds', { ascending: false, nullsFirst: false })
    .limit(10);

  const top = (data as CouncilRow[]) || [];
  const grandTotal = top.reduce((s, c) => s + (c.council_tax_band_d_pounds || 0), 0);
  const avg = top.length ? Math.round(grandTotal / top.length) : 0;

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p
          style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          The People&rsquo;s Chamber · Council Tax
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          Top 10 highest charging councils {YEAR_LABEL}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginBottom: '20px' }}>
          Ranked by Band D council tax set by the local authority for the 2026&ndash;27 financial year. Source: MHCLG.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <Stat label="Top 10 combined" value={fmtMoney(grandTotal)} />
          <Stat label="Average" value={fmtMoney(avg)} />
          <Stat label="Year" value={YEAR_LABEL} />
        </div>
      </header>

      <style>{`
        .pca-row { transition: background-color 140ms ease; }
        .pca-row:hover { background: rgba(122,22,18,0.08); }
        .pca-row:hover [data-pca-leader] { border-bottom-color: rgba(122,22,18,0.55); }
      `}</style>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          borderTop: `2px solid ${INK}`,
          borderBottom: `2px solid ${INK}`,
          columnCount: 2,
          columnGap: '32px',
          columnRule: `1px solid ${INK_HAIRLINE}`,
          columnFill: 'balance',
        }}
      >
        {top.map((c, i) => (
          <SimpleRow
            key={c.slug}
            rank={i + 1}
            amount={c.council_tax_band_d_pounds}
            slug={c.slug}
            name={c.short_name || c.name}
            subtitle={c.type_label}
          />
        ))}
      </ol>

      <p style={{ marginTop: '32px', fontSize: '13px', color: INK_SOFT, lineHeight: 1.7 }}>
        Figures shown are the authority-level Band D charge for the 2026&ndash;27 financial year, as
        published by the Ministry of Housing, Communities and Local Government. They do not include
        the adult social care precept, parish precepts, or precepts from police and fire authorities,
        which are added on top by the billing authority. Full council profile and per-council
        finance figures are linked from each row.
      </p>

      <section style={{ marginTop: '40px', borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`, padding: '24px 0' }}>
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: ACCENT,
            textAlign: 'center',
          }}
        >
          Feature · Analysis
        </p>
        <h2
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
            fontSize: 'clamp(20px, 2.4vw, 28px)',
            fontWeight: 'bold',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            marginBottom: '20px',
            textAlign: 'center',
            color: INK,
          }}
        >
          {FEATURE_TITLE}
        </h2>
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '14px',
            lineHeight: 1.7,
            color: INK,
            columnCount: 2,
            columnGap: '28px',
            columnRule: `1px solid ${INK_HAIRLINE}`,
            columnFill: 'balance',
            textAlign: 'justify',
            hyphens: 'auto',
          }}
        >
          {FEATURE_BODY
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p
                key={i}
                style={{
                  margin: '0 0 0.9em 0',
                  breakInside: 'avoid-column',
                  pageBreakInside: 'avoid',
                }}
              >
                {p}
              </p>
            ))}
        </div>
      </section>

      <ScrollToTopButton />
    </DossierShell>
  );
}

// Newspaper-classified row — rank, small-caps council name, dot leader,
// amount, then a discreet 'Full profile' ref linking to the council
// page. Same layout as the MP expenses row at /expenses.
function SimpleRow({
  rank,
  amount,
  slug,
  name,
  subtitle,
}: {
  rank: number;
  amount: number | null;
  slug: string;
  name: string;
  subtitle: string;
}) {
  return (
    <li
      className="pca-row"
      style={{
        listStyle: 'none',
        borderBottom: `1px solid ${INK_HAIRLINE}`,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        position: 'relative',
        display: 'flex',
        alignItems: 'baseline',
        gap: '6px',
        padding: '7px 4px',
        color: INK,
        fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
      }}
    >
      <Link
        href={`/councils/${slug}`}
        aria-label={`${name} council profile`}
        className="no-hover-scale"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'block',
          cursor: 'pointer',
          zIndex: 2,
          textDecoration: 'none',
        }}
      >
        <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          {name} council profile
        </span>
      </Link>
      <span
        style={{
          fontSize: '13px',
          fontVariantNumeric: 'tabular-nums',
          color: INK_SOFT,
          width: '18px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {rank}.
      </span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          fontVariant: 'small-caps',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
        <span
          style={{
            fontSize: '9px',
            fontFamily: 'Special Elite, monospace',
            color: INK_SOFT,
            letterSpacing: '0.1em',
            marginLeft: '6px',
            textTransform: 'uppercase',
          }}
        >
          {subtitle}
        </span>
      </span>
      <span
        aria-hidden
        data-pca-leader
        style={{
          flex: '1 1 auto',
          alignSelf: 'flex-end',
          height: '1px',
          borderBottom: `1px dotted ${INK_SOFT}`,
          transform: 'translateY(-4px)',
          minWidth: '10px',
        }}
      />
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtMoney(amount)}
      </span>
      <span
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: ACCENT,
          paddingBottom: '1px',
          marginLeft: '5px',
          whiteSpace: 'nowrap',
        }}
      >
        Profile →
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${INK_HAIRLINE}`,
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: INK_SOFT,
          margin: '0 0 6px',
          fontWeight: 'bold',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '-0.01em',
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
