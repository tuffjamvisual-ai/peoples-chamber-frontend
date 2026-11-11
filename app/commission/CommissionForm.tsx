'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  COMMISSION_PUBLISH, QUESTION_MAX, QUESTION_MIN, TITLE_MAX, LINKS_MAX, SUCCESS_MESSAGE, UNAVAILABLE_MESSAGE,
  normaliseCommission, todayUk, validateCommission, type CommissionErrors, type CommissionField,
} from '@/lib/commission';
import { PHONE, phoneUpTo } from '@/lib/breakpoints';

// The commission enquiry form (owner's brief, 24 Oct 2026; a research enquiry from 3 Nov 2026: your details, your
// enquiry, what you already know, then deadline and publishing; opengovt decides how to investigate, so there is no
// research type or output to choose). Checked here with the same rules the server uses (lib/commission.ts), then sent
// to /api/commission, which emails it to the contact inbox.
//
// Under 640px (owner, 4 Nov 2026) the same form shows as four steps. It is one form throughout: CSS alone hides the rows
// of the other steps, so the phone layout is there from the first paint, every value stays in place between steps, and
// from 640px up nothing changes. Next checks the step's fields with the same rules; a send that fails on an earlier step
// goes back to that step.

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

// Parchment form controls, as on the reports filter bar.
const field: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: MONO,
  fontSize: '16px',
  outline: 'none',
};
const label: CSSProperties = { display: 'block', fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' };
const hint: CSSProperties = { fontSize: '15px', margin: '4px 0 0' };
const errorText: CSSProperties = { fontSize: '15px', color: ACCENT, fontWeight: 'bold', margin: '6px 0 0' };

const stepButton: CSSProperties = { padding: '12px 24px', background: INK, color: '#f4e8d4', border: `1px solid ${INK}`, borderRadius: 0, fontFamily: MONO, fontSize: '16px', letterSpacing: '0.06em', cursor: 'pointer' };
const legend: CSSProperties = { fontSize: '17px', fontWeight: 'bold', padding: 0, marginBottom: '14px' };
const group: CSSProperties = { border: 'none', borderTop: `2px solid ${INK}`, margin: '0 0 8px', padding: '14px 0 0', minWidth: 0 };

type Values = {
  name: string; email: string; organisation: string; title: string; question: string;
  knownPeople: string; knownFrom: string; knownTo: string; knownArea: string; knownLinks: string;
  deadline: string; publish: string; terms: boolean; website: string;
};
const EMPTY: Values = {
  name: '', email: '', organisation: '', title: '', question: '',
  knownPeople: '', knownFrom: '', knownTo: '', knownArea: '', knownLinks: '',
  deadline: '', publish: '', terms: false, website: '',
};

const STEP_TITLES = ['What should we investigate', 'Who and where', 'Links and deadline', 'Your details'];
const STEP_FIELDS: CommissionField[][] = [
  ['title', 'question'],
  ['knownPeople', 'knownFrom', 'knownTo', 'knownArea'],
  ['knownLinks', 'deadline', 'publish'],
  ['name', 'email', 'organisation', 'terms'],
];
const isPhone = () => window.matchMedia(PHONE).matches;
const stepOf = (k: CommissionField) => STEP_FIELDS.findIndex((fields) => fields.includes(k)) + 1;
const firstInError = (e: CommissionErrors) => STEP_FIELDS.flat().find((k) => e[k]);
const CORRECT_MESSAGE = 'Please correct the highlighted fields.';

const STEP_CSS = `
  .cm-phone, .cm-phone-inline { display: none; }
  @media ${phoneUpTo(767.98)} {
    .cm-form .cm-phone { display: block; }
    .cm-form .cm-phone-inline { display: inline; }
    .cm-form fieldset { border: none !important; margin: 0 !important; padding: 0 !important; }
    .cm-form legend { display: none; }
    .cm-form [data-cm-step] { display: none; }
    .cm-form[data-step="1"] [data-cm-step="1"], .cm-form[data-step="2"] [data-cm-step="2"], .cm-form[data-step="3"] [data-cm-step="3"], .cm-form[data-step="4"] [data-cm-step="4"] { display: block; }
    .cm-form[data-step="2"] .cm-period[data-cm-step="2"] { display: flex; }
    .cm-form:not([data-step="4"]) [data-cm-send] { display: none; }
    .cm-actions { display: flex; align-items: stretch; gap: 12px; }
    .cm-actions button { min-height: 48px; }
    .cm-actions [data-cm-next], .cm-actions [data-cm-send] { margin-left: auto; }
  }
`;

export default function CommissionForm() {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<CommissionErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState('');
  const [step, setStep] = useState(1);
  const stepHead = useRef<HTMLDivElement>(null);

  // Shows a step at once, so the field to focus is on the screen; otherwise the reader starts at the step's heading.
  const showStep = (n: number, focus?: CommissionField) => {
    flushSync(() => setStep(n));
    if (focus) { document.getElementById(`commission-${focus}`)?.focus(); return; }
    stepHead.current?.scrollIntoView({ block: 'start' });
    stepHead.current?.focus({ preventScroll: true });
  };

  // Next: this step's fields, by the form's own rules. A later step's errors wait until the reader gets there.
  const nextStep = () => {
    const found = validateCommission(normaliseCommission(v));
    const here: CommissionErrors = {};
    for (const k of STEP_FIELDS[step - 1]) if (found[k]) Object.assign(here, { [k]: found[k] });
    setErrors(here);
    const first = firstInError(here);
    if (first) {
      setFormError(CORRECT_MESSAGE);
      document.getElementById(`commission-${first}`)?.focus();
      return;
    }
    setFormError('');
    showStep(step + 1);
  };

  const backStep = () => {
    setFormError('');
    showStep(step - 1);
  };

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    // A field's error goes once it is edited; the rest stay until the next send.
    if (k in errors) setErrors((e) => { const next = { ...e }; delete next[k as CommissionField]; return next; });
  };

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    // Enter in a field on the first three steps moves on, as there is nothing to send yet.
    if (isPhone() && step < 4) { nextStep(); return; }
    setFormError('');
    const request = normaliseCommission(v);
    const found = validateCommission(request);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError(CORRECT_MESSAGE);
      if (isPhone()) { const first = firstInError(found); if (first) showStep(stepOf(first), first); return; }
      const first = Object.keys(found)[0];
      document.getElementById(`commission-${first}`)?.focus();
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/commission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: CommissionErrors };
      if (res.ok) { setStatus('sent'); return; }
      setStatus('idle');
      if (body.errors) setErrors(body.errors);
      setFormError(body.error || UNAVAILABLE_MESSAGE);
      if (body.errors && isPhone()) { const first = firstInError(body.errors); if (first) showStep(stepOf(first), first); }
    } catch {
      setStatus('idle');
      setFormError(UNAVAILABLE_MESSAGE);
    }
  }

  if (status === 'sent') {
    return (
      <p role="status" style={{ fontSize: '17px', lineHeight: 1.6, fontWeight: 'bold', borderLeft: `4px solid ${ACCENT}`, padding: '12px 16px', background: 'rgba(107,36,23,0.06)' }}>
        {SUCCESS_MESSAGE}
      </p>
    );
  }

  const err = (k: CommissionField) => errors[k] && <p id={`commission-${k}-error`} style={errorText}>{errors[k]}</p>;
  const aria = (k: CommissionField) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `commission-${k}-error` : undefined });
  const border = (k: CommissionField): CSSProperties => (errors[k] ? { ...field, border: `2px solid ${ACCENT}` } : field);
  const sending = status === 'sending';
  const row: CSSProperties = { marginBottom: '20px' };

  const optional = <span style={{ fontWeight: 'normal' }}>(optional)</span>;
  // On a phone the "What you already know (optional)" heading is not shown, so each of its fields says so itself.
  const phoneOptional = <span className="cm-phone-inline" style={{ fontWeight: 'normal' }}> (optional)</span>;

  return (
    <form className="cm-form" data-step={step} onSubmit={onSubmit} noValidate style={{ fontFamily: MONO, color: INK, maxWidth: '640px' }}>
      <style>{`.cm-period { display: flex; gap: 16px; flex-wrap: wrap; } .cm-period > div { flex: 1 1 200px; }${STEP_CSS}`}</style>
      <div ref={stepHead} className="cm-phone" tabIndex={-1} style={{ borderTop: `2px solid ${INK}`, padding: '14px 0 0', marginBottom: '16px', outline: 'none', scrollMarginTop: '12px' }}>
        <p data-cm-progress style={{ fontSize: '15px', margin: '0 0 6px' }}>Step {step} of 4</p>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1.25, margin: 0 }}>{STEP_TITLES[step - 1]}</h2>
      </div>
      <fieldset style={group}>
      <legend style={legend}>Your details</legend>
      <div data-cm-step="4" style={row}>
        <label htmlFor="commission-name" style={label}>Name</label>
        <input id="commission-name" name="name" type="text" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} style={border('name')} {...aria('name')} />
        {err('name')}
      </div>

      <div data-cm-step="4" style={row}>
        <label htmlFor="commission-email" style={label}>Email</label>
        <input id="commission-email" name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} style={border('email')} {...aria('email')} />
        {err('email')}
      </div>

      <div data-cm-step="4" style={row}>
        <label htmlFor="commission-organisation" style={label}>Organisation <span style={{ fontWeight: 'normal' }}>(optional)</span></label>
        <input id="commission-organisation" name="organisation" type="text" autoComplete="organization" value={v.organisation} onChange={(e) => set('organisation', e.target.value)} style={border('organisation')} {...aria('organisation')} />
        {err('organisation')}
      </div>
      </fieldset>

      <fieldset style={group}>
      <legend style={legend}>Your enquiry</legend>
      <div data-cm-step="1" style={row}>
        <label htmlFor="commission-title" style={label}>Title</label>
        <input id="commission-title" name="title" type="text" maxLength={TITLE_MAX} value={v.title} onChange={(e) => set('title', e.target.value)} style={border('title')} {...aria('title')} />
        <p style={hint}>Up to {TITLE_MAX} characters.</p>
        {err('title')}
      </div>

      <div data-cm-step="1" style={row}>
        <label htmlFor="commission-question" style={label}>What do you want investigated, and why?</label>
        <textarea id="commission-question" name="question" rows={7} value={v.question} onChange={(e) => set('question', e.target.value)} style={{ ...border('question'), resize: 'vertical', lineHeight: 1.5 }} {...aria('question')} />
        <p style={hint}>Between {QUESTION_MIN} and {QUESTION_MAX.toLocaleString('en-GB')} characters. Written: {v.question.trim().length.toLocaleString('en-GB')}. We decide how to investigate.</p>
        {err('question')}
      </div>
      </fieldset>

      <fieldset style={group}>
      <legend style={legend}>What you already know {optional}</legend>
      <div data-cm-step="2" style={row}>
        <label htmlFor="commission-knownPeople" style={label}>People, bodies or companies involved{phoneOptional}</label>
        <textarea id="commission-knownPeople" name="knownPeople" rows={3} value={v.knownPeople} onChange={(e) => set('knownPeople', e.target.value)} style={{ ...border('knownPeople'), resize: 'vertical', lineHeight: 1.5 }} {...aria('knownPeople')} />
        {err('knownPeople')}
      </div>

      <div className="cm-period" data-cm-step="2" style={row}>
        <div>
          <label htmlFor="commission-knownFrom" style={label}>Period from{phoneOptional}</label>
          <input id="commission-knownFrom" name="knownFrom" type="date" value={v.knownFrom} onChange={(e) => set('knownFrom', e.target.value)} style={border('knownFrom')} {...aria('knownFrom')} />
          {err('knownFrom')}
        </div>
        <div>
          <label htmlFor="commission-knownTo" style={label}>Period to{phoneOptional}</label>
          <input id="commission-knownTo" name="knownTo" type="date" min={v.knownFrom || undefined} value={v.knownTo} onChange={(e) => set('knownTo', e.target.value)} style={border('knownTo')} {...aria('knownTo')} />
          {err('knownTo')}
        </div>
      </div>

      <div data-cm-step="2" style={row}>
        <label htmlFor="commission-knownArea" style={label}>Area{phoneOptional}</label>
        <input id="commission-knownArea" name="knownArea" type="text" value={v.knownArea} onChange={(e) => set('knownArea', e.target.value)} style={border('knownArea')} {...aria('knownArea')} />
        <p style={hint}>A place, such as a council or constituency, or a policy area.</p>
        {err('knownArea')}
      </div>

      <div data-cm-step="3" style={row}>
        <label htmlFor="commission-knownLinks" style={label}>Links{phoneOptional}</label>
        <textarea id="commission-knownLinks" name="knownLinks" rows={3} value={v.knownLinks} onChange={(e) => set('knownLinks', e.target.value)} style={{ ...border('knownLinks'), resize: 'vertical', lineHeight: 1.5 }} {...aria('knownLinks')} />
        <p style={hint}>Up to {LINKS_MAX} web addresses, one per line.</p>
        {err('knownLinks')}
      </div>
      </fieldset>

      <fieldset style={group}>
      <legend style={legend}>Deadline and publishing</legend>
      <div data-cm-step="3" style={row}>
        <label htmlFor="commission-deadline" style={label}>Deadline {optional}</label>
        <input id="commission-deadline" name="deadline" type="date" min={todayUk()} value={v.deadline} onChange={(e) => set('deadline', e.target.value)} style={{ ...border('deadline'), maxWidth: '240px' }} {...aria('deadline')} />
        {err('deadline')}
      </div>

      <div data-cm-step="3" style={row}>
        <label htmlFor="commission-publish" style={label}>Do you intend to publish the research?</label>
        <select id="commission-publish" name="publish" value={v.publish} onChange={(e) => set('publish', e.target.value)} style={{ ...border('publish'), cursor: 'pointer', maxWidth: '240px' }} {...aria('publish')}>
          <option value="">Choose an answer</option>
          {COMMISSION_PUBLISH.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {err('publish')}
      </div>
      </fieldset>

      {/* Honeypot: hidden from people and from screen readers, so only bots fill it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="commission-website">Website</label>
        <input id="commission-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <div data-cm-step="4" style={row}>
        <label htmlFor="commission-terms" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', lineHeight: 1.5, cursor: 'pointer' }}>
          <input id="commission-terms" name="terms" type="checkbox" checked={v.terms} onChange={(e) => set('terms', e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '1px', flex: '0 0 auto', accentColor: ACCENT }} {...aria('terms')} />
          <span>I have read the <Link href="/commission/terms" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>terms for commissioned research</Link></span>
        </label>
        {err('terms')}
      </div>

      {formError && <p role="alert" style={{ ...errorText, fontSize: '15px', margin: '0 0 14px' }}>{formError}</p>}

      <div className="cm-actions">
        {step > 1 && (
          <button type="button" data-cm-back className="cm-phone" onClick={backStep} disabled={sending} style={{ ...stepButton, background: 'transparent', color: INK }}>
            Back
          </button>
        )}
        {step < 4 && (
          <button type="button" data-cm-next className="cm-phone" onClick={nextStep} style={stepButton}>
            Next
          </button>
        )}
        <button type="submit" data-cm-send disabled={sending} style={{
          padding: '12px 24px', background: sending ? 'rgba(20,16,13,0.45)' : INK, color: '#f4e8d4', border: `1px solid ${INK}`, borderRadius: 0,
          fontFamily: MONO, fontSize: '16px', letterSpacing: '0.06em', cursor: sending ? 'default' : 'pointer',
        }}>
          {sending ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>
    </form>
  );
}
