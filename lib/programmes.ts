// Shared data layer for the policy programme tracker (D1+).
//
// getLiveProgrammes()  — anon client, is_live=true only (RLS enforced),
//                        nested programme_timeline join so the current figure
//                        is derived in a single round trip. Used by the index page.
//
// getProgramme()       — supabaseAdmin, bypasses RLS so is_live=false draft
//                        rows are reachable for editorial review. Used by [slug].
//
// getTimeline()        — supabaseAdmin, showAll=true returns every entry
//                        (for draft preview); showAll=false returns only
//                        is_approved=true (for live rendering). Used by [slug].
//
// deriveCurrentFigure() — shared derivation: most recent approved entry with
//                         a non-null figure_value. Called by both pages and by
//                         getLiveProgrammes(), so the logic lives exactly once.

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type ProgrammeRow = {
  id: number;
  slug: string;
  name: string;
  dept_slugs: string[];
  status: string;
  summary: string | null;
  started_date: string | null;
  target_label: string | null;
  target_figure: number | null;
  target_unit: string | null;
  is_live: boolean;
};

export type TimelineRow = {
  id: number;
  entry_date: string;
  title: string;
  body: string | null;
  source_label: string | null;
  figure_value: number | null;
  figure_unit: string | null;
  is_approved: boolean;
};

export type ProgrammeWithFigure = ProgrammeRow & {
  currentEntry: TimelineRow | null;
};

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Most recent approved timeline entry with a non-null figure_value. */
export function deriveCurrentFigure(timeline: TimelineRow[]): TimelineRow | null {
  return timeline.find((e) => e.is_approved && e.figure_value !== null) ?? null;
}

/**
 * All live programmes for the index page. Uses the anon client — RLS filters
 * to is_live=true and is_approved=true automatically, so no explicit filter
 * needed on either table. programme_timeline rows are sorted DESC by
 * entry_date client-side (PostgREST returns join rows in insert order).
 */
export async function getLiveProgrammes(): Promise<ProgrammeWithFigure[]> {
  const { data, error } = await supabase
    .from('policy_programmes')
    .select(
      'id, slug, name, dept_slugs, status, summary, started_date, target_label, target_figure, target_unit, is_live, programme_timeline(id, entry_date, figure_value, figure_unit, is_approved)',
    )
    .eq('is_live', true)
    .order('name');

  if (error) throw new Error(`getLiveProgrammes: ${error.message}`);

  return (data ?? []).map((row) => {
    const nested = (
      (row as unknown as { programme_timeline: TimelineRow[] }).programme_timeline ?? []
    );
    const timeline = [...nested].sort((a, b) =>
      b.entry_date.localeCompare(a.entry_date),
    );
    const { programme_timeline: _t, ...prog } = row as typeof row & {
      programme_timeline: TimelineRow[];
    };
    void _t;
    return {
      ...(prog as unknown as ProgrammeRow),
      currentEntry: deriveCurrentFigure(timeline),
    };
  });
}

/** Single programme by slug — supabaseAdmin bypasses RLS for draft preview. */
export async function getProgramme(slug: string): Promise<ProgrammeRow | null> {
  const { data } = await supabaseAdmin
    .from('policy_programmes')
    .select(
      'id, slug, name, dept_slugs, status, summary, started_date, target_label, target_figure, target_unit, is_live',
    )
    .eq('slug', slug)
    .maybeSingle();
  return (data as ProgrammeRow) ?? null;
}

/**
 * Timeline rows for a programme — supabaseAdmin bypasses RLS.
 * showAll=true (draft preview): all entries including unapproved.
 * showAll=false (live page): only is_approved=true.
 * Already sorted entry_date DESC.
 */
export async function getTimeline(
  programmeId: number,
  showAll: boolean,
): Promise<TimelineRow[]> {
  let q = supabaseAdmin
    .from('programme_timeline')
    .select(
      'id, entry_date, title, body, source_label, figure_value, figure_unit, is_approved',
    )
    .eq('programme_id', programmeId)
    .order('entry_date', { ascending: false });

  if (!showAll) q = q.eq('is_approved', true);

  const { data } = await q;
  return (data as TimelineRow[]) ?? [];
}
