// The Cabinet Office's yearly named list of special advisers ("Special adviser data releases: numbers and costs"),
// read from the GOV.UK Content API (owner, 28 Oct 2026). Used by /api/sync-spad-roster and its local dry run.
//
// The release is an HTML publication. Its "List of Special Advisers" table has one row per appointment: Appointing
// Minister | Special Adviser | Pay Band | Salary Band (if £81,000 or above). An adviser shared between two ministers
// (for example 50 per cent at two departments) has a row for each. Footnote markers are glued to some names
// ("Sophie Nazemi4[footnote 4]"); the footnotes become notes in our own words. The totals come from the cost table
// and the "As at 31 March 2026, there were 159 (155 full-time equivalent)" sentence.
import { parse, type HTMLElement } from 'node-html-parser';

export const SPAD_UA = 'OpenGovt/1.0 (contact@opengovt.uk)';
export const SPAD_SEARCH = 'https://www.gov.uk/api/search.json?q=%22special+adviser+data+releases%22+%22numbers+and+costs%22&order=-public_timestamp&count=20&fields=title,link,public_timestamp,format';

export type SpadAppointment = {
  adviser_name: string;
  minister_title: string;
  minister_name: string | null;
  pay_band: number | null;
  salary_band_text: string | null;
  salary_band_min: number | null;
  salary_band_max: number | null;
  notes: string[];
};
export type SpadRelease = {
  release_slug: string;
  as_at: string;            // yyyy-mm-dd
  headcount: number | null;
  fte: number | null;
  paybill: number | null;   // pounds
  salary: number | null;
  ni: number | null;
  pensions: number | null;
  severance: number | null;
  prior_paybill: number | null;
  prior_severance: number | null;
  source_url: string;
  published_at: string | null;
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// NFKC turns the source's typographic ligatures ("Oﬃce", "Aﬀairs") back into letters, and no break spaces into spaces.
const clean = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

// Footnotes in our own words (no dashes); anything not recognised keeps the source wording with dashes made colons.
function noteWords(raw: string): string {
  const t = clean(raw).replace(/\s*↩.*$/, '').replace(/\.$/, '');
  if (/temporarily uplifted/i.test(t)) return 'Salary temporarily uplifted';
  if (/temporarily works part time/i.test(t)) return 'Temporarily part time';
  if (/works part time/i.test(t)) return 'Part time: the band shown is the full time equivalent';
  if (/temporary appointment/i.test(t)) return 'Temporary appointment';
  if (/council of economic advisers/i.test(t)) return 'Council of Economic Advisers';
  if (/50\s*%\s*time|50 per cent/i.test(t)) return 'Half time for each of two Secretaries of State, so listed under both';
  return t.replace(/\s+[-–—]\s+/g, ': ');
}

// "The Prime Minister, First Lord ... – The Rt Hon Sir Keir Starmer KCB KC MP" → title and name. The dash between them
// varies (hyphen, en or em dash); a row may have no name at all.
export function splitMinister(cell: string): { title: string; name: string | null } {
  const c = clean(cell);
  const m = c.match(/^(.*?)\s+[-–—]\s+(.+)$/) ?? c.match(/^(.*?)[-–—]\s*((?:The\s+)?(?:Rt\.?\s+Hon|Rt\.?\s+Hon\.?|Lord|Baroness|Sir|Dame)\b.+)$/i);
  if (!m) return { title: c, name: null };
  return { title: m[1].replace(/[,;]\s*$/, '').trim(), name: m[2].trim() || null };
}

// For matching against our MPs table: the person's name without honorifics, letters after the name or "MP".
export function bareName(name: string): string {
  return clean(name)
    .replace(/^(the\s+)?(rt\.?\s+(hon\.?\s+)?|right\s+honourable\s+)/i, '') // "The Rt Ed Miliband MP": Hon missing in the source
    .replace(/^(sir|dame|dr|mr|mrs|ms|miss)\s+/i, '')
    .replace(/(\s+(kcb|kc|qc|mp|obe|cbe|mbe|dbe|kbe|pc|frs|cb|ksg))+\s*$/i, '')
    .replace(/[^\p{L}\s'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pounds(s: string): number | null {
  const m = clean(s).match(/£\s*([\d.,]+)\s*(m|bn|k)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  const mult = m[2]?.toLowerCase() === 'm' ? 1e6 : m[2]?.toLowerCase() === 'bn' ? 1e9 : m[2]?.toLowerCase() === 'k' ? 1e3 : 1;
  return Math.round(n * mult);
}

function salaryBand(s: string): { text: string | null; min: number | null; max: number | null } {
  const t = clean(s);
  // The £ is sometimes left off the top of the band ("£115,000-119,999").
  const nums = [...t.matchAll(/£?\s*(\d{1,3}(?:,\d{3})+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  if (!nums.length) return { text: t && !/^(n\/?a|-+|–)$/i.test(t) ? t : null, min: null, max: null };
  return { text: `£${nums[0].toLocaleString('en-GB')}${nums[1] ? ` to £${nums[1].toLocaleString('en-GB')}` : ''}`, min: nums[0], max: nums[1] ?? nums[0] };
}

// The adviser's name without footnote markers: the <sup> is removed, and digits glued to the end of the name
// ("Nazemi4") are dropped.
function adviserName(td: HTMLElement): string {
  const copy = parse(td.innerHTML);
  copy.querySelectorAll('sup').forEach((s) => s.remove());
  return clean(copy.text).replace(/\[?\s*(footnote\s*)?\d+\s*\]?$/i, '').replace(/\d+$/, '').trim();
}

export function parseRelease(html: string, meta: { slug: string; sourceUrl: string; publishedAt: string | null }): { release: SpadRelease; appointments: SpadAppointment[]; footnoteNames: Record<string, string[]> } {
  const root = parse(html);
  const text = clean(root.text);

  // Footnotes: id fn:N → our wording.
  const notes = new Map<string, string>();
  for (const li of root.querySelectorAll('li[id^="fn:"]')) notes.set(li.id.slice(3), noteWords(li.text));

  // The list: the table whose header has "Appointing Minister" and "Special Adviser".
  const table = root.querySelectorAll('table').find((t) => /appointing minister/i.test(t.text) && /special adviser/i.test(t.text));
  if (!table) throw new Error('no "List of Special Advisers" table in the release');
  const appointments: SpadAppointment[] = [];
  const footnoteNames: Record<string, string[]> = {};
  let lastTitle = '';
  for (const tr of table.querySelectorAll('tr')) {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 3) continue;
    // A row that is a notice, not an adviser ("... was in the process of appointing her special advisers"): its pay
    // band cell is not a band number.
    if (!/^\s*\d{1,2}\s*$/.test(clean(tds[2].text))) continue;
    const split = splitMinister(tds[0].text);
    // July 2023 splits one minister over rows: "Secretary of State for ..." with no name, then "– The Rt Hon ..." with
    // no title. A row with no title carries on the title above it.
    const title = split.title || lastTitle;
    const name = split.name;
    lastTitle = title;
    const adviser = adviserName(tds[1]);
    if (!adviser) continue;
    const refs = tds[1].querySelectorAll('a[href^="#fn:"]').map((a) => (a.getAttribute('href') ?? '').slice(4));
    const rowNotes = [...new Set(refs.map((r) => notes.get(r)).filter((x): x is string => !!x))];
    for (const r of refs) (footnoteNames[r] ??= []).push(adviser);
    const band = Number(clean(tds[2].text).match(/\d+/)?.[0]);
    const sal = salaryBand(tds[3]?.text ?? '');
    appointments.push({ adviser_name: adviser, minister_title: title, minister_name: name, pay_band: Number.isFinite(band) ? band : null, salary_band_text: sal.text, salary_band_min: sal.min, salary_band_max: sal.max, notes: rowNotes });
  }

  // Totals. "As at 31 March 2026, there were 159 (155 full-time equivalent) special advisers".
  const head = text.match(/As at (\d{1,2}) ([A-Za-z]+) (\d{4}), there were ([\d,]+) \(([\d,.]+) full.time equivalent\) special advisers/i);
  const asAt = head ? `${head[3]}-${String(MONTHS.indexOf(head[2].toLowerCase()) + 1).padStart(2, '0')}-${head[1].padStart(2, '0')}` : '';
  const costTable = root.querySelectorAll('table').find((t) => /severance/i.test(t.text) && /total pay/i.test(t.text));
  const cost = (label: RegExp): [number | null, number | null] => {
    const tr = costTable?.querySelectorAll('tr').find((r) => label.test(r.text));
    const cells = tr ? tr.querySelectorAll('td,th').slice(1).map((c) => pounds(c.text)) : [];
    return [cells[0] ?? null, cells[1] ?? null];
  };
  const [paybill, priorPaybill] = cost(/total pay/i);
  const [severance, priorSeverance] = cost(/severance/i);
  const release: SpadRelease = {
    release_slug: meta.slug,
    as_at: asAt,
    headcount: head ? Number(head[4].replace(/,/g, '')) : null,
    fte: head ? Number(head[5].replace(/,/g, '')) : null,
    paybill, salary: cost(/salary costs/i)[0], ni: cost(/national insurance/i)[0], pensions: cost(/pension/i)[0], severance,
    prior_paybill: priorPaybill, prior_severance: priorSeverance,
    source_url: meta.sourceUrl, published_at: meta.publishedAt,
  };
  return { release, appointments, footnoteNames };
}

// The same appointment can appear twice in the table only by mistake; the unique key is (adviser, minister title).
export function dedupe(rows: SpadAppointment[]): { rows: SpadAppointment[]; dropped: number } {
  const seen = new Map<string, SpadAppointment>();
  for (const r of rows) {
    const k = `${r.adviser_name.toLowerCase()}|${r.minister_title.toLowerCase()}`;
    const prev = seen.get(k);
    if (prev) prev.notes = [...new Set([...prev.notes, ...r.notes])];
    else seen.set(k, { ...r });
  }
  return { rows: [...seen.values()], dropped: rows.length - seen.size };
}

// Each minister's Open Govt MP id, matched by name (without honorifics) against our MPs table: a current MP first, or
// the only MP of that name. Lords ministers have no MP page and stay null, as does a row with no name.
export type MpName = { member_id: number; name: string | null; display_name: string | null; current_member: boolean | null };
export function matchMinisters(rows: SpadAppointment[], mps: MpName[]): { ids: Map<string, number>; unmatched: string[] } {
  const byName = new Map<string, MpName[]>();
  for (const m of mps) for (const n of new Set([m.name, m.display_name].filter((x): x is string => !!x).map((x) => bareName(x).toLowerCase()))) {
    byName.set(n, [...(byName.get(n) ?? []), m]);
  }
  const ids = new Map<string, number>();
  const unmatched: string[] = [];
  for (const name of new Set(rows.map((r) => r.minister_name ?? ''))) {
    const title = rows.find((r) => (r.minister_name ?? '') === name)!.minister_title;
    if (!name) { unmatched.push(`${title} (no name given)`); continue; }
    const hits = byName.get(bareName(name).toLowerCase()) ?? [];
    const current = hits.filter((h) => h.current_member);
    const pick = current.length === 1 ? current[0] : hits.length === 1 ? hits[0] : null;
    if (pick) ids.set(name, pick.member_id);
    else unmatched.push(`${name} (${title})${hits.length > 1 ? `: ${hits.length} MPs of that name` : ''}`);
  }
  return { ids, unmatched };
}
