import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import {
  listQuarterlyFiles,
  downloadFile,
  readWorkbookSheets,
  parseQuarterlyFile,
  writeHomelessnessRows,
  storedSources,
  loadCouncilCodes,
} from '@/lib/homelessness';
import { isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly: MHCLG publishes statutory homelessness detailed local authority
// tables quarterly, and each release usually replaces the previous quarter
// with a revised file. This reads the file list from the GOV.UK Content API
// and (re)loads any quarter from April 2019 whose file differs from the one
// stored, i.e. a new quarter or a revised file. Full history is loaded once
// by scripts/import-council-homelessness.ts.
// A file that fails its England-row checks, or contains a council code the
// councils table doesn't know, is not written (reported in the response).

const TIME_BUDGET_MS = 240_000;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();

  try {
    const [files, stored, { codes }] = await Promise.all([listQuarterlyFiles(), storedSources(supabase), loadCouncilCodes(supabase)]);
    const todo = files.filter((f) => f.periodStart >= '2019-04-01' && stored.get(f.periodStart) !== f.url);
    let written = 0;
    const loaded: string[] = [];
    const failed: { period: string; error: string }[] = [];
    const skippedForTime: string[] = [];

    for (const f of todo) {
      if (Date.now() - started > TIME_BUDGET_MS) { skippedForTime.push(f.periodLabel); continue; }
      try {
        const sheets = readWorkbookSheets(await downloadFile(f.url));
        const r = parseQuarterlyFile(f, sheets, codes);
        if (r.unmatchedCodes.length) throw new Error(`codes not in councils table: ${r.unmatchedCodes.join(' ')}`);
        written += await writeHomelessnessRows(supabase, r.rows);
        loaded.push(`${f.periodLabel} (${f.status})`);
      } catch (e) {
        if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
        failed.push({ period: f.periodLabel, error: (e as Error).message });
      }
    }

    const body = { status: todo.length ? 'checked' : 'up_to_date', loaded, failed, skipped_for_time: skippedForTime, rows_written: written };
    return NextResponse.json(body, { status: failed.length ? 500 : 200 });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-homelessness', GET_impl);
