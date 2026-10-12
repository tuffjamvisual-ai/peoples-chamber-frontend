// Biography review flags. A written MP biography (mp_biography.political_bio) is
// handwritten and never touched by syncs, so it can silently go out of date when
// an MP's circumstances change. The nightly syncs call flagBioReview when they
// detect such a change (party switch, a government or opposition post starting
// or ending, an MP leaving the Commons, a new MP with no biography). The daily
// freshness monitor (/api/monitor-freshness) lists outstanding flags and emails
// any raised in the last 24 hours.
//
// A flag is cleared when the biography is reviewed: the update that rewrites it
// sets bio_last_reviewed and nulls bio_review_reason / bio_review_flagged_at.
// See the opengovt-mp-biography skill.

import type { SupabaseClient } from '@supabase/supabase-js';

// Adds a reason to the MP's review flag. Several reasons accumulate ("; "-joined)
// until the biography is reviewed. Never throws: a flag failure must not break
// the sync that raised it. Does nothing if the MP has no biography row.
export async function flagBioReview(supabase: SupabaseClient, memberId: number, reason: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('mp_biography')
      .select('bio_review_reason')
      .eq('member_id', memberId)
      .limit(1);
    const row = data?.[0];
    if (!row) return false;
    const existing = (row.bio_review_reason as string | null) || '';
    if (existing.includes(reason)) return true; // already flagged for this
    const merged = existing ? `${existing}; ${reason}` : reason;
    const { error } = await supabase
      .from('mp_biography')
      .update({ bio_review_reason: merged, bio_review_flagged_at: new Date().toISOString() })
      .eq('member_id', memberId);
    return !error;
  } catch {
    return false;
  }
}

// Date as "20 July 2026" for flag reasons.
export function ukDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}
