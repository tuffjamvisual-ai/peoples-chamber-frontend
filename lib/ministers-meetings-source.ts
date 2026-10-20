// Reading ministers' meetings returns from GOV.UK: shared by the weekly sync (app/api/sync-ministers-meetings) and
// the full reload (scripts/reload-ministers-meetings.ts). No imports from the app, so Node can run it directly.
//
// Owner's approval, 20 Oct 2026 (lobbying phase 1):
//   - Text: each CSV is read as UTF-8, or as Windows-1252 when it is not valid UTF-8. Reading every file as UTF-8
//     turned characters such as ’ and – in Windows-1252 files into "�" and lost them.
//   - Dates: the published text is kept (meeting_date_raw). A date is read only from a recognised form; a date
//     after the return was published cannot be right: if reading it as month/day puts it inside the return's
//     quarter, that is used (and noted), otherwise it is left empty with a note. Nothing else is guessed.
//   - Source: every row records its publication (slug and address) and the CSV it came from.
//   - Coverage: Scotland Office, Wales Office, Northern Ireland Office and the Office of the Advocate General
//     added; publication titles need "meetings" and "minister" (some departments do not write "ministerial").
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export const DEPT_SLUGS = [
  'cabinet-office',
  'prime-ministers-office-10-downing-street',
  'deputy-prime-ministers-office',
  'attorney-generals-office',
  'department-for-business-and-trade',
  'department-for-culture-media-and-sport',
  'department-for-education',
  'department-for-energy-security-and-net-zero',
  'department-for-environment-food-rural-affairs',
  'department-for-science-innovation-and-technology',
  'department-for-transport',
  'department-for-work-pensions',
  'department-of-health-and-social-care',
  'foreign-commonwealth-development-office',
  'hm-treasury',
  'home-office',
  'ministry-of-defence',
  'ministry-of-housing-communities-local-government',
  'ministry-of-justice',
  'scotland-office',
  'wales-office',
  'northern-ireland-office',
  'office-of-the-advocate-general-for-scotland',
];
export const CUTOFF_ISO = '2024-07-04';
const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';

export type Fetched = { ok: boolean; status: number; bytes: Uint8Array };
export type FetchFn = (url: string) => Promise<Fetched>;

export type Publication = { title: string; link: string; public_timestamp?: string };
export type Attachment = { url: string; title?: string; content_type?: string };
export type MeetingRow = {
  minister_name: string;
  minister_dept: string | null;
  meeting_date: string | null;
  meeting_date_raw: string | null;
  date_note: string | null;
  organisation: string | null;
  purpose: string | null;
  quarter: string | null;
  source_publication_slug: string;
  source_publication_url: string;
  source_csv_url: string;
};

const json = (f: Fetched) => JSON.parse(new TextDecoder('utf-8').decode(f.bytes));

// UTF-8 when the bytes are valid UTF-8, else Windows-1252 (the encoding Excel uses when saving CSV on Windows).
export function decodeCsv(bytes: Uint8Array): { text: string; encoding: 'utf-8' | 'windows-1252' } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
  }
}

export async function findPublications(fetchFn: FetchFn, deptSlug: string): Promise<{ kept: Publication[]; all: Publication[] }> {
  const all: Publication[] = [];
  for (let start = 0; start < 1000; ) {
    const url = `${SEARCH}?filter_format=transparency&filter_organisations=${deptSlug}` +
      `&q=${encodeURIComponent('ministers meetings hospitality')}` +
      `&filter_public_timestamp=${encodeURIComponent('from:' + CUTOFF_ISO)}` +
      `&order=-public_timestamp&count=100&start=${start}`;
    const res = await fetchFn(url);
    if (!res.ok) break;
    const data = json(res) as { results?: Publication[]; total?: number };
    const results = data.results || [];
    if (results.length === 0) break;
    all.push(...results);
    start += results.length;
    if (start >= (data.total || 0)) break;
  }
  // Ministers' returns: "...ministerial gifts, hospitality, travel and meetings..." or, for the Scotland and Wales
  // Offices, "Ministerial Transparency Return April-June 2026". Special advisers' and senior officials' returns are not.
  const kept = all.filter((r) => {
    const t = String(r.title || '').toLowerCase();
    return ((t.includes('minister') && (t.includes('meetings') || /transparency (return|data)/.test(t))) || /transparency return/.test(t))
      && !/special adviser|senior official/.test(t);
  });
  return { kept, all };
}

