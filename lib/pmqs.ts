// Prime Minister's Questions since July 2024 (owner, 5 Nov 2026), read from the Hansard tables the parliament archive
// sync fills. A session is the section Hansard opens with "The Prime Minister was asked": normally a "Prime Minister"
// heading and the sections under it; for a day or so after a sitting it can still sit inside "Oral Answers to Questions",
// and then it runs from that line on. Who answered is whoever spoke most in the session. The Speaker, shouted asides
// and points of order are not exchanges: the Hansard link has the full record.
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { displayMpName } from '@/lib/mp-name';
import attendance from '@/lib/data/pmqs-attendance-2026-11-04.json';

export const PMQS_TAG = 'pmqs';
const HOUR = 3600;
const MARKER = 'The Prime Minister was asked';
const SNIPPET = 160;

type Part = { guid: string; fromOrder: number };
type Heading = { guid: string; sitting_date: string; title: string; parent_guid: string | null; position: number | null };
type Row = { ext_id: string; member_id: number | null; attributed_to: string | null; contribution_text: string | null; url: string | null; debate_ext_id: string; item_order: number | null };

export type Person = { id: number; name: string };
export type PmqsSession = {
  date: string;
  parts: Part[];
  answeredBy: Person;
  deputisingFor: string | null;   // the Prime Minister's name, when someone else answered
  opposition: Person | null;
  questions: number;
  hansardUrl: string | null;
};
export type MemberQuestion = { date: string; extId: string; text: string };
export type PmqsSet = { sessions: PmqsSession[]; byMember: Record<number, MemberQuestion[]> };
type RawExchange = { row: Row; parts: string[]; answers: string[] };
export type Exchange = { id: string; asker: Person; question: string; answers: string[]; hansardUrl: string | null };

const COLS = 'ext_id, member_id, attributed_to, contribution_text, url, debate_ext_id, item_order';
const clean = (s: string | null) => (s ?? '').trim();
const printedName = (a: string | null) => clean(a).replace(/\s*\(.*$/, '');

// The Prime Minister in office on a date, from the Commons Library's table.
export function primeMinisterOn(date: string): string | null {
  const r = attendance.attendance.find((p) => p.in_office_from <= date && (!p.in_office_to || date < p.in_office_to));
  return r?.prime_minister ?? null;
}

// A shouted aside recorded in Hansard ("Hear, hear!", "That is a lie! Withdrawn."): short, not numbered, not a question.
const isHeckle = (t: string) => t.length < 60 && !/^Q\d/.test(t) && !t.endsWith('?');

function isExchangeRow(r: Row): boolean {
  if (r.member_id === null) return false;                                     // "Hon. Members", "Several hon. Members rose"
  if (/\bSpeaker\b/.test(clean(r.attributed_to))) return false;
  const t = clean(r.contribution_text);
  if (!t || t.startsWith(MARKER)) return false;
  if (/^rose\W*$/i.test(t)) return false;
  return !/^(indicated (dissent|assent)|On a point of order)/i.test(t);
}

// All rows for a set of sections, in pages: PostgREST returns at most 1,000 at a time.
async function readRows(parts: Part[]): Promise<Row[]> {
  const out: Row[] = [];
  const guids = parts.map((p) => p.guid);
  for (let i = 0; i < guids.length; i += 40) {
    const some = guids.slice(i, i + 40);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('hansard_contributions').select(COLS).in('debate_ext_id', some).is('removed_at', null)
        .order('debate_ext_id', { ascending: true }).order('item_order', { ascending: true }).range(from, from + 999);
      if (error) throw new Error(`pmqs contributions: ${error.message}`);
      out.push(...((data ?? []) as Row[]));
      if ((data ?? []).length < 1000) break;
    }
  }
  const start = new Map(parts.map((p) => [p.guid, p.fromOrder]));
  return out.filter((r) => (r.item_order ?? 0) >= (start.get(r.debate_ext_id) ?? 0));
}

