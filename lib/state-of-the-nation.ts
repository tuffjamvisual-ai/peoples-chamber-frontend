// State of the nation (T1-SOTN, owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 105): the latest official figures, each
// with the period it covers, the change on the previous figure, its source and the date it was published.
//
// Two kinds of figure:
//  - ONS figures, read from the ONS time series data (ons.gov.uk/<topic>/timeseries/<cdid>/<dataset>/data). Every series
//    ID below was checked against its ONS title on 15 Nov 2026 (the GDP first estimate is in the PN2 dataset, not QNA).
//    They are read by one shared cached function (Next unstable_cache, tag 'state-of-the-nation-ons', kept a day and
//    refreshed each morning by /api/refresh-state-of-the-nation after the 07:00 ONS releases). Requests follow the ONS
//    rules (developer.ons.gov.uk/bots/): an identifying User-Agent and one request a second, far under the limit. A
//    failed read throws and is not cached, so the last good figures stay up.
//  - Everything else from the reviewed file data/state-of-the-nation.json, which Cowork fills from the official sources
//    and checks. An entry shows only when its checkedBy is "Cowork"; otherwise the card says "Not yet published here".
//    Nothing is invented here: a value missing from the file is shown as not yet published.
// No opinion and no good-or-bad colours: figures, periods, changes and sources only.
import { unstable_cache } from 'next/cache';
import REVIEWED from '@/data/state-of-the-nation.json';
import { isRecent, londonDay } from '@/lib/london-date';

export const SOTN_TAG = 'state-of-the-nation-ons';
const UA = 'opengovt-archive/1.0 (+https://www.opengovt.uk; contact@opengovt.uk)';
const ONS = 'https://www.ons.gov.uk';
export const NEW_DAYS = 7; // a figure is marked new on its publication day and the 6 days after (lib/london-date.ts isRecent)

export type Group = 'Cost of living' | 'Economy' | 'Public money' | 'Public services' | 'Housing and homelessness' | 'Immigration';
export const GROUPS: Group[] = ['Cost of living', 'Economy', 'Public money', 'Public services', 'Housing and homelessness', 'Immigration'];

// How the figure is written. 'pct' 3.5 -> "3.5%" ("3.5 per cent" in a sentence); 'ppt' change in percentage points; 'thousands' 691 -> "691,000";
// 'gbp-m' millions of pounds -> "£24.5bn"; 'gbp-bn' -> "£3,005bn".
type Format = 'pct' | 'thousands' | 'gbp-m' | 'gbp-bn';
// 'month' a single month ("September 2026"); 'lfs' a rolling three months labelled by its middle month ("JUL" is June to
// August: the Labour Force Survey and vacancy series); 'awe' a three month average labelled by its LAST month ("AUG" is
// June to August: average weekly earnings growth); 'quarter' ("July to September 2026"); 'fytd' the financial year to
// date, summed from April.
type Period = 'month' | 'lfs' | 'awe' | 'quarter' | 'fytd';

