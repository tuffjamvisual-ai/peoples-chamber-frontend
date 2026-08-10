import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly-ish liveness check for archived GOV.UK press releases (Option C).
//
// We serve press-release bodies DB-first from our own archive, so a page view
// never depends on GOV.UK. This cron is the mechanism that DETECTS when GOV.UK
// removes a release: it HEAD-requests each release's original URL (least
// recently checked first) and, on a 404/410, sets removed_upstream = true so
// the detail page shows the "removed from GOV.UK — archived copy" banner.
//
// It also self-heals: if a live (200) release somehow has no stored body yet
// (e.g. a transient failure during the initial backfill), it fetches and fills
// the body from the content API.
//
// Batched so it fits in maxDuration: each run checks the BATCH least-recently
// -checked rows; at ~500/run every 2 hours it cycles the whole ~45k archive
// roughly weekly. Added 2026-07-11.

const BATCH = 500;
const DELAY_MS = 250;
const UA = 'PeoplesChamber/1.0 (+https://www.opengovt.uk)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { id: number; gov_url: string | null; body: string | null };

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('press_releases')
    .select('id, gov_url, body')
    .ilike('gov_url', '%gov.uk%')
    .order('liveness_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const rows = (data || []) as Row[];

  let checked = 0, removed = 0, restored = 0, filled = 0, transient = 0;
  const nowIso = () => new Date().toISOString();

  for (const r of rows) {
    if (!r.gov_url) continue;
    const path = r.gov_url.replace(/^https?:\/\/[^/]+/, '');
    try {
      const head = await fetch(r.gov_url, { method: 'HEAD', headers: { 'User-Agent': UA } });
      if (head.status === 404 || head.status === 410) {
        await supabase.from('press_releases').update({ removed_upstream: true, liveness_checked_at: nowIso() }).eq('id', r.id);
        removed++;
      } else if (head.ok) {
        const patch: Record<string, unknown> = { removed_upstream: false, liveness_checked_at: nowIso() };
        // Self-heal a missing body (rare, post-backfill).
        if (!r.body) {
          try {
            const c = await fetch(`https://www.gov.uk/api/content${path}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
            if (c.ok) {
              const j = (await c.json()) as { details?: { body?: string } };
              if (j.details?.body) { patch.body = j.details.body; filled++; }
            }
          } catch { /* leave body null; next cycle retries */ }
        }
        await supabase.from('press_releases').update(patch).eq('id', r.id);
        restored++;
      } else {
        transient++;
        continue; // don't stamp checked — retry next run
      }
      checked++;
    } catch {
      transient++;
    }
    await sleep(DELAY_MS);
  }

  return NextResponse.json({
    ok: true,
    batch: rows.length,
    checked,
    stillLive: restored,
    newlyRemoved: removed,
    bodiesFilled: filled,
    transient,
    syncedAt: nowIso(),
  });
}
