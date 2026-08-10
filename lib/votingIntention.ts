import { parse, type HTMLElement } from 'node-html-parser';

// Voting-intention ingestion. Wikipedia is the PRIMARY, authoritative source
// (complete, all pollsters incl. Survation, CC BY-SA). BritPolls voting-intention.json
// is a SECONDARY supplement (CC BY 4.0): it corroborates Wikipedia rows and can add
// a same-day-fresh poll before Wikipedia's table updates, but is never sole authority
// (it omits Survation). See lib note + the /polls/voting-intention page for attribution.
//
// Decisions baked in (confirmed 2026-07-11):
//  1. MRP rows tagged poll_type='mrp' (kept separate, excluded from averages).
//  2. Dates normalised: year attached from the table's section, ranges -> canonical end date.
//  3. Attribution: display-only; share-alike not triggered (revisit if a data export/API is built).

export type VIPoll = {
  pollster: string;
  client: string | null;
  area: string;
  poll_type: 'standard' | 'mrp';
  fieldwork_label: string | null;
  fieldwork_start: string | null; // ISO date or null
  fieldwork_end: string;          // ISO date (canonical sort key)
  sample_size: number | null;
  pct_lab: number | null; pct_con: number | null; pct_ref: number | null; pct_ld: number | null;
  pct_grn: number | null; pct_snp: number | null; pct_pc: number | null; pct_rb: number | null; pct_oth: number | null;
  lead: number | null;
  figures_json: Record<string, number | null>;
  source: 'wikipedia' | 'britpolls';
  source_url: string;
  corroborated_by: string[];
};

const WIKI_PAGE = 'Opinion_polling_for_the_next_United_Kingdom_general_election';
const WIKI_URL = `https://en.wikipedia.org/wiki/${WIKI_PAGE}`;
const WIKI_API = `https://en.wikipedia.org/w/api.php?action=parse&page=${WIKI_PAGE}&format=json&prop=text&formatversion=2`;
const BRITPOLLS_URL = 'https://britpolls.co.uk/data/voting-intention.json';
const UA = 'OpenGovtBot/1.0 (+https://www.opengovt.uk; voting-intention aggregation)';

// Canonical pollster names (collapse spelling variants across the two sources).
const POLLSTER_ALIASES: Record<string, string> = {
  'ipsos mori': 'Ipsos', 'ipsos uk': 'Ipsos',
  'redfield & wilton': 'Redfield & Wilton', 'redfield and wilton': 'Redfield & Wilton',
  'lord ashcroft polls': 'Lord Ashcroft', 'lord ashcroft': 'Lord Ashcroft',
  'more in common (mrp)': 'More in Common', 'more in common': 'More in Common',
};
export function normalisePollster(raw: string): string {
  const s = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  return POLLSTER_ALIASES[s.toLowerCase()] || s;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
function pad(n: number) { return String(n).padStart(2, '0'); }

// "8–9 Jul" / "23–30 Jun 2026" / "28 Jun–2 Jul" / "31 Dec" -> canonical ISO end date.
export function parseDateRangeToEnd(label: string, sectionYear: number): { start: string | null; end: string | null } {
  if (!label) return { start: null, end: null };
  const clean = label.replace(/\[[^\]]*\]/g, '').replace(/[–—]/g, '-').trim();
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : sectionYear;
  const parts = clean.replace(/\b20\d{2}\b/, '').split('-').map((p) => p.trim()).filter(Boolean);
  const monthsAll = [...clean.matchAll(/([a-z]{3})[a-z]*/gi)].map((m) => m[1].toLowerCase()).filter((m) => m in MONTHS);
  const lastMonth = monthsAll.length ? MONTHS[monthsAll[monthsAll.length - 1]] : null;
  const firstMonth = monthsAll.length ? MONTHS[monthsAll[0]] : lastMonth;

  function dayMonthOf(seg: string, fallbackMonth: number | null): { d: number | null; m: number | null } {
    const dm = seg.match(/(\d{1,2})\s*([a-z]{3})?/i);
    if (!dm) return { d: null, m: fallbackMonth };
    const d = parseInt(dm[1], 10);
    const m = dm[2] && dm[2].toLowerCase() in MONTHS ? MONTHS[dm[2].toLowerCase()] : fallbackMonth;
    return { d, m };
  }
  const endSeg = parts[parts.length - 1] || clean;
  const startSeg = parts[0] || clean;
  const end = dayMonthOf(endSeg, lastMonth);
  const start = dayMonthOf(startSeg, firstMonth);

  const iso = (d: number | null, m: number | null, y: number) =>
    d && m ? `${y}-${pad(m)}-${pad(d)}` : null;
  // Year rollover: a range ending in Jan that started in Dec belongs to sectionYear (end) with start in year-1.
  let endYear = year, startYear = year;
  if (end.m && start.m && end.m < start.m) startYear = year - 1;
  return { start: iso(start.d, start.m, startYear), end: iso(end.d, end.m, endYear) };
}

