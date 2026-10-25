// Commission research requests (owner's brief, 24 Oct 2026; one service at £295 from 25 Oct 2026, so there is no type of
// request to choose, report 54): the form fields and the rules that check them, shared by
// the form (app/commission/CommissionForm.tsx) and the route that sends them (app/api/commission/route.ts), so the
// browser and the server apply exactly the same rules.

export const COMMISSION_PUBLISH = ['Yes', 'No', 'Not sure'] as const;
export const QUESTION_MIN = 30;
export const QUESTION_MAX = 3000;
export const UNAVAILABLE_MESSAGE = 'Sorry, the form is unavailable. Email contact@opengovt.uk.';
export const SUCCESS_MESSAGE = 'Thank you. We will reply within two working days.';

export type CommissionRequest = {
  name: string;
  email: string;
  organisation: string;
  question: string;
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

// Any value from a form or a JSON body, made into a request with every field present and trimmed.
export function normaliseCommission(raw: Record<string, unknown>): CommissionRequest {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  // Single-line fields lose line breaks and runs of spaces (the name goes into the email subject).
  const line = (v: unknown) => text(v).replace(/\s+/g, ' ');
  return {
    name: line(raw.name),
    email: line(raw.email),
    organisation: line(raw.organisation),
    question: text(raw.question),
    deadline: line(raw.deadline),
    publish: line(raw.publish),
    terms: raw.terms === true || raw.terms === 'on' || raw.terms === 'true',
    website: text(raw.website),
  };
}

// One message per field that breaks a rule; an empty object means the request is valid.
export function validateCommission(r: CommissionRequest, today = todayUk()): CommissionErrors {
  const e: CommissionErrors = {};
  if (!r.name) e.name = 'Enter your name.';
  else if (r.name.length > 200) e.name = 'Use 200 characters or fewer.';
  if (!r.email) e.email = 'Enter your email address.';
  else if (r.email.length > 254 || !EMAIL.test(r.email)) e.email = 'Enter a valid email address, like name@example.com.';
  if (r.organisation.length > 200) e.organisation = 'Use 200 characters or fewer.';
  if (!r.question) e.question = 'Tell us your question.';
  else if (r.question.length < QUESTION_MIN) e.question = `Use at least ${QUESTION_MIN} characters (you have ${r.question.length}).`;
  else if (r.question.length > QUESTION_MAX) e.question = `Use ${QUESTION_MAX.toLocaleString('en-GB')} characters or fewer (you have ${r.question.length.toLocaleString('en-GB')}).`;
  if (r.deadline) {
    const valid = DATE.test(r.deadline) && !Number.isNaN(Date.parse(`${r.deadline}T00:00:00Z`));
    if (!valid) e.deadline = 'Enter a valid date.';
    else if (r.deadline <= today) e.deadline = 'Choose a date in the future.';
  }
  if (!(COMMISSION_PUBLISH as readonly string[]).includes(r.publish)) e.publish = 'Choose an answer.';
  if (!r.terms) e.terms = 'Confirm you have read the terms.';
  return e;
}
