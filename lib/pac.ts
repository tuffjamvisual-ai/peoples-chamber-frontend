// Committee of Public Accounts recommendations tracker (owner's approval, 29 Oct 2026, "go stage 4"). Reads the
// pac_* tables and the pac_recommendation_status view (migrations 2026-10-29d to f) with the server key, cached for a
// day under the 'pac' tag (scripts/pac/load-treasury-minutes.mjs refreshes it after a load).
//   RECOMMENDATIONS_PUBLIC=1    the /recommendations pages and the department tab exist (otherwise notFound()).
//   RECOMMENDATIONS_OVERDUE=1   totals and department tabs may show recommendations whose target has passed.
// Source: HM Treasury Treasury Minutes and Progress Reports on GOV.UK, Open Government Licence v3.0.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { fetchWithoutEmDashes } from '@/lib/no-em-dash';
import { departments } from '@/lib/departments';

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
  status: string | null; target_text: string | null; original_target_text: string | null; revised_target_text: string | null;
  implemented_text: string | null; implemented_month: string | null; progress_text: string | null;
};
export type Evidence = { id: number; delivered_on: string | null; evidence_title: string; evidence_url: string; publisher: string | null; note: string | null };

async function readAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from(table).select(columns).order(order).range(from, from + 999);
    if (error) throw new Error(`pac: reading ${table}: ${error.message}`);
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < 1000) return out;
  }
}

const STATUS_COLUMNS = 'recommendation_id, session, report_number, report_title, department, rec_number, status, latest_response, times_target_moved, original_target_month, latest_target_month, latest_target_text, implemented_month, split_into, completed_in_cp_number, not_listed_in_cp_number, not_listed_in_published_on, latest_cp_number, latest_published_on, evidence_title, evidence_url, evidence_delivered_on, review_checked_on, review_outcome, review_note';

export const allStatus = unstable_cache(() => readAll<StatusRow>('pac_recommendation_status', STATUS_COLUMNS, 'recommendation_id'), ['pac-status'], { tags: ['pac'], revalidate: DAY });
export const allDocuments = unstable_cache(() => readAll<SourceDocument>('pac_source_documents', 'id, kind, cp_number, title, published_on, url, pages', 'published_on'), ['pac-documents'], { tags: ['pac'], revalidate: DAY });
// The document each implemented recommendation was reported in (for "Delivered, per Treasury Minute of ...").
export const implementedIn = unstable_cache(async () => {
  const { data, error } = await db().from('pac_recommendation_events').select('recommendation_id, document_id').eq('status', 'implemented').range(0, 4999);
  if (error) throw new Error(`pac: reading implemented events: ${error.message}`);
  return (data ?? []) as { recommendation_id: number; document_id: number }[];
}, ['pac-implemented-in'], { tags: ['pac'], revalidate: DAY });

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
    client.from('pac_recommendation_events').select('id, recommendation_id, document_id, page, response, response_text, status, target_text, original_target_text, revised_target_text, implemented_text, implemented_month, progress_text').eq('recommendation_id', row.recommendation_id),
    client.from('pac_delivery_evidence').select('id, delivered_on, evidence_title, evidence_url, publisher, note').eq('recommendation_id', row.recommendation_id).order('delivered_on'),
  ]);
  for (const r of [text, events, evidence]) if (r.error) throw new Error(`pac: reading recommendation ${row.recommendation_id}: ${r.error.message}`);
  const t = text.data as { conclusion_text: string | null; recommendation_text: string | null } | null;
  return {
    row,
    conclusion: t?.conclusion_text ?? null,
    recommendation: t?.recommendation_text ?? null,
    events: ((events.data ?? []) as EventRow[]).map((e) => ({ ...e, document: docs.get(e.document_id)! })).filter((e) => e.document)
      .sort((a, b) => a.document.published_on.localeCompare(b.document.published_on)),
    evidence: (evidence.data ?? []) as Evidence[],
  };
}, ['pac-recommendation'], { tags: ['pac'], revalidate: DAY });

// ---------- departments: pac_reports.department text to department page slugs (a report can name several).
// Department for Science, Innovation and Technology and Department for Business and Trade go to business-trade (now
// the Department for Business, Innovation, Science and Trade); HM Revenue and Customs to treasury; the Department for
// Levelling Up, Housing and Communities to housing. Names that match none (the BBC, the Operational Delivery
// Profession, the former Department for Business, Energy and Industrial Strategy) are listed under "Other bodies".
const DEPT_PATTERNS: [string, RegExp][] = [
  ['treasury', /\bHM Treasury\b|\bNS&I\b|\bHM Revenue (and|&) Customs\b/i],
  ['home-office', /\bHome Office\b/i],
  ['health', /\bHealth and Social Care\b/i],
  ['energy', /\bEnergy Security and Net Zero\b/i],
  ['education', /\bDepartment for Education\b/i],
  ['work-pensions', /\bWork and Pensions\b/i],
  ['transport', /\bDepartment for Transport\b/i],
  ['environment', /\bEnvironment, (Food|Farming) (and|&) Rural Affairs\b/i],
  ['business-trade', /\bBusiness and Trade\b|\bBusiness, Innovation, Science and Trade\b|\bScience, Innovation and Technology\b/i],
  ['housing', /\bHousing, Communities and Local Government\b|\bLevelling Up, Housing and Communities\b/i],
  ['justice', /\bMinistry of Justice\b/i],
  ['defence', /\bMinistry of Defence\b/i],
  ['culture', /\bCulture, Media and Sport\b/i],
  ['cabinet-office', /\bCabinet Office\b/i],
  ['foreign-office', /\bForeign, Commonwealth\b/i],
];
export function departmentSlugs(text: string | null): string[] {
  if (!text) return [];
  return DEPT_PATTERNS.filter(([, re]) => re.test(text)).map(([slug]) => slug);
}
export const departmentName = (slug: string) => departments.find((d) => d.slug === slug)?.name ?? slug;

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
// The target as the government wrote it when it is a short date ("Summer 2027"), else the month it ends in.
export function targetWords(row: Pick<StatusRow, 'latest_target_text' | 'latest_target_month'>): string {
  const t = (row.latest_target_text ?? '').replace(/\.$/, '').trim();
  if (t && /^(?:(?:by )?(?:the )?(?:end of |end |early |mid |late )?)?(?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Summer|Autumn|Winter)?\s*\d{4}$/i.test(t) && /\d{4}/.test(t)) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return monthYear(row.latest_target_month);
}
// Official text as published, with words the PDF broke across a line put back together ("semi- permanent"); a
// shared hyphen before and, or or to ("short- and long-term") is left as printed.
export const asPublished = (t: string | null) => (t ?? '').replace(/([a-z])- (?!and |or |to )([a-z])/g, '$1-$2');
export const recPath = (r: Pick<StatusRow, 'session' | 'report_number' | 'rec_number'>) => `/recommendations/${r.session}/${r.report_number}/${r.rec_number}`;

