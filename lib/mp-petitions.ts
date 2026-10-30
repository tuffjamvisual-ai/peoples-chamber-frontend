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
// checkedOn: the last successful run of /api/sync-petitions (sync_heartbeat), which checks every open petition daily;
// closed petitions' counts are final.
export type MpPetitionsAnswer = { petitions: MpPetition[]; checkedOn: string | null };

type Row = {
  petition_id: number; signature_count: number; rank_in_petition: number;
  petitions: { action: string; state: string; signature_count: number; constituency_count: number | null; opened_at: string | null; closed_at: string | null; government_response_at: string | null; debated_on: string | null; url: string } | null;
};

export const loadMpPetitions = unstable_cache(async (memberId: number): Promise<MpPetitionsAnswer | null> => {
  // Read in the same cached read, so the sync's daily refresh of MP_PETITIONS_TAG also moves the date (owner, 30 Oct 2026).
  const { data: hb, error: hbErr } = await supabase.from('sync_heartbeat').select('last_ran_at, last_status, last_nonzero_at').eq('route', '/api/sync-petitions').maybeSingle();
  if (hbErr) throw new Error(`/api/mps/${memberId}/petitions sync_heartbeat: ${hbErr.message}`);
  // The last successful run: the last run when it succeeded, otherwise the last run that saved rows.
  const ok = hb && typeof hb.last_status === 'number' && hb.last_status >= 200 && hb.last_status < 300;
  const checkedOn = ((ok ? hb.last_ran_at : hb?.last_nonzero_at) as string | null | undefined) ?? null;
  const { data: mp, error: mpErr } = await supabase.from('mps').select('constituency_gss_code').eq('member_id', memberId).maybeSingle();
  if (mpErr) throw new Error(`/api/mps/${memberId}/petitions mps: ${mpErr.message}`);
  if (!mp) return null;
  const gss = mp.constituency_gss_code as string | null;
  if (!gss) return { petitions: [], checkedOn };
  const { data, error } = await supabase
    .from('petition_constituency_signatures')
    .select('petition_id, signature_count, rank_in_petition, petitions(action, state, signature_count, constituency_count, opened_at, closed_at, government_response_at, debated_on, url)')
    .eq('constituency_gss_code', gss)
    .order('signature_count', { ascending: false })
    .limit(PETITIONS_SHOWN);
  if (error) throw new Error(`/api/mps/${memberId}/petitions: ${error.message}`);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.petitions && r.petitions.action);
  return {
    checkedOn,
    petitions: rows.map((r) => ({
      petitionId: r.petition_id, title: r.petitions!.action, state: r.petitions!.state, localSignatures: r.signature_count,
      rank: r.rank_in_petition, rankOutOf: r.petitions!.constituency_count, totalSignatures: r.petitions!.signature_count,
      openedAt: r.petitions!.opened_at, closedAt: r.petitions!.closed_at, governmentResponseAt: r.petitions!.government_response_at,
      debatedOn: r.petitions!.debated_on, url: r.petitions!.url,
    })),
  };
}, ['mp-petitions-v2'], { tags: [MP_PETITIONS_TAG], revalidate: 86400 });

