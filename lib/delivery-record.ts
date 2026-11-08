// MP delivery record (owner approved the format, 8 Nov 2026, DR1). Stored in mp_biography.delivery_record (migration
// 2026-11-08b): NULL or one JSON object
//   { "items": [DeliveryItem, ...], "pledges": [Pledge, ...] }
// DeliveryItem:
//   area          text, e.g. "Transport"; "Legislation" for the MP's own bills
//   claim         what was delivered or planned
//   stage         "delivered" | "committed" | "in_development" | "not_established"
//   mp_role       the MP's role in words
//   delivered_by  the body that delivers it
//   start, end    "YYYY", "YYYY-MM" or "YYYY-MM-DD", or null; end never before start
//   detail        one or two sentences
//   sources       [{ "title", "url" }], at least one, https only
//   attribution   "direct_responsibility" | "documented_contribution" | "campaign_claim" | "no_established_contribution",
//                 or null only when area is "Legislation"
//   scope         "local" | "national"
// Pledge: { "wording", "made": "YYYY", "status", "source": { "title", "url" } }
// No other field is allowed. Measures (the panel's counts) are always worked out here, never stored: a field named
// "measure" anywhere is rejected.
// Written only through scripts/background/make-background-migration.ts --column delivery; read by the MP page under the
// biography, only when bio_visible is true (lib/mp-delivery.ts). Pure: no database or file access here, so the check
// script and any component can import it.

export type DeliveryStage = 'delivered' | 'committed' | 'in_development' | 'not_established';
export type DeliveryAttribution = 'direct_responsibility' | 'documented_contribution' | 'campaign_claim' | 'no_established_contribution';
export type DeliveryScope = 'local' | 'national';
export type DeliverySource = { title: string; url: string };

export type DeliveryItem = {
  area: string;
  claim: string;
  stage: DeliveryStage;
  mp_role: string;
  delivered_by: string;
  start: string | null;
  end: string | null;
  detail: string;
  sources: DeliverySource[];
  attribution: DeliveryAttribution | null;
  scope: DeliveryScope;
};
export type Pledge = { wording: string; made: string; status: string; source: DeliverySource };
export type DeliveryRecord = { items: DeliveryItem[]; pledges: Pledge[] };

export const STAGES: DeliveryStage[] = ['delivered', 'committed', 'in_development', 'not_established'];
export const ATTRIBUTIONS: DeliveryAttribution[] = ['direct_responsibility', 'documented_contribution', 'campaign_claim', 'no_established_contribution'];
export const SCOPES: DeliveryScope[] = ['local', 'national'];
export const LEGISLATION = 'Legislation';

// Display labels (house style: no hyphens or dashes).
export const STAGE_LABEL: Record<DeliveryStage, string> = {
  delivered: 'Delivered', committed: 'Committed', in_development: 'In development', not_established: 'Not established',
};
export const ATTRIBUTION_LABEL: Record<DeliveryAttribution, string> = {
  direct_responsibility: 'Ministerial responsibility',
  documented_contribution: 'Credited by a council or delivering body',
  campaign_claim: "MP's own campaign claim",
  no_established_contribution: 'No role established',
};
export const SCOPE_LABEL: Record<DeliveryScope, string> = { local: 'Local', national: 'National' };

