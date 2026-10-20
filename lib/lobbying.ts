// Data for the Lobbying pages (/lobbying and /lobbying/[slug]).
//
// Two public sources, joined through the lobbying index (lobby_orgs):
//   - ministers' meetings, from GOV.UK transparency returns (lobby_meeting_mentions, built by
//     scripts/build-lobbying-index.js)
//   - consultant lobbyists and their clients, from the Registrar of Consultant Lobbyists
//     quarterly returns (orcl_client_returns, built by scripts/import-orcl-returns.js)
// Organisation names are matched only through spellings checked by hand, taken from GOV.UK's
// official list, or our councils' names; anything else stays unmatched and is not ranked.
// People, job titles and generic entries are excluded (kept in the meeting records, not ranked).
//
// Keep normalising rules in step with scripts/lib/lobby-names.js.

import { cache } from 'react';
import { supabase } from '@/lib/supabase';

import { ORG_TYPE_LABEL, type OrgType } from '@/lib/lobbying-types';
export { ORG_TYPE_LABEL, type OrgType };

export type RankingRow = {
  org_id: number;
  slug: string;
  name: string;
  org_type: OrgType;
  source: 'manual' | 'govuk';
  reviewed: boolean;
  meetings_all: number;
  meetings_12m: number;
  ministers_all: number;
  ministers_12m: number;
  last_meeting: string | null;
  lobbying_firms: number;
  lobbying_quarters: number;
  last_lobbying_quarter: string | null;
};

export type LobbySummary = {
  meeting_entries: number;
  mentions: number;
  mentions_matched: number;
  mentions_unmatched: number;
  mentions_excluded: number;
  meetings_counted: number;   // meetings naming at least one organisation that is not excluded (migration 2026-10-20f)
  meetings_matched: number;   // of those, naming at least one matched organisation
  first_meeting: string | null;
  last_meeting: string | null;
  meetings_built_at: string | null;
  orcl_rows: number;
  orcl_firms: number;
  orcl_clients: number;
  orcl_first_quarter: string | null;
  orcl_last_quarter: string | null;
  orcl_built_at: string | null;
};

export type FirmRow = { firm: string; clients: number };

// Every row of a query, 1,000 at a time, in a stable order (PostgREST returns at most
// 1,000 rows per request; without an order, pages can repeat or skip rows).
async function readAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const getRankings = cache(async (): Promise<RankingRow[]> => {
  const rows = await readAll<RankingRow>((from, to) =>
    supabase.from('lobby_org_rankings').select('*').order('org_id', { ascending: true }).range(from, to)
  );
  return rows.map((r) => ({
    ...r,
    meetings_all: Number(r.meetings_all) || 0,
    meetings_12m: Number(r.meetings_12m) || 0,
    ministers_all: Number(r.ministers_all) || 0,
    ministers_12m: Number(r.ministers_12m) || 0,
    lobbying_firms: Number(r.lobbying_firms) || 0,
    lobbying_quarters: Number(r.lobbying_quarters) || 0,
  }));
});

export const getSummary = cache(async (): Promise<LobbySummary | null> => {
  const { data, error } = await supabase.from('lobby_summary').select('*').limit(1);
  if (error) throw new Error(error.message);
  const r = data && data[0];
  if (!r) return null;
  const n = (v: unknown) => Number(v) || 0;
  return {
    ...r,
    meeting_entries: n(r.meeting_entries), mentions: n(r.mentions), mentions_matched: n(r.mentions_matched),
    mentions_unmatched: n(r.mentions_unmatched), mentions_excluded: n(r.mentions_excluded),
    meetings_counted: n(r.meetings_counted), meetings_matched: n(r.meetings_matched),
    orcl_rows: n(r.orcl_rows), orcl_firms: n(r.orcl_firms), orcl_clients: n(r.orcl_clients),
  } as LobbySummary;
});

// Lobbying firms by number of clients in one quarter.
export const getFirmsForQuarter = cache(async (quarterStart: string): Promise<FirmRow[]> => {
  const rows = await readAll<{ firm_name: string; firm_norm: string; client_norm: string }>((from, to) =>
    supabase
      .from('orcl_client_returns')
      .select('firm_name, firm_norm, client_norm')
      .eq('quarter_start', quarterStart)
      .order('id', { ascending: true })
      .range(from, to)
  );
  const byFirm = new Map<string, { firm: string; clients: Set<string> }>();
  for (const r of rows) {
    const f = byFirm.get(r.firm_norm) || { firm: r.firm_name, clients: new Set<string>() };
    f.clients.add(r.client_norm);
    byFirm.set(r.firm_norm, f);
  }
  return [...byFirm.values()]
    .map((f) => ({ firm: f.firm, clients: f.clients.size }))
    .sort((a, b) => b.clients - a.clients || a.firm.localeCompare(b.firm));
});

