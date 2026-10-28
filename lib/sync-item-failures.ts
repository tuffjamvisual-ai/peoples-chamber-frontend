// Items that keep failing in a queue sync (owner, 28 Oct 2026, after report 79: bill 3031's stages timed out on every
// run and, as the only bill due, turned the 28 Oct 07:35 run into a 502). For the syncs that work through a queue:
//  - each item that fails in a run has its count of runs in a row raised by one (once per run, however many tries);
//  - from FLAG_AFTER_RUNS runs in a row it is flagged: the sync moves it to the back of its queue, carries on with the
//    others, does not count it towards a failed run (5xx), and returns 200 with partial: true;
//  - the freshness email names every flagged item with its error (app/api/monitor-freshness);
//  - an item that later succeeds has its count cleared.
// Kept in sync_cursor under "failures:<route>" (no schema change): { items: { [key]: ItemFailure } }.

import type { SupabaseClient } from '@supabase/supabase-js';

export const FLAG_AFTER_RUNS = 3;
export const FAILURES_PREFIX = 'failures:';
// An item not failing again for this long is dropped (it left the queue, e.g. a bill that is now hidden).
const FORGET_AFTER_MS = 60 * 86_400_000;

export type ItemFailure = { label: string; error: string; runs: number; firstAt: string; lastAt: string };
export type FlaggedItem = ItemFailure & { key: string };

export class ItemFailures {
  private changed = false;
  private readonly seen = new Set<string>();      // items that failed in this run
  private readonly flaggedNow = new Set<string>(); // of those, the ones flagged

  private constructor(
    private readonly supabase: SupabaseClient,
    readonly route: string,
    private readonly items: Record<string, ItemFailure>,
    // false when the stored counts could not be read: nothing is saved, so they are not wiped.
    private readonly loaded: boolean,
  ) {}

  static async load(supabase: SupabaseClient, route: string): Promise<ItemFailures> {
    const { data, error } = await supabase.from('sync_cursor').select('cursor').eq('route', FAILURES_PREFIX + route).maybeSingle();
    if (error) console.error(`[sync] ${route}: could not read the failing items: ${error.message}`);
    const items = ((data?.cursor as { items?: Record<string, ItemFailure> } | null)?.items) ?? {};
    const cutoff = Date.now() - FORGET_AFTER_MS;
    for (const [k, v] of Object.entries(items)) if (Date.parse(v.lastAt) < cutoff) delete items[k];
    return new ItemFailures(supabase, route, items, !error);
  }

  // Flagged before this run: the sync puts it at the back of its queue.
  isFlagged(key: string | number): boolean {
    return (this.items[String(key)]?.runs ?? 0) >= FLAG_AFTER_RUNS;
  }

  // Record a failure; returns true when the item is now flagged (this failure does not fail the run).
  failed(key: string | number, label: string, error: string): boolean {
    const k = String(key);
    const now = new Date().toISOString();
    const prev = this.items[k];
    if (!this.seen.has(k)) {
      this.seen.add(k);
      this.items[k] = { label, error: error.slice(0, 300), runs: (prev?.runs ?? 0) + 1, firstAt: prev?.firstAt ?? now, lastAt: now };
      this.changed = true;
    } else {
      this.items[k] = { ...this.items[k], error: error.slice(0, 300), lastAt: now };
    }
    const flagged = this.items[k].runs >= FLAG_AFTER_RUNS;
    if (flagged) this.flaggedNow.add(k);
    return flagged;
  }

  succeeded(key: string | number): void {
    const k = String(key);
    this.flaggedNow.delete(k); // failed earlier in this run, then succeeded on a second try
    if (this.items[k]) { delete this.items[k]; this.changed = true; }
  }

  // Flagged items that failed in this run: the run is partial while there are any.
  get flaggedFailures(): number { return this.flaggedNow.size; }

  flagged(): FlaggedItem[] {
    return Object.entries(this.items).filter(([, v]) => v.runs >= FLAG_AFTER_RUNS).map(([key, v]) => ({ key, ...v }));
  }

  // For the response body.
  summary(): { flagged: FlaggedItem[]; failing: number } {
    return { flagged: this.flagged(), failing: Object.keys(this.items).length };
  }

  async save(): Promise<boolean> {
    if (!this.loaded || !this.changed) return true;
    const route = FAILURES_PREFIX + this.route;
    const { error } = Object.keys(this.items).length === 0
      ? await this.supabase.from('sync_cursor').delete().eq('route', route)
      : await this.supabase.from('sync_cursor').upsert({ route, cursor: { items: this.items }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (error) console.error(`[sync] ${this.route}: could not save the failing items: ${error.message}`);
    return !error;
  }
}
