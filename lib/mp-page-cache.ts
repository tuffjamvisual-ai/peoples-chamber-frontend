// Reads every MP page render made, now shared (owner, 7 Nov 2026, W1: each ran on every render, thousands of times a day).
//   voteCounts(memberId): the mp_vote_counts RPC, once per render (the metadata and the page used to call it twice) and kept
//     for an hour per member under VOTE_COUNTS_TAG, which the MP page refresh after a sync expires at once.
//   latestSpadRelease(): the Cabinet Office's latest special adviser release, kept for an hour under SPAD_RELEASES_TAG, which
//     the special adviser sync expires when it writes a release.
// Nothing shown changes.
import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

const PARL_START = '2024-07-04';
export const VOTE_COUNTS_TAG = 'mp-vote-counts';
export const SPAD_RELEASES_TAG = 'spad-releases';

export type VoteCounts = { all_votes: number; aye_no: number; aye_no_since: number; rebellions_since: number; rebellions_all: number };

const voteCountsCached = unstable_cache(async (memberId: number): Promise<VoteCounts | null> => {
  const { data, error } = await supabase.rpc('mp_vote_counts', { p_member_id: memberId, p_since: PARL_START });
  if (error) throw new Error(error.message);
  return (data as VoteCounts | null) ?? null;
}, ['mp-vote-counts-v1'], { revalidate: 3600, tags: [VOTE_COUNTS_TAG] });

// The same { data, error } shape as the RPC call it replaces; a failed read is not cached.
export const voteCounts = cache(async (memberId: number): Promise<{ data: VoteCounts | null; error: { message: string } | null }> => {
  try {
    return { data: await voteCountsCached(memberId), error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
});

export type SpadRelease = { release_slug: string; as_at: string; headcount: number | null; fte: number | null; paybill: number | null; prior_paybill: number | null; source_url: string | null };
export const latestSpadRelease = unstable_cache(async (): Promise<SpadRelease | null> => {
  const { data, error } = await supabase.from('spad_releases').select('release_slug, as_at, headcount, fte, paybill, prior_paybill, source_url').order('as_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`spad_releases: ${error.message}`);
  return (data as SpadRelease | null) ?? null;
}, ['spad-latest-v1'], { revalidate: 3600, tags: [SPAD_RELEASES_TAG] });

// Called where MP vote data has just changed (lib/mp-refresh.ts).
export function voteCountsChanged(): void {
  try { revalidateTag(VOTE_COUNTS_TAG, { expire: 0 }); } catch { /* outside a request */ }
}
export function spadReleasesChanged(): void {
  try { revalidateTag(SPAD_RELEASES_TAG, { expire: 0 }); } catch { /* outside a request */ }
}
