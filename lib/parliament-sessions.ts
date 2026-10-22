// Parliamentary sessions and the bills in each (owner's decision, 20 Oct 2026). Session names and dates are in
// parliament_sessions, loaded from Parliament's calendar API by scripts/load-parliament-sessions.js; bill membership
// is the bill_in_session view (scripts/migrations/2026-10-20h-parliament-sessions.sql). A session with no name yet
// (a new session before the loader is re-run) shows as "Session 41".
import { supabase } from './supabase';

export type ParliamentSession = {
  id: number;
  name: string;               // '2026-27'
  number: string | null;      // '59/2'
  parliament_number: number | null;
  session_number: number | null;
  start_date: string | null;
  end_date: string | null;
  bills_introduced: number;
  bills_carried_in: number;
  bills_listed: number;
  is_current: boolean;
};

export type SessionBill = {
  bill_id: number;
  title: string;
  current_stage: string | null;
  stage_date: string | null;
  is_act: boolean | null;
  bill_withdrawn: string | null;
  is_defeated: boolean | null;
  originating_house: string | null;
  sponsor_name: string | null;
  introduced_here: boolean;
  introduced_session_id: number | null;
  latest_session_id: number | null;
};

export const SESSIONS_SOURCE_URL = 'https://whatson-api.parliament.uk/calendar/sessions/list.json';

export function sessionTitle(s: { id: number; name?: string | null }): string {
  return s.name ? `${s.name} session` : `Session ${s.id}`;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

// "9 July 2024 to 29 April 2026"; the current session's published end date is a planned date, so it reads "since".
export function sessionDates(s: Pick<ParliamentSession, 'start_date' | 'end_date' | 'is_current'>): string {
  if (!s.start_date) return '';
  if (s.is_current || !s.end_date) return `since ${fmt(s.start_date)}`;
  return `${fmt(s.start_date)} to ${fmt(s.end_date)}`;
}

// Every session that has bills, newest first.
export async function getParliamentSessions(): Promise<ParliamentSession[]> {
  const [{ data: counts, error: e1 }, { data: names, error: e2 }] = await Promise.all([
    // Stored copies of parliament_session_bill_counts and bill_in_session (migration 2026-10-22h), refreshed after each
    // bill stages and sponsors sync: the views worked every bill's sessions out on each read and timed out on cold reads.
    supabase.from('parliament_session_bill_counts_stored').select('session_id, bills_introduced, bills_carried_in, bills_listed, is_current'),
    supabase.from('parliament_sessions').select('id, name, number, parliament_number, session_number, start_date, end_date'),
  ]);
  // A failed read throws (owner's approval, 21 Oct 2026): a page built ahead keeps its last good version instead of
  // being published with no sessions.
  if (e1 || e2) throw new Error(`getParliamentSessions: ${(e1 || e2)!.message}`);
  const byId = new Map((names || []).map((n) => [n.id as number, n]));
  return (counts || [])
    .map((c) => {
      const n = byId.get(c.session_id as number);
      return {
        id: c.session_id as number,
        name: (n?.name as string) || '',
        number: (n?.number as string) ?? null,
        parliament_number: (n?.parliament_number as number) ?? null,
        session_number: (n?.session_number as number) ?? null,
        start_date: (n?.start_date as string) ?? null,
        end_date: (n?.end_date as string) ?? null,
        bills_introduced: Number(c.bills_introduced) || 0,
        bills_carried_in: Number(c.bills_carried_in) || 0,
        bills_listed: Number(c.bills_listed) || 0,
        is_current: c.is_current === true,
      };
    })
    .sort((a, b) => b.id - a.id);
}

export async function getParliamentSession(id: number): Promise<ParliamentSession | null> {
  return (await getParliamentSessions()).find((s) => s.id === id) ?? null;
}

export async function getSessionBills(sessionId: number): Promise<SessionBill[]> {
  const out: SessionBill[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('bill_in_session_stored')
      .select('bill_id, title, current_stage, stage_date, is_act, bill_withdrawn, is_defeated, originating_house, sponsor_name, introduced_here, introduced_session_id, latest_session_id')
      .eq('session_id', sessionId)
      .order('title', { ascending: true })
      .order('bill_id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`getSessionBills(${sessionId}): ${error.message}`);
    out.push(...((data || []) as SessionBill[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// The sessions the bills on /bills come from (the current one, and any a bill was carried over from), for the
// Session filter.
export async function getCurrentBillSessions(): Promise<{ id: number; label: string }[]> {
  const [{ data: rows, error }, sessions] = await Promise.all([
    supabase.from('bill_current').select('introduced_session_id').range(0, 999),
    getParliamentSessions(),
  ]);
  if (error) throw new Error(`getCurrentBillSessions: ${error.message}`);
  const ids = [...new Set((rows || []).map((r) => r.introduced_session_id as number).filter((x) => x != null))].sort((a, b) => b - a);
  const byId = new Map(sessions.map((s) => [s.id, s]));
  return ids.map((id) => {
    const s = byId.get(id);
    const title = sessionTitle({ id, name: s?.name });
    return { id, label: s && !s.is_current ? `${title} (carried over)` : title };
  });
}

// What became of a bill in one session. Order matters: a bill carried into a later session is "carried over" in
// this one, whatever happened to it afterwards.
export type SessionBillGroup = 'law' | 'carried' | 'current' | 'withdrawn' | 'defeated' | 'unfinished';

export const SESSION_GROUPS: { key: SessionBillGroup; heading: string; note: string }[] = [
  { key: 'law', heading: 'Became law (Royal Assent)', note: 'Passed both Houses and received Royal Assent in this session.' },
  { key: 'current', heading: 'Still going through Parliament', note: 'This is the current session.' },
  { key: 'carried', heading: 'Carried over to the next session', note: 'Parliament agreed to continue these bills in the following session.' },
  { key: 'withdrawn', heading: 'Withdrawn', note: 'Withdrawn by the member or minister in charge.' },
  { key: 'defeated', heading: 'Defeated', note: 'Voted down in the Commons or the Lords.' },
  { key: 'unfinished', heading: 'Did not finish before the session ended', note: 'A bill that has not passed by the end of a session falls, unless Parliament agrees to carry it over.' },
];

export function sessionBillGroup(b: SessionBill, sessionId: number, isCurrent: boolean): SessionBillGroup {
  if (b.latest_session_id != null && b.latest_session_id > sessionId) return 'carried';
  if (b.is_act || b.current_stage === 'Royal Assent') return 'law';
  if (b.bill_withdrawn) return 'withdrawn';
  if (b.is_defeated) return 'defeated';
  if (isCurrent) return 'current';
  return 'unfinished';
}
