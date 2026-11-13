// Source availability (Cowork 13 Nov 2026, COWORK-TO-T1 ENTRY 4): when an outside source is down (it answers every call
// with a server error, e.g. Parliament's statutory instruments API with HTTP 503 on 11 and 13 Nov 2026), the sync that
// reads it records that here and returns without failing. Nothing is written, so the pages keep the last good data, and
// the freshness monitor (app/api/monitor-freshness) says the source is down rather than that our sync failed.
//
// One row per route in sync_cursor, under "source:<route>". The first run that gets an answer from the source clears it.
// Recording never fails the sync it describes.

import type { SupabaseClient } from '@supabase/supabase-js';

export const SOURCE_PREFIX = 'source:';
export const DOWN_AFTER_ERRORS = 5; // server errors in a row, with no answer yet in the run, before the source counts as down

export type SourceDown = { reason: string; since: string; lastSeenAt: string; runs: number };

// The reason a run's failed calls show the source is down, or null. Down means: no call answered, at least one call got
// an HTTP 5xx answer, and every other call either got a 5xx or timed out. A 4xx or a network error is not counted as
// the source being down (it may be our request). The reason names the most common status, e.g. "HTTP 503".
export function sourceDownReason(answered: number, reasons: string[]): string | null {
  if (answered > 0 || reasons.length === 0) return null;
  const http = reasons.filter((r) => r !== 'timeout');
  if (http.length === 0 || !http.every((r) => /^HTTP 5\d\d$/.test(r))) return null;
  const counts = new Map<string, number>();
  for (const r of http) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export async function markSourceDown(supabase: SupabaseClient, route: string, reason: string, now: Date = new Date()): Promise<SourceDown | null> {
  try {
    const key = SOURCE_PREFIX + route;
    const { data } = await supabase.from('sync_cursor').select('cursor').eq('route', key).maybeSingle();
    const prev = (data?.cursor as SourceDown | undefined) ?? null;
    const at = now.toISOString();
    const next: SourceDown = { reason, since: prev?.since ?? at, lastSeenAt: at, runs: (prev?.runs ?? 0) + 1 };
    const { error } = await supabase.from('sync_cursor').upsert({ route: key, cursor: next, updated_at: at }, { onConflict: 'route' });
    return error ? null : next;
  } catch {
    return null;
  }
}

export async function clearSourceDown(supabase: SupabaseClient, route: string): Promise<void> {
  try {
    await supabase.from('sync_cursor').delete().eq('route', SOURCE_PREFIX + route);
  } catch {
    // never fails the sync
  }
}

// The monitor's line for a source that is down.
export function sourceDownMessage(s: SourceDown): string {
  const when = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`;
  return `source unavailable (${s.reason}) since ${when(s.since)}, last seen ${when(s.lastSeenAt)} (${s.runs} run${s.runs === 1 ? '' : 's'}); `
    + 'our sync ran and wrote nothing, so the pages keep the last good data';
}