const ITEM_FIELDS = ['area', 'claim', 'stage', 'mp_role', 'delivered_by', 'start', 'end', 'detail', 'sources', 'attribution', 'scope'];
const PLEDGE_FIELDS = ['wording', 'made', 'status', 'source'];
const SOURCE_FIELDS = ['title', 'url'];
const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const firstDay = (v: string) => (v.length === 4 ? `${v}-01-01` : v.length === 7 ? `${v}-01` : v);
const lastDay = (v: string) => (v.length === 4 ? `${v}-12-31` : v.length === 7 ? `${v}-31` : v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.trim() !== '';

// Problems with a stored record, one message per problem; an empty list means it is valid.
export function validate(record: unknown): string[] {
  const problems: string[] = [];
  // A "measure" field anywhere, at any depth.
  const findMeasure = (v: unknown, at: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => findMeasure(x, `${at}[${i}]`));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) { if (k === 'measure') problems.push(`${at}.measure: measures are worked out, never stored`); findMeasure(x, `${at}.${k}`); }
  };
  if (!isObj(record)) return ['record is not an object'];
  findMeasure(record, 'record');
  for (const k of Object.keys(record)) if (k !== 'items' && k !== 'pledges' && k !== 'measure') problems.push(`record: unknown field "${k}"`);
  const source = (s: unknown, at: string) => {
    if (!isObj(s)) { problems.push(`${at}: not an object`); return; }
    for (const k of Object.keys(s)) if (!SOURCE_FIELDS.includes(k) && k !== 'measure') problems.push(`${at}: unknown field "${k}"`);
    if (!text(s.title)) problems.push(`${at}: title is empty`);
    if (typeof s.url !== 'string' || !/^https:\/\/[^\s]+$/.test(s.url)) problems.push(`${at}: url must start with https://`);
  };

  if (!Array.isArray(record.items)) problems.push('items must be an array');
  else record.items.forEach((raw, i) => {
    const at = `item ${i + 1}`;
    if (!isObj(raw)) { problems.push(`${at}: not an object`); return; }
    for (const k of Object.keys(raw)) if (!ITEM_FIELDS.includes(k) && k !== 'measure') problems.push(`${at}: unknown field "${k}"`);
    for (const k of ['area', 'claim', 'mp_role', 'delivered_by', 'detail'] as const) if (!text(raw[k])) problems.push(`${at}: ${k} is empty`);
    if (!STAGES.includes(raw.stage as DeliveryStage)) problems.push(`${at}: stage must be one of ${STAGES.join(', ')}`);
    if (!SCOPES.includes(raw.scope as DeliveryScope)) problems.push(`${at}: scope must be local or national`);
    if (raw.attribution === null || raw.attribution === undefined) {
      if (raw.area !== LEGISLATION) problems.push(`${at}: attribution may be null only when area is ${LEGISLATION}`);
    } else if (!ATTRIBUTIONS.includes(raw.attribution as DeliveryAttribution)) problems.push(`${at}: attribution must be one of ${ATTRIBUTIONS.join(', ')} (or null for ${LEGISLATION})`);
    for (const k of ['start', 'end'] as const) {
      if (!(k in raw)) problems.push(`${at}: ${k} is missing (null when not known)`);
      else if (raw[k] !== null && (typeof raw[k] !== 'string' || !DATE.test(raw[k] as string))) problems.push(`${at}: ${k} must be YYYY, YYYY-MM, YYYY-MM-DD or null`);
    }
    const s = raw.start, e = raw.end;
    if (typeof s === 'string' && DATE.test(s) && typeof e === 'string' && DATE.test(e) && lastDay(e) < firstDay(s)) problems.push(`${at}: end (${e}) is before start (${s})`);
    if (!Array.isArray(raw.sources) || raw.sources.length === 0) problems.push(`${at}: needs at least one source`);
    else raw.sources.forEach((x, j) => source(x, `${at} source ${j + 1}`));
  });

  if (!Array.isArray(record.pledges)) problems.push('pledges must be an array');
  else record.pledges.forEach((raw, i) => {
    const at = `pledge ${i + 1}`;
    if (!isObj(raw)) { problems.push(`${at}: not an object`); return; }
    for (const k of Object.keys(raw)) if (!PLEDGE_FIELDS.includes(k) && k !== 'measure') problems.push(`${at}: unknown field "${k}"`);
    for (const k of ['wording', 'status'] as const) if (!text(raw[k])) problems.push(`${at}: ${k} is empty`);
    if (typeof raw.made !== 'string' || !/^\d{4}$/.test(raw.made)) problems.push(`${at}: made must be a year (YYYY)`);
    source(raw.source, `${at} source`);
  });
  return problems;
}

// Figures from Parliament's own records, read by the page from the database; null when we do not hold them.
export type ParliamentFigures = {
  bills_introduced: number | null;
  bills_passed: number | null;
  minister_written_answers: number | null;
  minister_written_statements: number | null;
  // The period a figure covers, when the MP held a ministerial post before our data starts ("since 2014"), else null
  // (owner, 8 Nov 2026, WS1; lib/written-statements.ts coverageLabel).
  minister_written_answers_since: string | null;
  minister_written_statements_since: string | null;
};
export type DeliveryPanel = ParliamentFigures & {
  delivered: number;
  delivered_with_role: number;
  in_development: number;
  in_development_with_role: number;
  attribution: Record<DeliveryAttribution, number>;
  pledges: number;
};
const NO_FIGURES: ParliamentFigures = { bills_introduced: null, bills_passed: null, minister_written_answers: null, minister_written_statements: null, minister_written_answers_since: null, minister_written_statements_since: null };

