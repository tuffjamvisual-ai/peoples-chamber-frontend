// Fetch a bill's COMPLETE stage list from Parliament's Bills API.
//
// The Stages endpoint is paged: with no Take parameter it returns only the
// first 20 stages, plus totalResults. Long bills (government bills with
// ping-pong between the Houses) have more than 20 — e.g. the Holocaust
// Memorial Bill has 27, so a single default call stopped at its Lords 2nd
// reading (4 Sep 2024) and lost Report, Third Reading, ping-pong and Royal
// Assent (live-verified 2026-10-11 against /Bills/3421/Stages).
//
// This pages with Take/Skip until every stage is collected and returns the
// same JSON shape the site already stores in bill.stages
// ({ items, totalResults, ... }), so existing readers are unaffected.
//
// Used by app/api/sync-bill-stages/route.ts. scripts/backfill-bill-stages.js
// is plain Node and carries an identical copy of this logic — mirror any
// change there.

import { politeFetch, type SyncBudget } from '@/lib/sync-budget';

const PARLIAMENT_API = 'https://bills-api.parliament.uk/api/v1/Bills';
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2,000 stages — far beyond any real bill; guards a runaway loop

type StageItem = { description?: string; stageSittings?: Array<{ date?: string }>; [k: string]: unknown };
export type BillStagesJson = { items: StageItem[]; totalResults: number; itemsPerPage: number; [k: string]: unknown };

// The Bills API answers 404 for a bill it no longer has (24 Oct 2026: three bills had returned 404 since June). Thrown
// so the sync can tell "not found" from a real failure; every other status throws a plain Error as before.
export class BillNotFoundError extends Error {
  readonly status = 404;
  constructor(parliamentId: number) {
    super(`Bills API 404 for bill ${parliamentId}`);
    this.name = 'BillNotFoundError';
  }
}

// With a budget (the sync), each request's timeout is cut to the time left and a 429 throws RateLimited
// (lib/sync-budget.ts); without one (scripts), a 30 s timeout as before.
export async function fetchAllBillStages(parliamentId: number, budget?: SyncBudget): Promise<BillStagesJson> {
  const items: StageItem[] = [];
  let totalResults = 0;
  let first: Record<string, unknown> | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await politeFetch(`${PARLIAMENT_API}/${parliamentId}/Stages?Take=${PAGE_SIZE}&Skip=${page * PAGE_SIZE}`, { cache: 'no-store' },
      { budget, timeoutMs: 30_000 });
    if (res.status === 404) throw new BillNotFoundError(parliamentId);
    if (!res.ok) throw new Error(`Bills API ${res.status}`);
    const json = await res.json();
    if (!first) first = json;
    const pageItems: StageItem[] = Array.isArray(json?.items) ? json.items : [];
    totalResults = typeof json?.totalResults === 'number' ? json.totalResults : items.length + pageItems.length;
    items.push(...pageItems);
    if (pageItems.length === 0 || items.length >= totalResults) break;
  }

  if (items.length < totalResults) {
    // Never store a silently truncated list.
    throw new Error(`Bills API returned ${items.length} of ${totalResults} stages for bill ${parliamentId}`);
  }

  return { ...(first ?? {}), items, totalResults, itemsPerPage: items.length };
}

// Headline current_stage + stage_date: the freshest stage whose first
// sitting date has actually happened (future/scheduled sittings ignored).
export function deriveCurrentStage(items: StageItem[]): { current_stage: string | null; stage_date: string | null } {
  const today = new Date().toISOString().slice(0, 10);
  const dated = items
    .map((s) => ({ s, date: s.stageSittings?.[0]?.date }))
    .filter((x): x is { s: StageItem; date: string } => typeof x.date === 'string' && x.date.slice(0, 10) <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = dated[0];
  return {
    current_stage: latest?.s.description ?? null,
    stage_date: latest?.date?.slice(0, 10) ?? null,
  };
}
