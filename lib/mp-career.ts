// The MP page's Political career fold (owner, 7 Nov 2026, PC1): reads mp_biography.career_parliament, career_research and
// career_checked_at (migration 2026-11-08a) on their own, so the rest of the page never depends on them. Before the
// migration, or on any read error, it returns nothing and the page shows no fold. A part that fails validate() is left out
// and logged.
//
// CAREER_PREVIEW_FILE (a local test only; never set it in Vercel or .env.local): the path of a
// scripts/sync-career-parliament.ts --dry-run file, read in place of the database, so the fold can be drawn locally for the
// MPs in it without touching the live database. Its "generated" time stands in for career_checked_at.
import fs from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validate, type CareerEntry } from '@/lib/career-timeline';

export type MpCareer = { parliament: CareerEntry[] | null; research: CareerEntry[] | null; checkedAt: string | null };
const NONE: MpCareer = { parliament: null, research: null, checkedAt: null };

function checked(memberId: number, name: string, part: unknown): CareerEntry[] | null {
  if (part === null || part === undefined) return null;
  const problems = validate(part);
  if (problems.length) { console.error(`/mps/${memberId} ${name}: ${problems.slice(0, 3).join('; ')}`); return null; }
  return (part as CareerEntry[]).length ? (part as CareerEntry[]) : null;
}

export async function getMpCareer(supabase: SupabaseClient, memberId: number): Promise<MpCareer> {
  const preview = process.env.CAREER_PREVIEW_FILE;
  if (preview) {
    try {
      const file = JSON.parse(fs.readFileSync(preview, 'utf8')) as { generated: string; members: Record<string, { career_parliament: unknown }> };
      const m = file.members[String(memberId)];
      return m ? { parliament: checked(memberId, 'career_parliament', m.career_parliament), research: null, checkedAt: file.generated } : NONE;
    } catch (e) {
      console.error(`CAREER_PREVIEW_FILE: ${e instanceof Error ? e.message : String(e)}`);
      return NONE;
    }
  }
  const { data, error } = await supabase.from('mp_biography').select('career_parliament, career_research, career_checked_at').eq('member_id', memberId).maybeSingle();
  if (error) {
    // Before migration 2026-11-08a the columns are not there: no fold, and nothing to log.
    if (!/career_(parliament|research|checked_at)/.test(error.message)) console.error(`/mps/${memberId} career: ${error.message}`);
    return NONE;
  }
  if (!data) return NONE;
  const row = data as { career_parliament: unknown; career_research: unknown; career_checked_at: string | null };
  return { parliament: checked(memberId, 'career_parliament', row.career_parliament), research: checked(memberId, 'career_research', row.career_research), checkedAt: row.career_checked_at };
}
