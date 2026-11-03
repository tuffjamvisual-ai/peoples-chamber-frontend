'use client';

import { useState, type CSSProperties } from 'react';
import { questionUrl, QUESTIONS_PER_PAGE, type WrittenQuestion } from '@/lib/mp-written-questions';

// The list on /mps/[id]/questions (owner, 3 Nov 2026): page 1 of all questions comes from the cached page; other pages
// and a department filter are read from /api/mps/[id]/questions.

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
const divider = '1px solid rgba(20,16,13,0.18)';
const link: CSSProperties = { color: INK, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' };
const button: CSSProperties = { padding: '8px 14px', background: 'transparent', color: INK, border: `1px solid ${INK}`, borderRadius: 0, fontFamily: MONO, fontSize: '15px', cursor: 'pointer' };

const fmt = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

export default function QuestionsList({ memberId, initial, total: initialTotal, departments }: {
  memberId: number;
  initial: WrittenQuestion[];
  total: number;
  departments: Array<{ name: string; count: number }>;
}) {
  const [rows, setRows] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const pages = Math.max(1, Math.ceil(total / QUESTIONS_PER_PAGE));

  async function load(nextPage: number, nextDepartment: string) {
    setStatus('loading');
    try {
      const q = new URLSearchParams({ page: String(nextPage), ...(nextDepartment ? { department: nextDepartment } : {}) });
      const res = await fetch(`/api/mps/${memberId}/questions?${q}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { questions: WrittenQuestion[]; total: number };
      setRows(body.questions);
      setTotal(body.total);
      setPage(nextPage);
      setDepartment(nextDepartment);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{ color: INK, fontSize: '15px' }}>
      <label htmlFor="questions-department" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Department</label>
      <select
        id="questions-department"
        value={department}
        onChange={(e) => load(1, e.target.value)}
        style={{ ...button, cursor: 'pointer', maxWidth: '100%', marginBottom: '14px', background: 'rgba(20,16,13,0.05)' }}
      >
        <option value="">All departments</option>
        {departments.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.count.toLocaleString('en-GB')})</option>)}
      </select>

      <p aria-live="polite" style={{ margin: '0 0 8px' }}>
        {status === 'loading' ? 'Loading…' : status === 'error' ? 'Sorry, the questions could not be loaded. Please try again.' : `${total.toLocaleString('en-GB')} question${total === 1 ? '' : 's'}${department ? ` to ${department}` : ''}, newest first. Page ${page} of ${pages}.`}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', opacity: status === 'loading' ? 0.5 : 1 }}>
        {rows.map((q) => {
          const href = questionUrl(q);
          const title = (q.heading || `Written question ${q.uin}`).trim();
          return (
            <li key={q.id} style={{ padding: '9px 0', borderBottom: divider }}>
              <div>
                <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>{fmt(q.date_tabled)}</span>
                {q.answering_body && <span> · {q.answering_body}</span>}
              </div>
              <div>{href ? <a href={href} target="_blank" rel="noopener noreferrer" style={link}>{title}</a> : <strong>{title}</strong>}</div>
              <div>{q.is_withdrawn ? 'Withdrawn' : q.date_answered ? `Answered ${fmt(q.date_answered)}` : 'Awaiting answer'}</div>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <nav aria-label="Question pages" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={button} disabled={page <= 1 || status === 'loading'} onClick={() => load(page - 1, department)}>Newer</button>
          <span>Page {page} of {pages}</span>
          <button type="button" style={button} disabled={page >= pages || status === 'loading'} onClick={() => load(page + 1, department)}>Older</button>
        </nav>
      )}
    </div>
  );
}
