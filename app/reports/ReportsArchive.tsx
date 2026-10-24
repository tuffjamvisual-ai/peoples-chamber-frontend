'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ContinueToArticle from '../components/ContinueToArticle';

// The /reports archive (23 Oct 2026): search, topic and type filters and 20 a page, all on the client. Every report
// is rendered into the page's HTML by the server; the client only hides the ones that do not match or are on another
// page, so search engines see the full list and the page stays cached. q, topic, type and page live in the address
// bar (history.replaceState), so Back from a report restores them.
// Two columns grouped by month (24 Oct 2026): each month's visible reports sit under a month heading in a two-column
// grid (one column below 720px). A month with no visible report on the current page is hidden with its heading.

export type ArchiveItem = {
  href: string;
  type: 'Investigation' | 'Briefing' | 'Commentary';
  kicker: string | null;
  headline: string;
  summary: string;
  dateLabel: string;
  monthKey: string;   // "2026-10"
  monthLabel: string; // "October 2026"
  readingLabel: string; // "6 min read" (lib/reading-time.ts)
  topics: string[];
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const MONO = '"Special Elite", monospace';
const PER_PAGE = 20;
const TYPES = ['Investigation', 'Briefing', 'Commentary'] as const;

// Parchment form controls, as on the bills filter bar.
const field: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: 'Special Elite, monospace',
  fontSize: '15px',
  outline: 'none',
};
const pageBtn = (disabled: boolean): CSSProperties => ({
  padding: '6px 14px',
  background: 'transparent',
  color: INK,
  border: `1px solid ${INK}`,
  borderRadius: 0,
  fontFamily: 'Special Elite, monospace',
  fontSize: '15px',
  letterSpacing: '0.06em',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.3 : 1,
});

type State = { q: string; topic: string; type: string; page: number };
const EMPTY: State = { q: '', topic: '', type: '', page: 1 };

function readUrl(topicSlugs: Set<string>): State {
  const p = new URLSearchParams(window.location.search);
  const type = p.get('type') || '';
  const topic = p.get('topic') || '';
  const page = Math.max(1, Math.floor(Number(p.get('page')) || 1));
  return {
    q: p.get('q') || '',
    topic: topicSlugs.has(topic) ? topic : '',
    type: (TYPES as readonly string[]).includes(type) ? type : '',
    page,
  };
}

