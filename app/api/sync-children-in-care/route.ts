import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { isPoliteStop } from '@/lib/sync-budget';
import { newestReportingYear, latestReleaseZip, downloadZip, filesFromZip, DATA_FILES, buildRows, checkRows } from '@/lib/children-in-care-source';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly (owner's approval, 28 Oct 2026): DfE publishes "Children looked after in England including adoptions" once a
// year in November (reporting year 2025 on 26 November 2025; next November 2026). Each run asks DfE's statistics API
// for the newest reporting year. When it is newer than the newest stored, the release's "Download all data" zip is
// read (lib/children-in-care-source.ts) and every year in it is upserted (DfE revises earlier years in each release).
// Nothing is written if a check fails: England's row each year, councils add up to England within its rounding, every
// code ours or an old county code, every children's services council present. A late release is warned about by
// /api/monitor-freshness.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { data: top, error: topErr } = await supabase.from('council_children_in_care').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
    if (topErr) return NextResponse.json({ error: `council_children_in_care: ${topErr.message}` }, { status: 500 });
    const stored = top?.[0]?.year ? Number(String(top[0].year).slice(0, 4)) : null;
    const newest = await newestReportingYear();
    if (newest == null) return NextResponse.json({ error: 'the DfE statistics API gives no reporting year (its data sets may have changed)' }, { status: 502 });
    if (stored != null && newest <= stored) return NextResponse.json({ status: 'up_to_date', stored_year: stored, newest_year: newest, rows_written: 0 });

    const rel = await latestReleaseZip();
    if (rel.year < newest) return NextResponse.json({ status: 'release_page_not_updated', newest_year: newest, page_year: rel.year, rows_written: 0 });
    const rows = buildRows(filesFromZip(await downloadZip(rel.zipUrl), DATA_FILES), rel.pageUrl);
    const { data: councils, error: cErr } = await supabase.from('councils').select('gss_code, type').eq('country', 'England');
    if (cErr) return NextResponse.json({ error: `councils: ${cErr.message}` }, { status: 500 });
    const ours = new Set((councils ?? []).map((c) => c.gss_code as string).filter(Boolean));
    const upper = new Set((councils ?? []).filter((c) => c.type !== 'district').map((c) => c.gss_code as string).filter(Boolean));
    const check = checkRows(rows, ours, upper);
    if (!check.ok) return NextResponse.json({ error: 'checks_failed', problems: check.problems.slice(0, 20), year: rel.year }, { status: 500 });

    const now = new Date().toISOString();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('council_children_in_care').upsert(rows.slice(i, i + 500).map((r) => ({ ...r, updated_at: now })), { onConflict: 'ons_code,year' });
      if (error) return NextResponse.json({ error: `council_children_in_care upsert at ${i}: ${error.message}` }, { status: 500 });
    }
    const { error: hlErr } = await supabase.from('hand_loaded_datasets')
      .update({ held_period: `${rel.year} (31 March ${check.years[0].slice(0, 4)} to ${rel.year})`, loaded_on: now.slice(0, 10) }).eq('key', 'children_in_care');
    if (hlErr) console.error(`[sync-children-in-care] hand_loaded_datasets: ${hlErr.message}`);
    revalidatePath('/councils/children-in-care');
    revalidatePath('/councils/[slug]', 'page');
    return NextResponse.json({ status: 'updated', year: rel.year, previous_year: stored, rows_written: rows.length, england: check.england, council_sums: check.councilSums });
  } catch (e) {
    if (isPoliteStop(e)) throw e;
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 502 });
  }
}

export const GET = withHeartbeat('/api/sync-children-in-care', GET_impl);