function parsePct(raw: string): number | null {
  if (!raw) return null;
  const s = raw.replace(/\[[^\]]*\]/g, '').replace('%', '').replace(/[−–—]/g, '-').replace('Tied', '0').trim();
  if (!s || s === '-' || s === '—' || /^n\/?a$/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function parseSample(raw: string): number | null {
  const s = (raw || '').replace(/[^0-9]/g, '');
  return s ? parseInt(s, 10) : null;
}

// Map a header cell's text to one of our party keys.
function headerToParty(text: string): keyof VIPoll | null {
  const t = text.toLowerCase().replace(/\[[^\]]*\]/g, '').trim();
  if (t === 'lab' || t.startsWith('labour')) return 'pct_lab';
  if (t === 'con' || t.startsWith('conservative')) return 'pct_con';
  if (t === 'ref' || t.startsWith('reform')) return 'pct_ref';
  if (t === 'ld' || t.startsWith('lib')) return 'pct_ld';
  if (t === 'grn' || t.startsWith('green')) return 'pct_grn';
  if (t === 'snp') return 'pct_snp';
  if (t === 'pc' || t.startsWith('plaid')) return 'pct_pc';
  if (t === 'rb' || t.startsWith('restore')) return 'pct_rb';
  if (t.startsWith('other')) return 'pct_oth';
  return null;
}

// --- Wikipedia --------------------------------------------------------------
export async function fetchAndParseWikipedia(): Promise<VIPoll[]> {
  const res = await fetch(WIKI_API, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`wikipedia api ${res.status}`);
  const data = (await res.json()) as { parse?: { text?: string } };
  const html = data.parse?.text;
  if (!html) throw new Error('wikipedia: no html');
  const root = parse(html);

  const nodes = root.querySelectorAll('h2, h3, table.wikitable');
  let currentYear = new Date().getUTCFullYear();
  const out: VIPoll[] = [];
  let nationalTablesParsed = 0;

  for (const node of nodes) {
    const tag = node.tagName?.toLowerCase();
    if (tag === 'h2' || tag === 'h3') {
      const ym = node.text.match(/\b(20\d{2})\b/);
      if (ym) currentYear = parseInt(ym[1], 10);
      continue;
    }
    // table.wikitable
    const rows = node.querySelectorAll('tr');
    if (rows.length < 2) continue;
    // Build column map from the header row(s): find the row containing "Pollster".
    let headerRow: HTMLElement | null = null;
    for (const r of rows.slice(0, 3)) {
      if (/pollster/i.test(r.text)) { headerRow = r; break; }
    }
    if (!headerRow) continue;
    const headerCells = headerRow.querySelectorAll('th, td');
    const colParty: (keyof VIPoll | null)[] = [];
    let hasArea = false, hasPollster = false, hasSample = false;
    headerCells.forEach((c) => {
      const t = c.text.replace(/\s+/g, ' ').trim();
      if (/^pollster$/i.test(t)) hasPollster = true;
      if (/^area$/i.test(t) || /^method$/i.test(t)) hasArea = true;
      if (/sample/i.test(t)) hasSample = true;
      colParty.push(headerToParty(t));
    });
    const hasLab = colParty.includes('pct_lab');
    const hasCon = colParty.includes('pct_con');
    if (!(hasPollster && hasLab && hasCon)) continue; // not a national VI table
    void hasArea; void hasSample;

    nationalTablesParsed++;
    // Column indices for the non-party fields (by header text position).
    const idx = { date: -1, pollster: -1, client: -1, area: -1, sample: -1 };
    headerCells.forEach((c, i) => {
      const t = c.text.replace(/\s+/g, ' ').trim().toLowerCase();
      if (idx.date < 0 && t.startsWith('date')) idx.date = i;
      else if (idx.pollster < 0 && t === 'pollster') idx.pollster = i;
      else if (idx.client < 0 && t === 'client') idx.client = i;
      else if (idx.area < 0 && (t === 'area' || t === 'method')) idx.area = i;
      else if (idx.sample < 0 && t.includes('sample')) idx.sample = i;
    });

    for (const r of rows) {
      if (r === headerRow) continue;
      const cells = r.querySelectorAll('td, th');
      if (cells.length < headerCells.length - 2) continue; // skip event/separator rows
      const cellText = (i: number) => (i >= 0 && i < cells.length ? cells[i].text.replace(/\s+/g, ' ').trim() : '');
      const pollsterRaw = cellText(idx.pollster);
      const lab = parsePct(cellText(colParty.indexOf('pct_lab')));
      const con = parsePct(cellText(colParty.indexOf('pct_con')));
      if (!pollsterRaw || lab === null || con === null) continue; // real poll rows only

      const figures: Record<string, number | null> = {};
      const val = (k: keyof VIPoll) => {
        const ci = colParty.indexOf(k);
        const v = ci >= 0 ? parsePct(cellText(ci)) : null;
        figures[k.replace('pct_', '')] = v;
        return v;
      };
      const dm = parseDateRangeToEnd(cellText(idx.date), currentYear);
      if (!dm.end) continue;
      const isMrp = /\bMRP\b/i.test(pollsterRaw);
      const clientRaw = cellText(idx.client);
      const client = clientRaw && !/^(n\/?a|[-–—?.])$/i.test(clientRaw) ? clientRaw : null;
      out.push({
        pollster: normalisePollster(pollsterRaw),
        client,
        area: cellText(idx.area) || 'GB',
        poll_type: isMrp ? 'mrp' : 'standard',
        fieldwork_label: cellText(idx.date) || null,
        fieldwork_start: dm.start,
        fieldwork_end: dm.end,
        sample_size: parseSample(cellText(idx.sample)),
        pct_lab: val('pct_lab'), pct_con: val('pct_con'), pct_ref: val('pct_ref'), pct_ld: val('pct_ld'),
        pct_grn: val('pct_grn'), pct_snp: val('pct_snp'), pct_pc: val('pct_pc'), pct_rb: val('pct_rb'), pct_oth: val('pct_oth'),
        lead: null,
        figures_json: figures,
        source: 'wikipedia',
        source_url: WIKI_URL,
        corroborated_by: [],
      });
    }
    if (nationalTablesParsed >= 2) break; // current year + prior year
  }
  return out;
}

