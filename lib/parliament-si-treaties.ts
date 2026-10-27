// UK Parliament Statutory Instruments API (v2) and Treaties API (v1): client and mapping to the statutory_instruments
// and treaties tables (migration 2026-10-27b; discovery in report 80). Used by the daily sync
// (lib/si-treaties-sync.ts) and the one off full load (scripts/load-statutory-instruments-treaties.ts).
//
// Both APIs are free, need no key and publish no robots.txt. To stay polite every request waits until at least
// MIN_GAP_MS after the previous one and gives up after API_TIMEOUT_MS. Lists come back newest laid first.
//
// Flags, from each instrument's timeline (its "business items") once read:
//   committee_concerns  the Joint Committee on Statutory Instruments or the Secondary Legislation Scrutiny Committee
//                       drew it to the special attention of the House ("Not drawn ..." does not count)
//   prayed_against      a motion to object to it, annul it, reject it or regret it was tabled
//   debated             a debate step dated today or earlier (a later date is a debate still to come)
// Before its timeline is read (older instruments), the API's ConcernsRaisedByCommittee and MotionToStop lists set the
// first two.

export const SI_API = 'https://statutoryinstruments-api.parliament.uk/api/v2';
export const TREATY_API = 'https://treaties-api.parliament.uk/api';
export const API_TIMEOUT_MS = 20_000;
export const MIN_GAP_MS = 1_000;

export type ApiCall = { url: string; ms: number; status: number | 'timeout' | 'error' };

// A polite client: one request at a time, at least MIN_GAP_MS apart, each cut off at API_TIMEOUT_MS (or less when a
// caller's time budget is nearly used). Returns null when the API did not answer in time; throws on an error answer.
export class ParliamentApi {
  private last = 0;
  calls: ApiCall[] = [];
  constructor(private fetchFn: typeof fetch = fetch, private gapMs = MIN_GAP_MS) {}

