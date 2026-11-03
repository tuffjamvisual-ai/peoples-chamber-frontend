// Reading mp_biography for a public page (owner, 3 Nov 2026). When bio_visible is not true, the written biography is
// never selected, so it cannot reach a component, the page's HTML or its __next_f data, or any response: not the
// text (political_bio), its sources (bio_source, bio_sources), its review date (bio_last_reviewed) or the background
// text written alongside it (career_background). The review flags (bio_review_reason, bio_review_flagged_at) are for
// the freshness email only and are never read here. Everything else (posts, committees, seats, party history,
// career history, education, the sourced Background timeline) is read as before.
import type { SupabaseClient } from '@supabase/supabase-js';

export const BIO_PUBLIC_COLUMNS =
  'id, member_id, representations, government_posts, opposition_posts, committee_memberships, party_history, created_at, '
  + 'occupation_before_politics, career_history, education, bio_visible, background_timeline, background_last_checked';
export const BIO_TEXT_COLUMNS = 'political_bio, bio_source, bio_sources, bio_last_reviewed, career_background';

export type BiographyRow = Record<string, unknown> & { member_id: number; bio_visible: boolean | null; political_bio?: string | null };

// The public row; the text columns are added only when bio_visible is true. Same { data, error } shape as a query.
export async function getMpBiography(supabase: SupabaseClient, memberId: number): Promise<{ data: BiographyRow | null; error: { message: string } | null }> {
  const { data, error } = await supabase.from('mp_biography').select(BIO_PUBLIC_COLUMNS).eq('member_id', memberId).maybeSingle();
  if (error || !data) return { data: null, error: error ? { message: error.message } : null };
  const row = data as unknown as BiographyRow;
  if (row.bio_visible !== true) return { data: row, error: null };
  const text = await supabase.from('mp_biography').select(BIO_TEXT_COLUMNS).eq('member_id', memberId).eq('bio_visible', true).maybeSingle();
  if (text.error) return { data: row, error: { message: text.error.message } };
  return { data: { ...row, ...((text.data as Record<string, unknown> | null) ?? {}) }, error: null };
}
