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
  organisations: string[];
  dept_slugs: string[];
  letters: DirectionLetter[];
};

const COLUMNS = 'slug, subject, summary, govuk_url, published_on, direction_date, minister_names, minister_roles, organisations, dept_slugs, letters';

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
// owner's note (20 Oct 2026). No date is guessed. Where GOV.UK has published no direction letter at all (the Home
// Office, 2019), the owner's note for that case instead.
export const NO_DATE_NOTE = 'Date the direction was given is not shown on the published letter';
export const NO_DIRECTION_LETTER_NOTE = "GOV.UK has published only the permanent secretary's letter, not the direction.";
export const dateLine = (d: Direction) => {
  if (d.direction_date) return `Given ${longDate(d.direction_date)}`;
  const note = d.letters.some((l) => l.kind === 'direction') ? `${NO_DATE_NOTE}.` : NO_DIRECTION_LETTER_NOTE;
  return `Published ${longDate(d.published_on)}. ${note}`;
};

// GOV.UK re-tags old pages with successor departments, so a 2020 page can carry both the Department for Business,
// Energy & Industrial Strategy and the Department for Business and Trade. These departments did not exist before
// the date given; a direction from before then shows the department as it was (owner's decision, 20 Oct 2026).
// Sources: GOV.UK organisation pages (DBT, DESNZ and DSIT from 7 Feb 2023; DLUHC from 19 Sep 2021); the July 2026
// reshuffle for Business, Innovation, Science and Trade.
const CREATED: Record<string, string> = {
  'Department for Business, Innovation, Science and Trade': '2026-07-01',
  'Department for Business and Trade': '2023-02-07',
  'Department for Energy Security and Net Zero': '2023-02-07',
  'Department for Science, Innovation and Technology': '2023-02-07',
  'Department for Levelling Up, Housing and Communities': '2021-09-19',
};
// Bodies GOV.UK also tags that are not departments; left out of "Department at the time".
const NOT_DEPARTMENTS = new Set(['The Shareholder Executive', 'Office for Product Safety and Standards', 'UK Holocaust Memorial Foundation', "Prime Minister's Office, 10 Downing Street"]);
// The GOV.UK organisations tagged on a direction that existed on its date (date given, else publication date).
export function departmentsAtTheTime(d: Direction): string[] {
  const on = sortKey(d);
  const depts = d.organisations.filter((o) => !NOT_DEPARTMENTS.has(o));
  const kept = depts.filter((o) => !CREATED[o] || CREATED[o] <= on);
  return kept.length ? kept : depts;
}

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
