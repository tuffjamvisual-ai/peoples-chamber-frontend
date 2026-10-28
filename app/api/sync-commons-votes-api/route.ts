import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { refreshStore, type StoreRefreshResult } from '@/lib/refresh-stores';
import { politeFetch, isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Keeps mp_division_votes current from the LIVE Commons Votes API.
// The older sync-parlparse-votes job depends on the mySociety parlparse XML
// feed, which can lag or freeze (it stalled at mid-Jan 2026 while the House
// kept voting). This route pulls member-level Ayes/Noes straight from
// Parliament for recent divisions, deduped by (date, division number) so it
// never collides with parlparse-sourced rows.
//
// Each vote row carries the MP's party on the day (from the API), and
// apply_division_parties() then flags votes against the majority of that party
// (is_rebellion). A division already in the database but not yet given parties
// (for example one the parlparse job added first) is fetched again for that and
// for its official totals. See the 2026-10-15c migration.
//
// Optional query params (for historical backfill):
//   startDate  YYYY-MM-DD  — start of custom range (requires endDate)
//   endDate    YYYY-MM-DD  — end of custom range (requires startDate)
//   dryRun     true        — fetch and parse but write nothing; returns a
//                            summary of what would be inserted

const API = 'https://commonsvotes-api.parliament.uk/data';
const LOOKBACK_DAYS = 45;
// The CVA date-range search endpoint caps take at 25 regardless of the value
// requested — confirmed empirically 2026-09-07: take=200 over a 44-division
// window returned 25. Pagination is therefore required for correctness, not
// just for wide ranges. It also fixes a latent bug in the rolling cron: the
// original take=200 single fetch silently truncated when >25 divisions fell
// in the 45-day window (masked during recess; visible during sitting weeks).
const PAGE = 25;
const MAX_RANGE_DAYS = 400;
const TIME_BUDGET_MS = 260_000; // leave 40 s of margin before Vercel's 300 s hard limit

type ApiMember = { MemberId: number; Party?: string | null; Name?: string };
type ApiDivision = { DivisionId: number; Number: number; Date: string; Title: string };
type ApiDetail = ApiDivision & { Ayes: ApiMember[]; Noes: ApiMember[]; AyeTellers: ApiMember[]; NoTellers: ApiMember[]; AyeCount?: number; NoCount?: number; IsDeferred?: boolean };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  // Refresh sitemap materialized views unconditionally before the budget-limited
  // vote loop so it runs on every invocation, including backfills. ~213ms.
  // On error: surface in response but do NOT halt — a sitemap helper failure
  // must not stop vote ingestion.
  const { data: sitemapCounts, error: sitemapRefreshError } = await supabase.rpc('refresh_sitemap_views');

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // --- Date range resolution ---
  const sp = new URL(req.url).searchParams;
  const paramStart = sp.get('startDate');
  const paramEnd   = sp.get('endDate');
  const dryRun     = sp.get('dryRun') === 'true';

  let fromStr: string;
  let toStr: string;
  let customRange = false;

  if (paramStart !== null || paramEnd !== null) {
    if (!paramStart || !paramEnd) {
      return NextResponse.json({ error: 'startDate and endDate must be supplied together' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paramStart) || !/^\d{4}-\d{2}-\d{2}$/.test(paramEnd)) {
      return NextResponse.json({ error: 'startDate and endDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (paramEnd < paramStart) {
      return NextResponse.json({ error: 'startDate must not be after endDate' }, { status: 400 });
    }
    const diffDays = (new Date(paramEnd).getTime() - new Date(paramStart).getTime()) / 86400000;
    if (diffDays > MAX_RANGE_DAYS) {
      return NextResponse.json({
        error: `Range is ${Math.round(diffDays)} days; maximum is ${MAX_RANGE_DAYS}. Split into smaller ranges.`,
      }, { status: 400 });
    }
    fromStr = paramStart;
    toStr   = paramEnd;
    customRange = true;
  } else {
    // No date params — 45-day rolling window, identical to original behaviour.
    const to   = new Date();
    const from = new Date(to.getTime() - LOOKBACK_DAYS * 86400000);
    fromStr = iso(from);
    toStr   = iso(to);
  }

  const startedAt = Date.now();

  try {
    // Paginate the CVA division list (PAGE=25 cap confirmed; see comment above).
    const list: ApiDivision[] = [];
    let skip = 0;
    while (skip < 10000) {
      const pageRes = await politeFetch(
        `${API}/divisions.json/search?queryParameters.startDate=${fromStr}&queryParameters.endDate=${toStr}&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`,
      );
      if (!pageRes.ok) return NextResponse.json({ ok: false, error: `list ${pageRes.status}` }, { status: 502 });
      const page = (await pageRes.json()) as ApiDivision[];
      if (!Array.isArray(page) || page.length === 0) break;
      list.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    // Dedup: one row per division held (commons_division_keys, migration 2026-10-21b) rather than mp_division_votes
    // (one row per MP vote), which returns thousands of rows for any real range and PostgREST silently truncates at
    // 1000. The function gives what the commons_divisions_titled view gave without grouping all 1.15 million vote
    // rows. A full year is ~300 rows, well inside the cap.
    const { data: have, error: dedupErr } = await supabase.rpc('commons_division_keys', { p_from: fromStr, p_to: customRange ? toStr : null });
    if (dedupErr) throw new Error(`dedup query failed: ${dedupErr.message}`);
    if ((have || []).length === 1000) {
      throw new Error('Dedup query returned exactly 1000 rows: possible PostgREST truncation. Narrow the date range and retry.');
    }
    const seen = new Set(((have || []) as { division_date_only: string; division_number: number }[]).map((r) => `${r.division_date_only}#${r.division_number}`));

    // Divisions whose parties and rebellion flags are already done.
    const applied = new Set<number>();
    const listIds = [...new Set(list.map((d) => d.DivisionId))];
    for (let i = 0; i < listIds.length; i += 200) {
      const { data: doneRows, error: doneErr } = await supabase.from('commons_division_totals').select('division_id')
        .in('division_id', listIds.slice(i, i + 200)).not('parties_applied_at', 'is', null);
      if (doneErr) throw new Error(`parties check failed: ${doneErr.message}`);
      for (const r of doneRows || []) applied.add(r.division_id as number);
    }
    let partiesApplied = 0;
    const partyErrors: { divisionId: number; message: string }[] = [];

    let divisionsAdded = 0;
    let rowsInserted  = 0;
    let divisionsSkipped = 0;
    let partial = false;
    let stoppedBefore: string | null = null;
    const dryRunWould: { date: string; number: number; title: string | null; estimatedRows: number }[] = [];
    const apiErrors: { divisionId: number; status: number }[] = [];
    const insertErrors: { division: number; date: string; message: string }[] = [];
    const bothLobbyVotes: { date: string; division: number; memberId: number; memberName: string | null }[] = [];

    for (const d of list) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        partial = true;
        stoppedBefore = (d.Date || '').slice(0, 10);
        break;
      }

      const dateOnly = (d.Date || '').slice(0, 10);
      const already = seen.has(`${dateOnly}#${d.Number}`);
      if (already && applied.has(d.DivisionId)) { divisionsSkipped++; continue; }

      const detRes = await politeFetch(`${API}/division/${d.DivisionId}.json`);
      if (!detRes.ok) { apiErrors.push({ divisionId: d.DivisionId, status: detRes.status }); continue; }
      const det = (await detRes.json()) as ApiDetail;
      const ts = `${dateOnly} 00:00:00`;
      const rows: Record<string, unknown>[] = [];
      const add = (members: ApiMember[] | undefined, vote: string, teller: boolean) => {
        for (const m of members || []) {
          if (!m.MemberId) continue;
          rows.push({
            member_id: m.MemberId, division_id: det.DivisionId, vote_type: vote,
            division_date: ts, division_title: det.Title || null, division_number: det.Number,
            division_date_only: dateOnly, source: 'commonsvotes-api', is_teller: teller, is_rebellion: false,
            party: m.Party ? String(m.Party).trim() : null,
          });
        }
      };
      add(det.Ayes, 'aye', false); add(det.AyeTellers, 'aye', true);
      add(det.Noes, 'no', false); add(det.NoTellers, 'no', true);

      // One row per member per division. If a MemberId appears in BOTH the Ayes
      // and Noes lists, that is a deliberate both-lobby vote (the MP walked
      // through both lobbies as a form of abstention/protest — a recognised
      // parliamentary practice). Emit vote_type='both' for those members.
      // The divisions page already renders a "Voted in both lobbies" section
      // for vote_type='both' rows. Same-side duplicates (e.g. listed in Ayes
      // AND AyeTellers) are dropped silently — teller handling is out of scope.
      const batchSeen = new Map<number, number>(); // memberId → index in finalRows
      const finalRows: Record<string, unknown>[] = [];
      for (const r of rows) {
        const mid = r.member_id as number;
        if (batchSeen.has(mid)) {
          const idx = batchSeen.get(mid)!;
          const existingVote = finalRows[idx].vote_type as string;
          const newVote = r.vote_type as string;
          // Opposite sides → upgrade stored row to 'both' and record it.
          // Same side → CVA noise (Ayes + AyeTellers for same MP): drop silently.
          if (existingVote !== 'both' && existingVote !== newVote) {
            finalRows[idx] = { ...finalRows[idx], vote_type: 'both' };
            bothLobbyVotes.push({ date: dateOnly, division: det.Number, memberId: mid, memberName: null });
          }
        } else {
          batchSeen.set(mid, finalRows.length);
          finalRows.push(r);
        }
      }

      if (!finalRows.length) continue;

      if (dryRun) {
        if (!already) dryRunWould.push({ date: dateOnly, number: det.Number, title: det.Title || null, estimatedRows: finalRows.length });
        continue;
      }

      // Official totals (tellers not included) for the division page; see the 2026-10-15b migration.
      if (typeof det.AyeCount === 'number' && typeof det.NoCount === 'number') {
        await supabase.from('commons_division_totals').upsert({
          division_id: det.DivisionId, division_number: det.Number, division_date: dateOnly, title: det.Title || null,
          aye_count: det.AyeCount, no_count: det.NoCount,
          aye_tellers: (det.AyeTellers || []).map((m) => (m as { Name?: string }).Name).filter(Boolean),
          no_tellers: (det.NoTellers || []).map((m) => (m as { Name?: string }).Name).filter(Boolean),
          is_deferred: !!det.IsDeferred, synced_at: new Date().toISOString(),
        }, { onConflict: 'division_id' });
      }

      // Party on the day for every voter, then the votes-against-party flags.
      const applyParties = async () => {
        const members = finalRows.filter((r) => r.party).map((r) => ({ member_id: r.member_id, party: r.party }));
        const { error: apErr } = await supabase.rpc('apply_division_parties', { p_division_id: det.DivisionId, p_members: members });
        if (apErr) partyErrors.push({ divisionId: det.DivisionId, message: apErr.message });
        else partiesApplied++;
      };

      if (already) { await applyParties(); divisionsSkipped++; continue; }

      const { error: insErr } = await supabase.from('mp_division_votes').insert(finalRows);
      if (!insErr) {
        await applyParties();
        divisionsAdded++;
        rowsInserted += finalRows.length;
      } else if (insErr.code === '23505') {
        // We only reach the insert path for divisions NOT in the seen set — the seen-set
        // check above skips any division the dedup knows about. A unique violation here
        // therefore means the dedup reported this division as new but it is already in
        // the DB: treat as an anomaly so it surfaces in the response, not counts as success.
        insertErrors.push({
          division: det.Number,
          date: dateOnly,
          message: 'unexpected unique violation on a division dedup reported as new',
        });
      } else {
        insertErrors.push({ division: det.Number, date: dateOnly, message: insErr.message });
      }
    }

    // The refresh at the top ran before this run's inserts, so the divisions list, topics
    // and search (commons_divisions_fts) would miss the new divisions until the next run.
    // Refresh again when anything was added. Same rule as above: an error is reported in
    // the response but does not undo the inserts.
    let postInsertRefresh: { sitemap_bill_ids: number; sitemap_divisions: number } | null = null;
    let postInsertRefreshError: string | null = null;
    if (!dryRun && divisionsAdded > 0) {
      const { data: d2, error: e2 } = await supabase.rpc('refresh_sitemap_views');
      postInsertRefresh = d2 as { sitemap_bill_ids: number; sitemap_divisions: number } | null;
      postInsertRefreshError = e2 ? e2.message : null;
    }

    // Party whip pages read saved figures; refresh them when any division changed.
    let whipRefresh: unknown = null;
    let whipRefreshError: string | null = null;
    if (!dryRun && partiesApplied > 0) {
      const { data: w, error: we } = await supabase.rpc('refresh_whip_views');
      whipRefresh = w;
      whipRefreshError = we ? we.message : null;
    }

    // MP pages read stored vote counts (lib/refresh-stores.ts); a failed refresh is reported, not a failed sync.
    let voteCountsRefresh: StoreRefreshResult | null = null;
    if (!dryRun && (divisionsAdded > 0 || partiesApplied > 0)) voteCountsRefresh = await refreshStore(supabase, 'refresh_vote_counts');

    // Statutory instruments are the Commons divisions on an SI (migration 2026-10-21n): add new ones and refresh
    // vote counts whenever a division was added or changed.
    let siRefresh: number | null = null;
    let siRefreshError: string | null = null;
    if (!dryRun && (divisionsAdded > 0 || partiesApplied > 0)) {
      const { data: si, error: sie } = await supabase.rpc('refresh_statutory_instruments');
      siRefresh = si as number | null;
      siRefreshError = sie ? sie.message : null;
    }

    // Resolve member names for both-lobby voters (best-effort; former MPs may be absent).
    if (bothLobbyVotes.length > 0) {
      const memberIds = [...new Set(bothLobbyVotes.map((c) => c.memberId))];
      const { data: nameRows } = await supabase.from('mps').select('member_id, name').in('member_id', memberIds);
      const nameMap = new Map((nameRows || []).map((r) => [r.member_id as number, r.name as string | null]));
      for (const c of bothLobbyVotes) c.memberName = nameMap.get(c.memberId) ?? null;
    }

    const base = {
      ok: !insertErrors.length && !sitemapRefreshError && !postInsertRefreshError && !partyErrors.length && !whipRefreshError && !siRefreshError,
      dryRun,
      range: [fromStr, toStr],
      divisionsInRange: list.length,
      divisionsSkipped,
      partial,
      sitemapRefresh: sitemapCounts as { sitemap_bill_ids: number; sitemap_divisions: number } | null,
      ...(sitemapRefreshError ? { sitemapRefreshError: sitemapRefreshError.message } : {}),
      ...(postInsertRefresh ? { postInsertRefresh } : {}),
      ...(postInsertRefreshError ? { postInsertRefreshError } : {}),
      ...(insertErrors.length ? { errors: insertErrors } : {}),
      partiesApplied,
      ...(partyErrors.length ? { partyErrors } : {}),
      ...(whipRefresh ? { whipRefresh } : {}),
      ...(whipRefreshError ? { whipRefreshError } : {}),
      ...(voteCountsRefresh ? { voteCountsRefresh } : {}),
      ...(siRefresh != null ? { statutoryInstrumentsRefreshed: siRefresh } : {}),
      ...(siRefreshError ? { siRefreshError } : {}),
      ...(bothLobbyVotes.length ? { bothLobbyVotes } : {}),
      ...(partial && stoppedBefore ? { stoppedBefore, note: `Time budget reached. Resume with startDate=${stoppedBefore}&endDate=${toStr}` } : {}),
      ...(apiErrors.length ? { apiErrors } : {}),
      syncedAt: new Date().toISOString(),
    };

    if (dryRun) {
      return NextResponse.json({
        ...base,
        would: {
          insertDivisions: dryRunWould.length,
          estimatedRows: dryRunWould.reduce((s, w) => s + w.estimatedRows, 0),
          divisions: dryRunWould,
        },
      });
    }

    return NextResponse.json({ ...base, divisionsAdded, rowsInserted }, { status: insertErrors.length ? 500 : 200 });
  } catch (err) {
    if (isPoliteStop(err)) throw err; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-commons-votes-api', GET_impl);
