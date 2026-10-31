// MP Background timeline (owner's approval, 24 Oct 2026, "approve background plan"). Stored in
// mp_biography.background_timeline (migration 2026-10-24b), NULL or a JSON array of entries:
//   { "phase": "education" | "career" | "politics",
//     "start": "YYYY" | "YYYY-MM" | null,
//     "end": "YYYY" | "YYYY-MM" | "present" | null,
//     "title": string,                // e.g. "BA English", "Solicitor", "Councillor"
//     "organisation": string | null,  // e.g. "Fitzwilliam College, Cambridge"
//     "detail": string | null,        // one plain sentence at most
//     "source": { "title": string, "url": string } }   // required, https only
// mp_biography.background_last_checked holds the date the timeline was last checked against its sources.

export type BackgroundPhase = 'education' | 'career' | 'politics';

export type BackgroundEntry = {
  phase: BackgroundPhase;
  start: string | null;
  end: string | null;
  title: string;
  organisation: string | null;
  detail: string | null;
  source: { title: string; url: string };
};

export const BACKGROUND_PHASES: BackgroundPhase[] = ['education', 'career', 'politics'];

const YEAR_OR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

// Earliest and latest month a "YYYY" or "YYYY-MM" value can mean, for comparing a start with an end.
const firstMonth = (v: string) => (v.length === 4 ? `${v}-01` : v);
const lastMonth = (v: string) => (v.length === 4 ? `${v}-12` : v);

// Problems with a stored timeline, one message per problem ("entry 2: ..."); an empty list means it is valid.
export function validate(entries: unknown): string[] {
  if (entries === null || entries === undefined) return [];
  if (!Array.isArray(entries)) return ['timeline is not an array'];
  const problems: string[] = [];
  entries.forEach((raw, i) => {
    const at = `entry ${i + 1}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { problems.push(`${at}: not an object`); return; }
    const e = raw as Record<string, unknown>;
    if (!BACKGROUND_PHASES.includes(e.phase as BackgroundPhase)) problems.push(`${at}: phase must be education, career or politics`);
    if (typeof e.title !== 'string' || e.title.trim() === '') problems.push(`${at}: title is empty`);
    for (const k of ['organisation', 'detail'] as const) {
      if (e[k] !== null && e[k] !== undefined && typeof e[k] !== 'string') problems.push(`${at}: ${k} must be text or null`);
    }
    const start = e.start ?? null;
    const end = e.end ?? null;
    if (start !== null && (typeof start !== 'string' || !YEAR_OR_MONTH.test(start))) problems.push(`${at}: start must be YYYY, YYYY-MM or null`);
    if (end !== null && (typeof end !== 'string' || (end !== 'present' && !YEAR_OR_MONTH.test(end)))) problems.push(`${at}: end must be YYYY, YYYY-MM, "present" or null`);
    if (typeof start === 'string' && YEAR_OR_MONTH.test(start) && typeof end === 'string' && YEAR_OR_MONTH.test(end)
        && lastMonth(end) < firstMonth(start)) problems.push(`${at}: end (${end}) is before start (${start})`);
    const src = e.source as Record<string, unknown> | null | undefined;
    if (!src || typeof src !== 'object') problems.push(`${at}: source is missing`);
    else {
      if (typeof src.title !== 'string' || src.title.trim() === '') problems.push(`${at}: source title is empty`);
      if (typeof src.url !== 'string' || !src.url.startsWith('https://')) problems.push(`${at}: source url must start with https://`);
    }
  });
  return problems;
}

// Education, then career, then politics; within a phase by a sort key, ascending (owner, 31 Oct 2026). The key is the
// start, or the end when start is null but end is a date ("Until 1981" sorts at 1981). An entry with neither takes the
// key of the nearest entry before it in the stored array in the same phase, so it stays directly after the entry it
// follows; with none before it, it sorts before every dated entry of its phase. Equal keys keep the stored order.
export function sortTimeline(entries: BackgroundEntry[]): BackgroundEntry[] {
  const lastKey = new Map<BackgroundPhase, string>();
  return entries
    .map((e, i) => {
      const own = e.start ?? (e.end && e.end !== 'present' ? e.end : null);
      const key = own ? firstMonth(own) : (lastKey.get(e.phase) ?? '');
      lastKey.set(e.phase, key);
      return { e, i, key };
    })
    .sort((a, b) => {
      const p = BACKGROUND_PHASES.indexOf(a.e.phase) - BACKGROUND_PHASES.indexOf(b.e.phase);
      if (p !== 0) return p;
      if (a.key !== b.key) return a.key < b.key ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ e }) => e);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (v: string) => (v.length === 7 ? `${MONTHS[Number(v.slice(5, 7)) - 1]} ${v.slice(0, 4)}` : v);

// The years column: "2003 to 2007", "From 2015", "2019 to today", "Until 2007", or '' when both are null. A start
// equal to its end shows once ("2016", "Oct 1974").
export function yearsLabel(start: string | null, end: string | null): string {
  if (start && end && start === end) return label(start);
  if (start && end) return `${label(start)} to ${end === 'present' ? 'today' : label(end)}`;
  if (start) return `From ${label(start)}`;
  if (end) return end === 'present' ? 'To today' : `Until ${label(end)}`;
  return '';
}
