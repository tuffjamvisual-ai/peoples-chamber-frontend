// MP Political career timeline (owner approved the design on 7 Nov 2026, PC1; backlog item 21). Two stored parts in
// mp_biography (migration 2026-11-08a):
//   career_parliament  rebuilt by scripts/sync-career-parliament.ts from Parliament's Members API and Bills API
//   career_research    written only through scripts/background/make-background-migration.ts --column career, never by the sync
//   career_checked_at  when the sync last checked the Parliament part
// Each part is NULL or a JSON array of entries shaped as Background timeline entries (lib/background-timeline.ts), with
// "group" in place of "phase":
//   { "group": "elections" | "posts" | "committees" | "bills" | "findings" | "pledges",
//     "start": "YYYY" | "YYYY-MM" | "YYYY-MM-DD" | null,
//     "end": "YYYY" | "YYYY-MM" | "YYYY-MM-DD" | "present" | null,
//     "title": string, "organisation": string | null, "detail": string | null,
//     "source": { "title": string, "url": "https://..." } }
// Parliament's records give exact days, so a day is allowed as well as a year or a month. A bill also carries
//   "outcome": "became_law" | "defeated" | "withdrawn" | "no_further_stage" | "in_progress", "stage": its current stage as
//   Parliament names it, "session": the session it was last in ("2019-21"), and for withdrawn and in progress bills the
//   date in "end" (the withdrawal date, or the last update).
// Findings are stored exactly as published and shown in quotation marks, unchanged.
// An election contested and lost (owner, PCL2, 8 Nov 2026; Members API Biography electionsContested) is an elections
// entry with start and end both the election day and the title "Contested <constituency>, not elected" (contestTitle; no
// date, as the dates column shows it: owner, PCL3, 8 Nov 2026); validate() checks that shape for any elections title
// starting "Contested ". Until the nightly sync has rewritten the stored titles, validate() also accepts PCL2's dated
// wording "Contested <constituency>, <8 June 2017>, not elected" when that date is the entry's own day, so no MP page
// loses its timeline in between; the sync writes only the new wording.

export type CareerGroup = 'elections' | 'posts' | 'committees' | 'bills' | 'findings' | 'pledges';
export type BillOutcome = 'became_law' | 'defeated' | 'withdrawn' | 'no_further_stage' | 'in_progress';

export type CareerEntry = {
  group: CareerGroup;
  start: string | null;
  end: string | null;
  title: string;
  organisation: string | null;
  detail: string | null;
  source: { title: string; url: string };
  outcome?: BillOutcome;
  stage?: string | null;
  session?: string | null;
};

export const CAREER_GROUPS: Array<{ group: CareerGroup; heading: string }> = [
  { group: 'elections', heading: 'Elections' },
  { group: 'posts', heading: 'Posts' },
  { group: 'committees', heading: 'Committees' },
  { group: 'bills', heading: 'Bills' },
  { group: 'findings', heading: 'Findings' },
  { group: 'pledges', heading: 'Pledges' },
];
const GROUPS = CAREER_GROUPS.map((g) => g.group);
const OUTCOMES: BillOutcome[] = ['became_law', 'defeated', 'withdrawn', 'no_further_stage', 'in_progress'];

const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const firstDay = (v: string) => (v.length === 4 ? `${v}-01-01` : v.length === 7 ? `${v}-01` : v);
const lastDay = (v: string) => (v.length === 4 ? `${v}-12-31` : v.length === 7 ? `${v}-31` : v);