// --- BritPolls (secondary) --------------------------------------------------
export async function fetchAndParseBritPolls(): Promise<VIPoll[]> {
  const res = await fetch(BRITPOLLS_URL, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`britpolls ${res.status}`);
  const data = (await res.json()) as { polls?: Array<Record<string, unknown>> };
  const polls = data.polls || [];
  return polls.map((p) => {
    const num = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : null);
    const figures = { lab: num('labour'), con: num('conservatives'), ref: num('reform_uk'), ld: num('lib_dems'), grn: num('greens'), snp: num('snp'), oth: num('others') };
    return {
      pollster: normalisePollster(String(p.pollster || '')),
      client: null,
      area: 'GB',
      poll_type: 'standard' as const,
      fieldwork_label: String(p.date || ''),
      fieldwork_start: null,
      fieldwork_end: String(p.date || ''),
      sample_size: num('sample'),
      pct_lab: figures.lab, pct_con: figures.con, pct_ref: figures.ref, pct_ld: figures.ld,
      pct_grn: figures.grn, pct_snp: figures.snp, pct_pc: null, pct_rb: null, pct_oth: figures.oth,
      lead: null,
      figures_json: figures,
      source: 'britpolls' as const,
      source_url: BRITPOLLS_URL,
      corroborated_by: [],
    };
  }).filter((p) => p.pollster && p.fieldwork_end && p.pct_lab !== null && p.pct_con !== null);
}

const keyOf = (p: VIPoll) => `${p.pollster.toLowerCase()}|${p.fieldwork_end}|${p.area}|${p.poll_type}`;

// Wikipedia authoritative; BritPolls corroborates existing rows or adds fresh ones.
export function mergeAndDedup(wiki: VIPoll[], brit: VIPoll[]): VIPoll[] {
  const byKey = new Map<string, VIPoll>();
  for (const w of wiki) byKey.set(keyOf(w), w);
  for (const b of brit) {
    const k = keyOf(b);
    const existing = byKey.get(k);
    if (existing) {
      if (!existing.corroborated_by.includes('britpolls')) existing.corroborated_by.push('britpolls');
    } else {
      byKey.set(k, b); // fresh poll Wikipedia hasn't listed yet
    }
  }
  return [...byKey.values()];
}
