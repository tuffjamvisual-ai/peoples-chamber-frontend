import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.stages from Parliament's Bills API. Per cron tick this
// refreshes bills whose stages_synced_at is older than 24h OR null, up
// to a per-run cap so a single 300s function invocation stays within
// budget. Run daily via Vercel Cron / GitHub Actions to keep the
// /bills/[id] render path purely Supabase-backed.

const RUN_CAP = 600; // bills to refresh per invocation (600 × 150ms ≈ 90s)
const PARLIAMENT_API = 'https://bills-api.parliament.uk/api/v1/Bills';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchStages(parliamentId: number) {
  const res = await fetch(`${PARLIAMENT_API}/${parliamentId}/Stages`);
  if (!res.ok) throw new Error(`Bills API ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  // Pick the stalest first — bills with NULL stages_synced_at come back
  // first, then by oldest sync. Capped at RUN_CAP per invocation.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, stages_synced_at')
    .not('parliament_id', 'is', null)
    .or(`stages_synced_at.is.null,stages_synced_at.lt.${cutoff}`)
    .order('stages_synced_at', { ascending: true, nullsFirst: true })
    .limit(RUN_CAP);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  let ok = 0, fail = 0;
  const failures: Array<{ id: number; detail: string }> = [];

  for (const row of targets) {
    try {
      const stages = await fetchStages(row.parliament_id);

      // Derive headline current_stage + stage_date from the freshest
      // dated stage in the JSON we just fetched. Stages without a
      // stageSittings date (future/scheduled) are ignored for this
      // purpose so we surface the last *actually-occurred* stage.
      const today = new Date().toISOString().slice(0, 10);
      const items: Array<{ description?: string; stageSittings?: Array<{ date?: string }> }> =
        Array.isArray(stages?.items) ? stages.items : [];
      const dated = items
        .map((s) => ({ s, date: s.stageSittings?.[0]?.date }))
        .filter((x): x is { s: typeof items[number]; date: string } => Boolean(x.date) && x.date.slice(0, 10) <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
      const latest = dated[0];
      const current_stage = latest?.s.description ?? null;
      const stage_date = latest?.date?.slice(0, 10) ?? null;

      const { error } = await supabase
        .from('bill')
        .update({
          stages,
          stages_synced_at: new Date().toISOString(),
          current_stage,
          stage_date,
        })
        .eq('id', row.id);
      if (error) throw error;
      ok++;
    } catch (err) {
      fail++;
      if (failures.length < 20) failures.push({ id: row.id, detail: (err as Error).message });
    }
    await sleep(150);
  }

  return NextResponse.json({
    targeted: targets.length,
    ok,
    fail,
    failures,
    note: targets.length === RUN_CAP ? `Hit per-run cap of ${RUN_CAP}. Re-run to continue.` : 'complete',
    syncedAt: new Date().toISOString(),
  });
}
