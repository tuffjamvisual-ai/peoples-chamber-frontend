import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { periodKey, isNewer, newestPeriod } from '@/lib/hand-loaded';
import { sendHandLoadedReleaseAlert, type HandLoadedRelease } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Weekly: for each dataset loaded by hand (hand_loaded_datasets, migration 2026-10-21r), look at its source page for
// a release newer than the one held, and email John once per new release (owner's approval, 21 Oct 2026). Nothing is
// imported. Reminder datasets (no feed, such as council leaders) get one email in their month each year. One request
// per source page, one at a time, 2 s apart; each host's robots.txt allows these pages (checked 21 Oct 2026).

const UA = 'opengovt/1.0 (+https://opengovt.uk)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = {
  key: string; label: string; held_period: string; source_page: string; expected_release: string;
  check_kind: 'page_period' | 'reminder' | 'automated'; check_url: string | null; period_pattern: string | null;
  reminder_month: number | null; notified_period: string | null; notified_at: string | null;
};

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from('hand_loaded_datasets').select('*').order('key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now = new Date();
  const found: HandLoadedRelease[] = [];
  const results: Array<{ key: string; status: string; found?: string | null }> = [];
  let checked = 0, failed = 0;

  for (const d of (data || []) as Row[]) {
    if (d.check_kind === 'automated') { results.push({ key: d.key, status: 'automated' }); continue; }
    if (d.check_kind === 'reminder') {
      const year = String(now.getUTCFullYear());
      const due = now.getUTCMonth() + 1 === d.reminder_month && !(d.notified_at || '').startsWith(year);
      if (due) found.push({ key: d.key, label: d.label, held: d.held_period, newer: null, sourcePage: d.source_page, expectedRelease: d.expected_release });
      results.push({ key: d.key, status: due ? 'reminder due' : 'reminder not due' });
      continue;
    }
    const update: Record<string, unknown> = { last_checked_at: now.toISOString() };
    try {
      // Stat-Xplore's schema API needs the API key (STAT_XPLORE_API_KEY, set on the project); other sources are public.
      const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/json, text/html' };
      if (d.check_url!.startsWith('https://stat-xplore.dwp.gov.uk/')) {
        if (!process.env.STAT_XPLORE_API_KEY) throw new Error('STAT_XPLORE_API_KEY not set');
        headers.APIKey = process.env.STAT_XPLORE_API_KEY;
      }
      const res = await fetch(d.check_url!, { headers, signal: AbortSignal.timeout(30_000), cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newest = newestPeriod(await res.text(), d.period_pattern!);
      const held = periodKey(d.held_period);
      update.last_found_period = newest?.text ?? null;
      update.last_error = newest ? null : 'no period found on the page (its layout may have changed)';
      checked++;
      if (!newest) failed++;
      else if (held != null && isNewer(newest.key, held) && d.notified_period !== newest.text) {
        found.push({ key: d.key, label: d.label, held: d.held_period, newer: newest.text, sourcePage: d.source_page, expectedRelease: d.expected_release });
      }
      results.push({ key: d.key, status: newest ? 'checked' : 'no period found', found: newest?.text ?? null });
    } catch (e) {
      failed++;
      update.last_error = (e as Error).message;
      results.push({ key: d.key, status: `failed: ${(e as Error).message}` });
    }
    await supabaseAdmin.from('hand_loaded_datasets').update(update).eq('key', d.key);
    await sleep(2000);
  }

  const email = found.length ? await sendHandLoadedReleaseAlert(found) : { sent: false, reason: 'nothing new' };
  if (email.sent) {
    for (const f of found) {
      await supabaseAdmin.from('hand_loaded_datasets').update({ notified_period: f.newer ?? `reminder ${now.getUTCFullYear()}`, notified_at: now.toISOString() }).eq('key', f.key);
    }
  }
  return NextResponse.json({
    rows_written: checked, checked, failed, new_releases: found.map((f) => f.key), email, results, checkedAt: now.toISOString(),
  }, { status: checked === 0 && failed > 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/check-hand-loaded-releases', GET_impl);
