// The council page's detail tabs (owner, 4 Nov 2026). /councils/nottingham was 500 KB: every tab's markup was in the
// page, then again in the data React needs to hydrate it, though only one tab shows at a time. These six tabs now come
// from /councils/[slug]/panel/[tab] when opened; Overview, Ratings, Money and Health, the summary figures, stay in the
// page. Both routes build their sections from this one list, so they cannot drift apart.
import type { ReactNode } from 'react';
import { pageDb } from '@/lib/page-reads';
import { COUNCIL_LAZY_TABS, type CouncilLazyTab } from '@/lib/council-panels';
import CouncilCrimeSection from '../../components/CouncilCrimeSection';
import CouncilChildPovertySection from '../../components/CouncilChildPovertySection';
import CouncilFuelPovertySection from '../../components/CouncilFuelPovertySection';
import CouncilHousePricesSection from '../../components/CouncilHousePricesSection';
import CouncilHomelessnessSection from '../../components/CouncilHomelessnessSection';
import CouncilClaimantCountSection from '../../components/CouncilClaimantCountSection';
import CouncilSchoolInspectionsSection from '../../components/CouncilSchoolInspectionsSection';
import CouncilEhcpSection from '../../components/CouncilEhcpSection';
import CouncilRoadCasualtiesSection from '../../components/CouncilRoadCasualtiesSection';
import CouncilRoadConditionSection from '../../components/CouncilRoadConditionSection';
import CouncilChildrenInCareSection from '../../components/CouncilChildrenInCareSection';
import CouncilFlyTippingSection from '../../components/CouncilFlyTippingSection';
import CouncilPipMobilitySection from '../../components/CouncilPipMobilitySection';
import CouncilBlueBadgesSection from '../../components/CouncilBlueBadgesSection';
import CouncilConnectivitySection from '../../components/CouncilConnectivitySection';
import CouncilSewageSection from '../../components/CouncilSewageSection';

export type PanelCouncil = { slug: string; name: string; type: string; country: string; gss_code: string; parent_slug: string | null; population: number | null };
export type PanelContext = { c: PanelCouncil; parent: { slug: string; name: string } | null; children: { gss_code?: string | null }[] };

// The tab's sections in order. read() is the section called directly, which gives null when the council has no figures
// from that source: the page uses it to leave out a tab with nothing in it. The reads are the page's own, from the data
// cache, so the panel route's render repeats none of them against the database within the cache period.
type Part = { node: ReactNode; read: () => unknown };
function part<P extends object>(C: (props: P) => Promise<ReactNode>, props: P): Part {
  return { node: <C {...props} />, read: () => C(props) };
}

/** Welfare spending: England, Wales, Scotland and Northern Ireland; counties show the sum of their districts. */
export const showsWelfare = (gss: string) => /^[EWSN]\d{8}$/.test(gss);

export function panelParts(tab: CouncilLazyTab, { c, parent, children }: PanelContext, welfareSlot: ReactNode): Part[] {
  const isCounty = c.type === 'county';
  const isDistrict = c.type === 'district';
  const countyName = parent ? parent.name : null;
  const countySlug = parent ? parent.slug : null;
  const districtCodes = children.map((d) => d.gss_code).filter((g): g is string => !!g);
  const ownOrDistricts = isCounty ? districtCodes : [c.gss_code];
  const pointer = { isDistrict, countyName, countySlug };
  switch (tab) {
    case 'work':
      return [
        part(CouncilClaimantCountSection, { gssCode: c.gss_code }),
        ...(showsWelfare(c.gss_code) ? [{ node: welfareSlot, read: () => true }] : []),
        part(CouncilPipMobilitySection, { gssCode: c.gss_code }),
        part(CouncilBlueBadgesSection, { gssCode: c.gss_code, country: c.country, ...pointer }),
        part(CouncilChildPovertySection, { gssCodes: ownOrDistricts, isCounty }),
        part(CouncilFuelPovertySection, { gssCode: c.gss_code }),
      ];
    case 'housing':
      return [
        part(CouncilHousePricesSection, { gssCode: c.gss_code }),
        part(CouncilHomelessnessSection, { gssCodes: ownOrDistricts, isCounty }),
      ];
    case 'crime':
      return [
        part(CouncilCrimeSection, { gssCodes: ownOrDistricts, population: c.population, isCounty }),
        part(CouncilRoadCasualtiesSection, { gssCode: c.gss_code, ...pointer }),
        part(CouncilRoadConditionSection, { gssCode: c.gss_code, country: c.country, ...pointer }),
        part(CouncilFlyTippingSection, { gssCode: c.gss_code, country: c.country }),
      ];
    case 'schools':
      return [
        part(CouncilSchoolInspectionsSection, { gssCode: c.gss_code, ...pointer, fullListHref: `/councils/${c.slug}/schools` }),
        part(CouncilChildrenInCareSection, { gssCode: c.gss_code, country: c.country, ...pointer }),
        part(CouncilEhcpSection, { gssCode: c.gss_code, ...pointer }),
      ];
    case 'broadband':
      return [part(CouncilConnectivitySection, { gssCodes: ownOrDistricts, isCounty })];
    case 'sewage':
      return [part(CouncilSewageSection, { gssCode: c.gss_code, isCounty, districtCodes, fullListHref: `/councils/${c.slug}/sewage` })];
  }
}

/** The detail tabs with anything to show for this council, so the tab list reads as it did when each was in the page. */
export async function tabsWithContent(ctx: PanelContext): Promise<CouncilLazyTab[]> {
  const found = await Promise.all(COUNCIL_LAZY_TABS.map(async (tab) => {
    const parts = await Promise.all(panelParts(tab, ctx, null).map((p) => p.read()));
    return parts.some((node) => node != null && node !== false) ? tab : null;
  }));
  return found.filter((t): t is CouncilLazyTab => t != null);
}

export async function loadPanelContext(slug: string): Promise<PanelContext | null> {
  const { data, error } = await pageDb().from('councils').select('slug, name, type, country, gss_code, parent_slug, population').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`council ${slug}: ${error.message}`);
  if (!data) return null;
  const c = data as PanelCouncil;
  const [{ data: parent, error: parentErr }, { data: children, error: childrenErr }] = await Promise.all([
    c.parent_slug
      ? pageDb().from('councils').select('slug, name').eq('slug', c.parent_slug).single()
      : Promise.resolve({ data: null, error: null }),
    c.type === 'county'
      ? pageDb().from('councils').select('gss_code').eq('parent_slug', c.slug).order('name')
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const e of [parentErr, childrenErr]) if (e && e.code !== 'PGRST116') throw new Error(`council ${slug}: ${e.message}`);
  return { c, parent: (parent as PanelContext['parent']) ?? null, children: (children ?? []) as PanelContext['children'] };
}