export default function ReportsArchive({ items, topics }: { items: ArchiveItem[]; topics: { slug: string; title: string }[] }) {
  const [state, setState] = useState<State>(EMPTY);
  const ready = useRef(false);
  const topicSlugs = useMemo(() => new Set(topics.map((t) => t.slug)), [topics]);

  // Read the address bar once, after mount (the server renders the unfiltered first page).
  useEffect(() => {
    const t = setTimeout(() => { setState(readUrl(topicSlugs)); ready.current = true; }, 0);
    return () => clearTimeout(t);
  }, [topicSlugs]);

  const term = state.q.trim().toLowerCase();
  const matches = useMemo(() => items.map((e) =>
    (!term || e.headline.toLowerCase().includes(term) || e.summary.toLowerCase().includes(term))
    && (!state.topic || e.topics.includes(state.topic))
    && (!state.type || e.type === state.type)), [items, term, state.topic, state.type]);
  const count = matches.filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
  const page = Math.min(state.page, totalPages);

  // Keep the address bar in step (no new history entries).
  useEffect(() => {
    if (!ready.current) return;
    const url = new URL(window.location.href);
    const set = (k: string, v: string) => { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k); };
    set('q', state.q.trim());
    set('topic', state.topic);
    set('type', state.type);
    set('page', page > 1 ? String(page) : '');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  }, [state.q, state.topic, state.type, page]);

  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch, page: patch.page ?? 1 }));
  const goTo = (p: number) => { update({ page: p }); window.scrollTo({ top: 0 }); };

  // Show only the matching items on the current page.
  const visible = useMemo(() => {
    const out: boolean[] = [];
    let rank = 0;
    for (const m of matches) { out.push(m ? Math.floor(rank / PER_PAGE) + 1 === page : false); if (m) rank++; }
    return out;
  }, [matches, page]);

  // Items grouped by month, in their existing order (newest first), each with its index into items.
  const months = useMemo(() => {
    const out: { key: string; label: string; idx: number[] }[] = [];
    items.forEach((e, i) => {
      const last = out[out.length - 1];
      if (last && last.key === e.monthKey) last.idx.push(i);
      else out.push({ key: e.monthKey, label: e.monthLabel, idx: [i] });
    });
    return out;
  }, [items]);
  const firstShownMonth = months.findIndex((m) => m.idx.some((i) => visible[i]));

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', alignItems: 'baseline' }}>
        <input aria-label="Search reports" type="search" placeholder="Search reports…" value={state.q}
          onChange={(e) => update({ q: e.target.value })} style={{ ...field, flex: '1 1 280px', maxWidth: '420px' }} />
        <select aria-label="Topic" value={state.topic} onChange={(e) => update({ topic: e.target.value })} style={{ ...field, cursor: 'pointer' }}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
        </select>
        <select aria-label="Type" value={state.type} onChange={(e) => update({ type: e.target.value })} style={{ ...field, cursor: 'pointer' }}>
          <option value="">All</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', color: INK, opacity: 0.7, margin: '0 0 16px' }}>
        {state.q.trim() ? `${count} report${count === 1 ? '' : 's'} matching "${state.q.trim()}"` : `${count} report${count === 1 ? '' : 's'}`}
      </p>

      {/* Inline styles cannot hold a media query: the grid's columns live in this class. */}
      <style>{`
        .reports-month-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; row-gap: 0; align-items: stretch; }
        @media (max-width: 719.98px) { .reports-month-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
      <div style={{ fontFamily: MONO }}>
        {months.map((m, mi) => {
          const shown = m.idx.some((i) => visible[i]);
          return (
            <section key={m.key} hidden={!shown} style={{ display: shown ? 'block' : 'none' }}>
              <h2 style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold', color: INK, borderBottom: `1px solid ${INK_HAIRLINE}`, padding: mi === firstShownMonth ? '0 0 8px' : '28px 0 8px', margin: 0 }}>
                {m.label}
              </h2>
              <div className="reports-month-grid">
                {m.idx.map((i) => {
                  const e = items[i];
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      className="no-hover-scale"
                      hidden={!visible[i]}
                      style={{ display: visible[i] ? 'flex' : 'none', flexDirection: 'column', height: '100%', padding: '22px 0', borderBottom: `1px solid ${HAIRLINE}`, textDecoration: 'none', color: INK }}
                    >
                      {/* The type, then the piece's own kicker when it says something the type does not. */}
                      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.22em', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>
                        {e.type}
                        {e.kicker && e.kicker.toLowerCase() !== e.type.toLowerCase() ? ` · ${e.kicker}` : ''}
                      </div>
                      <h3 style={{ fontFamily: MONO, fontSize: 'clamp(19px, 1.9vw, 25px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.15, marginBottom: '8px' }}>
                        {e.headline}
                      </h3>
                      <div style={{ fontSize: '14px', color: INK, marginBottom: '6px' }}>{e.dateLabel} · {e.readingLabel}</div>
                      {e.summary && <p style={{ fontSize: '15px', lineHeight: 1.55, margin: 0 }}>{e.summary}</p>}
                      {/* Pushed to the foot of the card so cards in the same row line up. */}
                      <ContinueToArticle style={{ marginTop: 'auto', paddingTop: '6px' }} />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        {count === 0 && <p style={{ padding: '22px 0', fontSize: '15px', color: INK }}>No reports match.</p>}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Reports pages" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px', fontFamily: MONO, fontSize: '15px', color: INK }}>
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} style={pageBtn(page <= 1)}>Previous</button>
          <span>page {page} of {totalPages}</span>
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} style={pageBtn(page >= totalPages)}>Next</button>
        </nav>
      )}
    </>
  );
}
