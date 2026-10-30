// Committee of Public Accounts recommendations tracker (owner's approval, 29 Oct 2026, "go stage 4"; fixes 30 Oct 2026).
// Reads the pac_* tables and the pac_recommendation_status view (migrations 2026-10-29d to f) with the server key,
// cached for a day under the 'pac' tag (scripts/pac/load-treasury-minutes.mjs refreshes it after a load).
//   RECOMMENDATIONS_PUBLIC=1    the /recommendations pages and the department tab exist (otherwise notFound()).
//   RECOMMENDATIONS_OVERDUE=1   any wording that calls a recommendation overdue (none yet), and the department tab's
//                               list of unchecked passed targets.
// Targets are always shown as the document writes them ("Summer 2025"); the months in the database (the month a
// period ends) are only used to sort and to decide whether a target has passed.
// Source: HM Treasury Treasury Minutes and Progress Reports on GOV.UK, Open Government Licence v3.0.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { fetchWithoutEmDashes } from '@/lib/no-em-dash';

export const RECOMMENDATIONS_PUBLIC = process.env.RECOMMENDATIONS_PUBLIC === '1';
export const RECOMMENDATIONS_OVERDUE = process.env.RECOMMENDATIONS_OVERDUE === '1';

const DAY = 86400;
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
  global: { fetch: fetchWithoutEmDashes },
});

export type StatusKey = 'implemented' | 'delivered_elsewhere' | 'split' | 'rejected' | 'report_completed' | 'not_listed_in_later_update'
  | 'target_passed_checked' | 'target_passed_unchecked' | 'target_in_future' | 'no_dated_target';

export type StatusRow = {
  recommendation_id: number; session: string; report_number: number; report_title: string; department: string | null; rec_number: string;
  status: StatusKey; latest_response: string | null; times_target_moved: number; original_target_month: string | null;
  latest_target_month: string | null; latest_target_text: string | null; implemented_month: string | null; split_into: string[] | null;
  completed_in_cp_number: string | null; not_listed_in_cp_number: string | null; not_listed_in_published_on: string | null;
  latest_cp_number: string; latest_published_on: string; evidence_title: string | null; evidence_url: string | null;
  evidence_delivered_on: string | null; review_checked_on: string | null; review_outcome: string | null; review_note: string | null;
};
export type SourceDocument = { id: number; kind: 'treasury_minute' | 'progress_report'; cp_number: string; title: string; published_on: string; url: string; pages: number | null };
export type EventRow = {
  id: number; recommendation_id: number; document_id: number; page: number | null; response: string | null; response_text: string | null;
  status: string | null; target_text: string | null; target_month: string | null; original_target_text: string | null; original_target_month: string | null;
  revised_target_text: string | null; revised_target_month: string | null; implemented_text: string | null; implemented_month: string | null; progress_text: string | null;
};
export type Evidence = { id: number; delivered_on: string | null; evidence_title: string; evidence_url: string; publisher: string | null; note: string | null };

async function readAll<T>(table: string, columns: string, order: string, filter?: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db().from(table).select(columns);
    if (filter) q = filter(q);
    const { data, error } = await q.order(order).range(from, from + 999);
    if (error) throw new Error(`pac: reading ${table}: ${error.message}`);
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < 1000) return out;
  }
}

const STATUS_COLUMNS = 'recommendation_id, session, report_number, report_title, department, rec_number, status, latest_response, times_target_moved, original_target_month, latest_target_month, latest_target_text, implemented_month, split_into, completed_in_cp_number, not_listed_in_cp_number, not_listed_in_published_on, latest_cp_number, latest_published_on, evidence_title, evidence_url, evidence_delivered_on, review_checked_on, review_outcome, review_note';
const EVENT_COLUMNS = 'id, recommendation_id, document_id, page, response, response_text, status, target_text, target_month, original_target_text, original_target_month, revised_target_text, revised_target_month, implemented_text, implemented_month, progress_text';

