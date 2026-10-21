// /councils/[slug] — Per-council dossier page. Sparse on data for now
// (only the seed columns from the MapIt import); will fill out as
// political control, leadership and finance phases land.

import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta-description';
import { administrationLabel, seatsLine, seatName, type CouncilComposition } from '@/lib/council-composition';
import { shortParty, type ElectionSummary } from '@/lib/council-election-summary';
import { loadCouncilTax, type CouncilTax } from '@/lib/council-tax';
import { supabase } from '@/lib/supabase';
import { SHOW_COUNCIL_FOUNDED } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import CouncilTabs from './CouncilTabs';
import WelfareLocalAuthorityDetail from '../../components/WelfareLocalAuthorityDetail';
import CouncilCrimeSection from '../../components/CouncilCrimeSection';
import CouncilChildPovertySection from '../../components/CouncilChildPovertySection';
import CouncilFuelPovertySection from '../../components/CouncilFuelPovertySection';
import CouncilHousePricesSection from '../../components/CouncilHousePricesSection';
import CouncilHomelessnessSection from '../../components/CouncilHomelessnessSection';
import CouncilClaimantCountSection from '../../components/CouncilClaimantCountSection';
import CouncilSchoolInspectionsSection from '../../components/CouncilSchoolInspectionsSection';
import CouncilEhcpSection from '../../components/CouncilEhcpSection';
import CouncilRoadCasualtiesSection from '../../components/CouncilRoadCasualtiesSection';
import CouncilFlyTippingSection from '../../components/CouncilFlyTippingSection';
import CouncilConnectivitySection from '../../components/CouncilConnectivitySection';
import CouncilSewageSection from '../../components/CouncilSewageSection';
import CouncilRatingsSection from '../../components/CouncilRatingsSection';
import CouncilOmbudsmanSection from '../../components/CouncilOmbudsmanSection';
import { loadElectionSummary } from '@/lib/council-election-summary';

export const revalidate = 21600;

// No council pages are built ahead (owner's approval, 21 Oct 2026: build reliability; each makes about 45 reads).
// generateStaticParams returning [] keeps the route cached: each council renders on its first visit and is kept for
// 6 hours (revalidate above).
export function generateStaticParams() { return []; }

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
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
  population_year: string | null;       // e.g. 'mid-2025' (migration 2026-10-19r)
  population_source: string | null;
  population_source_url: string | null;
  political_control: string | null;
  political_control_status: string | null;
  leader_name: string | null;
  leader_party: string | null;
  leader_role: string | null;
  leader_since: string | null;
  leader_since_text: string | null;
  leader_source_url: string | null;
  leader_second_source_url: string | null;
  leader_checked_on: string | null;
  chief_exec: string | null;
  chief_exec_note: string | null;        // shown in place of a name, e.g. 'Post abolished in 2026' (migration 2026-10-20c)
  chief_exec_source_url: string | null;
  chief_exec_checked_on: string | null;
  council_tax_band_d_pounds: number | null;
  ni_district_rate_poundage: number | null;
  revenue_budget_mn: number | null;
  section_114_year: number | null;
  last_election_year: number | null;
  founded_year: number | null;
  website_url: string | null;
  description: string | null;
  wikipedia_url: string | null;
};