// Each session's sections, in reading order.
async function findSessions(): Promise<Map<string, Part[]>> {
  const { data: heads, error } = await supabase.from('hansard_debates').select('guid, sitting_date, title, parent_guid, position')
    .eq('house', 'Commons').eq('title', 'Prime Minister').is('gone_at', null).order('sitting_date', { ascending: true });
  if (error) throw new Error(`pmqs headings: ${error.message}`);
  const headings = (heads ?? []) as Heading[];
  const sessions = new Map<string, Part[]>();
  const { data: kids, error: kidsError } = await supabase.from('hansard_debates').select('guid, sitting_date, title, parent_guid, position')
    .in('parent_guid', headings.map((h) => h.guid)).is('gone_at', null).order('position', { ascending: true });
  if (kidsError) throw new Error(`pmqs sections: ${kidsError.message}`);
  for (const h of headings) {
    const under = ((kids ?? []) as Heading[]).filter((k) => k.parent_guid === h.guid);
    sessions.set(String(h.sitting_date).slice(0, 10), [{ guid: h.guid, fromOrder: 0 }, ...under.map((k) => ({ guid: k.guid, fromOrder: 0 }))]);
  }
  // Recent days can still have the questions inside "Oral Answers to Questions".
  const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const { data: oral, error: oralError } = await supabase.from('hansard_debates').select('guid, sitting_date, title, parent_guid, position')
    .eq('house', 'Commons').eq('title', 'Oral Answers to Questions').is('gone_at', null).gte('sitting_date', since);
  if (oralError) throw new Error(`pmqs oral answers: ${oralError.message}`);
  const open = ((oral ?? []) as Heading[]).filter((o) => !sessions.has(String(o.sitting_date).slice(0, 10)));
  if (open.length) {
    const { data: marks, error: markError } = await supabase.from('hansard_contributions').select('debate_ext_id, item_order')
      .in('debate_ext_id', open.map((o) => o.guid)).ilike('contribution_text', `${MARKER}%`);
    if (markError) throw new Error(`pmqs oral answers: ${markError.message}`);
    for (const m of (marks ?? []) as { debate_ext_id: string; item_order: number | null }[]) {
      const o = open.find((x) => x.guid === m.debate_ext_id);
      if (o) sessions.set(String(o.sitting_date).slice(0, 10), [{ guid: o.guid, fromOrder: m.item_order ?? 0 }]);
    }
  }
  return sessions;
}

async function namesOf(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('mps').select('member_id, name, display_name').in('member_id', ids.slice(i, i + 200));
    if (error) throw new Error(`pmqs names: ${error.message}`);
    for (const m of (data ?? []) as { member_id: number; name: string | null; display_name: string | null }[]) {
      const n = displayMpName((m.display_name || m.name || '').trim());
      if (n) out.set(m.member_id, n);
    }
  }
  return out;
}

// Rows in reading order: the sections in session order, each by item_order.
function inOrder(parts: Part[], rows: Row[]): Row[] {
  return parts.flatMap((p) => rows.filter((r) => r.debate_ext_id === p.guid).sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0)));
}

function answererOf(rows: Row[]): number | null {
  const counts = new Map<number, number>();
  for (const r of rows) if (isExchangeRow(r)) counts.set(r.member_id!, (counts.get(r.member_id!) ?? 0) + 1);
  let best: number | null = null;
  for (const [id, n] of counts) if (best === null || n > counts.get(best)!) best = id;
  return best;
}

// The member called as Leader of the Opposition, else whoever asked most (a stand in on the days a deputy answers).
function oppositionOf(rows: Row[], answerer: number): number | null {
  const i = rows.findIndex((r) => /I call the Leader of the Opposition/i.test(clean(r.contribution_text)));
  if (i >= 0) {
    const next = rows.slice(i + 1).find((r) => isExchangeRow(r) && r.member_id !== answerer);
    if (next) return next.member_id;
  }
  const counts = new Map<number, number>();
  for (const r of rows) if (isExchangeRow(r) && r.member_id !== answerer) counts.set(r.member_id!, (counts.get(r.member_id!) ?? 0) + 1);
  let best: number | null = null;
  for (const [id, n] of counts) if (best === null || n > counts.get(best)!) best = id;
  return best;
}