type OnsSeries = {
  id: string; group: Group; label: string; cdid: string; dataset: string; path: string; format: Format; period: Period;
  sign?: -1; // J5II is negative when the government borrows
  note?: string;
};
export const ONS_SERIES: OnsSeries[] = [
  { id: 'cpi', group: 'Cost of living', label: 'Inflation (CPI), annual rate', cdid: 'D7G7', dataset: 'MM23', path: '/economy/inflationandpriceindices', format: 'pct', period: 'month' },
  { id: 'cpih', group: 'Cost of living', label: 'Inflation including housing costs (CPIH), annual rate', cdid: 'L55O', dataset: 'MM23', path: '/economy/inflationandpriceindices', format: 'pct', period: 'month' },
  { id: 'gdp-q', group: 'Economy', label: 'GDP growth on the previous quarter', cdid: 'IHYQ', dataset: 'PN2', path: '/economy/grossdomesticproductgdp', format: 'pct', period: 'quarter' },
  { id: 'gdp-y', group: 'Economy', label: 'GDP growth on the same quarter a year earlier', cdid: 'IHYR', dataset: 'PN2', path: '/economy/grossdomesticproductgdp', format: 'pct', period: 'quarter' },
  { id: 'unemployment', group: 'Economy', label: 'Unemployment rate, aged 16 and over', cdid: 'MGSX', dataset: 'LMS', path: '/employmentandlabourmarket/peoplenotinwork/unemployment', format: 'pct', period: 'lfs' },
  { id: 'employment', group: 'Economy', label: 'Employment rate, aged 16 to 64', cdid: 'LF24', dataset: 'LMS', path: '/employmentandlabourmarket/peopleinwork/employmentandemployeetypes', format: 'pct', period: 'lfs' },
  { id: 'inactivity', group: 'Economy', label: 'Economic inactivity rate, aged 16 to 64', cdid: 'LF2S', dataset: 'LMS', path: '/employmentandlabourmarket/peoplenotinwork/economicinactivity', format: 'pct', period: 'lfs' },
  { id: 'pay-regular', group: 'Economy', label: 'Regular pay growth, on a year earlier', cdid: 'KAI9', dataset: 'LMS', path: '/employmentandlabourmarket/peopleinwork/earningsandworkinghours', format: 'pct', period: 'awe', note: 'Average weekly earnings excluding bonuses, three month average, before inflation' },
  { id: 'vacancies', group: 'Economy', label: 'Job vacancies', cdid: 'AP2Y', dataset: 'UNEM', path: '/employmentandlabourmarket/peopleinwork/employmentandemployeetypes', format: 'thousands', period: 'lfs' },
  { id: 'borrowing-ytd', group: 'Public money', label: 'Government borrowing in the financial year', cdid: 'J5II', dataset: 'PUSF', path: '/economy/governmentpublicsectorandtaxes/publicsectorfinance', format: 'gbp-m', period: 'fytd', sign: -1, note: 'Public sector net borrowing excluding public sector banks' },
  { id: 'borrowing-month', group: 'Public money', label: 'Government borrowing in the month', cdid: 'J5II', dataset: 'PUSF', path: '/economy/governmentpublicsectorandtaxes/publicsectorfinance', format: 'gbp-m', period: 'month', sign: -1, note: 'Public sector net borrowing excluding public sector banks' },
  { id: 'debt', group: 'Public money', label: 'Public sector net debt', cdid: 'HF6W', dataset: 'PUSF', path: '/economy/governmentpublicsectorandtaxes/publicsectorfinance', format: 'gbp-bn', period: 'month', note: 'Excluding public sector banks' },
  { id: 'debt-gdp', group: 'Public money', label: 'Public sector net debt as a share of GDP', cdid: 'HF6X', dataset: 'PUSF', path: '/economy/governmentpublicsectorandtaxes/publicsectorfinance', format: 'pct', period: 'month' },
  { id: 'debt-interest', group: 'Public money', label: 'Central government debt interest in the month', cdid: 'NMFX', dataset: 'PUSF', path: '/economy/governmentpublicsectorandtaxes/publicsectorfinance', format: 'gbp-m', period: 'month', note: 'Net interest payable' },
];

// The figures not read from the ONS: their ids, groups and labels; values come from the reviewed file.
export const REVIEWED_ITEMS: { id: string; group: Group; label: string }[] = [
  { id: 'bank-rate', group: 'Cost of living', label: 'Bank Rate' },
  { id: 'energy-cap', group: 'Cost of living', label: 'Typical household energy bill (Ofgem price cap, dual fuel)' },
  { id: 'house-price', group: 'Cost of living', label: 'Average UK house price' },
  { id: 'rent', group: 'Cost of living', label: 'Private rents, annual change' },
  { id: 'pay-real', group: 'Economy', label: 'Regular pay growth after inflation' },
  { id: 'nhs-waiting', group: 'Public services', label: 'NHS England waiting list (treatment pathways)' },
  { id: 'nhs-18-weeks', group: 'Public services', label: 'NHS England patients waiting under 18 weeks' },
  { id: 'ae-4-hours', group: 'Public services', label: 'A&E attendances seen within 4 hours (all A&E departments, England)' },
  { id: 'crown-court', group: 'Public services', label: 'Crown Court outstanding cases' },
  { id: 'prisons', group: 'Public services', label: 'Prison population and usable capacity' },
  { id: 'temp-accommodation', group: 'Housing and homelessness', label: 'Households in temporary accommodation (England)' },
  { id: 'temp-accommodation-children', group: 'Housing and homelessness', label: 'Children in temporary accommodation (England)' },
  { id: 'net-migration', group: 'Immigration', label: 'Net migration' },
  { id: 'small-boats', group: 'Immigration', label: 'People arriving in small boats this year' },
  { id: 'asylum-claims', group: 'Immigration', label: 'Asylum claims' },
];