type RelatedCouncil = { slug: string; name: string; short_name: string | null; political_control: string | null; gss_code?: string | null };

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
    'This is the council’s own share only. Police and fire precepts (and, in areas with two tiers of council, the county or district precept) are added separately for the final bill. See Council Spending by Service below for how this council itself spends.',
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
  const { data, error: dataErr } = await supabase.from('councils').select('name, type_label, country, political_control, population').eq('slug', slug).single();
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/councils/[slug] councils: ${dataErr.message}`);
  if (!data) return { title: 'Council not found' };
  // A description that says what the page offers, not just the council's type (all 382
  // councils had a one-line description; search engine check, 16 Oct 2026).
  const who = data.political_control ? ` Run by ${data.political_control === 'No overall control' ? 'no single party (no overall control)' : data.political_control}.` : '';
  const pop = data.population ? ` Population ${Number(data.population).toLocaleString('en-GB')}.` : '';
  return {
    title: `${data.name}`,
    description: metaDescription(`${data.name}, ${data.type_label.toLowerCase()} in ${data.country}.${who}${pop} Spending, services and how the area compares.`),
    alternates: { canonical: `/councils/${slug}` },
  };
}

export default async function CouncilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A database error must not become a 404: ISR would cache the 404 for hours (Hartlepool and
  // Knowsley were serving a cached 404 on 17 Oct 2026). Throwing keeps the last good page.
  const { data: council, error: councilErr } = await supabase
    .from('councils')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (councilErr) throw new Error(`council ${slug}: ${councilErr.message}`);
  if (!council) notFound();
  const c = council as CouncilFull;

  // Pull parent council (for districts) and child districts (for
  // counties) in a single round-trip — the parent_slug column makes
  // the relationship explicit. Counties have null parent_slug; child
  // districts are read by querying parent_slug = this slug.
  const [{ data: parentRow, error: parentRowErr }, { data: childRows, error: childRowsErr }, { data: compRow, error: compRowErr }] = await Promise.all([
    c.parent_slug
      ? supabase.from('councils').select('slug, name, short_name, political_control').eq('slug', c.parent_slug).single()
      : Promise.resolve({ data: null, error: null }),
    c.type === 'county'
      ? supabase.from('councils').select('slug, name, short_name, political_control, gss_code').eq('parent_slug', c.slug).order('name')
      : Promise.resolve({ data: [], error: null }),
    supabase.from('council_composition').select('snapshot_year, total_seats, seats, majority_party, administration_code').eq('council_slug', c.slug).limit(1).maybeSingle(),
  ]);
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [parentRowErr, childRowsErr, compRowErr]) if (e && e.code !== 'PGRST116') throw new Error(`/councils/[slug] (councils, council_composition): ${e.message}`);
  const comp = (compRow as CouncilComposition | null) || null;
  // A failed read throws, so the last good page stays up (owner's approval, 21 Oct 2026); no data is null.
  const electionSummary = await loadElectionSummary(c.gss_code);
  const councilTax = await loadCouncilTax(c.gss_code);
  const parent: RelatedCouncil | null = (parentRow as RelatedCouncil | null) || null;
  const children: RelatedCouncil[] = (childRows || []) as RelatedCouncil[];

  const hasFinance = c.council_tax_band_d_pounds != null || c.revenue_budget_mn != null || c.ni_district_rate_poundage != null || councilTax != null;
  const hasLeadership = c.political_control != null || c.chief_exec != null || c.chief_exec_note != null || c.leader_source_url != null;
  const hasOverview =
    c.population != null || (SHOW_COUNCIL_FOUNDED && c.founded_year != null) || c.website_url != null;

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
  // Counties show the sum of their districts (the welfare API adds them up), 17 Oct 2026.
  // Northern Ireland councils (N09) are included from 17 Oct 2026 (Department for Communities figures).
  const showWelfare = /^[EWSN]\d{8}$/.test(welfareGss);

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
  const { data: serviceSpendingRows, error: serviceSpendingRowsErr } = await supabase
    .from('council_service_spending')
    .select('service_category, value_pounds, source, period_label')
    .eq('council_gss_code', c.gss_code);
  if (serviceSpendingRowsErr && serviceSpendingRowsErr.code !== 'PGRST116') throw new Error(`/councils/[slug] council_service_spending: ${serviceSpendingRowsErr.message}`);
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

      {/* No parchment card: content sits directly on the page, like the
          department and MP pages. */}
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

        {/* Sections are grouped into tabs (same pattern as the department and
            MP pages). Every tab's content is server-rendered; CouncilTabs only
            switches which one is visible and hides tabs with no figures. */}
        <CouncilTabs
          tabs={[
            { id: 'overview', label: 'Overview', rotate: '0.1deg' },
            { id: 'ratings', label: 'Ratings', rotate: '-0.06deg' },
            { id: 'money', label: 'Money', rotate: '-0.12deg' },
            { id: 'work', label: 'Work & benefits', rotate: '0.08deg' },
            { id: 'housing', label: 'Housing', rotate: '-0.05deg' },
            { id: 'crime', label: 'Crime & roads', rotate: '0.06deg' },
            { id: 'health', label: 'Health', rotate: '-0.1deg' },
            { id: 'schools', label: 'Schools', rotate: '0.05deg' },
            { id: 'broadband', label: 'Broadband & mobile', rotate: '-0.08deg' },
            { id: 'sewage', label: 'Sewage', rotate: '0.07deg' },
          ]}
          slots={{
            overview: <>
              {c.description && (
                <p style={{ fontFamily: MONO, fontSize: 'clamp(15px, 1.15vw, 15px)', lineHeight: 1.75, margin: '0 auto 28px', maxWidth: '46em', color: INK }}>
                  {c.description}
                </p>
              )}
              {/* Descriptions are the lead of the council's Wikipedia article (CC BY-SA 4.0), so it is credited. */}
              {c.description && c.wikipedia_url && (
                <p style={{ fontFamily: MONO, fontSize: '13px', lineHeight: 1.6, margin: '-20px auto 28px', maxWidth: '46em', color: INK_SOFT, opacity: 0.8 }}>
                  From <a href={c.wikipedia_url} target="_blank" rel="noopener noreferrer" style={{ color: INK_SOFT, textDecoration: 'underline' }}>Wikipedia</a>,
                  {' '}under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: INK_SOFT, textDecoration: 'underline' }}>CC BY-SA 4.0</a>.
                </p>
              )}

              {hasLeadership && (
                <Section title="Political Control & Leadership">
                  <DataRow label="Political control" value={c.political_control} sub={controlStatusText(c.political_control_status)} />
                  {/* The publisher's administration label is left out when it contradicts the seats shown
                      below (e.g. "minority" while one named party holds more than half the seats). */}
                  {comp && !runByContradictsSeats(comp) && <DataRow label="Run by" value={administrationLabel(comp.administration_code)} />}
                  {comp && comp.total_seats > 0 && (
                    <DataRow
                      label="Seats"
                      value={`${seatsLine(comp)} (${comp.total_seats} seats)`}
                      sub={`As at May ${comp.snapshot_year}. "Independents and others" includes local parties. Source: Open Council Data UK (public domain).`}
                    />
                  )}
                  {/* Shown only when the leader was read from a source (scripts/import-council-leaders.js, owner's
                      decision, 19 Oct 2026); the old backfilled value was often the ceremonial mayor or chair. */}
                  {c.leader_source_url && c.leader_role && (
                    <DataRow label={c.leader_role} value={leaderValue(c)} sub={leaderSource(c)} />
                  )}
                  <DataRow label="Chief executive" value={c.chief_exec ?? c.chief_exec_note} sub={chiefExecSource(c)} />
                  <DataRow label="Last election" value={lastElectionValue(c.last_election_year, comp, electionSummary, c.slug)} sub={lastElectionSub(c.last_election_year, comp, electionSummary, c)} />
                </Section>
              )}

              {hasOverview && (
                <Section title="Overview">
                  <DataRow
                    label={c.population_year ? `Population (${c.population_year} estimate)` : 'Population'}
                    value={c.population?.toLocaleString('en-GB') ?? null}
                    sub={c.population_source ? (c.population_source_url
                      ? <>Source: <a href={c.population_source_url} target="_blank" rel="noopener noreferrer" style={{ color: INK_SOFT, textDecoration: 'underline' }}>{c.population_source}</a></>
                      : `Source: ${c.population_source}`) : null}
                  />
                  {/* Founded year: hidden (owner's decision, 20 Oct 2026; SHOW_COUNCIL_FOUNDED). */}
                  {SHOW_COUNCIL_FOUNDED && <DataRow label="Founded" value={c.founded_year?.toString() ?? null} />}
                  {c.website_url && (
                    <DataRow label="Website" value={
                      <a href={c.website_url} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>
                        {c.website_url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')}
                      </a>
                    } />
                  )}
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
            </>,
            money: <>
              {hasFinance && (
                <Section title="Finance">
                  <DataRow label="Annual revenue budget" value={c.revenue_budget_mn != null ? `£${c.revenue_budget_mn.toLocaleString()}m` : null} />
                  {councilTax ? (
                    <DataRow label={`Council tax ${councilTax.year.replace('-', '/')} (Band D)`} value={councilTaxValue(councilTax, c.name, c.type)} sub={councilTaxSub(councilTax)} />
                  ) : (
                    <DataRow
                      label="Council tax (Band D)"
                      value={c.council_tax_band_d_pounds != null ? `£${c.council_tax_band_d_pounds.toLocaleString()}` : null}
                      sub={
                        c.council_tax_band_d_pounds != null
                          ? COUNCIL_TAX_CAVEAT_BY_NATION[c.country] || null
                          : null
                      }
                    />
                  )}
                  {c.ni_district_rate_poundage != null && (
                    <DataRow
                      label="District rate (NI)"
                      value={`${(c.ni_district_rate_poundage * 100).toFixed(4)}p per £ of capital value`}
                      sub="Northern Ireland has no council tax. This is the portion of domestic rates set by the council; a regional rate set by Stormont (5.559p in 2026/27) is added on top to produce the final bill."
                    />
                  )}
                  {c.section_114_year && (
                    <DataRow label="Section 114 notice" value={`Issued ${c.section_114_year}`} valueColour={ACCENT} />
                  )}
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
                          ? `Sum of this council's ${spendingBreakdownRows.length} reported service categories. ${c.country} does not publish a single total figure in this source.`
                          : null,
                        c.revenue_budget_mn != null
                          ? 'May not match "Annual revenue budget" above. That figure is a different accounting measure (budgeted resource requirement) for a different year than this outturn total.'
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
                          ? 'May overlap with the Housing Benefit figure shown under Welfare spending in the Work & benefits tab. StatsWales does not document how the two relate.'
                          : null
                      }
                    />
                  ))}
                </Section>
              )}
            </>,
            work: <>
              {/* Claimant count: every council, counties included, has its own figures. */}
              <CouncilClaimantCountSection gssCode={c.gss_code} />

              {showWelfare && (
                <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
                  <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
                    Welfare spending
                  </h2>
                  <WelfareLocalAuthorityDetail gss={welfareGss} embedded />
                </section>
              )}

              {/* Child poverty: same district/county logic as crime. */}
              <CouncilChildPovertySection
                gssCodes={
                  c.type === 'county'
                    ? children.map((d) => d.gss_code).filter((g): g is string => !!g)
                    : [c.gss_code]
                }
                isCounty={c.type === 'county'}
              />

              {/* Fuel poverty: every English council has its own figure; a county's neighbourhoods come from its districts. */}
              <CouncilFuelPovertySection
                gssCode={c.gss_code}
                neighbourhoodCodes={
                  c.type === 'county'
                    ? children.map((d) => d.gss_code).filter((g): g is string => !!g)
                    : c.gss_code ? [c.gss_code] : []
                }
              />
            </>,
            housing: <>
              {/* House prices: every council with a published series, county
                  councils included, has its own HPI figures, so no summing. */}
              <CouncilHousePricesSection gssCode={c.gss_code} />

              {/* Homelessness (England): same district/county logic as crime. */}
              <CouncilHomelessnessSection
                gssCodes={
                  c.type === 'county'
                    ? children.map((d) => d.gss_code).filter((g): g is string => !!g)
                    : c.gss_code ? [c.gss_code] : []
                }
                isCounty={c.type === 'county'}
              />
            </>,
            crime: <>
              {/* Crime: district/unitary councils use their own rows; a county's
                  figures are the sum of its districts (no county-level rows exist
                  in any source). Renders nothing when there's no data. */}
              <CouncilCrimeSection
                gssCodes={
                  c.type === 'county'
                    ? children.map((d) => d.gss_code).filter((g): g is string => !!g)
                    : [c.gss_code]
                }
                population={c.population}
                isCounty={c.type === 'county'}
              />

              {/* Road casualties: highway authorities show DfT figures; districts point to their county. */}
              <CouncilRoadCasualtiesSection
                gssCode={c.gss_code}
                isDistrict={c.type === 'district'}
                countyName={parent ? parent.name : null}
                countySlug={parent ? parent.slug : null}
              />

              {/* Fly-tipping: England (Defra) and Wales (StatsWales); a county's figures are its districts' total.
                  Scotland and Northern Ireland get one line: no official council figures are published. */}
              <CouncilFlyTippingSection gssCode={c.gss_code} country={c.country} />
            </>,
            health: <>
              {showPublicHealth && (
                <Section title="Public Health">
                  <PublicHealthRow label="Smoking (adults)" row={publicHealthByKey.get('smoking_prevalence')} nation={c.country} />
                  <PublicHealthRow label="Physically active (adults)" row={publicHealthByKey.get('physical_activity_prevalence')} nation={c.country} />
                  <PublicHealthRow label="Overweight or obese (adults)" row={publicHealthByKey.get('obesity_prevalence')} nation={c.country} />
                  <PublicHealthRow label="Life expectancy (male)" row={publicHealthByKey.get('life_expectancy_male')} nation={c.country} isYears />
                  <PublicHealthRow label="Life expectancy (female)" row={publicHealthByKey.get('life_expectancy_female')} nation={c.country} isYears />
                </Section>
              )}
            </>,
            schools: <>
              {/* Schools: education authorities show Ofsted results; districts point to their county. */}
              <CouncilSchoolInspectionsSection
                gssCode={c.gss_code}
                isDistrict={c.type === 'district'}
                countyName={parent ? parent.name : null}
                countySlug={parent ? parent.slug : null}
                fullListHref={`/councils/${c.slug}/schools`}
              />
              {/* EHC plans (DfE timeliness, council_ehcp): education authorities; districts point to their county. */}
              <CouncilEhcpSection
                gssCode={c.gss_code}
                isDistrict={c.type === 'district'}
                countyName={parent ? parent.name : null}
                countySlug={parent ? parent.slug : null}
              />
            </>,
            broadband: <>
              {/* Broadband and mobile: districts/unitaries have their own figures; a county sums its districts. */}
              <CouncilConnectivitySection
                gssCodes={
                  c.type === 'county'
                    ? children.map((d) => d.gss_code).filter((g): g is string => !!g)
                    : c.gss_code ? [c.gss_code] : []
                }
                isCounty={c.type === 'county'}
              />
            </>,
            ratings: <>
              {/* Area league table (England): area rating, council services score, similar councils, financial health. */}
              <CouncilRatingsSection
                gssCode={c.gss_code}
                type={c.type}
                name={c.short_name || c.name}
                districtCodes={children.map((d) => d.gss_code).filter((g): g is string => !!g)}
              />
              {/* Ombudsman complaints (England, council_ombudsman): every council has its own figures. */}
              <CouncilOmbudsmanSection gssCode={c.gss_code} />
            </>,
            sewage: <>
              {/* Sewage spills: England and NI; a county sums its districts. Water companies run overflows. */}
              <CouncilSewageSection
                gssCode={c.gss_code}
                isCounty={c.type === 'county'}
                districtCodes={children.map((d) => d.gss_code).filter((g): g is string => !!g)}
                fullListHref={`/councils/${c.slug}/sewage`}
              />
            </>,
          }}
        />

      </article>
    </OpenGovShell>
  );
}