// The "Record in numbers" figures, always worked out from the record (and Parliament's figures where given).
export function computePanel(record: DeliveryRecord, parliament: Partial<ParliamentFigures> = {}): DeliveryPanel {
  const items = record.items.filter((i) => i.area !== LEGISLATION);
  const hasRole = (i: DeliveryItem) => i.attribution !== 'no_established_contribution';
  const delivered = items.filter((i) => i.stage === 'delivered');
  const developing = record.items.filter((i) => i.stage === 'committed' || i.stage === 'in_development');
  const attribution = Object.fromEntries(ATTRIBUTIONS.map((a) => [a, items.filter((i) => i.attribution === a).length])) as Record<DeliveryAttribution, number>;
  return {
    delivered: delivered.length,
    delivered_with_role: delivered.filter(hasRole).length,
    in_development: developing.length,
    in_development_with_role: developing.filter(hasRole).length,
    attribution,
    pledges: record.pledges.length,
    ...NO_FIGURES,
    ...parliament,
  };
}

// Rows in display order: Delivered, then Committed and In development, then Not established; stored order within each.
export function displayGroups(record: DeliveryRecord): Array<{ key: string; heading: string; items: DeliveryItem[] }> {
  return [
    { key: 'delivered', heading: 'Delivered', items: record.items.filter((i) => i.stage === 'delivered') },
    { key: 'developing', heading: 'Committed and in development', items: record.items.filter((i) => i.stage === 'committed' || i.stage === 'in_development') },
    { key: 'not_established', heading: 'Not established', items: record.items.filter((i) => i.stage === 'not_established') },
  ].filter((g) => g.items.length > 0);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateLabel = (v: string) => { const [y, m, d] = v.split('-'); return d ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : m ? `${MONTHS[Number(m) - 1]} ${y}` : y; };
// The Dates cell: "7 September 2025", "18 March 2026 to 29 April 2026", "Until 2026", or "" when neither is known.
export function itemDates(i: Pick<DeliveryItem, 'start' | 'end'>): string {
  if (i.start && i.end) return i.start === i.end ? dateLabel(i.start) : `${dateLabel(i.start)} to ${dateLabel(i.end)}`;
  if (i.start) return dateLabel(i.start);
  if (i.end) return `Until ${dateLabel(i.end)}`;
  return '';
}

// Link texts for one item's sources (owner, 8 Nov 2026, DR3), in order, never two the same:
//   a) the publisher, the title before its first ": " ("Royal Borough of Greenwich");
//   b) with the date when the title ends with one in brackets: "Royal Borough of Greenwich, 20 March 2026";
//   c) where two would still be the same, the title after its first colon instead, shortened to 60 characters at a word
//      boundary with three full stops if shortened (no dash or ellipsis characters).
// If two titles are identical even then, the later ones get "(2)", "(3)" so no two links read the same.
const TITLE_DATE = /\((\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4})\)\s*$/;
export const sourcePublisher = (title: string) => (title.includes(': ') ? title.slice(0, title.indexOf(': ')) : title);
export function shortenAtWord(text: string, max = 60): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : t.slice(0, max)).replace(/[\s,;:.]+$/, '')}...`;
}
export function sourceLinkTexts(sources: Array<{ title: string }>): string[] {
  const first = sources.map((s) => {
    const date = TITLE_DATE.exec(s.title);
    return date ? `${sourcePublisher(s.title)}, ${date[1]}` : sourcePublisher(s.title);
  });
  const repeated = (list: string[], i: number) => list.filter((x) => x === list[i]).length > 1;
  const second = first.map((t, i) => {
    if (!repeated(first, i)) return t;
    const title = sources[i].title;
    const after = title.includes(':') ? title.slice(title.indexOf(':') + 1).trim() : title;
    return shortenAtWord(after || title);
  });
  const seen = new Map<string, number>();
  return second.map((t) => { const n = (seen.get(t) ?? 0) + 1; seen.set(t, n); return n === 1 ? t : `${t} (${n})`; });
}
