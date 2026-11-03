// Commission research enquiries (owner's brief, 24 Oct 2026; one service from 25 Oct 2026, report 54; a research
// enquiry from 3 Nov 2026): the form fields and the rules that check them, shared by the form
// (app/commission/CommissionForm.tsx) and the route that sends them (app/api/commission/route.ts), so the browser and
// the server apply exactly the same rules.
//
// From 3 Nov 2026 (owner): the client describes what they want investigated and why; opengovt decides how to
// investigate, so there is no research type or output to choose. Research starts from £295, with a fixed quote for
// each enquiry. Every commission includes the findings, every source, the methodology and the underlying data.
// The enquiry is emailed to the contact inbox; nothing is stored in the database (owner's choice, 3 Nov 2026).

export const COMMISSION_PRICE = 'From £295';
export const COMMISSION_QUOTE = 'a fixed quote for each enquiry';
export const COMMISSION_PUBLISH = ['Yes', 'No', 'Not sure'] as const;
export const TITLE_MAX = 120;
// The brief keeps the field name `question` (and its limits) from the single question form.
export const QUESTION_MIN = 30;
export const QUESTION_MAX = 3000;
export const KNOWN_TEXT_MAX = 1000;
export const AREA_MAX = 200;
export const LINKS_MAX = 5;
export const LINK_MAX_CHARS = 500;
export const UNAVAILABLE_MESSAGE = 'Sorry, the form is unavailable. Email contact@opengovt.uk.';
export const SUCCESS_MESSAGE = 'Thank you. We will reply to your enquiry within two working days.';

export type CommissionRequest = {
  name: string;
  email: string;
  organisation: string;
  title: string;
  question: string; // the brief: what to investigate, and why
  // What the client already knows (all optional).
  knownPeople: string; // people, bodies or companies involved
  knownFrom: string; // YYYY-MM-DD or ''
  knownTo: string; // YYYY-MM-DD or ''
  knownArea: string;
  knownLinks: string[];
  deadline: string; // YYYY-MM-DD or ''
  publish: string;
  terms: boolean;
  website: string; // the honeypot: hidden from people, so only bots fill it
};

export type CommissionField = Exclude<keyof CommissionRequest, 'website'>;
export type CommissionErrors = Partial<Record<CommissionField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Today's date in the UK as YYYY-MM-DD, for the "deadline must be in the future" rule.
export function todayUk(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

// Links arrive as a list (JSON body) or as text with one per line (the form's box).
export function splitLinks(v: unknown): string[] {
  const parts = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\s+/) : [];
  return parts.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
}

// Any value from a form or a JSON body, made into a request with every field present and trimmed.
export function normaliseCommission(raw: Record<string, unknown>): CommissionRequest {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  // Single line fields lose line breaks and runs of spaces (the name and title go into the email).
  const line = (v: unknown) => text(v).replace(/\s+/g, ' ');
  return {
    name: line(raw.name),
    email: line(raw.email),
    organisation: line(raw.organisation),
    title: line(raw.title),
    question: text(raw.question),
    knownPeople: text(raw.knownPeople),
    knownFrom: line(raw.knownFrom),
    knownTo: line(raw.knownTo),
    knownArea: line(raw.knownArea),
    knownLinks: splitLinks(raw.knownLinks),
    deadline: line(raw.deadline),
    publish: line(raw.publish),
    terms: raw.terms === true || raw.terms === 'on' || raw.terms === 'true',
    website: text(raw.website),
  };
}

const validDate = (d: string) => DATE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
function validUrl(s: string): boolean {
  if (s.length > LINK_MAX_CHARS) return false;
  try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname.includes('.'); } catch { return false; }
}

// One message per field that breaks a rule; an empty object means the request is valid.
export function validateCommission(r: CommissionRequest, today = todayUk()): CommissionErrors {
  const e: CommissionErrors = {};
  const n = (x: number) => x.toLocaleString('en-GB');
  if (!r.name) e.name = 'Enter your name.';
  else if (r.name.length > 200) e.name = 'Use 200 characters or fewer.';
  if (!r.email) e.email = 'Enter your email address.';
  else if (r.email.length > 254 || !EMAIL.test(r.email)) e.email = 'Enter a valid email address, like name@example.com.';
  if (r.organisation.length > 200) e.organisation = 'Use 200 characters or fewer.';
  if (!r.title) e.title = 'Give your enquiry a title.';
  else if (r.title.length > TITLE_MAX) e.title = `Use ${TITLE_MAX} characters or fewer (you have ${r.title.length}).`;
  if (!r.question) e.question = 'Tell us what you want investigated, and why.';
  else if (r.question.length < QUESTION_MIN) e.question = `Use at least ${QUESTION_MIN} characters (you have ${r.question.length}).`;
  else if (r.question.length > QUESTION_MAX) e.question = `Use ${n(QUESTION_MAX)} characters or fewer (you have ${n(r.question.length)}).`;
  if (r.knownPeople.length > KNOWN_TEXT_MAX) e.knownPeople = `Use ${n(KNOWN_TEXT_MAX)} characters or fewer (you have ${n(r.knownPeople.length)}).`;
  if (r.knownFrom && !validDate(r.knownFrom)) e.knownFrom = 'Enter a valid date.';
  if (r.knownTo && !validDate(r.knownTo)) e.knownTo = 'Enter a valid date.';
  else if (r.knownTo && r.knownFrom && !e.knownFrom && r.knownTo < r.knownFrom) e.knownTo = 'Choose a date on or after the start of the period.';
  if (r.knownArea.length > AREA_MAX) e.knownArea = `Use ${AREA_MAX} characters or fewer.`;
  if (r.knownLinks.length > LINKS_MAX) e.knownLinks = `Give up to ${LINKS_MAX} links (you have ${r.knownLinks.length}).`;
  else if (r.knownLinks.some((l) => !validUrl(l))) e.knownLinks = 'Enter each link as a full web address, like https://www.gov.uk/example, one per line.';
  if (r.deadline) {
    if (!validDate(r.deadline)) e.deadline = 'Enter a valid date.';
    else if (r.deadline <= today) e.deadline = 'Choose a date in the future.';
  }
  if (!(COMMISSION_PUBLISH as readonly string[]).includes(r.publish)) e.publish = 'Choose an answer.';
  if (!r.terms) e.terms = 'Confirm you have read the terms.';
  return e;
}