export async function fetchAttachments(fetchFn: FetchFn, link: string): Promise<Attachment[]> {
  const res = await fetchFn(`${CONTENT}${link}`);
  if (!res.ok) throw new Error(`Content API ${res.status} for ${link}`);
  const data = json(res) as { details?: { attachments?: Attachment[] } };
  return data?.details?.attachments || [];
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// The meetings file of a publication: a CSV, or an Excel file where the department published no CSV (DfE, HM
// Treasury and MOJ have published some quarters as Excel only).
// The file is picked by its title or its file name, as GOV.UK titles are sometimes crossed (DSIT April to June 2026:
// "...Meetings.csv" is titled "ministerial travel"); a file whose columns are not a meetings table gives no rows.
const fileName = (u: string) => decodeURIComponent(u.split('/').pop() || '');
export const meetingsCsvs = (atts: Attachment[]) => {
  const files = atts.filter((a) => {
    if (a.content_type !== 'text/csv' && a.content_type !== XLSX_TYPE) return false;
    const t = a.title || ''; const f = fileName(a.url || '');
    return (/meetings?/i.test(t) && !/hospitality|gifts|travel|expenses/i.test(t)) || /meetings?\.(csv|xlsx)$/i.test(f);
  });
  if (files.length) return files;
  // No separate meetings file: a combined Excel workbook ("Ministers Overseas Travel and Meetings Transparency"),
  // read from its sheet with an organisation column.
  return atts.filter((a) => a.content_type === XLSX_TYPE && /meetings?/i.test(a.title || ''));
};

export type Quarter = { label: string; start: string; end: string };
const quarter = (q: number, y: number): Quarter => ({
  label: `Q${q} ${y}`, start: `${y}-${String(q * 3 - 2).padStart(2, '0')}-01`, end: `${y}-${['03-31', '06-30', '09-30', '12-31'][q - 1]}`,
});
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// The calendar quarter a title or address names: "January to March 2026", "1 October to 31 December 2025",
// "April 2025 to June 2025", "july-to-september-2025", or DCMS's financial-year "Q4 25/26" (= January to March 2026).
function quarterFromText(text: string): Quarter | null {
  const t = String(text || '').toLowerCase().replace(/[-_]/g, ' ');
  const mon = `(${MONTH_NAMES.join('|')}|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)`;
  // "January to March 2026", "Jan-March 2026", "Oct - Dec2025", "July - Sept 24" (hyphens become spaces above)
  const m = t.match(new RegExp(`${mon}(?:\\s+\\d{4})?\\s*(?:to|–|\\s)\\s*(?:\\d{1,2}\\s+)?${mon}\\s*(\\d{4}|\\d{2})\\b`));
  if (m) {
    const end = MONTH_NAMES.findIndex((x) => x.startsWith(m[2].slice(0, 3))) + 1;
    const start = MONTH_NAMES.findIndex((x) => x.startsWith(m[1].slice(0, 3))) + 1;
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (end % 3 === 0 && end - start === 2) return quarter(end / 3, y);
  }
  const f = t.match(/\bq([1-4])\s*(\d{2})\s*\/?\s*(\d{2})\b/); // financial year: Q1 = April to June of the first year
  if (f) { const q = Number(f[1]); const y = 2000 + Number(f[2]); return q === 4 ? quarter(1, y + 1) : quarter(q + 1, y); }
  return null;
}
export const quarterOf = (...texts: (string | undefined)[]): Quarter | null => {
  for (const x of texts) { const q = x ? quarterFromText(x) : null; if (q) return q; }
  return null;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// Reads a published date in a recognised form. Returns the day/month parts too, so a misread order can be checked.
function readDate(raw: string): { date: string | null; d?: number; m?: number; y?: number; note?: string } {
  const s = raw.trim().replace(/\s+00:00(:00)?$/, '');
  let x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (x) return { date: iso(+x[1], +x[2], +x[3]), y: +x[1], m: +x[2], d: +x[3] };
  x = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (x) return { date: iso(+x[1], +x[2], +x[3]), y: +x[1], m: +x[2], d: +x[3] };
  x = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (x) { const y = x[3].length === 2 ? 2000 + +x[3] : +x[3]; return { date: iso(y, +x[2], +x[1]), y, m: +x[2], d: +x[1] }; }
  x = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{2}|\d{4})$/);
  if (x && MONTHS.includes(x[2].slice(0, 3).toLowerCase())) {
    const y = x[3].length === 2 ? 2000 + +x[3] : +x[3]; const m = MONTHS.indexOf(x[2].slice(0, 3).toLowerCase()) + 1;
    return { date: iso(y, m, +x[1]), y, m, d: +x[1] };
  }
  x = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (x && MONTHS.includes(x[1].slice(0, 3).toLowerCase())) {
    const m = MONTHS.indexOf(x[1].slice(0, 3).toLowerCase()) + 1; return { date: iso(+x[3], m, +x[2]), y: +x[3], m, d: +x[2] };
  }
  x = s.match(/^([A-Za-z]{3,9})[\s-]+(\d{2}|\d{4})$/);
  if (x && MONTHS.includes(x[1].slice(0, 3).toLowerCase())) return { date: null, note: `the return gives a month only ("${raw.trim()}")` };
  x = s.match(/^(\d{5})(?:\.0+)?$/); // spreadsheet day number
  if (x) { const dt = new Date(Date.UTC(1899, 11, 30) + +x[1] * 86400000); return { date: dt.toISOString().slice(0, 10) }; }
  return { date: null, note: raw.trim() ? `the date "${raw.trim()}" is not in a recognised form` : 'no date given' };
}