// "2026-04-01" -> "April to June 2026".
export function quarterLabel(start: string | null): string {
  if (!start) return '';
  const d = new Date(`${start}T00:00:00Z`);
  const m = d.getUTCMonth();
  const name = (i: number) => new Date(Date.UTC(2000, i, 1)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  return `${name(m)} to ${name(m + 2)} ${d.getUTCFullYear()}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Department as published is untidy ("DHSC:", "Home Office's", "DfE: ministerial meetings
// January to March 2026"). Keep the part before any colon and drop a trailing possessive.
export function cleanDept(raw: string | null): string {
  if (!raw) return '';
  let s = raw.split(':')[0].trim();
  s = s.replace(/['’]s$/i, '').replace(/\s+ministerial external$/i, '').trim();
  if (/^rt hon .*starmer/i.test(s)) return 'Prime Minister';
  return s;
}

// ── One organisation (/lobbying/[slug]) ─────────────────────────────────────

export type OrgMeeting = {
  meeting_key: string;
  minister_name: string;
  minister_dept: string | null;
  meeting_date: string | null;
  meeting_date_raw: string | null;
  date_flag: 'future' | 'unreadable' | null;
  purpose: string | null;
  raw_name: string;
};

export type OrgLobbying = { firm: string; clientAs: string; quarters: { start: string; label: string }[] };

export const getOrgBySlug = cache(async (slug: string): Promise<RankingRow | null> => {
  const { data, error } = await supabase.from('lobby_org_rankings').select('*').eq('slug', slug).limit(1);
  if (error) throw new Error(error.message);
  const r = data && data[0];
  if (!r) return null;
  const n = (v: unknown) => Number(v) || 0;
  return { ...r, meetings_all: n(r.meetings_all), meetings_12m: n(r.meetings_12m), ministers_all: n(r.ministers_all), ministers_12m: n(r.ministers_12m), lobbying_firms: n(r.lobbying_firms), lobbying_quarters: n(r.lobbying_quarters) } as RankingRow;
});

// Every meeting entry naming the organisation, newest first; an entry that names it twice
// is listed once.
export const getOrgMeetings = cache(async (orgId: number): Promise<OrgMeeting[]> => {
  const rows = await readAll<OrgMeeting & { position: number }>((from, to) =>
    supabase
      .from('lobby_meeting_mentions')
      .select('meeting_key, position, minister_name, minister_dept, meeting_date, meeting_date_raw, date_flag, purpose, raw_name')
      .eq('org_id', orgId)
      .eq('match_type', 'alias')
      .order('meeting_date', { ascending: false, nullsFirst: false })
      .order('meeting_key', { ascending: true })
      .order('position', { ascending: true })
      .range(from, to)
  );
  const seen = new Set<string>();
  const out: OrgMeeting[] = [];
  for (const r of rows) {
    if (seen.has(r.meeting_key)) continue;
    seen.add(r.meeting_key);
    out.push(r);
  }
  return out;
});

// Consultant lobbying firms that named the organisation as a client, with the quarters.
export const getOrgLobbying = cache(async (orgId: number): Promise<OrgLobbying[]> => {
  const rows = await readAll<{ firm_name: string; firm_norm: string; client_name: string; quarter_start: string; quarter_label: string }>((from, to) =>
    supabase
      .from('orcl_client_returns')
      .select('firm_name, firm_norm, client_name, quarter_start, quarter_label')
      .eq('client_org_id', orgId)
      .order('quarter_start', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
  );
  const byFirm = new Map<string, OrgLobbying>();
  for (const r of rows) {
    const f = byFirm.get(r.firm_norm) || { firm: r.firm_name, clientAs: r.client_name, quarters: [] };
    if (!f.quarters.some((q) => q.start === r.quarter_start)) f.quarters.push({ start: r.quarter_start, label: r.quarter_label });
    byFirm.set(r.firm_norm, f);
  }
  return [...byFirm.values()].sort((a, b) => (b.quarters[0]?.start || '').localeCompare(a.quarters[0]?.start || '') || a.firm.localeCompare(b.firm));
});