// Stored status values are short codes ("majority", "NOC (largest: Labour 48/99)").
// Show them in plain English.
function runByContradictsSeats(comp: { administration_code: string | null; seats: Record<string, number>; total_seats: number }): boolean {
  const code = (comp.administration_code || '').trim();
  if (!/\smin$/i.test(code) || !comp.total_seats) return false;
  return Object.entries(comp.seats).some(([party, n]) => party !== 'other' && n * 2 > comp.total_seats);
}

function controlStatusText(status: string | null): string | null {
  if (!status) return null;
  const noc = status.match(/^NOC \(largest: (.+) (\d+)\/(\d+)\)$/);
  if (noc) return `Largest party: ${noc[1]}, ${noc[2]} of ${noc[3]} seats`;
  if (/^noc$/i.test(status)) return null;
  if (/^majority$/i.test(status)) return 'Majority of seats';
  if (/^(largest|largest party)$/i.test(status)) return 'Largest party';
  const mayor = status.match(/^majority \(directly elected mayor: (.+)\)$/i);
  if (mayor) return `Directly elected mayor: ${mayor[1]}`;
  return status;
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
        sub={`Not currently published at local authority level for ${nation}.`}
      />
    );
  }

  const formattedValue = isYears ? `${row.value.toFixed(1)} years` : `${row.value.toFixed(1)}%`;
  const sourceLabel = PUBLIC_HEALTH_SOURCE_LABELS[row.source] || row.source;
  const sub = row.period_label ? `${row.period_label} · ${sourceLabel}` : sourceLabel;

  return <DataRow label={label} value={formattedValue} sub={sub} />;
}