export function parseMeetingDate(raw: string | null | undefined, q: Quarter | null, publishedAt: string | null, today: string):
  { date: string | null; note: string | null } {
  if (!raw || !String(raw).trim()) return { date: null, note: 'no date given' };
  const r = readDate(String(raw));
  if (!r.date) return { date: null, note: r.note ?? `the date "${String(raw).trim()}" cannot be read` };
  const latest = (publishedAt && publishedAt.slice(0, 10) < today) ? publishedAt.slice(0, 10) : today;
  if (r.date <= latest) return { date: r.date, note: null };
  if (q && r.d && r.m && r.y && r.d <= 12) {
    const swapped = iso(r.y, r.d, r.m);
    if (swapped && swapped >= q.start && swapped <= q.end) return { date: swapped, note: `read as month/day ("${String(raw).trim()}")` };
  }
  return { date: null, note: `the date "${String(raw).trim()}" is after the return was published${publishedAt ? ` (${publishedAt.slice(0, 10)})` : ''}` };
}

const HEADER_MAP: Record<string, string[]> = {
  minister_name: ['minister', 'minister name', 'name of minister'],
  meeting_date: ['date', 'date of meeting', 'meeting date', 'month'],
  organisation: ['name of individual or organisation', 'name of organisation or individual', 'organisation', 'name of organisation',
    'organisation met', 'individual or organisation', 'name of external organisation'],
};
const PURPOSE_HEADERS = new Set(['purpose', 'purpose of meeting', 'reason']);
const normaliseHeader = (h: string) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