  async get<T>(url: string, timeoutMs = API_TIMEOUT_MS): Promise<T | null> {
    const wait = this.last + this.gapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = Date.now();
    try {
      const res = await this.fetchFn(url, { headers: { Accept: 'application/json', 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)' }, signal: ctrl.signal });
      this.calls.push({ url, ms: Date.now() - t0, status: res.status });
      if (!res.ok) throw new Error(`${new URL(url).host} ${res.status} for ${new URL(url).pathname}`);
      return (await res.json()) as T;
    } catch (e) {
      if (ctrl.signal.aborted) { this.calls.push({ url, ms: Date.now() - t0, status: 'timeout' }); return null; }
      if (!this.calls.length || this.calls[this.calls.length - 1].url !== url) this.calls.push({ url, ms: Date.now() - t0, status: 'error' });
      throw e;
    } finally {
      clearTimeout(timer);
      this.last = Date.now();
    }
  }
}

// ---- API shapes (only the fields used) ----
type Named = { id?: string | number; name?: string };
type Wrapped<T> = { value?: T } & T;
export type ApiList<T> = { items: Wrapped<T>[]; totalResults: number };
export type ApiSi = {
  id: string; name: string; paperPrefix?: string | null; paperNumber?: number | null; paperYear?: string | null;
  procedure?: Named | null; paperMadeDate?: string | null; commonsLayingDate?: string | null; lordsLayingDate?: string | null;
  paperComingIntoForceDate?: string | null; layingBody?: { name?: string } | null; link?: string | null;
  // The draft or proposal an instrument came from, and the instrument that followed it (detail records only; today the
  // API fills them for proposed negative instruments and their made versions).
  precededByInstrument?: { id?: string } | null; followedByInstrument?: { id?: string } | null;
};
export type ApiBusinessItem = { itemDate?: string | null; steps?: (string | Named)[] | null; houses?: (string | Named)[] | null; link?: string | null; stepName?: string | null };
export type ApiTreaty = {
  id: string; name: string; commandPaperPrefix?: string | null; commandPaperNumber?: number | null; laidDate?: string | null;
  signedDate?: string | null; webLink?: string | null; leadDepartment?: Named | null; layingBodyDepartment?: Named | null;
  parliamentaryConclusion?: string | null;
};
export type ApiLayingBody = { id: string; name: string };

export const unwrap = <T>(x: Wrapped<T>): T => ((x as { value?: T }).value ?? x) as T;
const day = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const label = (s: string | Named) => (typeof s === 'string' ? s : s.name || '');

// ---- Rows ----
export type TimelineStep = { date: string | null; step: string; houses: string[]; link: string | null };
export type SiRow = {
  api_id: string; title: string; si_number: string | null; procedure: string | null; laying_department: string | null;
  made_date: string | null; laid_date: string | null; in_force_date: string | null;
  committee_concerns: boolean; prayed_against: boolean; debated: boolean; legislation_url: string | null;
  timeline: TimelineStep[]; timeline_fetched_at: string | null; updated_at: string;
  preceded_by_id?: string | null; followed_by_id?: string | null;
};
export type TreatyRow = {
  api_id: string; title: string; command_paper: string | null; signed_date: string | null; laid_date: string | null;
  lead_department: string | null; laying_department: string | null; crag_end_date: string | null;
  scrutiny_concluded: boolean; conclusion: string | null; govuk_url: string | null;
  committee_reports: { date: string | null; step: string; link: string | null }[]; timeline: TimelineStep[];
  timeline_fetched_at: string | null; updated_at: string;
};

function earliest(...ds: (string | null)[]) {
  const v = ds.filter(Boolean) as string[];
  return v.length ? v.sort()[0] : null;
}

export function siNumber(s: ApiSi): string | null {
  if (!s.paperNumber || !s.paperYear) return null;
  return `${s.paperPrefix || 'SI'} ${s.paperYear}/${s.paperNumber}`;
}

// legislation.gov.uk address: the API's own link when the detail record has been read; otherwise built for a numbered
// UK SI (uksi/<year>/<number>/made, the form the API uses). Drafts and other series stay null until the detail is read.
export function legislationUrl(s: ApiSi): string | null {
  if (s.link && /^https:\/\/www\.legislation\.gov\.uk\//.test(s.link)) return s.link;
  if ((s.paperPrefix || 'SI') === 'SI' && s.paperNumber && s.paperYear) return `https://www.legislation.gov.uk/uksi/${s.paperYear}/${s.paperNumber}/made`;
  return null;
}

export function timelineFrom(items: ApiBusinessItem[]): TimelineStep[] {
  const out: TimelineStep[] = [];
  for (const raw of items) {
    const it = unwrap(raw as Wrapped<ApiBusinessItem>);
    const steps = (it.steps && it.steps.length ? it.steps.map(label) : [it.stepName || '']).filter(Boolean);
    const houses = (it.houses || []).map(label).filter(Boolean);
    for (const step of steps) out.push({ date: day(it.itemDate), step, houses, link: it.link || null });
  }
  return out.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
}

const DRAWN = /draws? (the )?special attention|drawn to the special attention/i;
const NOT_DRAWN = /not drawn to the special attention/i;
const MOTION_TO_STOP = /motion to (object|annul|reject|revoke)|regret motion|motion to regret|prayer/i;
const DEBATE = /\bdebate\b/i;

export function siFlagsFromTimeline(t: TimelineStep[], today = new Date().toISOString().slice(0, 10)) {
  return {
    committee_concerns: t.some((s) => DRAWN.test(s.step) && !NOT_DRAWN.test(s.step)),
    prayed_against: t.some((s) => MOTION_TO_STOP.test(s.step)),
    debated: t.some((s) => DEBATE.test(s.step) && !!s.date && s.date <= today),
  };
}

// From a list (summary) record: everything except department, timeline and flags.
export function siRowFromSummary(raw: Wrapped<ApiSi>, now: string): Omit<SiRow, 'laying_department' | 'committee_concerns' | 'prayed_against' | 'debated' | 'timeline' | 'timeline_fetched_at'> {
  const s = unwrap(raw);
  return {
    api_id: s.id,
    title: (s.name || '').trim(),
    si_number: siNumber(s),
    procedure: s.procedure?.name || null,
    made_date: day(s.paperMadeDate),
    laid_date: earliest(day(s.commonsLayingDate), day(s.lordsLayingDate)),
    in_force_date: day(s.paperComingIntoForceDate),
    legislation_url: legislationUrl(s),
    updated_at: now,
  };
}

// From a detail record plus its business items: the full row.
export function siRowFromDetail(raw: Wrapped<ApiSi>, items: ApiBusinessItem[], listFlags: { committee: boolean; motion: boolean }, now: string): SiRow {
  const s = unwrap(raw);
  const timeline = timelineFrom(items);
  const f = siFlagsFromTimeline(timeline);
  return {
    ...siRowFromSummary(s, now),
    laying_department: s.layingBody?.name || null,
    // The API's ConcernsRaisedByCommittee and MotionToStop lists stay true once set: a timeline step worded in a way the
    // patterns above miss must not clear them (27 Oct 2026).
    committee_concerns: f.committee_concerns || listFlags.committee,
    prayed_against: f.prayed_against || listFlags.motion,
    debated: f.debated,
    timeline,
    timeline_fetched_at: now,
    preceded_by_id: apiId(s.precededByInstrument?.id),
    followed_by_id: apiId(s.followedByInstrument?.id),
  };
}

const apiId = (id?: string | null) => (id && /^[A-Za-z0-9]{6,12}$/.test(id) ? id : null);

export function commandPaper(t: ApiTreaty): string | null {
  return t.commandPaperNumber ? `${t.commandPaperPrefix || 'CP'} ${t.commandPaperNumber}` : null;
}

export function treatyRow(raw: Wrapped<ApiTreaty>, items: ApiBusinessItem[] | null, now: string): Omit<TreatyRow, 'timeline' | 'committee_reports' | 'crag_end_date' | 'timeline_fetched_at'> & Partial<TreatyRow> {
  const t = unwrap(raw);
  const base = {
    api_id: t.id,
    title: (t.name || '').trim(),
    command_paper: commandPaper(t),
    signed_date: day(t.signedDate),
    laid_date: day(t.laidDate),
    lead_department: t.leadDepartment?.name || null,
    laying_department: t.layingBodyDepartment?.name || null,
    scrutiny_concluded: !!t.parliamentaryConclusion && t.parliamentaryConclusion !== 'NotConcluded',
    conclusion: t.parliamentaryConclusion || null,
    govuk_url: t.webLink && /^https:\/\//.test(t.webLink) ? t.webLink : null,
    updated_at: now,
  };
  if (!items) return base;
  const timeline = timelineFrom(items);
  const ends = timeline.filter((s) => /objection period .*ends/i.test(s.step) && s.date).map((s) => s.date as string).sort();
  return {
    ...base,
    timeline,
    crag_end_date: ends.length ? ends[ends.length - 1] : null,
    committee_reports: timeline.filter((s) => /committee/i.test(s.step)).map((s) => ({ date: s.date, step: s.step, link: s.link })),
    timeline_fetched_at: now,
  };
}

// What each procedure means, in one line, for the list page. Unknown procedures show no line.
export const PROCEDURE_MEANING: Record<string, string> = {
  'Made negative': 'Already law. It stays law unless either House votes to annul it within 40 days.',
  'Draft negative': 'Laid in draft. It can be made unless either House objects within 40 days.',
  'Draft affirmative': 'Cannot become law until Parliament votes to approve it.',
  'Made affirmative': 'Already law, but it lapses unless Parliament approves it within a set time.',
  'Proposed negative statutory instrument': 'A proposal: a committee decides whether it should need a vote before it is made.',
  'Legislative Reform Order': 'Changes an Act of Parliament under the Legislative and Regulatory Reform Act 2006, with extra scrutiny.',
  'Proposed draft remedial order': 'A proposal to change a law a court found incompatible with human rights.',
  'Draft affirmative remedial order': 'Changes a law found incompatible with human rights; Parliament must approve it.',
  'Enhanced affirmative: Investigatory Powers Act 2016': 'Needs approval by both Houses after an extra round of scrutiny.',
  'Published draft under European Union (Withdrawal) Act 2018 (Repealed)': 'Published for scrutiny under the European Union (Withdrawal) Act 2018; this procedure has ended.',
};