// Council tax line: the whole Band D bill where it is known for the area, then each
// part of it, with this council's own rise on the previous year.
const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function councilTaxValue(t: CouncilTax, councilName: string, type: string): React.ReactNode {
  const parts: [string, number | null][] = [
    [councilName, t.council_band_d],
    [t.county_name || 'County council', t.county_band_d],
    [t.ca_name || 'Combined authority', t.ca_band_d],
    ['Greater London Authority', t.gla_band_d],
    [t.police_name || 'Police', t.police_band_d],
    [t.fire_name || 'Fire', t.fire_band_d],
    [t.nation === 'Wales' ? 'Community councils (average)' : 'Parish and town councils (average)', t.parish_avg_band_d],
  ];
  const shown = parts.filter((p): p is [string, number] => p[1] != null && p[1] > 0);
  const change = t.council_band_d_prev ? t.council_band_d - t.council_band_d_prev : null;
  const pct = change != null && t.council_band_d_prev ? (change / t.council_band_d_prev) * 100 : null;
  return (
    <>
      {t.area_band_d != null && type !== 'county' && <strong>{gbp(t.area_band_d)} in total</strong>}
      <span style={{ display: 'block', marginTop: t.area_band_d != null && type !== 'county' ? '4px' : 0 }}>
        {shown.map(([name, v], i) => (
          <span key={name} style={{ display: 'block' }}>
            {name}: {i === 0 ? <strong>{gbp(v)}</strong> : gbp(v)}
            {i === 0 && change != null && pct != null && (Math.round(change * 100) === 0
              ? ' (no change on last year)'
              : ` (${change >= 0 ? 'up' : 'down'} ${gbp(Math.abs(change))}, ${Math.abs(pct).toFixed(1)}% on the year before)`)}
            {i === 0 && t.asc_band_d ? `, including ${gbp(t.asc_band_d)} for adult social care` : ''}
          </span>
        ))}
      </span>
    </>
  );
}
function councilTaxSub(t: CouncilTax): string {
  const base = 'Band D is the middle band that council tax is set from; most homes are in lower bands and pay less.';
  const nation = t.nation === 'Scotland'
    ? ' Scottish Water charges are added on the same bill; police and fire are funded nationally.'
    : t.nation === 'Wales' ? ' Fire services in Wales are funded by a levy on the council, not a separate charge.' : '';
  return `${base}${nation} Source: ${t.nation === 'England' ? 'Ministry of Housing, Communities and Local Government' : t.nation === 'Wales' ? 'Welsh Government' : 'Scottish Government'}, council tax levels ${t.year.replace('-', '/')}.`;
}