const cachedStatus = unstable_cache(() => readAll<StatusRow>('pac_recommendation_status', STATUS_COLUMNS, 'recommendation_id'), ['pac-status'], { tags: ['pac'], revalidate: DAY });
// The view works out "target passed" when it is read, and that read is cached for up to a day. So the rule is applied
// again here, at render, against today's date: a target whose period has ended moves out of "target in future"
// (an October 2026 target on 1 November 2026) without a code change. Pages using this revalidate every 86400 s.
export function effectiveStatus(r: StatusRow, today = new Date()): StatusKey {
  if (r.status !== 'target_in_future' || !targetPassed(r.latest_target_month, today)) return r.status;
  const [y, m] = (r.latest_target_month ?? '').slice(0, 10).split('-').map(Number);
  const afterTarget = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); // first day after the target month
  return r.review_outcome === 'no_later_evidence' && (r.review_checked_on ?? '') >= afterTarget ? 'target_passed_checked' : 'target_passed_unchecked';
}
export async function allStatus(): Promise<StatusRow[]> {
  const today = new Date();
  return (await cachedStatus()).map((r) => ({ ...r, status: effectiveStatus(r, today) }));
}
export const allDocuments = unstable_cache(() => readAll<SourceDocument>('pac_source_documents', 'id, kind, cp_number, title, published_on, url, pages', 'published_on'), ['pac-documents'], { tags: ['pac'], revalidate: DAY });
// Every event's targets (as written and as months), without the long texts: for the first target as written, and
// for the document each implemented recommendation was reported in.
type EventTargets = Pick<EventRow, 'recommendation_id' | 'document_id' | 'status' | 'target_text' | 'target_month' | 'original_target_text' | 'original_target_month' | 'revised_target_text' | 'revised_target_month'>;
const allEventTargets = unstable_cache(
  () => readAll<EventTargets>('pac_recommendation_events', 'recommendation_id, document_id, status, target_text, target_month, original_target_text, original_target_month, revised_target_text, revised_target_month', 'id'),
  ['pac-event-targets'], { tags: ['pac'], revalidate: DAY },
);

export type RecommendationDetail = {
  row: StatusRow; conclusion: string | null; recommendation: string | null; events: (EventRow & { document: SourceDocument })[]; evidence: Evidence[];
};
export const recommendationDetail = unstable_cache(async (session: string, report: number, rec: string): Promise<RecommendationDetail | null> => {
  const row = (await allStatus()).find((r) => r.session === session && r.report_number === report && r.rec_number === rec);
  if (!row) return null;
  const docs = new Map((await allDocuments()).map((d) => [d.id, d]));
  const client = db();
  const [text, events, evidence] = await Promise.all([
    client.from('pac_recommendations').select('conclusion_text, recommendation_text').eq('id', row.recommendation_id).maybeSingle(),
    client.from('pac_recommendation_events').select(EVENT_COLUMNS).eq('recommendation_id', row.recommendation_id),
    client.from('pac_delivery_evidence').select('id, delivered_on, evidence_title, evidence_url, publisher, note').eq('recommendation_id', row.recommendation_id).order('delivered_on'),
  ]);
  for (const r of [text, events, evidence]) if (r.error) throw new Error(`pac: reading recommendation ${row.recommendation_id}: ${r.error.message}`);
  const t = text.data as { conclusion_text: string | null; recommendation_text: string | null } | null;
  return {
    row,
    conclusion: t?.conclusion_text ?? null,
    recommendation: t?.recommendation_text ?? null,
    events: ((events.data ?? []) as unknown as EventRow[]).map((e) => ({ ...e, document: docs.get(e.document_id)! })).filter((e) => e.document)
      .sort((a, b) => a.document.published_on.localeCompare(b.document.published_on)),
    evidence: (evidence.data ?? []) as Evidence[],
  };
}, ['pac-recommendation-v2'], { tags: ['pac'], revalidate: DAY });