const readSet = unstable_cache(async (): Promise<PmqsSet> => {
  const found = await findSessions();
  const rows = await readRows([...found.values()].flat());
  const byGuid = new Map<string, Row[]>();
  for (const r of rows) byGuid.set(r.debate_ext_id, [...(byGuid.get(r.debate_ext_id) ?? []), r]);
  const ids = [...new Set(rows.map((r) => r.member_id).filter((v): v is number => v !== null))];
  const names = await namesOf(ids);
  const printed = new Map<number, string>();
  for (const r of rows) if (r.member_id !== null && !printed.has(r.member_id) && /\(/.test(clean(r.attributed_to))) printed.set(r.member_id, printedName(r.attributed_to));
  const person = (id: number): Person => ({ id, name: names.get(id) ?? printed.get(id) ?? `Member ${id}` });

  const sessions: PmqsSession[] = [];
  const byMember: Record<number, MemberQuestion[]> = {};
  for (const [date, parts] of found) {
    const ordered = inOrder(parts, parts.flatMap((p) => byGuid.get(p.guid) ?? []));
    const answerer = answererOf(ordered);
    if (answerer === null) continue;
    const asked = exchangesOf(ordered, answerer);
    for (const q of asked) (byMember[q.row.member_id!] ??= []).push({ date, extId: q.row.ext_id, text: q.parts.join(' ').slice(0, SNIPPET) });
    const opp = oppositionOf(ordered, answerer);
    const speaking = ordered.find((r) => r.member_id === answerer && /^The Prime Minister\b/.test(clean(r.attributed_to)));
    sessions.push({
      date,
      parts,
      answeredBy: person(answerer),
      deputisingFor: speaking ? null : primeMinisterOn(date),
      opposition: opp === null ? null : person(opp),
      questions: asked.length,
      hansardUrl: ordered.find((r) => r.url)?.url?.split('#')[0] ?? null,
    });
  }
  sessions.sort((a, b) => b.date.localeCompare(a.date));
  for (const list of Object.values(byMember)) list.sort((a, b) => b.date.localeCompare(a.date));
  return { sessions, byMember };
}, ['pmqs-set'], { tags: [PMQS_TAG], revalidate: HOUR });

export const pmqsSet = cache(() => readSet());

// The exchanges of one session: each question and the answer that follows it. A question or answer broken up by the
// Speaker stays one. Anything after the last answer that follows a point of order belongs to the point of order.
function exchangesOf(rows: Row[], answerer: number): RawExchange[] {
  const out: RawExchange[] = [];
  const kept = rows.filter(isExchangeRow);
  const lastAnswer = kept.map((r) => r.member_id).lastIndexOf(answerer);
  const pointOfOrder = rows.findIndex((r) => /^On a point of order/i.test(clean(r.contribution_text)));
  const cutoff = pointOfOrder >= 0 ? rows.findIndex((r, i) => i > pointOfOrder && isExchangeRow(r) && r.member_id === answerer) : 0;
  kept.forEach((r, i) => {
    const text = clean(r.contribution_text);
    if (r.member_id === answerer) { out[out.length - 1]?.answers.push(text); return; }
    if (i > lastAnswer && pointOfOrder >= 0 && cutoff < 0) return;
    if (isHeckle(text)) return;
    const last = out[out.length - 1];
    if (last && last.row.member_id === r.member_id && last.answers.length === 0) { last.parts.push(text); return; }
    out.push({ row: r, parts: [text], answers: [] });
  });
  return out;
}

export async function pmqsExchanges(session: PmqsSession): Promise<Exchange[]> {
  const rows = inOrder(session.parts, await readRows(session.parts));
  const raw = exchangesOf(rows, session.answeredBy.id);
  const names = await namesOf([...new Set(raw.map((e) => e.row.member_id!))]);
  return raw.map((e) => ({
    id: e.row.ext_id,
    asker: { id: e.row.member_id!, name: names.get(e.row.member_id!) ?? printedName(e.row.attributed_to) },
    question: e.parts.join('\n'),
    answers: e.answers,
    hansardUrl: e.row.url,
  }));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
