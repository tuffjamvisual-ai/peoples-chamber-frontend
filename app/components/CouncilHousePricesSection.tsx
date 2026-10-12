// "House prices" section for council pages (server component). Reads
// council_house_prices — HM Land Registry UK House Price Index; see
// scripts/migrations/2026-10-11h-council-house-prices.sql.
//
// Every council with a published series (including county councils, which
// have their own HPI figures) is read by its own code. Isles of Scilly has
// no series (too few sales), so it gets a one-line note instead.
//
// The trend is a single-series bar chart (one ink colour, no legend), one
// bar per year using the same calendar month as the latest figure, each bar
// carrying a native tooltip, with the same figures in a table under
// "Yearly figures".

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

const ISLES_OF_SCILLY = 'E06000053';

type Row = {
  month: string;
  average_price: number | null;
  change_1m_pct: number | null;
  change_12m_pct: number | null;
  sales_volume: number | null;
  detached_price: number | null;
  detached_12m_pct: number | null;
  semi_detached_price: number | null;
  semi_detached_12m_pct: number | null;
  terraced_price: number | null;
  terraced_12m_pct: number | null;
  flat_price: number | null;
  flat_12m_pct: number | null;
  ftb_price: number | null;
  ftb_12m_pct: number | null;
  foo_price: number | null;
  foo_12m_pct: number | null;
  cash_price: number | null;
  cash_12m_pct: number | null;
  mortgage_price: number | null;
  mortgage_12m_pct: number | null;
  release_tag: string;
};

