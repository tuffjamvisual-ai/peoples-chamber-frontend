// User feedback (owner's brief, 2 Nov 2026), built on the commission form pattern (lib/commission.ts): the form fields
// and the rules that check them, shared by the form (app/feedback/FeedbackForm.tsx) and the route that sends them
// (app/api/feedback/route.ts), so the browser and the server apply exactly the same rules.

export const FEEDBACK_TYPES = ["Something's wrong", 'Suggestion', 'Other'] as const;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 3000;
export const FROM_MAX = 200;
export const UNAVAILABLE_MESSAGE = 'Sorry, the form is unavailable. Email contact@opengovt.uk.';
export const SUCCESS_MESSAGE = 'Thank you. Your feedback has been sent.';

export type FeedbackRequest = {
  type: string;
  message: string;
  email: string; // optional
  from: string; // the page the reader came from: a path on this site, or ''
  website: string; // the honeypot: hidden from people, so only bots fill it
};

export type FeedbackField = Exclude<keyof FeedbackRequest, 'website' | 'from'>;
export type FeedbackErrors = Partial<Record<FeedbackField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The page the reader came from, kept only when it is a path on this site ("/mps/1427"), at most 200 characters;
// anything else (another site, "//host", a scheme, control characters) becomes ''.
export function cleanFrom(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s || s.length > FROM_MAX) return '';
  if (!s.startsWith('/') || s.startsWith('//') || s.includes('\\')) return '';
  if (/[\u0000-\u001f\u007f\s]/.test(s)) return '';
  return s;
}

// Any value from a form or a JSON body, made into a request with every field present and trimmed.
export function normaliseFeedback(raw: Record<string, unknown>): FeedbackRequest {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  // Single line fields lose line breaks and runs of spaces (the type goes into the email subject).
  const line = (v: unknown) => text(v).replace(/\s+/g, ' ');
  return {
    type: line(raw.type),
    message: text(raw.message),
    email: line(raw.email),
    from: cleanFrom(raw.from),
    website: text(raw.website),
  };
}

// One message per field that breaks a rule; an empty object means the request is valid.
export function validateFeedback(r: FeedbackRequest): FeedbackErrors {
  const e: FeedbackErrors = {};
  if (!(FEEDBACK_TYPES as readonly string[]).includes(r.type)) e.type = 'Choose a type.';
  if (!r.message) e.message = 'Enter your message.';
  else if (r.message.length < MESSAGE_MIN) e.message = `Use at least ${MESSAGE_MIN} characters (you have ${r.message.length}).`;
  else if (r.message.length > MESSAGE_MAX) e.message = `Use ${MESSAGE_MAX.toLocaleString('en-GB')} characters or fewer (you have ${r.message.length.toLocaleString('en-GB')}).`;
  if (r.email && (r.email.length > 254 || !EMAIL.test(r.email))) e.email = 'Enter a valid email address, like name@example.com.';
  return e;
}

// The email to the contact inbox: subject and plain text body. Reply-to is the reader's address when given.
export function feedbackEmail(r: FeedbackRequest, now = new Date()): { subject: string; text: string; replyTo?: string } {
  const received = now.toLocaleString('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const text =
    `Feedback from opengovt.uk/feedback\n\n` +
    `Type:      ${r.type}\n` +
    `Page:      ${r.from || 'Not given'}\n` +
    `Email:     ${r.email || 'Not given'}\n` +
    `Received:  ${received} (UK time)\n\n` +
    `Message:\n${r.message}\n\n` +
    (r.email ? `Reply to this email to answer the reader directly.\n` : `The reader did not give an email address.\n`);
  return { subject: `Feedback: ${r.type}`, text, ...(r.email ? { replyTo: r.email } : {}) };
}
