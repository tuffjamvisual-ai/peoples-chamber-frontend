// The Petitions tab of /mps/[id] (owner, 30 Oct 2026, cache Stage 2a part 4), read by /api/mps/[id]/petitions: the
// petitions most signed in the MP's constituency, kept for a day under MP_PETITIONS_TAG, which /api/sync-petitions
// refreshes when it changes a count.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as supabase } from '@/lib/supabase-admin';

export const MP_PETITIONS_TAG = 'mp-petitions';
// How many of the constituency's most-signed petitions the tab shows.
const PETITIONS_SHOWN = 20;

export type MpPetition = {
  petitionId: number; title: string; state: string; localSignatures: number; rank: number; rankOutOf: number | null;
  totalSignatures: number; openedAt: string | null; closedAt: string | null; governmentResponseAt: string | null;
  debatedOn: string | null; url: string;
};
export type MpPetitionsAnswer = { petitions: MpPetition[]; asAt: string | null };

type Row = {
  petition_id: number; signature_count: number; rank_in_petition: number; updated_at: string | null;
  petitions: { action: string; state: string; signature_count: number; constituency_count: number | null; opened_at: string | null; closed_at: string | null; government_response_at: string | null; debated_on: string | null; url: string; synced_at: string | null } | null;
};

export const loadMpPetitions = unstable_cache(async (memberId: number): Promise<MpPetitionsAnswer | null> => {
  const { data: mp, error: mpErr } = await supabase.from('mps').select('constituency_gss_code').eq('member_id', memberId).maybeSingle();
  if (mpErr) throw new Error(`/api/mps/${memberId}/petitions mps: ${mpErr.message}`);
  if (!mp) return null;
  const gss = mp.constituency_gss_code as string | null;
  if (!gss) return { petitions: [], asAt: null };
  const { data, error } = await supabase
    .from('petition_constituency_signatures')
    .select('petition_id, signature_count, rank_in_petition, updated_at, petitions(action, state, signature_count, constituency_count, opened_at, closed_at, government_response_at, debated_on, url, synced_at)')
    .eq('constituency_gss_code', gss)
    .order('signature_count', { ascending: false })
    .limit(PETITIONS_SHOWN);
  if (error) throw new Error(`/api/mps/${memberId}/petitions: ${error.message}`);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.petitions && r.petitions.action);
  // "Signature counts as at": the newest check of these figures (the petitions' sync time, or a row's own change).
  const times = rows.flatMap((r) => [r.updated_at, r.petitions!.synced_at]).filter((t): t is string => !!t).sort();
  return {
    asAt: times.length ? times[times.length - 1] : null,
    petitions: rows.map((r) => ({
      petitionId: r.petition_id, title: r.petitions!.action, state: r.petitions!.state, localSignatures: r.signature_count,
      rank: r.rank_in_petition, rankOutOf: r.petitions!.constituency_count, totalSignatures: r.petitions!.signature_count,
      openedAt: r.petitions!.opened_at, closedAt: r.petitions!.closed_at, governmentResponseAt: r.petitions!.government_response_at,
      debatedOn: r.petitions!.debated_on, url: r.petitions!.url,
    })),
  };
}, ['mp-petitions'], { tags: [MP_PETITIONS_TAG], revalidate: 86400 });

