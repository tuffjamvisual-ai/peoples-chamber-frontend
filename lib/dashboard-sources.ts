// The public services figures (dashboard_indicators) from their publishers (Cowork ENTRY 230 step 2, owner approved
// 17 Nov 2026; sources and file layouts from T2's audit/t2-prep/dashboard-indicators-sources.md). Free sources only, read
// with a plain request; robots.txt allows every path used here (T2, 17 Nov 2026).
//
// Four figures are read automatically, as their files have a fixed layout: A&E within 4 hours (monthly CSV), the RTT
// waiting list (monthly time series), fully qualified GPs (monthly bulletin tables) and prison occupancy (weekly figures).
// The other six (Crown Court backlog, households in temporary accommodation, persistent absence, children's homes,
// police charge rate, adult social care vacancies) come quarterly or yearly in large tables that change shape between
// editions: they are loaded by hand, and dashboardOverdue() tells the freshness monitor when a newer edition is due, so
// a missed release is flagged for every indicator.
//
// The parsers are pure (text or bytes in, figure out), so they are tested against saved copies of the real files.
import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthIndex = (name: string) => MONTHS.findIndex((m) => m.toLowerCase().startsWith(name.toLowerCase().slice(0, 3)));
const ym = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, '0')}`;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, "'");
const absolute = (href: string, base: string) => new URL(decode(href), base).toString();

// ---- A&E: share of attendances (all department types, booked appointments included) within 4 hours, England.
// The year page links each month's CSV as "Monthly A&E <Month> <YYYY> (CSV"; a "(Revised ...)" link is an older month.
export const AE_PAGE = (fyStart: number) =>
  `https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}/`;
export function aeNewestCsv(html: string, pageUrl: string): { url: string; period: string } | null {
  let best: { url: string; period: string } | null = null;
  for (const m of html.matchAll(/href="([^"]+\.csv)"[^>]*>\s*Monthly A&(?:amp;)?E ([A-Za-z]+) (\d{4})(?! \(Revised)\s*\(CSV/g)) {
    const mi = monthIndex(m[2]);
    if (mi < 0) continue;
    const period = ym(Number(m[3]), mi);
    if (!best || period > best.period) best = { url: absolute(m[1], pageUrl), period };
  }
  return best;
}
// The CSV for one month (for the year-earlier figure), the revised edition when there is one, as NHS England compares
// against it ("74.2% in October 2025" in the October 2026 commentary is the revised figure).
export function aeCsvFor(html: string, pageUrl: string, period: string): string | null {
  const [y, m] = period.split('-').map(Number);
  const links = [...html.matchAll(/href="([^"]+\.csv)"[^>]*>\s*Monthly A&(?:amp;)?E ([A-Za-z]+) (\d{4})([^<(]*\(Revised[^)]*\))?/g)]
    .filter((l) => monthIndex(l[2]) === m - 1 && Number(l[3]) === y);
  const pick = links.find((l) => l[4]) ?? links[0];
  return pick ? absolute(pick[1], pageUrl) : null;
}
export function aePercent(csv: string): number {
  const rows = parseCsv(csv, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  if (!rows.length) throw new Error('A&E CSV: no rows');
  const cols = Object.keys(rows[0]);
  const att = cols.filter((c) => /^A&E attendances/i.test(c));
  const over = cols.filter((c) => /^Attendances over 4hrs/i.test(c));
  if (att.length < 3 || over.length < 3) throw new Error(`A&E CSV: columns not found (${att.length} attendance, ${over.length} over 4 hours)`);
  const n = (v: string) => Number(String(v ?? '').replace(/,/g, '')) || 0;
  let a = 0, o = 0;
  for (const r of rows) { for (const c of att) a += n(r[c]); for (const c of over) o += n(r[c]); }
  if (a < 1_000_000) throw new Error(`A&E CSV: only ${a} attendances, not a full month for England`);
  return Math.round(1000 * (1 - o / a)) / 10;
}

// ---- RTT: total waiting (incomplete pathways) with estimates for missing trusts, the newest month of the time series.
export const RTT_PAGE = (fyStart: number) =>
  `https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}/`;
export function rttTimeseriesLink(html: string, pageUrl: string): string | null {
  const m = /href="([^"]+\.xlsx)"[^>]*>\s*RTT Overview Timeseries Including Estimates for Missing Trusts/i.exec(html);
  return m ? absolute(m[1], pageUrl) : null;
}
export function rttNewest(buf: ArrayBuffer | Uint8Array): { value: number; period: string; yearAgo: number | null } {
  const wb = XLSX.read(buf);
  const ws = wb.Sheets['Full Time Series'];
  if (!ws) throw new Error('RTT: sheet "Full Time Series" not found');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const head = rows.find((r) => typeof r[22] === 'string' && /Total waiting.*with estimates/i.test(String(r[22])));
  if (!head) throw new Error('RTT: column W is not "Total waiting ... with estimates for missing data"');
  const monthly = rows.filter((r) => typeof r[22] === 'number' && typeof r[2] === 'number');
  const last = monthly[monthly.length - 1];
  if (!last) throw new Error('RTT: no monthly rows');
  const d = XLSX.SSF.parse_date_code(last[2] as number);
  const period = ym(d.y, d.m - 1);
  const ago = monthly.find((r) => { const e = XLSX.SSF.parse_date_code(r[2] as number); return ym(e.y, e.m - 1) === ym(d.y - 1, d.m - 1); });
  return { value: Math.round(last[22] as number), period, yearAgo: ago ? Math.round(ago[22] as number) : null };
}

// ---- GPs: fully qualified GPs (excluding trainees), full time equivalent, from the newest bulletin tables.
// Each edition has its own page (…/general-and-personal-medical-services/<dd-month-yyyy>); a future edition's page may
// exist before publication, so an edition counts only once its page links the bulletin tables.
export const GP_SERIES = 'https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services';
export function gpEditionUrl(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${GP_SERIES}/${lastDay}-${MONTHS[m - 1].toLowerCase()}-${y}`;
}
export function gpTablesLink(html: string, period: string): string | null {
  const [y, m] = period.split('-').map(Number);
  const name = `GPW%20Bulletin%20Tables%20-%20${MONTHS[m - 1]}%20${y}.xlsx`;
  const re = new RegExp(`href="(https://files\\.digital\\.nhs\\.uk/[^"]+/${name.replace(/[.%]/g, (c) => `\\${c}`)})"`, 'i');
  return re.exec(html)?.[1] ?? null;
}
export function gpValue(buf: ArrayBuffer | Uint8Array, period: string): number {
  const [y, m] = period.split('-').map(Number);
  const wb = XLSX.read(buf);
  const ws = wb.Sheets['1a'];
  if (!ws) throw new Error('GP: sheet 1a not found');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const want = `${MONTHS[m - 1]} ${y}`;
  const head = rows.find((r) => r.some((c) => typeof c === 'string' && c.replace(/\s+/g, ' ').trim().startsWith(want)));
  const col = head?.findIndex((c) => typeof c === 'string' && c.replace(/\s+/g, ' ').trim().startsWith(want)) ?? -1;
  if (col < 0) throw new Error(`GP: no column for ${want}`);
  const row = rows.find((r) => String(r[0] ?? '').startsWith('All Fully Qualified GPs'));
  const v = row?.[col];
  if (typeof v !== 'number') throw new Error('GP: no "All Fully Qualified GPs" figure');
  return v; // unrounded: the stored figure is rounded by the caller, the year-earlier difference uses this
}

