// Shared logic for UK Parliament petitions (petition.parliament.uk, Open
// Government Licence v3.0). Used by the daily sync route
// (app/api/sync-petitions/route.ts). The one-off backfill script
// (scripts/import-petitions.js) is plain Node and cannot import this
// TypeScript module, so it carries an identical copy of this logic — any
// change here must be mirrored there.
//
// THRESHOLD: only petitions that reached 10,000 signatures (the point at
// which the government must respond) are stored. Stated to readers on the
// MP profile's Petitions tab. Must stay in sync with the migration header
// (scripts/migrations/2026-10-11-petitions.sql) and the backfill script.

import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, isPoliteStop } from '@/lib/sync-budget';

export const PETITION_SIGNATURE_THRESHOLD = 10000;
export const PETITIONS_BASE = 'https://petition.parliament.uk';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchPetitionJson(url: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await politeFetch(url, {
        headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) {
        // 4xx other than 429 won't improve on retry — fail immediately.
        const err = new Error(`HTTP ${res.status} for ${url}`) as Error & { noRetry?: boolean };
        err.noRetry = true;
        throw err;
      }
      return await res.json();
    } catch (e) {
      if (isPoliteStop(e)) throw e; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
      lastErr = e;
      if ((e as { noRetry?: boolean }).noRetry) break;
      await sleep(1000 * attempt * attempt); // 1s, 4s, 9s
    }
  }
  throw lastErr;
}

// List pages are sorted by signature_count DESCENDING (live-verified on both
// the open and closed lists, 2026-10-11), so reading stops at the first
// petition below the threshold.
export async function collectPetitionIdsAtThreshold(state: 'open' | 'closed', delayMs = 250): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; page <= 1000; page++) {
    const json = await fetchPetitionJson(`${PETITIONS_BASE}/petitions.json?state=${state}&page=${page}`);
    const items: any[] = Array.isArray(json?.data) ? json.data : [];
    let reachedBelow = false;
    for (const item of items) {
      const count = item?.attributes?.signature_count;
      if (typeof count !== 'number') continue;
      if (count >= PETITION_SIGNATURE_THRESHOLD) ids.push(item.id);
      else { reachedBelow = true; break; }
    }
    if (reachedBelow || !json?.links?.next || items.length === 0) break;
    await sleep(delayMs);
  }
  return ids;
}

export type ConstituencyRow = {
  petition_id: number;
  constituency_gss_code: string;
  constituency_name: string;
  signature_count: number;
  rank_in_petition: number;
  share_of_petition_pct: number | null;
  updated_at: string;
};

function toDateOnly(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

export function buildPetitionRows(json: any): { petition: Record<string, unknown>; constRows: ConstituencyRow[] } {
  const id = json?.data?.id;
  const a = json?.data?.attributes;
  if (typeof id !== 'number' || !a) throw new Error('Unexpected petition JSON shape');

  const rawConst: any[] = Array.isArray(a.signatures_by_constituency) ? a.signatures_by_constituency : [];
  const base = rawConst
    .filter((c) => c && typeof c.ons_code === 'string' && c.ons_code && typeof c.signature_count === 'number' && c.signature_count > 0)
    .map((c) => ({
      petition_id: id as number,
      constituency_gss_code: c.ons_code as string,
      constituency_name: (c.name as string) || (c.ons_code as string),
      signature_count: c.signature_count as number,
    }));

  const ukTotal = base.reduce((s, r) => s + r.signature_count, 0);
  const now = new Date().toISOString();

  // Standard competition ranking (1, 2, 2, 4) by signature_count descending.
  const sorted = [...base].sort((x, y) => y.signature_count - x.signature_count);
  let prevCount: number | null = null;
  let prevRank = 0;
  const constRows: ConstituencyRow[] = sorted.map((r, i) => {
    if (r.signature_count !== prevCount) { prevRank = i + 1; prevCount = r.signature_count; }
    return {
      ...r,
      rank_in_petition: prevRank,
      share_of_petition_pct: ukTotal > 0 ? Math.round((r.signature_count / ukTotal) * 100 * 10000) / 10000 : null,
      updated_at: now,
    };
  });

  const gr = a.government_response || null;
  const debate = a.debate || null;

  const petition = {
    id,
    action: a.action,
    background: a.background || null,
    additional_details: a.additional_details || null,
    state: a.state,
    signature_count: a.signature_count,
    uk_constituency_signature_count: ukTotal,
    constituency_count: constRows.length,
    source_created_at: a.created_at || null,
    opened_at: a.opened_at || null,
    closed_at: a.closed_at || null,
    response_threshold_reached_at: a.response_threshold_reached_at || null,
    government_response_at: a.government_response_at || null,
    government_response_summary: gr?.summary || null,
    debate_threshold_reached_at: a.debate_threshold_reached_at || null,
    scheduled_debate_date: toDateOnly(a.scheduled_debate_date),
    debated_on: toDateOnly(debate?.debated_on),
    debate_transcript_url: debate?.transcript_url || null,
    debate_video_url: debate?.video_url || null,
    departments: Array.isArray(a.departments) ? a.departments : [],
    topics: Array.isArray(a.topics) ? a.topics : [],
    url: `${PETITIONS_BASE}/petitions/${id}`,
    source_updated_at: a.updated_at || null,
    synced_at: now,
    updated_at: now,
  };

  return { petition, constRows };
}

export async function writePetitionRows(
  db: SupabaseClient,
  { petition, constRows }: { petition: Record<string, unknown>; constRows: ConstituencyRow[] },
): Promise<void> {
  const id = petition.id as number;
  const { error: pErr } = await db.from('petitions').upsert(petition, { onConflict: 'id' });
  if (pErr) throw new Error(`petitions upsert ${id}: ${pErr.message}`);

  for (let i = 0; i < constRows.length; i += 500) {
    const batch = constRows.slice(i, i + 500);
    const { error } = await db
      .from('petition_constituency_signatures')
      .upsert(batch, { onConflict: 'petition_id,constituency_gss_code' });
    if (error) throw new Error(`constituency upsert ${id}: ${error.message}`);
  }

  // Remove any constituency row no longer in the source (e.g. the petitions
  // site removed invalid signatures and a constituency fell to zero). ONS
  // codes are alphanumeric only, so they are safe inside the in-list.
  if (constRows.length > 0) {
    const codes = constRows.map((r) => r.constituency_gss_code);
    if (codes.some((c) => !/^[A-Z0-9]+$/.test(c))) {
      throw new Error(`Unexpected constituency code format on petition ${id}`);
    }
    const { error: dErr } = await db
      .from('petition_constituency_signatures')
      .delete()
      .eq('petition_id', id)
      .not('constituency_gss_code', 'in', `(${codes.join(',')})`);
    if (dErr) throw new Error(`stale constituency delete ${id}: ${dErr.message}`);
  }
}
