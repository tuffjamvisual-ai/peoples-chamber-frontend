// /councils/[slug] — Per-council dossier page. Sparse on data for now
// (only the seed columns from the MapIt import); will fill out as
// political control, leadership and finance phases land.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import WelfareLocalAuthorityDetail from '../../components/WelfareLocalAuthorityDetail';

export const revalidate = 21600;

export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('councils')
    .select('slug')
    .limit(20);
  if (error || !data?.length) throw new Error(`generateStaticParams councils: ${error?.message || 'zero rows'}`);
  const slugs = data.map((r) => String(r.slug)).filter(Boolean);
  if (!slugs.length) throw new Error('generateStaticParams councils: zero usable values');
  return slugs.map((slug) => ({ slug }));
}

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const PARCHMENT_CREAM = '#efe6d2';
const ACCENT = '#7a1612';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

type CouncilFull = {
  slug: string;
  name: string;
  short_name: string | null;
  type: string;
  type_label: string;
  country: string;
  region: string | null;
  gss_code: string;
  parent_slug: string | null;
  population: number | null;
  political_control: string | null;
  political_control_status: string | null;
  leader_name: string | null;
  leader_party: string | null;
  chief_exec: string | null;
  council_tax_band_d_pounds: number | null;
  ni_district_rate_poundage: number | null;
  revenue_budget_mn: number | null;
  section_114_year: number | null;
  last_election_year: number | null;
  founded_year: number | null;
  website_url: string | null;
  description: string | null;
};

type RelatedCouncil = { slug: string; name: string; short_name: string | null; political_control: string | null };

type PublicHealthMetricRow = {
  metric_key: string;
  value: number | null;
  unit: string | null;
  source: string;
  nation: string;
  period_label: string | null;
};

const PUBLIC_HEALTH_SOURCE_LABELS: Record<string, string> = {
  fingertips: 'OHID Fingertips',
  scottish_health_survey: 'Scottish Health Survey',
  ons_life_expectancy_gb: 'ONS',
  ons_life_expectancy_ni: 'ONS',
};

type ServiceSpendingRow = {
  service_category: string;
  value_pounds: number | null;
  source: string;
  period_label: string | null;
};

const SERVICE_SPENDING_SOURCE_LABELS: Record<string, string> = {
  mhclg_rsx: 'MHCLG (outturn)',
  scotland_lfr: 'Scottish Government (outturn)',
  statswales: 'StatsWales (outturn)',
};

// The single category in each nation's data that represents the whole
// council's spending, rather than one service — used to show a
// prominent total and excluded from the per-service breakdown list
// below it. Scotland's 8 LFR workbooks have no such aggregate category
// at all (confirmed live on 2026-10-09), so its total is computed by
// summing its 8 real service rows instead.
const SERVICE_SPENDING_AGGREGATE_CATEGORY: Record<string, string> = {
  England: 'Total Service Expenditure',
  Wales: 'Revenue expenditure',
};

// Nation-specific council tax composition, each confirmed against a
// primary source on 2026-10-09 rather than reused from the England
// wording: Scotland has no police/fire precept at all (Police Scotland
// and the Scottish Fire and Rescue Service are single national bodies
// funded directly by the Scottish Government — confirmed via Argyll &
// Bute's own "your council tax bill explained" page, which lists only
// council tax plus Scottish Water's water/sewerage charges); Wales has
// a police precept and town/community council precepts but NO fire
// precept (fire authorities are funded by a levy on their constituent
// councils, confirmed via North Wales Fire and Rescue's own budget
// booklet, so fire cost sits inside the council's own spending, not a
// separate bill line) and is single-tier throughout (no county/district
// split).
const COUNCIL_TAX_CAVEAT_BY_NATION: Record<string, string> = {
  England:
    'This is the council’s own share only. Police and fire precepts — and, in two-tier areas, the county or district precept — are added separately for the final bill. See Council Spending by Service below for how this council itself spends.',
  Scotland:
    'This is the council’s own charge. Scottish Water’s water and sewerage charges are added on the same bill. Police Scotland and the Scottish Fire and Rescue Service are national bodies funded by the Scottish Government, not through council tax. See Council Spending by Service below for how this council itself spends.',
  Wales:
    'This is the council’s own share. The police precept, and any town or community council precept, are added separately for the final bill. Fire services in Wales are funded by a levy on the council itself, not shown as a separate precept here. See Council Spending by Service below for how this council itself spends.',
};

// Rounds to the nearest £m and formats negative values with a proper
// minus sign before the £ (not "£-7m") — flagged from a live browser
// check on 2026-10-09 (Birmingham's "Planning and development services"
// row).
function formatPoundsMillions(valuePounds: number): string {
  const millions = Math.round(valuePounds / 1000000);
  const abs = Math.abs(millions).toLocaleString();
  return millions < 0 ? `−£${abs}m` : `£${abs}m`;
}

