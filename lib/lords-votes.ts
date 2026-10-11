// Shared logic for House of Lords divisions (Lords Votes API,
// lordsvotes-api.parliament.uk, no API key). Used by both the daily sync
// route (app/api/sync-lords-votes/route.ts) and the one-off backfill
// (scripts/import-lords-votes.ts, run with `npx tsx`), so there is a single
// copy of the parsing and bill-matching rules.
//
// Deliberately uses relative/no path-alias imports so the backfill script
// can import it under tsx without Next's module resolution.

import type { SupabaseClient } from '@supabase/supabase-js';
import { parse } from 'node-html-parser';

export const LORDS_VOTES_API = 'https://lordsvotes-api.parliament.uk/data/Divisions';
// Start of the current Parliament (general election 4 July 2024).
export const LORDS_PARLIAMENT_START = '2024-07-04';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchLordsJson(url: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`) as Error & { noRetry?: boolean };
        err.noRetry = true;
        throw err;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if ((e as { noRetry?: boolean }).noRetry) break;
      await sleep(1000 * attempt * attempt); // 1s, 4s, 9s
    }
  }
  throw lastErr;
}

// All division ids on or after startDate (YYYY-MM-DD), paging the search
// endpoint until it returns an empty page.
export async function listLordsDivisionIds(startDate: string, delayMs = 250): Promise<number[]> {
  const ids: number[] = [];
  const take = 25;
  for (let skip = 0; skip < 20000; skip += take) {
    const page = await fetchLordsJson(`${LORDS_VOTES_API}/search?StartDate=${startDate}&skip=${skip}&take=${take}`);
    const items: any[] = Array.isArray(page) ? page : [];
    for (const d of items) if (typeof d?.divisionId === 'number') ids.push(d.divisionId);
    if (items.length < take) break;
    await sleep(delayMs);
  }
  return [...new Set(ids)];
}

// HTML (amendmentMotionNotes / notes) -> plain text. Paragraph and line
// breaks are kept as newlines; entities are decoded; no markup survives.
export function htmlToPlainText(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trim()) return null;
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  const text = parse(withBreaks).text
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || null;
}

// ── Bill matching ────────────────────────────────────────────────────────
// Same normalisation as scripts/backfill-division-bill-ids.js (Commons):
// flatten curly quotes, drop a trailing [HL]/[Lords], keep "(No. 2)"
// inline, drop trailing "Bill"/"Act [YYYY]", collapse whitespace.
export function billKey(title: string): string {
  return title
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+\[(HL|Lords)\]\s*$/i, '')
    .replace(/\s+\((No\.?\s*\d+)\)\s*$/i, ' $1')
    .replace(/\s+(Bill|Act)(\s+\d{4})?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

type BillRow = { id: number; title: string };
type SittingRange = { first: string | null; last: string | null };
const isAct = (t: string) => / Act(\s+\d{4})?\s*$/i.test(t);
const isLordsBill = (t: string) => /\[HL\]\s*$/i.test(t);

// "(No. 2)" variant key: "Bus Services (No. 2) Bill [HL]" became "Bus
// Services Act 2025", so when the full key finds nothing, the key without
// the "(No. N)" marker is tried — but only ever accepted together with the
// date check below, so it can't fall back to an older, differently
// numbered bill.
function billKeyWithoutNumber(title: string): string {
  return billKey(title).replace(/\s*\(no\.?\s*\d+\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// A division belongs to a bill only if it falls inside that bill's own
// recorded sitting dates (bill.stages, refreshed daily by
// /api/sync-bill-stages), with 30 days' grace after the last recorded
// sitting so a division isn't missed if stages lag a day or two.
const GRACE_DAYS = 30;
function covers(range: SittingRange | undefined, date: string): boolean {
  if (!range?.first || !range.last) return false;
  const d = Date.parse(`${date}T00:00:00Z`);
  const first = Date.parse(range.first.slice(0, 10) + 'T00:00:00Z');
  const last = Date.parse(range.last.slice(0, 10) + 'T00:00:00Z') + GRACE_DAYS * 86_400_000;
  return d >= first && d <= last;
}

export type BillMatchStatus = 'linked' | 'ambiguous' | 'unmatched' | 'date_mismatch';
export type BillMatchResult = {
  billId: number | null;
  status: BillMatchStatus;
  candidates: { id: number; title: string }[];
};

export type BillMatcher = {
  match: (divisionTitle: string, divisionDate: string) => Promise<BillMatchResult>;
  billCount: number;
};

// Loads every bill id + title (paged — PostgREST returns at most 1,000 rows
// per call). Sitting dates are fetched lazily, only for bills that are
// candidates for some division title, and cached.
export async function loadBillMatcher(db: SupabaseClient): Promise<BillMatcher> {
  const bills: BillRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('bill').select('id, title').order('id').range(from, from + 999);
    if (error) throw new Error(`bill read: ${error.message}`);
    for (const b of data ?? []) {
      if (typeof b.title === 'string' && b.title.trim()) bills.push({ id: b.id as number, title: b.title });
    }
    if (!data || data.length < 1000) break;
  }

  const byKey = new Map<string, BillRow[]>();
  const byKeyNoNum = new Map<string, BillRow[]>();
  for (const b of bills) {
    const k = billKey(b.title);
    if (k) byKey.set(k, [...(byKey.get(k) ?? []), b]);
    const kn = billKeyWithoutNumber(b.title);
    if (kn) byKeyNoNum.set(kn, [...(byKeyNoNum.get(kn) ?? []), b]);
  }

  const ranges = new Map<number, SittingRange>();
  async function loadRanges(ids: number[]): Promise<void> {
    const missing = ids.filter((id) => !ranges.has(id));
    if (missing.length === 0) return;
    const { data, error } = await db.from('bill').select('id, stages').in('id', missing);
    if (error) throw new Error(`bill stages read: ${error.message}`);
    for (const row of data ?? []) {
      const items: any[] = (row.stages as { items?: any[] } | null)?.items ?? [];
      const dates: string[] = [];
      for (const st of items) {
        for (const sit of Array.isArray(st?.stageSittings) ? st.stageSittings : []) {
          if (typeof sit?.date === 'string' && sit.date) dates.push(sit.date.slice(0, 10));
        }
      }
      dates.sort();
      ranges.set(row.id as number, { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null });
    }
    for (const id of missing) if (!ranges.has(id)) ranges.set(id, { first: null, last: null });
  }

  return {
    billCount: bills.length,
    async match(divisionTitle: string, divisionDate: string): Promise<BillMatchResult> {
      let cands = byKey.get(billKey(divisionTitle)) ?? [];
      if (cands.length === 0) cands = byKeyNoNum.get(billKeyWithoutNumber(divisionTitle)) ?? [];
      const candidates = cands.map((c) => ({ id: c.id, title: c.title }));
      if (cands.length === 0) return { billId: null, status: 'unmatched', candidates };

      await loadRanges(cands.map((c) => c.id));
      const inDate = cands.filter((c) => covers(ranges.get(c.id), divisionDate));
      if (inDate.length === 0) return { billId: null, status: 'date_mismatch', candidates };
      if (inDate.length === 1) return { billId: inDate[0].id, status: 'linked', candidates };

      // Several bills sitting on that date share the name: prefer the same
      // way the Commons linker does (Act over plain Bill over Bill [HL]);
      // if that still can't separate them, leave it unlinked.
      const rank = (t: string) => (isAct(t) ? 0 : isLordsBill(t) ? 2 : 1);
      const best = Math.min(...inDate.map((c) => rank(c.title)));
      const top = inDate.filter((c) => rank(c.title) === best);
      if (top.length === 1) return { billId: top[0].id, status: 'linked', candidates };
      return { billId: null, status: 'ambiguous', candidates };
    },
  };
}

// ── Row building ─────────────────────────────────────────────────────────

export type LordsVoteRow = {
  division_id: number;
  member_id: number;
  member_name: string;
  party: string | null;
  vote: 'content' | 'not_content';
  was_teller: boolean;
};

export type PartyBreakdownEntry = { party: string; content: number; not_content: number };

export async function buildLordsDivisionRows(
  d: any,
  matcher: BillMatcher,
): Promise<{ division: Record<string, unknown>; votes: LordsVoteRow[]; match: BillMatchResult }> {
  const divisionId = d?.divisionId;
  if (typeof divisionId !== 'number' || typeof d?.title !== 'string' || typeof d?.date !== 'string') {
    throw new Error('Unexpected Lords division JSON shape');
  }

  const tellerIds = new Set<number>(
    [...(Array.isArray(d.contentTellers) ? d.contentTellers : []), ...(Array.isArray(d.notContentTellers) ? d.notContentTellers : [])]
      .map((m: any) => m?.memberId)
      .filter((x: unknown): x is number => typeof x === 'number'),
  );

  // The contents / notContents arrays already include the tellers
  // (live-verified on division 3719). Deduplicate by member id defensively.
  const byMember = new Map<number, LordsVoteRow>();
  const add = (arr: unknown, vote: 'content' | 'not_content') => {
    for (const m of Array.isArray(arr) ? arr : []) {
      if (typeof m?.memberId !== 'number') continue;
      if (byMember.has(m.memberId)) continue;
      byMember.set(m.memberId, {
        division_id: divisionId,
        member_id: m.memberId,
        member_name: typeof m.name === 'string' && m.name ? m.name : `Member ${m.memberId}`,
        party: typeof m.party === 'string' && m.party ? m.party : null,
        vote,
        was_teller: tellerIds.has(m.memberId),
      });
    }
  };
  add(d.contents, 'content');
  add(d.notContents, 'not_content');
  const votes = [...byMember.values()];

  const parties = new Map<string, PartyBreakdownEntry>();
  for (const v of votes) {
    const p = v.party ?? 'Unknown';
    const e = parties.get(p) ?? { party: p, content: 0, not_content: 0 };
    if (v.vote === 'content') e.content++;
    else e.not_content++;
    parties.set(p, e);
  }
  const partyBreakdown = [...parties.values()].sort(
    (a, b) => b.content + b.not_content - (a.content + a.not_content) || a.party.localeCompare(b.party),
  );

  const divisionDate = d.date.slice(0, 10);
  const match = await matcher.match(d.title, divisionDate);
  const now = new Date().toISOString();

  const division = {
    division_id: divisionId,
    division_date: divisionDate,
    division_number: typeof d.number === 'number' ? d.number : null,
    title: d.title,
    motion_text: htmlToPlainText(d.amendmentMotionNotes),
    notes_text: htmlToPlainText(d.notes),
    content_count: typeof d.authoritativeContentCount === 'number' ? d.authoritativeContentCount : votes.filter((v) => v.vote === 'content').length,
    not_content_count: typeof d.authoritativeNotContentCount === 'number' ? d.authoritativeNotContentCount : votes.filter((v) => v.vote === 'not_content').length,
    is_government_content: typeof d.isGovernmentContent === 'boolean' ? d.isGovernmentContent : null,
    is_government_win: typeof d.isGovernmentWin === 'boolean' ? d.isGovernmentWin : null,
    is_whipped: typeof d.isWhipped === 'boolean' ? d.isWhipped : null,
    party_breakdown: partyBreakdown,
    bill_id: match.billId,
    synced_at: now,
    updated_at: now,
  };

  return { division, votes, match };
}

export async function writeLordsDivision(
  db: SupabaseClient,
  { division, votes }: { division: Record<string, unknown>; votes: LordsVoteRow[] },
): Promise<void> {
  const id = division.division_id as number;
  const { error: dErr } = await db.from('lords_divisions').upsert(division, { onConflict: 'division_id' });
  if (dErr) throw new Error(`lords_divisions upsert ${id}: ${dErr.message}`);

  for (let i = 0; i < votes.length; i += 500) {
    const { error } = await db
      .from('lords_division_votes')
      .upsert(votes.slice(i, i + 500), { onConflict: 'division_id,member_id' });
    if (error) throw new Error(`lords_division_votes upsert ${id}: ${error.message}`);
  }

  // Remove any vote row no longer in the source (Parliament corrected the
  // record). Member ids are integers, so the in-list is safe.
  if (votes.length > 0) {
    const ids = votes.map((v) => v.member_id).join(',');
    const { error: delErr } = await db
      .from('lords_division_votes')
      .delete()
      .eq('division_id', id)
      .not('member_id', 'in', `(${ids})`);
    if (delErr) throw new Error(`stale vote delete ${id}: ${delErr.message}`);
  }
}
