'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import {
  FEEDBACK_TYPES, MESSAGE_MAX, MESSAGE_MIN, SUCCESS_MESSAGE, UNAVAILABLE_MESSAGE,
  normaliseFeedback, validateFeedback, type FeedbackErrors, type FeedbackField,
} from '@/lib/feedback';

// The feedback form (owner's brief, 2 Nov 2026), the same pattern as app/commission/CommissionForm.tsx. Checked here
// with the same rules the server uses (lib/feedback.ts), then sent to /api/feedback, which emails the contact inbox.

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

// Parchment form controls, as on the commission form.
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

type Values = { type: string; message: string; email: string; website: string };
const EMPTY: Values = { type: '', message: '', email: '', website: '' };

export default function FeedbackForm({ from }: { from: string }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState('');

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    // A field's error goes once it is edited; the rest stay until the next send.
    if (k in errors) setErrors((e) => { const next = { ...e }; delete next[k as FeedbackField]; return next; });
  };

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setFormError('');
    const request = normaliseFeedback({ ...v, from });
    const found = validateFeedback(request);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Please correct the highlighted fields.');
      const first = Object.keys(found)[0];
      document.getElementById(first === 'type' ? 'feedback-type-0' : `feedback-${first}`)?.focus();
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: FeedbackErrors };
      if (res.ok) { setStatus('sent'); return; }
      setStatus('idle');
      if (body.errors) setErrors(body.errors);
      setFormError(body.error || UNAVAILABLE_MESSAGE);
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

  const err = (k: FeedbackField) => errors[k] && <p id={`feedback-${k}-error`} style={errorText}>{errors[k]}</p>;
  const aria = (k: FeedbackField) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `feedback-${k}-error` : undefined });
  const border = (k: FeedbackField): CSSProperties => (errors[k] ? { ...field, border: `2px solid ${ACCENT}` } : field);
  const sending = status === 'sending';
  const row: CSSProperties = { marginBottom: '20px' };

  return (
    <form onSubmit={onSubmit} noValidate style={{ fontFamily: MONO, color: INK, maxWidth: '640px' }}>
      <fieldset style={{ ...row, border: 0, padding: 0, margin: '0 0 20px', minWidth: 0 }} aria-invalid={!!errors.type} aria-describedby={errors.type ? 'feedback-type-error' : undefined}>
        <legend style={{ ...label, padding: 0 }}>Type</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
          {FEEDBACK_TYPES.map((t, i) => (
            <label key={t} htmlFor={`feedback-type-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', lineHeight: 1.5, cursor: 'pointer', minHeight: '24px' }}>
              <input id={`feedback-type-${i}`} type="radio" name="type" value={t} checked={v.type === t} onChange={() => set('type', t)}
                style={{ width: '20px', height: '20px', margin: 0, flex: '0 0 auto', accentColor: ACCENT }} />
              <span>{t}</span>
            </label>
          ))}
        </div>
        {err('type')}
      </fieldset>

      <div style={row}>
        <label htmlFor="feedback-message" style={label}>Message</label>
        <textarea id="feedback-message" name="message" rows={7} value={v.message} onChange={(e) => set('message', e.target.value)} style={{ ...border('message'), resize: 'vertical', lineHeight: 1.5 }} {...aria('message')} />
        <p style={hint}>Between {MESSAGE_MIN} and {MESSAGE_MAX.toLocaleString('en-GB')} characters. {v.message.trim().length.toLocaleString('en-GB')} so far.</p>
        {err('message')}
      </div>

      <div style={row}>
        <label htmlFor="feedback-email" style={label}>Email <span style={{ fontWeight: 'normal' }}>(optional)</span></label>
        <input id="feedback-email" name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} style={border('email')} {...aria('email')} />
        <p style={hint}>Only if you would like a reply.</p>
        {err('email')}
      </div>

      <input type="hidden" name="from" value={from} />

      {/* Honeypot: hidden from people and from screen readers, so only bots fill it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="feedback-website">Website</label>
        <input id="feedback-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      {formError && <p role="alert" style={{ ...errorText, fontSize: '15px', margin: '0 0 14px' }}>{formError}</p>}

      <button type="submit" disabled={sending} style={{
        padding: '12px 24px', background: sending ? 'rgba(20,16,13,0.45)' : INK, color: '#f4e8d4', border: `1px solid ${INK}`, borderRadius: 0,
        fontFamily: MONO, fontSize: '16px', letterSpacing: '0.06em', cursor: sending ? 'default' : 'pointer',
      }}>
        {sending ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  );
}