const SELECT = 'month, average_price, change_1m_pct, change_12m_pct, sales_volume, detached_price, detached_12m_pct, semi_detached_price, semi_detached_12m_pct, terraced_price, terraced_12m_pct, flat_price, flat_12m_pct, ftb_price, ftb_12m_pct, foo_price, foo_12m_pct, cash_price, cash_12m_pct, mortgage_price, mortgage_12m_pct, release_tag';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMonth = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const fmtPrice = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const fmtChange = (p: number | null) => (p == null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}%`);

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        House prices
      </h2>
      {children}
    </section>
  );
}

export default async function CouncilHousePricesSection({ gssCode }: { gssCode: string | null }) {
  if (!gssCode) return null;

  // A council has at most ~380 monthly rows (Jan 1995 onwards), under
  // PostgREST's 1,000-row cap.
  const { data } = await supabase
    .from('council_house_prices')
    .select(SELECT)
    .eq('council_gss_code', gssCode)
    .order('month', { ascending: true })
    .limit(1000);
  const rows = ((data ?? []) as Row[]).map((r) => {
    const out = { ...r } as Record<string, unknown>;
    for (const [k, v] of Object.entries(r)) if (k !== 'month' && k !== 'release_tag' && v != null) out[k] = Number(v);
    return out as Row;
  });

  if (rows.length === 0) {
    if (gssCode !== ISLES_OF_SCILLY) return null;
    return (
      <Section>
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>
          HM Land Registry does not publish house price figures for the Isles of Scilly because too few homes are sold there each month.
        </p>
      </Section>
    );
  }

  const priced = rows.filter((r) => r.average_price != null);
  if (priced.length === 0) return null;
  const latest = priced[priced.length - 1];
  const latestSales = [...rows].reverse().find((r) => r.sales_volume != null) ?? null;

  // One bar per year, same calendar month as the latest figure.
  const mm = latest.month.slice(5, 7);
  const trend = priced.filter((r) => r.month.slice(5, 7) === mm).map((r) => ({ month: r.month, price: r.average_price as number }));
  const maxTrend = Math.max(...trend.map((t) => t.price));

  const breakdown: { label: string; price: number | null; change: number | null }[] = [
    { label: 'Detached', price: latest.detached_price, change: latest.detached_12m_pct },
    { label: 'Semi-detached', price: latest.semi_detached_price, change: latest.semi_detached_12m_pct },
    { label: 'Terraced', price: latest.terraced_price, change: latest.terraced_12m_pct },
    { label: 'Flat or maisonette', price: latest.flat_price, change: latest.flat_12m_pct },
    { label: 'First-time buyers', price: latest.ftb_price, change: latest.ftb_12m_pct },
    { label: 'Existing owners moving home', price: latest.foo_price, change: latest.foo_12m_pct },
    { label: 'Cash buyers', price: latest.cash_price, change: latest.cash_12m_pct },
    { label: 'Mortgage buyers', price: latest.mortgage_price, change: latest.mortgage_12m_pct },
  ].filter((b) => b.price != null);

  const releaseTag = latest.release_tag;
  const releaseLabel = fmtMonth(`${releaseTag}-01`);
  const isNI = gssCode.startsWith('N09');

  return (
    <Section>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtPrice(latest.average_price as number)}</strong> average house price, {fmtMonth(latest.month)}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
        {[
          latest.change_12m_pct != null ? `${fmtChange(latest.change_12m_pct)} over 12 months` : null,
          latest.change_1m_pct != null ? `${fmtChange(latest.change_1m_pct)} over 1 month` : null,
          latestSales ? `${latestSales.sales_volume!.toLocaleString('en-GB')} sales in ${fmtMonth(latestSales.month)}` : null,
        ].filter(Boolean).join(' · ')}
      </p>

      {trend.length > 1 && (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '6px' }}>
            Average price each {MONTHS[Number(mm) - 1]}
          </figcaption>
          <div
            role="img"
            aria-label={`Average house price each ${MONTHS[Number(mm) - 1]}, ${trend[0].month.slice(0, 4)} to ${trend[trend.length - 1].month.slice(0, 4)}. Full figures are in the Yearly figures table below.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px', borderBottom: `1px solid ${INK}` }}
          >
            {trend.map((t) => (
              <div
                key={t.month}
                title={`${fmtMonth(t.month)}: ${fmtPrice(t.price)}`}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
              >
                <div style={{ width: '100%', height: `${Math.max(2, (t.price / maxTrend) * 100)}%`, background: INK, borderRadius: '2px 2px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '13px', color: INK, marginTop: '4px' }}>
            <span>{trend[0].month.slice(0, 4)}</span>
            <span>{trend[trend.length - 1].month.slice(0, 4)}</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '14px', color: ACCENT, cursor: 'pointer' }}>Yearly figures</summary>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '6px' }}>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.month}>
                    <td style={{ padding: '2px 16px 2px 0' }}>{fmtMonth(t.month)}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{fmtPrice(t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>
      )}

      {breakdown.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, paddingBottom: '6px' }}>
            By type of home and buyer, {fmtMonth(latest.month)}
          </caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 'bold' }}>Type</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'bold' }}>Average price</th>
              <th style={{ textAlign: 'right', padding: '6px 0 6px 8px', fontWeight: 'bold' }}>12 months</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b) => (
              <tr key={b.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 8px 6px 0' }}>{b.label}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPrice(b.price as number)}</td>
                <td style={{ padding: '6px 0 6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtChange(b.change)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        Average prices are HM Land Registry&rsquo;s estimates for the whole area, adjusted for the mix of homes sold, not the price of any one home. Figures for the latest months are provisional: sales can take weeks or months to be registered, so each month is revised for a year after it is first published. Sales counts are published about three months behind prices. In areas with fewer sales, figures can swing noticeably from month to month.
        {isNI && ' Land Registry does not publish a breakdown by type of home or buyer for Northern Ireland councils.'}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '13px', color: INK, margin: 0 }}>
        Source: HM Land Registry, UK House Price Index ({releaseLabel} data). Contains HM Land Registry data &copy; Crown copyright and database right {releaseTag.slice(0, 4)}. This data is licensed under the Open Government Licence v3.0.
      </p>
    </Section>
  );
}