// ---------- bodies: one canonical name per body named in pac_reports.department, and its department page (if any).
// A report can name several bodies. A body's current name is shown; a report filed under an earlier name also shows
// "(formerly ...)" (owner, 30 Oct 2026): the Department for Digital, Culture, Media and Sport (formerly Department for
// Culture, Media and Sport); the Department for Business, Innovation, Science and Trade (formed July 2026, formerly
// Department for Business and Trade or Department for Science, Innovation and Technology); the National
// Infrastructure and Service Transformation Authority (formerly the Infrastructure and Projects Authority); the
// Ministry of Housing, Communities and Local Government (formerly Department for Levelling Up, Housing and
// Communities). HM Revenue and Customs and NS&I are on the treasury page. Bodies with no department page, and the
// Operational Delivery Profession (a cross government profession, left for the owner to place), are "Other bodies".
export type Body = { key: string; name: string; page: string | null };
type BodyRule = Body & { re: RegExp; formerly?: { re: RegExp; label: string }[] };
const BODIES: BodyRule[] = [
  { key: 'hm-treasury', name: 'HM Treasury', page: 'treasury', re: /\bHM Treasury\b|\bHMT\b|\bthe Treasury\b|^Treasury\b/i },
  { key: 'hmrc', name: 'HM Revenue and Customs', page: 'treasury', re: /\bHM Revenue (and|&) Customs\b|\bHMRC\b/i },
  { key: 'nsi', name: 'NS&I', page: 'treasury', re: /\bNS&I\b/ },
  { key: 'home-office', name: 'Home Office', page: 'home-office', re: /\bHome Office\b/i },
  { key: 'dhsc', name: 'Department of Health and Social Care', page: 'health', re: /\bHealth and Social Care\b|\bDHSC\b/i },
  { key: 'desnz', name: 'Department for Energy Security and Net Zero', page: 'energy', re: /\bEnergy Security and Net Zero\b|\bDESNZ\b/i },
  { key: 'dfe', name: 'Department for Education', page: 'education', re: /\bDepartment for Education\b|\bDfE\b/ },
  { key: 'dwp', name: 'Department for Work and Pensions', page: 'work-pensions', re: /\bWork and Pensions\b|\bDWP\b/i },
  { key: 'dft', name: 'Department for Transport', page: 'transport', re: /\bDepartment for Transport\b|\bDfT\b/ },
  { key: 'defra', name: 'Department for Environment, Food and Rural Affairs', page: 'environment', re: /\bEnvironment, (Food|Farming) (and|&) Rural Affairs\b|\bDefra\b/i },
  { key: 'bist', name: 'Department for Business, Innovation, Science and Trade', page: 'business-trade',
    re: /\bBusiness, Innovation, Science and Trade\b|\bBIST\b|\bBusiness and Trade\b|\bDBT\b|\bScience, Innovation and Technology\b|\bDSIT\b/,
    formerly: [
      { re: /\bBusiness and Trade\b|\bDBT\b/, label: 'Department for Business and Trade' },
      { re: /\bScience, Innovation and Technology\b|\bDSIT\b/, label: 'Department for Science, Innovation and Technology' },
    ] },
  { key: 'beis', name: 'Department for Business, Energy and Industrial Strategy', page: null, re: /\bBusiness, Energy (and|&) Industrial Strategy\b|\bBEIS\b/i },
  { key: 'mhclg', name: 'Ministry of Housing, Communities and Local Government', page: 'housing', re: /\bHousing, Communities and Local Government\b|\bLevelling Up, Housing and Communities\b|\bMHCLG\b|\bDLUHC\b/i,
    formerly: [{ re: /\bLevelling Up, Housing and Communities\b|\bDLUHC\b/i, label: 'Department for Levelling Up, Housing and Communities' }] },
  { key: 'homes-england', name: 'Homes England', page: null, re: /\bHomes England\b/i },
  { key: 'moj', name: 'Ministry of Justice', page: 'justice', re: /\bMinistry of Justice\b|\bMoJ\b/ },
  { key: 'mod', name: 'Ministry of Defence', page: 'defence', re: /\bMinistry of Defence\b|\bMoD\b|\bMOD\b/ },
  { key: 'ddcms', name: 'Department for Digital, Culture, Media and Sport', page: 'culture', re: /\bCulture, Media and Sport\b|\bD?DCMS\b/i,
    formerly: [{ re: /^(?![\s\S]*Digital, Culture)[\s\S]*\bCulture, Media and Sport\b/i, label: 'Department for Culture, Media and Sport' }] },
  { key: 'cabinet-office', name: 'Cabinet Office', page: 'cabinet-office', re: /\bCabinet Office\b/i },
  { key: 'fcdo', name: 'Foreign, Commonwealth and Development Office', page: 'foreign-office', re: /\bForeign, Commonwealth\b|\bFCDO\b/i },
  { key: 'nista', name: 'National Infrastructure and Service Transformation Authority', page: null,
    re: /\bNational Infrastructure and Service Transformation Authority\b|\bNISTA\b|\bInfrastructure and Projects Authority\b|\bIPA\b/,
    formerly: [{ re: /\bInfrastructure and Projects Authority\b|\bIPA\b/, label: 'the Infrastructure and Projects Authority' }] },
  { key: 'ofcom', name: 'Ofcom', page: null, re: /\bOfcom\b/ },
  { key: 'bbc', name: 'BBC', page: null, re: /\bBBC\b/ },
  { key: 'odp', name: 'Operational Delivery Profession', page: null, re: /\bOperational Delivery Profession\b|\bODP\b/ },
];
export const BODY_LIST: Body[] = BODIES.map(({ key, name, page }) => ({ key, name, page }));
export function bodiesFor(text: string | null): Body[] {
  if (!text) return [];
  return BODIES.filter((b) => b.re.test(text)).map(({ key, name, page }) => ({ key, name, page }));
}
export const departmentSlugs = (text: string | null) => [...new Set(bodiesFor(text).map((b) => b.page).filter((p): p is string => !!p))];
// The report's bodies by their current names, each with "(formerly ...)" when the report uses an earlier name.
export function departmentWords(text: string | null): string {
  if (!text) return '';
  // In the order the report names them.
  const at = (b: BodyRule) => { const m = new RegExp(b.re.source, b.re.flags.replace('g', '')).exec(text); return m ? m.index : Infinity; };
  const names = BODIES.filter((b) => b.re.test(text)).sort((x, y) => at(x) - at(y)).map((b) => {
    const current = b.name.replace(/^the /, '');
    const usesCurrent = new RegExp(current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text);
    const old = (b.formerly ?? []).filter((f) => f.re.test(text)).map((f) => f.label);
    return !usesCurrent && old.length ? `${b.name} (formerly ${old.join(' and ')})` : b.name;
  });
  return joinWords(names) || text;
}
const joinWords = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// The body a recommendation is addressed to, read from its first words ("Companies House should ..."), when it is
// not the report's own department. null when it cannot be read or is the department itself.
export function recommendationFor(text: string | null, reportDepartment: string | null): string | null {
  if (!text) return null;
  const t = text.replace(/^\(?[a-z]\)\s*/, '').replace(/^[•\s]+/, '').trim();
  const m = t.match(/^(.{2,160}?)\s+(?:should|must|needs to|need to)\b/);
  if (!m) return null;
  let subject = m[1].split(/,\s+/).pop()!.replace(/^(and|but|then|also)\s+/i, '').trim();
  if (subject.split(/\s+/).length > 12 || !/^[A-Z]|^the\s/i.test(subject)) return null;
  if (/^(the\s+)?(departments?|government|it|they|we|this|each department|all departments)$/i.test(subject)) return null;
  const mine = new Set(bodiesFor(reportDepartment).map((b) => b.key));
  const named = bodiesFor(subject);
  if (named.length && named.every((b) => mine.has(b.key))) return null;
  subject = subject.charAt(0).toUpperCase() + subject.slice(1);
  return subject;
}