export type Figure = {
  id: string; group: Group; label: string;
  value: string | null;      // as written ("3.5%"), or null: "Not yet published here"
  period: string | null;     // what the figure covers ("September 2026")
  change: string | null;     // on the previous figure, with its period ("up from 3.1 per cent in August 2026")
  sourceUrl: string | null; sourceName: string | null;
  publishedOn: string | null; // YYYY-MM-DD
  isNew: boolean;            // published in the last 7 days
  note?: string;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "2026 SEP" -> "September 2026"; LFS "2026 JUL" -> "June to August 2026" (a rolling three months named by its middle
// month); "2026 Q3" -> "July to September 2026".
export function periodLabel(date: string, kind: Period): string {
  const q = date.match(/^(\d{4}) Q([1-4])$/);
  if (q) { const y = q[1], n = Number(q[2]); return `${MONTH_NAMES[(n - 1) * 3]} to ${MONTH_NAMES[(n - 1) * 3 + 2]} ${y}`; }
  const m = date.match(/^(\d{4}) ([A-Z]{3})$/);
  if (!m) return date;
  const y = Number(m[1]), i = MONTHS.indexOf(m[2]);
  if (kind === 'lfs' || kind === 'awe') {
    const mid = kind === 'awe' ? i - 1 : i; // an 'awe' label is the last of its three months
    const a = new Date(Date.UTC(y, mid - 1, 1)), b = new Date(Date.UTC(y, mid + 1, 1));
    const ay = a.getUTCFullYear(), by = b.getUTCFullYear();
    return `${MONTH_NAMES[a.getUTCMonth()]}${ay !== by ? ` ${ay}` : ''} to ${MONTH_NAMES[b.getUTCMonth()]} ${by}`;
  }
  return `${MONTH_NAMES[i]} ${y}`;
}

// The big figure on a card is a figure and keeps '%' (owner, Cowork ENTRY 343: figures compact; the homepage band at 375
// went over the phone length limit with '3.6 per cent'); in a sentence ('up from 3.1 per cent in August 2026') it is
// 'per cent' (ENTRY 325 and 338): words = true.
export function formatValue(v: number, f: Format, words = false): string {
  if (f === 'pct') return words ? `${v.toFixed(1)} per cent` : `${v.toFixed(1)}%`;
  if (f === 'thousands') return `${Math.round(v * 1000).toLocaleString('en-GB')}`;
  if (f === 'gbp-m') return `£${(v / 1000).toFixed(1)}bn`;
  return `£${Math.round(v).toLocaleString('en-GB')}bn`;
}

// The change on the previous figure, in plain words, with the previous period. For a rate, the previous figure itself
// ("up from 3.1 per cent in August 2026"); no judgement of whether that is good or bad.
// ONS works out changes from unrounded figures and publishes rounded ones, so two equal published figures can still be
// a rise or a fall in the bulletin (inactivity: 20.9% and 20.9%, 'down by 0.1 percentage points'); equal figures are
// therefore not called 'the same' (ENTRY 107).
export function changeText(cur: number, prev: number, prevPeriod: string, f: Format): string {
  if (formatValue(cur, f) === formatValue(prev, f)) return `also ${formatValue(prev, f, true)} in ${prevPeriod} when rounded`;
  return `${cur > prev ? 'up' : 'down'} from ${formatValue(prev, f, true)} in ${prevPeriod}`;
}

type OnsData = { description: { title: string; releaseDate?: string; cdid: string; datasetId: string }; months?: { date: string; value: string }[]; quarters?: { date: string; value: string }[] };

// Financial year to date: the months from April of the latest month's financial year, summed; and the same months a
// year earlier for the change.
export function fytd(months: { date: string; value: string }[]): { sum: number; prevSum: number; label: string; prevLabel: string } | null {
  if (!months.length) return null;
  const last = months[months.length - 1].date.match(/^(\d{4}) ([A-Z]{3})$/);
  if (!last) return null;
  const y = Number(last[1]), i = MONTHS.indexOf(last[2]);
  // Months counted from January of year 0, so a range is two numbers.
  const at = (yy: number, mm: number) => yy * 12 + mm;
  const idx = (m: { date: string }) => { const p = m.date.match(/^(\d{4}) ([A-Z]{3})$/); return p ? at(Number(p[1]), MONTHS.indexOf(p[2])) : -1; };
  const end = at(y, i), start = at(i >= 3 ? y : y - 1, 3); // April of this financial year
  const cur = months.filter((m) => idx(m) >= start && idx(m) <= end);
  const prev = months.filter((m) => idx(m) >= start - 12 && idx(m) <= end - 12);
  const sum = (a: { value: string }[]) => a.reduce((s, m) => s + Number(m.value), 0);
  return { sum: sum(cur), prevSum: sum(prev), label: `April to ${MONTH_NAMES[i]} ${y}`, prevLabel: `April to ${MONTH_NAMES[i]} ${y - 1}` };
}

// As of the moment given, in London; the page shows it as rendered and the browser checks it again (ENTRY 140).
const recent = (iso: string | null, now = Date.now()) => isRecent(iso, NEW_DAYS, londonDay(new Date(now)));

export function onsFigure(s: OnsSeries, d: OnsData, now = Date.now()): Figure {
  const base = { id: s.id, group: s.group, label: s.label, note: s.note, sourceName: 'Office for National Statistics',
    sourceUrl: `${ONS}${s.path}/timeseries/${s.cdid.toLowerCase()}/${s.dataset.toLowerCase()}` };
  const publishedOn = d.description.releaseDate ? d.description.releaseDate.slice(0, 10) : null;
  const sign = s.sign ?? 1;
  if (s.period === 'fytd') {
    const f = fytd(d.months ?? []);
    if (!f) return { ...base, value: null, period: null, change: null, publishedOn, isNew: false };
    return { ...base, value: formatValue(sign * f.sum, s.format), period: f.label, change: changeText(sign * f.sum, sign * f.prevSum, f.prevLabel, s.format), publishedOn, isNew: recent(publishedOn, now) };
  }
  const series = s.period === 'quarter' ? d.quarters ?? [] : d.months ?? [];
  const last = series[series.length - 1], prev = series[series.length - 2];
  if (!last) return { ...base, value: null, period: null, change: null, publishedOn, isNew: false };
  const cur = sign * Number(last.value);
  // For a three month period, the comparison is with the three months before (three entries back), not the overlapping one.
  const before = s.period === 'lfs' || s.period === 'awe' ? series[series.length - 4] : prev;
  return {
    ...base,
    value: formatValue(cur, s.format),
    period: periodLabel(last.date, s.period),
    change: before ? changeText(cur, sign * Number(before.value), periodLabel(before.date, s.period), s.format) : null,
    publishedOn,
    isNew: recent(publishedOn, now),
  };
}

export async function readOns(): Promise<Record<string, OnsData>> {
  const out: Record<string, OnsData> = {};
  const seen = new Map<string, OnsData>();
  for (const s of ONS_SERIES) {
    const key = `${s.cdid}/${s.dataset}`;
    if (!seen.has(key)) {
      const url = `${ONS}${s.path}/timeseries/${s.cdid.toLowerCase()}/${s.dataset.toLowerCase()}/data`;
      const r = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
      if (!r.ok) throw new Error(`ONS ${key}: HTTP ${r.status}`);
      const d = (await r.json()) as OnsData;
      if (d.description?.cdid?.toUpperCase() !== s.cdid) throw new Error(`ONS ${key}: answered for ${d.description?.cdid}`);
      seen.set(key, { description: d.description, months: d.months?.slice(-30), quarters: d.quarters?.slice(-8) });
      await new Promise((res) => setTimeout(res, 1000)); // one request a second
    }
    out[s.id] = seen.get(key)!;
  }
  return out;
}
// One shared copy for every server instance, kept a day; refreshed each morning (tag) after the ONS releases.
// A16 (ENTRY 129, 140): no timer; /api/refresh-state-of-the-nation reads the ONS each morning and refreshes the tag only
// when the figures differ from this copy.
export const onsData = unstable_cache(readOns, ['state-of-the-nation-ons-v1'], { tags: [SOTN_TAG], revalidate: false });

type ReviewedEntry = { value: string | null; label?: string; period: string | null; previous: string | null; sourceUrl: string | null; sourceName?: string | null; publishedOn: string | null; checkedOn: string | null; checkedBy: string | null; note?: string | null };
export function reviewedFigure(item: { id: string; group: Group; label: string }, file: Record<string, ReviewedEntry | undefined>, now = Date.now()): Figure {
  const e = file[item.id];
  const ok = !!e && e.checkedBy === 'Cowork' && !!e.value;
  if (!ok) return { ...item, value: null, period: null, change: null, sourceUrl: null, sourceName: null, publishedOn: null, isNew: false };
  return {
    ...item, label: e!.label || item.label, value: e!.value, period: e!.period, change: e!.previous ?? null,
    sourceUrl: e!.sourceUrl, sourceName: e!.sourceName ?? null, publishedOn: e!.publishedOn,
    isNew: recent(e!.publishedOn, now), note: e!.note ?? undefined,
  };
}

export async function stateOfTheNation(): Promise<{ figures: Figure[]; onsError: string | null }> {
  let ons: Record<string, OnsData> | null = null, onsError: string | null = null;
  try { ons = await onsData(); } catch (e) { onsError = (e as Error).message; }
  const reviewed = (REVIEWED as { figures: Record<string, ReviewedEntry> }).figures;
  const figures: Figure[] = [
    ...ONS_SERIES.map((s) => (ons ? onsFigure(s, ons[s.id]) : { id: s.id, group: s.group, label: s.label, value: null, period: null, change: null, sourceUrl: null, sourceName: null, publishedOn: null, isNew: false })),
    ...REVIEWED_ITEMS.map((i) => reviewedFigure(i, reviewed)),
  ];
  const order = new Map([...ONS_SERIES.map((s) => s.id), ...REVIEWED_ITEMS.map((r) => r.id)].map((id, n) => [id, n]));
  // Within each group: the order of ENTRY 105.
  const want: Record<Group, string[]> = {
    'Cost of living': ['cpi', 'cpih', 'bank-rate', 'energy-cap', 'house-price', 'rent'],
    Economy: ['gdp-q', 'gdp-y', 'unemployment', 'employment', 'inactivity', 'pay-regular', 'pay-real', 'vacancies'],
    'Public money': ['borrowing-ytd', 'borrowing-month', 'debt', 'debt-gdp', 'debt-interest'],
    'Public services': ['nhs-waiting', 'nhs-18-weeks', 'ae-4-hours', 'crown-court', 'prisons'],
    'Housing and homelessness': ['temp-accommodation', 'temp-accommodation-children'],
    Immigration: ['net-migration', 'small-boats', 'asylum-claims'],
  };
  const rank = (f: Figure) => (want[f.group].indexOf(f.id) + 1 || 99) * 100 + (order.get(f.id) ?? 0);
  figures.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || rank(a) - rank(b));
  return { figures, onsError };
}

// The four figures on the homepage band: inflation, unemployment, borrowing this year, and the NHS waiting list (or the
// Crown Court backlog when the NHS figure has not been checked yet).
export function headlineFour(figures: Figure[]): Figure[] {
  const by = (id: string) => figures.find((f) => f.id === id);
  const fourth = by('nhs-waiting')?.value ? by('nhs-waiting') : by('crown-court');
  return [by('cpi'), by('unemployment'), by('borrowing-ytd'), fourth].filter((f): f is Figure => !!f);
}