export type StatusContext = { documentsByCp: Map<string, SourceDocument>; implementedDocument?: SourceDocument | null };
export type StatusLink = { text: string; href?: string };
// The status in plain words, as a list of text and link pieces.
export function statusWords(r: StatusRow, ctx: StatusContext): StatusLink[] {
  const moved = r.times_target_moved > 0 ? `, moved ${r.times_target_moved} time${r.times_target_moved === 1 ? '' : 's'}` : '';
  switch (r.status) {
    case 'implemented':
      return r.implemented_month
        ? [{ text: `Delivered (${monthYear(r.implemented_month)}), per Treasury Minute` }]
        : [{ text: `Delivered, per Treasury Minute${ctx.implementedDocument ? ` of ${monthYear(ctx.implementedDocument.published_on)}` : ''}` }];
    case 'delivered_elsewhere':
      return [{ text: `Delivered (${monthYear(r.evidence_delivered_on)}), see ` }, { text: r.evidence_title ?? 'the publication', href: r.evidence_url ?? undefined }];
    case 'split': {
      const parts = r.split_into ?? [];
      const out: StatusLink[] = [{ text: 'Split into ' }];
      parts.forEach((p, i) => {
        if (i > 0) out.push({ text: i === parts.length - 1 ? ' and ' : ', ' });
        out.push({ text: p, href: recPath({ ...r, rec_number: p }) });
      });
      return out;
    }
    case 'rejected':
      return [{ text: 'Rejected by the government' }];
    case 'report_completed': {
      const d = r.completed_in_cp_number ? ctx.documentsByCp.get(r.completed_in_cp_number) : undefined;
      return [{ text: `Report closed by the Treasury (progress report, ${monthYear(d?.published_on ?? null)})` }];
    }
    case 'not_listed_in_later_update':
      return [{ text: `No longer listed as outstanding (progress report, ${monthYear(r.not_listed_in_published_on)})` }];
    case 'target_in_future':
      return [{ text: `Target: ${targetWords(r)}${moved}` }];
    case 'no_dated_target':
      return [{ text: r.latest_target_text ? `No dated target: “${r.latest_target_text.replace(/\.$/, '')}”` : 'No dated target given' }];
    case 'target_passed_checked':
      return [{ text: `Target passed (${targetWords(r)}). No record of delivery found as of ${dayMonthYear(r.review_checked_on)}` }];
    case 'target_passed_unchecked':
      return [{ text: `Target passed (${targetWords(r)}). Not yet recorded as delivered in a Treasury document, as of ${monthYear(r.latest_published_on)}` }];
  }
}
export const statusText = (r: StatusRow, ctx: StatusContext) => statusWords(r, ctx).map((p) => p.text).join('');

// Labels for totals and filters. The two "target passed" groups are left out unless RECOMMENDATIONS_OVERDUE is on.
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
  target_passed_unchecked: 'Target passed, not yet recorded as delivered',
};
export const OVERDUE: StatusKey[] = ['target_passed_checked', 'target_passed_unchecked'];
export const shownStatuses = (): StatusKey[] => (Object.keys(STATUS_LABELS) as StatusKey[]).filter((k) => RECOMMENDATIONS_OVERDUE || !OVERDUE.includes(k));

export async function statusContext(): Promise<{ ctx: StatusContext; implementedDocFor: (id: number) => SourceDocument | null; latestDocument: SourceDocument | null }> {
  const docs = await allDocuments();
  const byId = new Map(docs.map((d) => [d.id, d]));
  const impl = new Map<number, SourceDocument>();
  for (const e of await implementedIn()) {
    const d = byId.get(e.document_id);
    const prev = impl.get(e.recommendation_id);
    if (d && (!prev || d.published_on < prev.published_on)) impl.set(e.recommendation_id, d);
  }
  return {
    ctx: { documentsByCp: new Map(docs.map((d) => [d.cp_number, d])) },
    implementedDocFor: (id) => impl.get(id) ?? null,
    latestDocument: docs.length ? docs[docs.length - 1] : null,
  };
}