export function deptFromCsvTitle(title: string): string | null {
  let s = String(title || '').split(/ meetings,/i)[0].trim();
  s = s.replace(/\s+(ministers'|ministers|ministerial)$/i, '').trim();
  s = s.replace(/['’]$/u, '').trim();
  return s || null;
}

// A line saying the minister had nothing to report, not a meeting.
const NIL = /^(nil|nil[\s-]*return|none|return pending)\.?$/i;

export type CsvResult = { rows: MeetingRow[]; encoding: string; problem: string | null };

// An Excel file's first sheet with recognised headings, as rows of text. Dates are taken from the cell's date value
// (as yyyy-mm-dd), never from its displayed text, which Excel may show month first.
function xlsxRecords(bytes: Uint8Array): string[][] {
  const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '' });
    const out = rows.map((r) => r.map((v) => (v instanceof Date
      ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
      : String(v ?? '').trim())));
    const heads = out.slice(0, 10).map((r) => r.map(normaliseHeader));
    if (heads.some((h) => h.some((x) => HEADER_MAP.minister_name.includes(x)) && h.some((x) => HEADER_MAP.organisation.includes(x)))) return out;
  }
  return [];
}

export function parseMeetingsCsv(bytes: Uint8Array, att: Attachment, pub: Publication, today: string): CsvResult {
  let records: string[][]; let encoding: string;
  if (att.content_type === XLSX_TYPE) {
    encoding = 'xlsx';
    try { records = xlsxRecords(bytes); } catch (e) { return { rows: [], encoding, problem: `Excel file could not be read: ${(e as Error).message.slice(0, 80)}` }; }
  } else {
    const dec = decodeCsv(bytes); encoding = dec.encoding;
    try { records = parse(dec.text, { skip_empty_lines: true, trim: true, bom: true, relax_column_count: true }) as string[][]; } catch (e) {
      return { rows: [], encoding, problem: `CSV could not be read: ${(e as Error).message.slice(0, 80)}` };
    }
  }
  // the heading row: the first of the first ten rows with a recognised date heading (some files have a title above)
  const h = records.slice(0, 10).findIndex((r) => r.map(normaliseHeader).some((x) => HEADER_MAP.meeting_date.includes(x)));
  if (h > 0) records = records.slice(h);
  if (records.length < 2) return { rows: [], encoding, problem: 'file has no rows' };
  const headers = records[0];
  const norm = headers.map(normaliseHeader);
  const idx: Record<string, number> = {};
  for (const [target, cands] of Object.entries(HEADER_MAP)) for (const c of cands) { const i = norm.indexOf(c); if (i !== -1) { idx[target] = i; break; } }
  // DCMS January to March 2025: the minister column has no heading; it is the first column, before "Date".
  if (idx.minister_name === undefined && norm[0] === '' && idx.meeting_date === 1) idx.minister_name = 0;
  if (idx.minister_name === undefined || idx.meeting_date === undefined) return { rows: [], encoding, problem: `columns not recognised (${headers.slice(0, 5).join(' | ')})` };
  const slug = pub.link.replace(/^.*\/publications\//, '');
  const q = quarterOf(att.title, pub.title, slug);
  const used = new Set([idx.minister_name, idx.meeting_date, idx.organisation].filter((i) => i !== undefined));
  const rows: MeetingRow[] = [];
  for (const vals of records.slice(1)) {
    const minister = String(vals[idx.minister_name] ?? '').trim();
    if (!minister || minister.startsWith('*')) continue; // "*Meetings were conducted in line with..." is a footnote
    const raw = String(vals[idx.meeting_date] ?? '').trim();
    const orgCell = idx.organisation !== undefined ? String(vals[idx.organisation] ?? '').trim() : '';
    if (NIL.test(raw) || NIL.test(orgCell)) continue; // "Nil return": the minister had no meetings to report
    const { date, note } = parseMeetingDate(raw, q, pub.public_timestamp ?? null, today);
    if (date && date < CUTOFF_ISO) continue;
    const purpose: string[] = [];
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const v = String(vals[i] ?? '').trim();
      if (!v) return;
      purpose.push(PURPOSE_HEADERS.has(normaliseHeader(h)) ? v : `${String(h).trim()}: ${v}`);
    });
    const org = idx.organisation !== undefined ? String(vals[idx.organisation] ?? '').trim() : '';
    rows.push({
      minister_name: minister, minister_dept: deptFromCsvTitle(att.title || ''), meeting_date: date, meeting_date_raw: raw || null, date_note: note,
      organisation: org || null, purpose: purpose.length ? purpose.join(' | ') : null, quarter: q ? q.label : null,
      source_publication_slug: slug, source_publication_url: `https://www.gov.uk${pub.link}`, source_csv_url: att.url,
    });
  }
  return { rows, encoding, problem: rows.length ? null : 'no meeting rows after the column headings' };
}