// ---------- wording (house style: no hyphens or dashes in our words; quotations are as written)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthYear(iso: string | null): string {
  if (!iso) return '';
  const [y, m] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function dayMonthYear(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
// "2024-26" -> "2024 to 2026 session"; "2019" -> "2019 session".
export function sessionWords(session: string): string {
  const m = session.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[1]} to ${m[1].slice(0, 2)}${m[2]} session` : `${session} session`;
}
// One form for every document: "<title> (CP nnnn), published <d Month yyyy>".
export const documentWords = (d: SourceDocument) => `${d.title} (${d.cp_number}), published ${dayMonthYear(d.published_on)}`;
export const documentShort = (d: SourceDocument) => `${d.title} (${d.cp_number})`;
// Official text as published, with words the PDF broke across a line put back together ("semi- permanent"); a
// shared hyphen before and, or or to ("short- and long-term") is left as printed.
export const asPublished = (t: string | null) => (t ?? '').replace(/([a-z])- (?!and |or |to )([a-z])/g, '$1-$2');
// "end of Summer 2026"; a target already written as an end or a deadline ("end of March 2026", "by end March 2029",
// "Before the end of ...") is left as it is.
export function endOf(t: string | null): string {
  const w = asWritten(t);
  return /^(end|by|before)\b/i.test(w) ? w : `end of ${w}`;
}
// The date part of a target as written, for short lists ("Spring 2027" from "Spring 2027, future updates to be
// provided ..."); the first 40 characters and an ellipsis when no date part can be cut cleanly.
const DATE_PART = /^(?:(?:by\s+(?:the\s+)?end(?:\s+of)?|end\s+of|end|early|mid|late|during|tbc)\s+)?(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Summer|Autumn|Winter)\s+)?\d{4}\b/i;
export function datePart(t: string | null): string {
  const w = asWritten(t).replace(/^ongoing\s+(until\s+)?/i, '');
  const m = w.match(DATE_PART);
  if (m) return m[0].replace(/^by\s+/i, '');
  return w.length > 40 ? `${w.slice(0, 40).trimEnd()}…` : w;
}
// A target as the document writes it.
export const asWritten = (t: string | null) => asPublished(t).replace(/\.$/, '').trim();
// A target has passed once the month its period ends in is over (Summer 2026 passes on 1 September 2026; October 2026
// on 1 November 2026). The month is the first day of that month, as stored.
export function targetPassed(month: string | null, today = new Date()): boolean {
  if (!month) return false;
  const [y, m] = month.slice(0, 10).split('-').map(Number);
  return y * 12 + m < today.getUTCFullYear() * 12 + today.getUTCMonth() + 1;
}
export const recPath = (r: Pick<StatusRow, 'session' | 'report_number' | 'rec_number'>) => `/recommendations/${r.session}/${r.report_number}/${r.rec_number}`;

export type StatusLink = { text: string; href?: string };
export type Wording = {
  words: (r: StatusRow) => StatusLink[];
  text: (r: StatusRow) => string;
  firstTarget: (r: StatusRow) => string;          // the first target as written
  latestDocument: SourceDocument | null;
  documents: SourceDocument[];
};

// Everything the wording needs, read once per render.
export async function wording(): Promise<Wording> {
  const [rows, docs, targets] = await Promise.all([allStatus(), allDocuments(), allEventTargets()]);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const byCp = new Map(docs.map((d) => [d.cp_number, d]));
  const implementedIn = new Map<number, SourceDocument>();
  const first = new Map<number, { on: string; text: string }>();
  for (const e of targets) {
    const d = byId.get(e.document_id);
    if (!d) continue;
    if (e.status === 'implemented') { const prev = implementedIn.get(e.recommendation_id); if (!prev || d.published_on < prev.published_on) implementedIn.set(e.recommendation_id, d); }
    // The first target in the sequence: the earliest document's original target if it gives one, else its current one.
    const text = e.original_target_text ?? e.target_text ?? e.revised_target_text;
    const prev = first.get(e.recommendation_id);
    if (text && (!prev || d.published_on < prev.on)) first.set(e.recommendation_id, { on: d.published_on, text });
  }
  const byRec = new Map(rows.map((r) => [`${r.session}/${r.report_number}/${r.rec_number}`, r]));
  const doc = (cp: string | null) => (cp ? byCp.get(cp) : undefined);
  const moved = (r: StatusRow) => (r.times_target_moved > 0 ? `, moved ${r.times_target_moved} time${r.times_target_moved === 1 ? '' : 's'}` : '');

  const words = (r: StatusRow, depth = 0): StatusLink[] => {
    switch (r.status) {
      case 'implemented': {
        const d = implementedIn.get(r.recommendation_id);
        const per = d ? documentShort(d) : 'Treasury Minute';
        return [{ text: r.implemented_month ? `Delivered (${monthYear(r.implemented_month)}), per ${per}` : `Delivered, per ${per}` }];
      }
      case 'delivered_elsewhere':
        return [{ text: `Delivered (${r.evidence_delivered_on ? monthYear(r.evidence_delivered_on) : 'month not stated'}), see ` }, { text: r.evidence_title ?? 'the publication', href: r.evidence_url ?? undefined }];
      case 'split': {
        const parts = r.split_into ?? [];
        const out: StatusLink[] = [{ text: 'Split into ' }];
        parts.forEach((p, i) => {
          if (i > 0) out.push({ text: i === parts.length - 1 ? ' and ' : ', ' });
          const part = byRec.get(`${r.session}/${r.report_number}/${p}`);
          out.push({ text: p, href: recPath({ ...r, rec_number: p }) });
          if (part && depth === 0) out.push({ text: ` (${words(part, 1).map((x) => x.text).join('')})` });
        });
        return out;
      }
      case 'rejected':
        return [{ text: 'Rejected by the government' }];
      case 'report_completed': {
        const d = doc(r.completed_in_cp_number);
        return [{ text: `Report closed by the Treasury (${d ? documentWords(d) : 'progress report'})` }];
      }
      case 'not_listed_in_later_update': {
        const d = doc(r.not_listed_in_cp_number);
        return [{ text: `No longer listed as outstanding (${d ? documentWords(d) : 'progress report'})` }];
      }
      case 'target_in_future':
        return [{ text: `Target: ${asWritten(r.latest_target_text)}${moved(r)}` }];
      case 'no_dated_target':
        return [{ text: r.latest_target_text ? `No dated target: “${asWritten(r.latest_target_text)}”` : 'No dated target given' }];
      case 'target_passed_checked':
        return [{ text: `Target passed (${asWritten(r.latest_target_text)}). No record of delivery found as of ${dayMonthYear(r.review_checked_on)}` }];
      case 'target_passed_unchecked': {
        const d = doc(r.latest_cp_number);
        const latest = docs[docs.length - 1];
        return [{ text: `Target passed (${endOf(r.latest_target_text)}). Last mentioned in ${d ? documentShort(d) : r.latest_cp_number}. Not recorded as delivered in any document up to ${latest ? documentShort(latest) : r.latest_cp_number}.` }];
      }
    }
  };
  return {
    words: (r) => words(r),
    text: (r) => words(r).map((p) => p.text).join(''),
    firstTarget: (r) => asWritten(first.get(r.recommendation_id)?.text ?? r.latest_target_text),
    latestDocument: docs.length ? docs[docs.length - 1] : null,
    documents: docs,
  };
}

// Labels for the totals boxes and the status filter. Every status has a box, so the boxes add up to the total.
export const STATUS_LABELS: Record<StatusKey, string> = {
  implemented: 'Delivered, per Treasury Minute',
  delivered_elsewhere: 'Delivered, shown in another publication',
  split: 'Split into parts',
  rejected: 'Rejected by the government',
  report_completed: 'Report closed by the Treasury',
  not_listed_in_later_update: 'No longer listed as outstanding',
  target_in_future: 'Target still to come',
  no_dated_target: 'No dated target',
  target_passed_checked: 'Target passed, no record of delivery found',
  target_passed_unchecked: 'Target date passed, being checked against later evidence',
};
export const STATUS_ORDER = Object.keys(STATUS_LABELS) as StatusKey[];