// Barnsley and Sheffield: no translation needed. This used to translate
// councils.gss_code on the assumption it stored the new 2025
// boundary-reorganisation codes (E08000038 / E08000039) while the
// welfare tables used the old pre-2025 codes (E08000016 / E08000019).
// That assumption was never actually checked against the real table —
// confirmed directly on 2026-10-09 while building the full-UK public
// health metrics import that councils.gss_code stores the OLD codes
// for these two councils too, same as the welfare tables. This map was
// a harmless no-op in practice (the lookup below always fell through to
// its `?? c.gss_code` fallback), but it documented a wrong assumption
// that caused two real bugs elsewhere — see app/api/councils/lookup/
// route.ts and app/api/welfare/local-authority/[gss]/route.ts — so it's
// removed here rather than left as misleading dead code.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('councils').select('name, type_label, country').eq('slug', slug).single();
  if (!data) return { title: 'Council not found' };
  return {
    title: `${data.name}`,
    description: `${data.name}, ${data.type_label}, ${data.country}.`,
    alternates: { canonical: `/councils/${slug}` },
  };
}

export default async function CouncilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: council } = await supabase
    .from('councils')
    .select('*')
    .eq('slug', slug)
    .single();
  if (!council) notFound();
  const c = council as CouncilFull;

  // Pull parent council (for districts) and child districts (for
  // counties) in a single round-trip — the parent_slug column makes
  // the relationship explicit. Counties have null parent_slug; child
  // districts are read by querying parent_slug = this slug.
  const [{ data: parentRow }, { data: childRows }] = await Promise.all([
    c.parent_slug
      ? supabase.from('councils').select('slug, name, short_name, political_control').eq('slug', c.parent_slug).single()
      : Promise.resolve({ data: null }),
    c.type === 'county'
      ? supabase.from('councils').select('slug, name, short_name, political_control').eq('parent_slug', c.slug).order('name')
      : Promise.resolve({ data: [] }),
  ]);
  const parent: RelatedCouncil | null = (parentRow as RelatedCouncil | null) || null;
  const children: RelatedCouncil[] = (childRows || []) as RelatedCouncil[];

  const hasFinance = c.council_tax_band_d_pounds != null || c.revenue_budget_mn != null || c.ni_district_rate_poundage != null;
  const hasLeadership = c.political_control != null || c.leader_name != null || c.chief_exec != null;
  const hasOverview =
    c.population != null || c.founded_year != null || c.website_url != null;

  // Welfare spending section: counties are upper-tier aggregates with no
  // welfare row of their own (districts/unitaries hold the actual
  // benefit data) — the "Districts under X" list below is the correct
  // drill-down path for those, so this section is skipped for them.
  // Northern Ireland councils are also excluded: the welfare explorer is
  // GB-only (England/Wales/Scotland — DWP Stat-Xplore and ONS/Nomis
  // don't cover NI benefits the same way), and NI GSS codes (starting
  // "N") don't match the welfare API's accepted shape (/^[EWS]\d{8}$/)
  // anyway, so showing this section there would only ever surface a
  // confusing "no data found" error rather than a genuine gap.
  const welfareGss = c.gss_code;
  const showWelfare = c.type !== 'county' && /^[EWS]\d{8}$/.test(welfareGss);

  // Public health metrics: same county exclusion as welfare — upper-tier
  // counties have no row of their own in council_public_health_metrics
  // (every source publishes at district/unitary/council level, not
  // county level), so this section is skipped for them too, same
  // drill-down-via-districts reasoning as welfare above.
  const { data: publicHealthRows } = c.type !== 'county'
    ? await supabase
        .from('council_public_health_metrics')
        .select('metric_key, value, unit, source, nation, period_label')
        .eq('council_gss_code', c.gss_code)
    : { data: [] };
  const publicHealthByKey = new Map(
    ((publicHealthRows || []) as PublicHealthMetricRow[]).map((r) => [r.metric_key, r]),
  );
  const showPublicHealth = publicHealthByKey.size > 0;

  // Service spending breakdown: unlike welfare/public health, English
  // county councils DO have their own real rows here (education, social
  // care, highways etc. are genuinely county-level services in a
  // two-tier area), so no county exclusion is applied. Northern Ireland
  // councils get zero rows by design — confirmed via the NI Audit
  // Office's own report that no comparable breakdown is published for
  // NI — and the section simply doesn't render for them.
  const { data: serviceSpendingRows } = await supabase
    .from('council_service_spending')
    .select('service_category, value_pounds, source, period_label')
    .eq('council_gss_code', c.gss_code);
  const allSpendingRows = (serviceSpendingRows || []) as ServiceSpendingRow[];
  const aggregateCategory = SERVICE_SPENDING_AGGREGATE_CATEGORY[c.country];
  const spendingAggregateRow = aggregateCategory
    ? allSpendingRows.find((r) => r.service_category === aggregateCategory)
    : undefined;
  const spendingBreakdownRows = allSpendingRows
    .filter((r) => r.service_category !== aggregateCategory && r.value_pounds != null)
    .sort((a, b) => (b.value_pounds ?? 0) - (a.value_pounds ?? 0));
  const spendingTotalPounds =
    spendingAggregateRow?.value_pounds ??
    (spendingBreakdownRows.length > 0
      ? spendingBreakdownRows.reduce((sum, r) => sum + (r.value_pounds ?? 0), 0)
      : null);
  const spendingPeriodLabel = (spendingAggregateRow ?? spendingBreakdownRows[0])?.period_label ?? null;
  const spendingSource = (spendingAggregateRow ?? spendingBreakdownRows[0])?.source ?? null;
  const showServiceSpending = spendingBreakdownRows.length > 0;
  // Rows that round to £0m are hidden from the displayed list (not from
  // the total, which is still computed from every row) — flagged from a
  // live browser check on 2026-10-09: Birmingham showing "Police
  // services £0m" / "Fire and rescue services £0m" reads as "this
  // council spends nothing on policing," when the real reason is simply
  // that policing/fire aren't this council's own function and are
  // funded via a separate precept instead.
  const spendingDisplayRows = spendingBreakdownRows.filter(
    (r) => r.value_pounds != null && Math.round(r.value_pounds / 1000000) !== 0,
  );

  return (
    <OpenGovShell pageStamp="Councils">
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
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
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            {c.type_label} · {c.country}
            {parent && (
              <>
                {' · '}
                <a href={`/councils/${parent.slug}`} style={{ color: INK_SOFT, textDecoration: 'underline' }}>
                  Part of {parent.short_name || parent.name}
                </a>
              </>
            )}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {c.name}
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '8px' }}>
            ONS code {c.gss_code}
          </div>
        </header>

        {c.description && (
          <p style={{ fontFamily: MONO, fontSize: 'clamp(15px, 1.15vw, 15px)', lineHeight: 1.75, margin: '0 auto 28px', maxWidth: '46em', color: INK }}>
            {c.description}
          </p>
        )}

        {hasLeadership && (
          <Section title="Political Control & Leadership">
            <DataRow label="Political control" value={c.political_control} sub={c.political_control_status} />
            <DataRow label="Leader" value={c.leader_name} sub={c.leader_party} />
            <DataRow label="Chief executive" value={c.chief_exec} />
            <DataRow label="Last election" value={c.last_election_year?.toString() ?? null} />
          </Section>
        )}

        {hasFinance && (
          <Section title="Finance">
            <DataRow label="Annual revenue budget" value={c.revenue_budget_mn != null ? `£${c.revenue_budget_mn.toLocaleString()}m` : null} />
            <DataRow
              label="Council tax (Band D)"
              value={c.council_tax_band_d_pounds != null ? `£${c.council_tax_band_d_pounds.toLocaleString()}` : null}
              sub={
                c.council_tax_band_d_pounds != null
                  ? COUNCIL_TAX_CAVEAT_BY_NATION[c.country] || null
                  : null
              }
            />
            {c.ni_district_rate_poundage != null && (
              <DataRow
                label="District rate (NI)"
                value={`${(c.ni_district_rate_poundage * 100).toFixed(4)}p per £ of capital value`}
                sub="Northern Ireland has no council tax. This is the council-set portion of domestic rates; a Stormont-set regional rate (5.559p in 2026-27) is added on top to produce the final bill."
              />
            )}
            {c.section_114_year && (
              <DataRow label="Section 114 notice" value={`Issued ${c.section_114_year}`} valueColour={ACCENT} />
            )}
          </Section>
        )}

        {hasOverview && (
          <Section title="Overview">
            <DataRow label="Population" value={c.population?.toLocaleString() ?? null} />
            <DataRow label="Founded" value={c.founded_year?.toString() ?? null} />
            {c.website_url && (
              <DataRow label="Website" value={
                <a href={c.website_url} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>
                  {c.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              } />
            )}
          </Section>
        )}

        {showWelfare && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
              Welfare spending
            </h2>
            <WelfareLocalAuthorityDetail gss={welfareGss} embedded />
          </section>
        )}

        {showPublicHealth && (
          <Section title="Public Health">
            <PublicHealthRow label="Smoking (adults)" row={publicHealthByKey.get('smoking_prevalence')} nation={c.country} />
            <PublicHealthRow label="Physically active (adults)" row={publicHealthByKey.get('physical_activity_prevalence')} nation={c.country} />
            <PublicHealthRow label="Overweight or obese (adults)" row={publicHealthByKey.get('obesity_prevalence')} nation={c.country} />
            <PublicHealthRow label="Life expectancy (male)" row={publicHealthByKey.get('life_expectancy_male')} nation={c.country} isYears />
            <PublicHealthRow label="Life expectancy (female)" row={publicHealthByKey.get('life_expectancy_female')} nation={c.country} isYears />
          </Section>
        )}

        {showServiceSpending && (
          <Section title="Council Spending by Service">
            <DataRow
              label="Total"
              value={spendingTotalPounds != null ? formatPoundsMillions(spendingTotalPounds) : null}
              sub={
                [
                  spendingPeriodLabel,
                  spendingSource ? SERVICE_SPENDING_SOURCE_LABELS[spendingSource] || spendingSource : null,
                  !spendingAggregateRow
                    ? `Sum of this council's ${spendingBreakdownRows.length} reported service categories — ${c.country} does not publish a single total figure in this source.`
                    : null,
                  c.revenue_budget_mn != null
                    ? 'May not match "Annual revenue budget" above — that figure is a different accounting measure (budgeted resource requirement) for a different year than this outturn total.'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
            />
            {spendingDisplayRows.map((row) => (
              <DataRow
                key={row.service_category}
                label={row.service_category}
                value={row.value_pounds != null ? formatPoundsMillions(row.value_pounds) : null}
                sub={
                  row.service_category === 'Council fund housing and housing benefit'
                    ? 'May overlap with the Housing Benefit figure shown in the Welfare section above — StatsWales does not document how the two relate.'
                    : null
                }
              />
            ))}
          </Section>
        )}

        {!hasLeadership && !hasFinance && !hasOverview && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <p style={{ fontFamily: MONO, fontSize: '15px', fontStyle: 'italic', color: INK_SOFT, margin: 0, lineHeight: 1.7 }}>
              Research pending. Political control, leadership, budget and council tax for {c.name} are
              being added in stages alongside the other 381 principal authorities. The {c.type_label}{' '}
              listing is the foundation; live data lands phase by phase.
            </p>
          </section>
        )}

        {children.length > 0 && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
              Districts under {c.short_name || c.name} · {children.length}
            </h2>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '4px 16px',
              }}
            >
              {children.map((d) => (
                <li key={d.slug}>
                  <a
                    href={`/councils/${d.slug}`}
                    style={{
                      display: 'block',
                      padding: '6px 0',
                      color: INK,
                      textDecoration: 'none',
                      fontFamily: MONO,
                      fontSize: '15px',
                      lineHeight: 1.55,
                    }}
                  >
                    {d.short_name || d.name}
                    {d.political_control && (
                      <span style={{ display: 'block', fontSize: '15px', color: INK_SOFT, marginTop: '1px' }}>
                        {d.political_control}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ScrollToTopButton />
      </article>
    </OpenGovShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        {title}
      </h2>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: '0', borderTop: `1px solid ${INK_HAIRLINE}` }}>
        {children}
      </dl>
    </section>
  );
}

function PublicHealthRow({
  label,
  row,
  nation,
  isYears,
}: {
  label: string;
  row: PublicHealthMetricRow | undefined;
  nation: string;
  isYears?: boolean;
}) {
  // No row at all (shouldn't normally happen given showPublicHealth's
  // check, but covers a council missing just this one metric) — skip
  // rather than show a misleading "no data" for something never queried.
  if (!row) return null;

  if (row.value == null) {
    // Deliberately worded as "no data available" rather than "not
    // available" or "unsupported" — see the migration's note: this
    // reflects that no local-authority-level source currently exists
    // for this nation, not a permanent gap.
    return (
      <DataRow
        label={label}
        value="No data available"
        sub={`Not currently published at local-authority level for ${nation}.`}
      />
    );
  }

  const formattedValue = isYears ? `${row.value.toFixed(1)} years` : `${row.value.toFixed(1)}%`;
  const sourceLabel = PUBLIC_HEALTH_SOURCE_LABELS[row.source] || row.source;
  const sub = row.period_label ? `${row.period_label} · ${sourceLabel}` : sourceLabel;

  return <DataRow label={label} value={formattedValue} sub={sub} />;
}

function DataRow({ label, value, sub, valueColour }: { label: string; value: React.ReactNode | null; sub?: string | null; valueColour?: string }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.04em', padding: '12px 16px 12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>
        {label}
      </dt>
      <dd style={{ padding: '12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: valueColour || INK }}>
        {value}
        {sub && <span style={{ display: 'block', fontSize: '15px', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>}
      </dd>
    </div>
  );
}
