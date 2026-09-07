import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Keeps mp_division_votes current from the LIVE Commons Votes API.
// The older sync-parlparse-votes job depends on the mySociety parlparse XML
// feed, which can lag or freeze (it stalled at mid-Jan 2026 while the House
// kept voting). This route pulls member-level Ayes/Noes straight from
// Parliament for recent divisions, deduped by (date, division number) so it
// never collides with parlparse-sourced rows. Rebellion flags are not computed
// here (left to recompute-activity-metrics / the parlparse path).
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

type ApiMember = { MemberId: number };
type ApiDivision = { DivisionId: number; Number: number; Date: string; Title: string };
type ApiDetail = ApiDivision & { Ayes: ApiMember[]; Noes: ApiMember[]; AyeTellers: ApiMember[]; NoTellers: ApiMember[] };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

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
      const pageRes = await fetch(
        `${API}/divisions.json/search?queryParameters.startDate=${fromStr}&queryParameters.endDate=${toStr}&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`,
      );
      if (!pageRes.ok) return NextResponse.json({ ok: false, error: `list ${pageRes.status}` }, { status: 502 });
      const page = (await pageRes.json()) as ApiDivision[];
      if (!Array.isArray(page) || page.length === 0) break;
      list.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    // Dedup: existing (date#number) keys already in the DB for this range —
    // skip whole divisions already held from either parlparse or a prior run.
    // Custom range: bound both sides to avoid scanning the full post-start history.
    // Default window: no upper bound, matching the original unbounded query exactly.
    const { data: have } = await (customRange
      ? supabase.from('mp_division_votes').select('division_date_only, division_number')
          .gte('division_date_only', fromStr).lte('division_date_only', toStr)
      : supabase.from('mp_division_votes').select('division_date_only, division_number')
          .gte('division_date_only', fromStr));
    const seen = new Set((have || []).map((r) => `${r.division_date_only}#${r.division_number}`));

    let divisionsAdded = 0;
    let rowsInserted  = 0;
    let divisionsSkipped = 0;
    let partial = false;
    let stoppedBefore: string | null = null;
    const dryRunWould: { date: string; number: number; title: string | null; estimatedRows: number }[] = [];
    const apiErrors: { divisionId: number; status: number }[] = [];

    for (const d of list) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        partial = true;
        stoppedBefore = (d.Date || '').slice(0, 10);
        break;
      }

      const dateOnly = (d.Date || '').slice(0, 10);
      if (seen.has(`${dateOnly}#${d.Number}`)) { divisionsSkipped++; continue; }

      const detRes = await fetch(`${API}/division/${d.DivisionId}.json`);
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
          });
        }
      };
      add(det.Ayes, 'aye', false); add(det.AyeTellers, 'aye', true);
      add(det.Noes, 'no', false); add(det.NoTellers, 'no', true);
      if (!rows.length) continue;

      if (dryRun) {
        dryRunWould.push({ date: dateOnly, number: det.Number, title: det.Title || null, estimatedRows: rows.length });
        continue;
      }

      // Unchanged insert path.
      const { error } = await supabase.from('mp_division_votes').insert(rows);
      if (!error) { divisionsAdded++; rowsInserted += rows.length; }
    }

    const base = {
      ok: true,
      dryRun,
      range: [fromStr, toStr],
      divisionsInRange: list.length,
      divisionsSkipped,
      partial,
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

    return NextResponse.json({ ...base, divisionsAdded, rowsInserted });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-commons-votes-api', GET_impl);
