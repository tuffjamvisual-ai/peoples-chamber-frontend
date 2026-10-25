'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type FormEvent } from 'react';
import {
  COMMISSION_PUBLISH, QUESTION_MAX, QUESTION_MIN, SUCCESS_MESSAGE, UNAVAILABLE_MESSAGE,
  normaliseCommission, todayUk, validateCommission, type CommissionErrors, type CommissionField,
} from '@/lib/commission';

// The commission request form (owner's brief, 24 Oct 2026). Checked here with the same rules the server uses
// (lib/commission.ts), then sent to /api/commission, which emails it to the contact inbox.

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
const hint: CSSProperties = { fontSize: '14px', opacity: 0.75, margin: '4px 0 0' };
const errorText: CSSProperties = { fontSize: '14px', color: ACCENT, fontWeight: 'bold', margin: '6px 0 0' };

type Values = { name: string; email: string; organisation: string; question: string; deadline: string; publish: string; terms: boolean; website: string };
const EMPTY: Values = { name: '', email: '', organisation: '', question: '', deadline: '', publish: '', terms: false, website: '' };

export default function CommissionForm() {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<CommissionErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState('');

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    // A field's error goes once it is edited; the rest stay until the next send.
    if (k in errors) setErrors((e) => { const next = { ...e }; delete next[k as CommissionField]; return next; });
  };

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setFormError('');
    const request = normaliseCommission(v);
    const found = validateCommission(request);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Please correct the highlighted fields.');
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

  return (
    <form onSubmit={onSubmit} noValidate style={{ fontFamily: MONO, color: INK, maxWidth: '640px' }}>
      <div style={row}>
        <label htmlFor="commission-name" style={label}>Name</label>
        <input id="commission-name" name="name" type="text" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} style={border('name')} {...aria('name')} />
        {err('name')}
      </div>

      <div style={row}>
        <label htmlFor="commission-email" style={label}>Email</label>
        <input id="commission-email" name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} style={border('email')} {...aria('email')} />
        {err('email')}
      </div>

      <div style={row}>
        <label htmlFor="commission-organisation" style={label}>Organisation <span style={{ fontWeight: 'normal', opacity: 0.75 }}>(optional)</span></label>
        <input id="commission-organisation" name="organisation" type="text" autoComplete="organization" value={v.organisation} onChange={(e) => set('organisation', e.target.value)} style={border('organisation')} {...aria('organisation')} />
        {err('organisation')}
      </div>

      <div style={row}>
        <label htmlFor="commission-question" style={label}>Your question</label>
        <textarea id="commission-question" name="question" rows={7} value={v.question} onChange={(e) => set('question', e.target.value)} style={{ ...border('question'), resize: 'vertical', lineHeight: 1.5 }} {...aria('question')} />
        <p style={hint}>Between {QUESTION_MIN} and {QUESTION_MAX.toLocaleString('en-GB')} characters. {v.question.trim().length.toLocaleString('en-GB')} so far.</p>
        {err('question')}
      </div>

      <div style={row}>
        <label htmlFor="commission-deadline" style={label}>Deadline <span style={{ fontWeight: 'normal', opacity: 0.75 }}>(optional)</span></label>
        <input id="commission-deadline" name="deadline" type="date" min={todayUk()} value={v.deadline} onChange={(e) => set('deadline', e.target.value)} style={{ ...border('deadline'), maxWidth: '240px' }} {...aria('deadline')} />
        {err('deadline')}
      </div>

      <div style={row}>
        <label htmlFor="commission-publish" style={label}>Do you intend to publish the research?</label>
        <select id="commission-publish" name="publish" value={v.publish} onChange={(e) => set('publish', e.target.value)} style={{ ...border('publish'), cursor: 'pointer', maxWidth: '240px' }} {...aria('publish')}>
          <option value="">Choose an answer</option>
          {COMMISSION_PUBLISH.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {err('publish')}
      </div>

      {/* Honeypot: hidden from people and from screen readers, so only bots fill it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="commission-website">Website</label>
        <input id="commission-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <div style={row}>
        <label htmlFor="commission-terms" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', lineHeight: 1.5, cursor: 'pointer' }}>
          <input id="commission-terms" name="terms" type="checkbox" checked={v.terms} onChange={(e) => set('terms', e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '1px', flex: '0 0 auto', accentColor: ACCENT }} {...aria('terms')} />
          <span>I have read the <Link href="/commission/terms" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>terms for commissioned research</Link></span>
        </label>
        {err('terms')}
      </div>

      {formError && <p role="alert" style={{ ...errorText, fontSize: '15px', margin: '0 0 14px' }}>{formError}</p>}

      <button type="submit" disabled={sending} style={{
        padding: '12px 24px', background: sending ? 'rgba(20,16,13,0.45)' : INK, color: '#f4e8d4', border: `1px solid ${INK}`, borderRadius: 0,
        fontFamily: MONO, fontSize: '16px', letterSpacing: '0.06em', cursor: sending ? 'default' : 'pointer',
      }}>
        {sending ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}