// ---- Prisons: population against usable operational capacity, the newest weekly figures (GOV.UK content API).
export const PRISON_API = (year: number) => `https://www.gov.uk/api/content/government/publications/prison-population-weekly-estate-figures-${year}`;
export const PRISON_PAGE = (year: number) => `https://www.gov.uk/government/publications/prison-population-weekly-estate-figures-${year}`;
export function prisonNewestFile(json: unknown): string | null {
  const docs = ((json as { details?: { attachments?: { url?: string; content_type?: string; filename?: string }[] } })?.details?.attachments ?? [])
    .filter((a) => a.url && /\.ods$|opendocument\.spreadsheet/i.test(`${a.filename ?? ''} ${a.content_type ?? ''} ${a.url}`));
  return docs[0]?.url ?? null; // newest first, as GOV.UK lists them
}
export function prisonFigures(buf: ArrayBuffer | Uint8Array): { value: number; period: string; population: number; capacity: number; yearAgo: { value: number; period: string } | null } {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
  const title = rows.map((r) => String(r[0] ?? '')).find((t) => /Briefing for \w+ \d{1,2} \w+ \d{4}/.test(t));
  const d = title && /(\d{1,2}) (\w+) (\d{4})/.exec(title);
  const mi = d ? monthIndex(d[2]) : -1;
  if (!d || mi < 0) throw new Error('Prisons: no briefing date');
  // The briefing's own figures come first; "12 Months Ago: <date>" heads the year-earlier block lower down.
  const agoAt = rows.findIndex((x) => /^12 Months Ago/i.test(String(x[0] ?? '')));
  const total = (label: string, from = 0) => {
    const r = rows.slice(from).find((x) => String(x[0] ?? '').trim() === label);
    const v = r?.find((c, i) => i > 0 && typeof c === 'number');
    if (typeof v !== 'number') throw new Error(`Prisons: no "${label}" total`);
    return v;
  };
  const population = total('Population');
  const capacity = total('Useable Operational Capacity');
  let yearAgo: { value: number; period: string } | null = null;
  const ad = agoAt >= 0 ? /(\d{1,2}) (\w+) (\d{4})/.exec(String(rows[agoAt][0])) : null;
  if (ad && monthIndex(ad[2]) >= 0) {
    yearAgo = { value: Math.round(1000 * total('Population', agoAt) / total('Useable Operational Capacity', agoAt)) / 10, period: `${ad[3]}-${String(monthIndex(ad[2]) + 1).padStart(2, '0')}-${ad[1].padStart(2, '0')}` };
  }
  return { value: Math.round(1000 * population / capacity) / 10, period: `${d[3]}-${String(mi + 1).padStart(2, '0')}-${d[1].padStart(2, '0')}`, population, capacity, yearAgo };
}