// "Last election" line: parties ranked 1st, 2nd, 3rd..., with each party's share of the
// vote where the council's full result is held (lib/council-election-summary.ts),
// otherwise seats only, from the May composition when that was the election year.
const ORD = (k: number) => { const s = ['th', 'st', 'nd', 'rd'], v = k % 100; return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`; };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Wards or divisions, as each council names them (Democracy Club's division types): county councils and these
// unitary councils elect by electoral division; Northern Ireland councils by district electoral area.
const DIVISION_UNITARIES = new Set(['cornwall', 'durham', 'northumberland', 'shropshire', 'wiltshire']);
function areaWord(c: { slug: string; type: string }): string {
  if (c.type === 'county' || DIVISION_UNITARIES.has(c.slug)) return 'divisions';
  if (c.type === 'ni-council') return 'district electoral areas';
  return 'wards';
}
// Council size for the seats-up note, where the composition's total counts members not chosen at that election:
// the City of London's 125 members are 100 Common Councillors, all elected at the full City-wide election, and 25
// Aldermen elected separately (cityoflondon.gov.uk/about-us/voting-elections, read 19 Oct 2026).
const SEATS_AT_ELECTION: Record<string, number> = { 'city-of-london-corporation': 100 };
const councilSeats = (slug: string, comp: CouncilComposition | null): number => SEATS_AT_ELECTION[slug] ?? comp?.total_seats ?? 0;
// Part of the council elected (by thirds or halves): seats on offer fewer than the council's seats. Party seats are
// then shown out of the seats on offer, with a note.
const partOf = (slug: string, comp: CouncilComposition | null, sum: ElectionSummary | null): boolean =>
  !!(sum && councilSeats(slug, comp) > 0 && sum.seatsUp < councilSeats(slug, comp));
function lastElectionValue(year: number | null | undefined, comp: CouncilComposition | null, sum: ElectionSummary | null, slug: string): React.ReactNode | null {
  if (sum) {
    const part = partOf(slug, comp, sum);
    const d = sum.date;
    const when = `${Number(d.slice(8, 10))} ${MONTH_NAMES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
    return (
      <>
        <strong>{when}</strong>
        <span style={{ display: 'block', marginTop: '4px' }}>
          {sum.parties.filter((p) => p.share >= 0.5 || p.seats > 0).map((p, i) => (
            <span key={p.party} style={{ display: 'block' }}>
              {ORD(i + 1)} {p.party}: {p.share.toFixed(1)}% of {sum.stv ? 'first preference votes' : 'the vote'}, {p.seats}{part ? ` of ${sum.seatsUp}` : ''} seat{(part ? sum.seatsUp : p.seats) === 1 ? '' : 's'}
            </span>
          ))}
        </span>
      </>
    );
  }
  if (!year) return null;
  if (comp && comp.snapshot_year === year && comp.total_seats > 0) {
    const ranked = Object.entries(comp.seats).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return (
      <>
        <strong>May {year}</strong>
        <span style={{ display: 'block', marginTop: '4px' }}>
          {ranked.map(([p, n], i) => (
            <span key={p} style={{ display: 'block' }}>{ORD(i + 1)} {seatName(p)}: {n} seat{n === 1 ? '' : 's'}</span>
          ))}
        </span>
      </>
    );
  }
  return year.toString();
}
function lastElectionSub(year: number | null | undefined, comp: CouncilComposition | null, sum: ElectionSummary | null, c: { slug: string; type: string }): string | null {
  const upNote = sum && partOf(c.slug, comp, sum) ? `${sum.seatsUp} of the council's ${councilSeats(c.slug, comp)} seats were up for election. ` : '';
  const unopposed = sum && sum.unopposedSeats > 0
    ? ` ${sum.unopposedSeats} seat${sum.unopposedSeats === 1 ? ' was' : 's were'} filled unopposed, without a vote; vote shares cover the contested wards only.`
    : '';
  // Turnout only where the council-wide figure is stored; a note for each extra poll counted in, with its reason.
  const fmt = (d: string) => `${Number(d.slice(8, 10))} ${MONTH_NAMES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
  const extra = sum
    ? (sum.turnout != null ? ` Turnout ${sum.turnout}%.` : '') +
      sum.extraPolls.map((p) => p.reason === 'postponed'
        ? ` Includes the ${p.ward} poll, postponed to ${fmt(p.date)}.`
        : ` Includes the ${p.ward} poll of ${fmt(p.date)}, held for seats left unfilled on ${fmt(sum.date)}.`).join('')
    : '';
  if (sum?.stv) return upNote + unopposed.trim() + (unopposed ? ' ' : '') + `Share of all first preference votes across the council's ${sum.wards} ${areaWord(c)} (councillors here are elected by single transferable vote, where voters rank candidates); seats won at that election.${sum.labourCoop ? ' Labour includes Labour and Co-operative candidates.' : ''}${extra} Source: ${sum.source || "the council's published results"}.`;
  if (sum) return upNote + (unopposed ? unopposed.trim() + ' ' : '') + `Share of all votes cast across the council's ${sum.wards} ${areaWord(c)}; seats won at that election.${sum.labourCoop ? ' Labour includes Labour and Co-operative candidates.' : ''}${extra} Source: ${sum.source || "the council's published results"}.`;
  // Only when the seats list is shown (the composition is from that election's year).
  if (comp && year && comp.snapshot_year === year && comp.total_seats > 0) return 'Seats on the council after that election (where a council elects a third of its seats at a time, this is the whole council). Vote shares are added once the full result is collected.';
  return null;
}

