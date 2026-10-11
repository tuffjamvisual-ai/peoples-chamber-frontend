import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import {
  findLatestFullFile,
  downloadFullFile,
  buildHousePriceRows,
  writeHousePriceRows,
  storedReleaseTag,
  loadCouncilCodes,
  monthsBefore,
} from '@/lib/house-prices';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: check HM Land Registry for a new UK House Price Index release
// (published monthly, usually the 2nd or 3rd Wednesday; files are named by
// data month, ~2 months behind). The full history is loaded once by
// scripts/import-council-house-prices.ts.
//   * No newer full file than the one stored -> nothing written (rows 0).
//   * Newer file -> rewrite the latest 13 months for every council, because
//     each release revises the previous 12 months.
// Stops without writing if the file contains an area code that is neither
// a council nor a known aggregate (a boundary change needs a human look).

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const [latest, stored] = await Promise.all([findLatestFullFile(), storedReleaseTag(supabase)]);
    if (!latest) return NextResponse.json({ error: 'no_full_file_found' }, { status: 502 });
    if (stored && latest.tag <= stored) {
      return NextResponse.json({ status: 'up_to_date', release: stored, rows_written: 0 });
    }

    const { codes } = await loadCouncilCodes(supabase);
    const text = await downloadFullFile(latest.url);
    // First pass finds the latest month; rows from 12 months before it onwards.
    const probe = buildHousePriceRows(text, codes, latest.tag, '9999-01-01');
    if (probe.unknownCodes.length) {
      return NextResponse.json({ error: 'unmatched_area_codes', codes: probe.unknownCodes, release: latest.tag }, { status: 500 });
    }
    if (!probe.latestMonth) return NextResponse.json({ error: 'no_council_rows', release: latest.tag }, { status: 502 });
    const fromMonth = monthsBefore(probe.latestMonth, 12);
    const built = buildHousePriceRows(text, codes, latest.tag, fromMonth);

    const written = await writeHousePriceRows(supabase, built.rows);
    return NextResponse.json({
      status: 'updated',
      release: latest.tag,
      previous_release: stored,
      from_month: fromMonth,
      latest_month: built.latestMonth,
      councils_with_latest_price: built.councilsWithLatest.size,
      rows_written: written,
    });
  } catch (e) {
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-house-prices', GET_impl);
