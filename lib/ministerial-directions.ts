// Ministerial directions (ministerial_directions, migration 2026-10-20a). Shared by
// /transparency/ministerial-directions and the Directions tab on department pages.
import { supabase } from '@/lib/supabase';

export type DirectionLetter = { title: string; url: string; format: 'pdf' | 'html'; kind: 'request' | 'direction' | 'other' };
export type Direction = {
  slug: string;
  subject: string;
  summary: string | null;
  govuk_url: string;
  published_on: string;
  direction_date: string | null;
  minister_names: string[] | null;
  minister_roles: string[];
  dept_slugs: string[];
  letters: DirectionLetter[];
};

const COLUMNS = 'slug, subject, summary, govuk_url, published_on, direction_date, minister_names, minister_roles, dept_slugs, letters';

// Newest first, by the date given where it is known, else the publication date.
export const sortKey = (d: Direction) => d.direction_date ?? d.published_on;
const byNewest = (a: Direction, b: Direction) => sortKey(b).localeCompare(sortKey(a));

export async function fetchDirections(deptSlug?: string): Promise<Direction[]> {
  let q = supabase.from('ministerial_directions').select(COLUMNS);
  if (deptSlug) q = q.contains('dept_slugs', [deptSlug]);
  const { data, error } = await q;
  if (error) throw new Error(`ministerial_directions: ${error.message}`); // fail the build rather than publish an empty list
  return ((data ?? []) as Direction[]).sort(byNewest);
}

export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// "Given 12 April 2025" or, where the published letter shows no readable date, the publication date with the
// owner's note (20 Oct 2026). No date is guessed.
export const NO_DATE_NOTE = 'Date the direction was given is not shown on the published letter';
export const dateLine = (d: Direction) =>
  d.direction_date ? `Given ${longDate(d.direction_date)}` : `Published ${longDate(d.published_on)}. ${NO_DATE_NOTE}`;

export const ministerLine = (d: Direction) =>
  d.minister_names?.length ? d.minister_names.join(' and ') : 'Minister not named in the published letter';

// The minister's letter first, then the request; one link per letter (the HTML version where both are published).
export function letterLinks(d: Direction): { label: string; url: string }[] {
  const seen = new Set<string>();
  const order = { direction: 0, request: 1, other: 2 } as const;
  return [...d.letters]
    .sort((a, b) => order[a.kind] - order[b.kind] || (a.format === 'html' ? -1 : 1))
    .filter((l) => {
      const key = `${l.kind}|${l.title.replace(/\s*\(accessible( version)?\)|: accessible version/i, '')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((l) => ({ label: l.kind === 'direction' ? "Minister's direction" : l.kind === 'request' ? "Accounting officer's letter" : l.title, url: l.url }));
}
