// Houses in multiple occupation: types, wording and figures with no database read (Cowork ENTRY 362), shared by
// lib/hmos.ts (the reads), the council section and /councils/hmos, and testable on their own.
export type HmoRow = {
  ons_code: string; area_name: string; nation: 'England' | 'Wales' | 'Scotland'; area_level: 'nation' | 'council';
  region: string | null; year: string;
  estimated: number | null; known: number | null; licensable: number | null; licensed: number | null;
  mandatory_licences: number | null; additional_licences: number | null;
  homes: number | null; homes_year: string | null;
  symbols: Record<string, string>; predecessors: string[]; notes: string[]; source_url: string;
};

export const NATIONAL_PATH = '/councils/hmos';
export const NO_FIGURE = 'No figure published';

export const SOURCE = {
  England: {
    label: 'Ministry of Housing, Communities and Local Government (MHCLG), Local Authority Housing Statistics, section F; homes: Live Table 100 (dwellings by district)',
    short: 'MHCLG, Local Authority Housing Statistics',
    href: 'https://www.gov.uk/government/collections/local-authority-housing-data',
  },
  Wales: {
    label: 'Welsh Government, StatsWales: Houses in multiple occupation by local authority area, and Dwellings licenced by local authority area and licence type; homes: Dwelling stock estimates',
    short: 'Welsh Government, StatsWales',
    href: 'https://stats.gov.wales/en-GB/5d159f50-e1bb-43b3-9275-30f9c031ba41',
  },
  Scotland: {
    label: 'Scottish Government, Housing statistics: Houses in multiple occupation (licences in force); homes: Housing statistics, stock by tenure',
    short: 'Scottish Government, Housing statistics',
    href: 'https://www.gov.scot/publications/housing-statistics-houses-in-multiple-occupation/',
  },
} as const;
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

// Notes, in plain words (Cowork ENTRY 362 change (b)).
export const SHARP_NOTE = 'The council’s estimate changed sharply this year; no reason was published.';
export const BRENT_NOTE = 'MHCLG’s note: the change in 2024-25 is in large part due to a change of methodology by Brent on how its estimate is calculated, a decrease of over 12,000 HMOs.';
export const GOV_ESTIMATED_NOTE = 'Estimated by the Scottish Government from the council’s earlier returns.';
export const DEFINITION_2018 = 'From 1 October 2018 mandatory licensing covers HMOs with five or more people in two or more households, whatever the number of storeys, so figures from 2018-19 count more licensable HMOs than earlier years.';
export const ENGLAND_ESTIMATE_NOTE = 'Estimates are the council’s own and many are rounded; HMOs nobody has reported are missing.';
export const WALES_NOTE = 'Wales counts mandatory and additional licences (councils may license smaller HMOs under additional schemes) and has no figure for HMOs needing a mandatory licence, so no licensed share is shown. No figures were collected for 2019-20.';
export const SCOTLAND_NOTE = 'In Scotland every HMO with three or more unrelated people sharing a kitchen or bathroom needs a licence, so these are licences for all HMOs: not the same measure as England’s mandatory licences.';
export const NI_NOTE = 'Northern Ireland’s councils license HMOs through the NI HMO Unit, run by Belfast City Council; figures by council are not published as data.';
export const DIFFERENT_MEASURES = 'The nations count different things: England’s councils estimate HMOs and report mandatory licences, Wales reports estimated and known HMOs and all HMO licences, and Scotland reports licences for every HMO. They must not be added into one UK total.';

export const noteText = (n: string) => (n === 'sharp_change' ? SHARP_NOTE : n === 'brent_method_2025' ? BRENT_NOTE : n === 'estimated_by_government' ? GOV_ESTIMATED_NOTE : null);

const n0 = (v: number) => v.toLocaleString('en-GB');
export const count = (v: number | null | undefined) => (v == null ? NO_FIGURE : n0(v));
/** '2025-03-31' -> '2024-25' (England and Wales's financial years). */
export const fy = (year: string) => `${Number(year.slice(0, 4)) - 1}-${year.slice(2, 4)}`;
export const marchDate = (year: string) => `31 March ${year.slice(0, 4)}`;
/** Out of those needing a mandatory licence, as a whole per cent; null when either figure is missing. */
export const share = (licensed: number | null, licensable: number | null) => (licensed == null || !licensable ? null : Math.round((100 * licensed) / licensable));
/** For every 1,000 homes, one decimal place. */
export const perThousand = (v: number | null, homes: number | null) => (v == null || !homes ? null : Math.round((v * 10000) / homes) / 10);
export const perThousandText = (v: number | null) => (v == null ? NO_FIGURE : v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

/** A county: the sum of its districts for each year, only where every district has the figure (as the other sections). */
export function sumDistricts(rows: HmoRow[], codes: string[], name: string, code: string): HmoRow[] {
  const byYear = new Map<string, HmoRow[]>();
  for (const r of rows) byYear.set(r.year, [...(byYear.get(r.year) ?? []), r]);
  const out: HmoRow[] = [];
  for (const [year, list] of byYear) {
    if (list.length !== codes.length) continue;
    const sum = (k: 'estimated' | 'licensable' | 'licensed' | 'homes') => (list.every((r) => r[k] != null) ? list.reduce((t, r) => t + (r[k] as number), 0) : null);
    out.push({
      ...list[0], ons_code: code, area_name: name, year, estimated: sum('estimated'), licensable: sum('licensable'), licensed: sum('licensed'),
      homes: sum('homes'), homes_year: list.every((r) => r.homes_year) ? list[0].homes_year : null,
      known: null, mandatory_licences: null, additional_licences: null, symbols: {}, predecessors: [], notes: [],
    });
  }
  return out.sort((a, b) => b.year.localeCompare(a.year));
}