// Problems with a stored part, one message per problem ("entry 2: ..."); an empty list means it is valid.
export function validate(entries: unknown): string[] {
  if (entries === null || entries === undefined) return [];
  if (!Array.isArray(entries)) return ['part is not an array'];
  const problems: string[] = [];
  entries.forEach((raw, i) => {
    const at = `entry ${i + 1}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { problems.push(`${at}: not an object`); return; }
    const e = raw as Record<string, unknown>;
    if (!GROUPS.includes(e.group as CareerGroup)) problems.push(`${at}: group must be one of ${GROUPS.join(', ')}`);
    if (typeof e.title !== 'string' || e.title.trim() === '') problems.push(`${at}: title is empty`);
    for (const k of ['organisation', 'detail'] as const) {
      if (e[k] !== null && e[k] !== undefined && typeof e[k] !== 'string') problems.push(`${at}: ${k} must be text or null`);
    }
    const start = e.start ?? null, end = e.end ?? null;
    if (start !== null && (typeof start !== 'string' || !DATE.test(start))) problems.push(`${at}: start must be YYYY, YYYY-MM, YYYY-MM-DD or null`);
    if (end !== null && (typeof end !== 'string' || (end !== 'present' && !DATE.test(end)))) problems.push(`${at}: end must be YYYY, YYYY-MM, YYYY-MM-DD, "present" or null`);
    if (typeof start === 'string' && DATE.test(start) && typeof end === 'string' && DATE.test(end) && lastDay(end) < firstDay(start)) problems.push(`${at}: end (${end}) is before start (${start})`);
    const src = e.source as Record<string, unknown> | null | undefined;
    if (!src || typeof src !== 'object') problems.push(`${at}: source is missing`);
    else {
      if (typeof src.title !== 'string' || src.title.trim() === '') problems.push(`${at}: source title is empty`);
      if (typeof src.url !== 'string' || !src.url.startsWith('https://')) problems.push(`${at}: source url must start with https://`);
    }
    if (e.group === 'elections' && typeof e.title === 'string' && e.title.startsWith('Contested ')) {
      if (typeof start !== 'string' || !DAY.test(start)) problems.push(`${at}: a contested election needs its day (YYYY-MM-DD) in start`);
      else {
        if (end !== start) problems.push(`${at}: a contested election ends on its own day (end must equal start)`);
        const place = e.title.match(/^Contested (.+), not elected$/)?.[1];
        const dated = place?.endsWith(`, ${dateLabel(start)}`); // PCL2's wording, accepted until the nightly sync rewrites it
        if (!place || (!dated && /\b(1[89]|20)\d\d\b/.test(place))) problems.push(`${at}: a contested election's title must read "Contested <constituency>, not elected"`);
      }
    }
    if (e.group === 'bills') {
      if (!OUTCOMES.includes(e.outcome as BillOutcome)) problems.push(`${at}: a bill needs outcome ${OUTCOMES.join(', ')}`);
      if (e.stage !== undefined && e.stage !== null && typeof e.stage !== 'string') problems.push(`${at}: stage must be text or null`);
      if (typeof e.session !== 'string' || !e.session.trim()) problems.push(`${at}: a bill needs its session`);
      if ((e.outcome === 'withdrawn' || e.outcome === 'in_progress') && (typeof end !== 'string' || !DATE.test(end))) problems.push(`${at}: a withdrawn or in progress bill needs its date in end`);
      if (e.outcome === 'defeated' && (typeof e.stage !== 'string' || !e.stage.trim())) problems.push(`${at}: a defeated bill needs its stage`);
    } else if (e.outcome !== undefined || e.stage !== undefined || e.session !== undefined) {
      problems.push(`${at}: only a bill has outcome, stage and session`);
    }
  });
  return problems;
}

// Both parts in one list, each group in date order: by start (or end when there is no start), oldest first; entries with
// neither keep their stored order after the dated ones. Equal dates keep stored order.
export function careerTimeline(parliament: CareerEntry[] | null | undefined, research: CareerEntry[] | null | undefined): CareerEntry[] {
  const all = [...(parliament ?? []), ...(research ?? [])];
  return all
    .map((e, i) => ({ e, i, key: e.start ?? (e.end && e.end !== 'present' ? e.end : null) }))
    .sort((a, b) => {
      const g = GROUPS.indexOf(a.e.group) - GROUPS.indexOf(b.e.group);
      if (g !== 0) return g;
      if (a.key && b.key && a.key !== b.key) return firstDay(a.key) < firstDay(b.key) ? -1 : 1;
      if (!a.key !== !b.key) return a.key ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ e }) => e);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "4 July 2024", "July 2024" or "2024", read from the parts so the day never shifts with the time zone.
export function dateLabel(v: string): string {
  const [y, m, d] = v.split('-');
  if (d) return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}

// The dates column: "4 July 2024 to today", "From 2015", "2010 to 2015", "Until 2019", one date when start equals end.
export function careerDates(e: Pick<CareerEntry, 'start' | 'end'>): string {
  const { start, end } = e;
  if (start && end && start === end) return dateLabel(start);
  if (start && end) return `${dateLabel(start)} to ${end === 'present' ? 'today' : dateLabel(end)}`;
  if (start) return `From ${dateLabel(start)}`;
  if (end) return end === 'present' ? 'To today' : `Until ${dateLabel(end)}`;
  return '';
}

// "Contested Bolton South East, not elected" (owner, PCL2 and PCL3, 8 Nov 2026): no date, as the dates column shows it.
export function contestTitle(constituency: string): string {
  return `Contested ${constituency.trim()}, not elected`;
}

// A bill's outcome in Parliament's own terms, with no verdict (owner, 7 Nov 2026, PC1).
export function billOutcomeText(e: Pick<CareerEntry, 'outcome' | 'stage' | 'session' | 'end'>): string {
  switch (e.outcome) {
    case 'became_law': return 'Became law';
    case 'defeated': return `Defeated at ${e.stage ?? 'an unnamed stage'}`;
    case 'withdrawn': return e.end && e.end !== 'present' ? `Withdrawn on ${dateLabel(e.end)}` : 'Withdrawn';
    case 'no_further_stage': return `No further stage after the ${e.session} session ended`;
    case 'in_progress': return `In progress: ${e.stage ?? 'stage not given'}${e.end && e.end !== 'present' ? `, as of ${dateLabel(e.end)}` : ''}`;
    default: return '';
  }
}