// "<name>, <party> (since <date>)"; co-leaders are stored as "A and B" with parties "P / Q", in the same order.
// A sourced row with no name is a post the council's own page confirms is vacant.
function leaderValue(c: CouncilFull): string {
  if (!c.leader_name) return 'vacant';
  const names = c.leader_role === 'Co-leaders' ? c.leader_name.split(' and ') : [c.leader_name];
  const parties = c.leader_party ? (names.length > 1 ? c.leader_party.split(' / ') : [c.leader_party]) : [];
  const people = names.map((n, i) => (parties[i] ? `${n}, ${shortParty(parties[i])}` : n));
  const who = people.length === 1 ? people[0]
    : people.length === 2 ? `${people[0]}, and ${people[1]}`
    : `${people.slice(0, -1).join('; ')}; and ${people[people.length - 1]}`;
  const since = c.leader_since
    ? new Date(`${c.leader_since}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : c.leader_since_text;
  return since ? `${who} (since ${since})` : who;
}
function leaderSource(c: CouncilFull): React.ReactNode {
  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: INK_SOFT, textDecoration: 'underline' }}>{text}</a>
  );
  const src = c.leader_source_url as string;
  const wiki = /^https:\/\/en\.wikipedia\.org\//.test(src);
  return (
    <>
      Source: {link(src, wiki ? 'Wikipedia' : c.name)}
      {c.leader_second_source_url && <>, {link(c.leader_second_source_url, c.name)}</>}
      {c.leader_checked_on && <>, checked {longDate(c.leader_checked_on)}</>}
    </>
  );
}

// '2026-10-20' -> '20 October 2026'.
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Where the chief executive was read, and when (migration 2026-10-20c): the council's Wikipedia article.
function chiefExecSource(c: CouncilFull): React.ReactNode {
  if (!c.chief_exec_source_url) return null;
  const checked = c.chief_exec_checked_on ? longDate(c.chief_exec_checked_on) : null;
  return (
    <>
      Source: <a href={c.chief_exec_source_url} target="_blank" rel="noopener noreferrer" style={{ color: INK_SOFT, textDecoration: 'underline' }}>Wikipedia</a>
      {checked && <>, checked {checked}</>}
    </>
  );
}

function DataRow({ label, value, sub, valueColour }: { label: string; value: React.ReactNode | null; sub?: React.ReactNode | null; valueColour?: string }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.04em', padding: '12px 16px 12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>
        {label}
      </dt>
      <dd style={{ padding: '12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: valueColour || INK, minWidth: 0, overflowWrap: 'anywhere' }}>
        {value}
        {sub && <span style={{ display: 'block', fontSize: '15px', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>}
      </dd>
    </div>
  );
}