// ---- The publisher's own release date on its page: "Publication Date: 22 Oct 2026" (NHS England Digital) or
// "published 12 November 2026" (NHS England's statistics pages). null when the page gives none.
export function publishedOn(html: string): string | null {
  const t = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const m = /Publication Date:\s*(\d{1,2}) ([A-Za-z]{3,}) (\d{4})|\bpublished (\d{1,2}) ([A-Za-z]{3,}) (\d{4})/i.exec(t);
  if (!m) return null;
  const [d, mon, y] = m[1] ? [m[1], m[2], m[3]] : [m[4], m[5], m[6]];
  const mi = monthIndex(mon);
  return mi < 0 ? null : `${y}-${String(mi + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// ---- When a newer figure is due (for the freshness monitor), from the period held. A grace of a week or more after the
// usual release, so a normal publication day is never flagged.
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const monthEnd = (period: string) => { const [y, m] = period.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
const quarterEnd = (period: string) => { const q = /^(\d{4})-Q([1-4])$/.exec(period); return q ? monthEnd(`${q[1]}-${String(Number(q[2]) * 3).padStart(2, '0')}`) : null; };
export const DUE_AFTER: Record<string, (r: { period: string; released_at: string | null }) => string | null> = {
  ae_4hr_pct: (r) => addDays(monthEnd(r.period), 31 + 21),        // next month's figures: second Thursday of the month after it
  rtt_waiting_list: (r) => addDays(monthEnd(r.period), 61 + 21),  // two months behind, second Thursday
  gp_fte: (r) => addDays(monthEnd(r.period), 31 + 35),            // next month's edition: about four weeks after its month ends
  prison_occupancy_pct: (r) => addDays(r.period, 7 + 7),          // weekly, Mondays
  crown_court_backlog: (r) => { const e = quarterEnd(r.period); return e ? addDays(e, 92 + 105) : null; },  // quarterly, about 3 months behind
  ta_households: (r) => { const e = quarterEnd(r.period); return e ? addDays(e, 92 + 170) : null; },        // quarterly, about 5 months behind (Apr to Jun 2026 on 26 Nov: 3 weeks' grace)
  schools_persistent_absence: (r) => (r.released_at ? addDays(r.released_at, 365 + 30) : null),
  childrens_homes_good: (r) => (r.released_at ? addDays(r.released_at, 365 + 30) : null),
  police_charge_rate: (r) => (r.released_at ? addDays(r.released_at, 365 + 30) : null),
  asc_vacancy_rate: (r) => (r.released_at ? addDays(r.released_at, 365 + 30) : null),
};
export function dashboardOverdue(rows: { indicator_key: string; label: string; period: string; released_at: string | null }[], today: string) {
  return rows.flatMap((r) => {
    const due = DUE_AFTER[r.indicator_key]?.(r) ?? null;
    return due && today > due ? [{ key: r.indicator_key, label: r.label, period: r.period, due }] : [];
  });
}

// ---- The year-earlier line ("Recent:" on the dashboard), in the wording of the lines loaded by hand (17 Nov 2026), and its
// direction: better or worse by more than the margin given (1 per cent of the figure, or 0.3 points for a percentage
// figure), otherwise flat. direction_good is the row's own: 'up' or 'down'.
const fmt0 = (n: number) => Math.round(n).toLocaleString('en-GB');
export function yearEarlierLine(key: string, now: number, ago: number, agoLabel: string, directionGood: 'up' | 'down'): { recent_change: string; recent_direction: 'improving' | 'worsening' | 'flat' } {
  const diff = now - ago;
  const pctFigure = key === 'ae_4hr_pct' || key === 'prison_occupancy_pct';
  const moved = pctFigure ? Math.abs(diff) >= 0.3 : Math.abs(diff) / ago >= 0.01;
  const better = directionGood === 'up' ? diff > 0 : diff < 0;
  const recent_direction = !moved ? 'flat' : better ? 'improving' : 'worsening';
  const word = diff > 0 ? 'Up' : diff < 0 ? 'Down' : 'No change';
  let recent_change: string;
  if (key === 'ae_4hr_pct') recent_change = diff === 0 ? `No change on ${agoLabel} (${ago.toFixed(1)} per cent)` : `${word} ${Math.abs(diff).toFixed(1)} points on ${agoLabel} (${ago.toFixed(1)} per cent)`;
  else if (key === 'prison_occupancy_pct') recent_change = diff === 0 ? `No change on ${agoLabel} (${ago.toFixed(1)} per cent)` : `${word} from ${ago.toFixed(1)} per cent in ${agoLabel}`;
  else if (key === 'rtt_waiting_list') recent_change = `${word} ${fmt0(Math.abs(diff))} (${(Math.abs(diff) / ago * 100).toFixed(1)} per cent) on ${agoLabel} (${(ago / 1e6).toFixed(2)}m)`;
  else recent_change = `${word} ${fmt0(Math.abs(diff))} (${(Math.abs(diff) / ago * 100).toFixed(1)} per cent) on ${agoLabel}`;
  return { recent_change, recent_direction };
}
