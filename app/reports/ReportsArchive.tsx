'use client';

import NoJsPager, { NoJsFold } from '@/app/components/NoJsPager';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ContinueToArticle from '../components/ContinueToArticle';
import { phoneUpTo } from '@/lib/breakpoints';

// The /reports archive (23 Oct 2026): search and 20 a page, all on the client. Every report is rendered into the page's
// HTML by the server; the client only hides the ones that do not match or are on another page, so search engines see the
// full list and the page stays cached. q and page live in the address bar (history.replaceState), so Back from a report
// restores them. The topic and type dropdowns were removed as clutter (T1-RFILT, owner decision 12 Nov 2026): search
// covers every report, and an old address with ?topic= or ?type= opens the whole list and drops those from the address.
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
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const PER_PAGE = 20;

// Parchment form controls, as on the bills filter bar.
const field: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '15px',
  outline: 'none',
};
const pageBtn = (disabled: boolean): CSSProperties => ({
  padding: '6px 14px',
  background: 'transparent',
  color: INK,
  border: `1px solid ${INK}`,
  borderRadius: 0,
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '15px',
  letterSpacing: '0.06em',
  cursor: disabled ? 'default' : 'pointer',
  textDecoration: disabled ? 'line-through' : 'none', // black ink rule: struck through when unavailable, never greyed
  borderStyle: disabled ? 'dashed' : 'solid',
});

type State = { q: string; page: number };
const EMPTY: State = { q: '', page: 1 };

function readUrl(): State {
  const p = new URLSearchParams(window.location.search);
  const page = Math.max(1, Math.floor(Number(p.get('page')) || 1));
  return { q: p.get('q') || '', page };
}

export default function ReportsArchive({ items }: { items: ArchiveItem[] }) {
  const [state, setState] = useState<State>(EMPTY);
  const ready = useRef(false);

  // Read the address bar once, after mount (the server renders the first page of every report).
  useEffect(() => {
    const t = setTimeout(() => {
      setState(readUrl());
      ready.current = true;
      // The removed filters (T1-RFILT): an old ?topic= or ?type= address is shown as /reports, with any search and page kept.
      const url = new URL(window.location.href);
      url.searchParams.delete('topic');
      url.searchParams.delete('type');
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
    }, 0);
    return () => clearTimeout(t);
  }, []);


  const term = state.q.trim().toLowerCase();
  const matches = useMemo(() => items.map((e) =>
    !term || e.headline.toLowerCase().includes(term) || e.summary.toLowerCase().includes(term)), [items, term]);
  const count = matches.filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
  const page = Math.min(state.page, totalPages);

  // Keep the address bar in step (no new history entries).
  useEffect(() => {
    if (!ready.current) return;
    const url = new URL(window.location.href);
    const set = (k: string, v: string) => { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k); };
    set('q', state.q.trim());
    set('page', page > 1 ? String(page) : '');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  }, [state.q, page]);

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
      {/* Phones (UX2n, owner approved through Cowork, 10 Nov 2026): the search box at 16px, and smaller gaps above the first
          report. From 768px up, as before. */}
      <style dangerouslySetInnerHTML={{ __html: `@media ${phoneUpTo(767.98)} { .reports-filters > input { font-size: 16px !important; } .reports-filters { margin-bottom: 6px !important; } .reports-count { margin-bottom: 8px !important; } .reports-mh { padding-bottom: 4px !important; } .reports-card { padding-top: 12px !important; } .reports-type { margin-bottom: 4px !important; } }` }} />
      <div className="reports-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', alignItems: 'baseline' }}>
        <input aria-label="Search reports" type="search" placeholder="Search reports…" value={state.q}
          onChange={(e) => update({ q: e.target.value })} style={{ ...field, flex: '1 1 280px', maxWidth: '420px' }} />
      </div>

      <p aria-live="polite" className="reports-count" style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', color: INK, margin: '0 0 16px' }}>
        {state.q.trim() ? `${count} report${count === 1 ? '' : 's'} matching "${state.q.trim()}"` : `${count} report${count === 1 ? '' : 's'}`}
      </p>

      {/* Inline styles cannot hold a media query: the grid's columns live in this class. */}
      <style>{`
        html:not(.og-js) .reports-card { display: flex !important; }
        html:not(.og-js) .reports-month { display: block !important; }
        html:not(.og-js) .reports-pager, html:not(.og-js) .reports-filters { display: none !important; }
        .reports-month-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; row-gap: 0; align-items: stretch; }
        @media (max-width: 719.98px) { .reports-month-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
      <div style={{ fontFamily: MONO }}>
        {months.map((m, mi) => {
          const shown = m.idx.some((i) => visible[i]);
          return (
            <section key={m.key} className="reports-month" style={{ display: shown ? 'block' : 'none' }}>
              <h2 className="reports-mh" style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold', color: INK, borderBottom: `1px solid ${INK_HAIRLINE}`, padding: mi === firstShownMonth ? '0 0 8px' : '28px 0 8px', margin: 0 }}>
                {m.label}
              </h2>
              <NoJsFold id={`rf-${m.key}`} always label={`${m.idx.length} ${m.idx.length === 1 ? 'report' : 'reports'}`} open={mi === 0}>
              {/* Phones (under 768px): a month's first 3 reports, then "Show all N" (owner approved 12 Nov 2026, T1-VERD: the
                  AR7 report took the page to 2,511px at 375, over the 2,500px limit; folded, nothing removed). From 768px up
                  nothing changes. */}
              <NoJsPager id={`rm-${m.key}`} count={m.idx.length} rows="> a" size={12} first={3}>
              <div className="reports-month-grid">
                {m.idx.map((i) => {
                  const e = items[i];
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      className="no-hover-scale reports-card"
                      data-main-action={mi === firstShownMonth && i === m.idx.find((k) => visible[k]) ? '' : undefined}
                      style={{ display: visible[i] ? 'flex' : 'none', flexDirection: 'column', height: '100%', padding: '22px 0', borderBottom: `1px solid ${HAIRLINE}`, textDecoration: 'none', color: INK }}
                    >
                      {/* The type, then the piece's own kicker when it says something the type does not. */}
                      <div className="reports-type" style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>
                        {e.type}
                        {e.kicker && e.kicker.toLowerCase() !== e.type.toLowerCase() ? ` · ${e.kicker}` : ''}
                      </div>
                      <h3 style={{ fontFamily: MONO, fontSize: 'clamp(19px, 1.9vw, 25px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.15, marginBottom: '8px' }}>
                        {e.headline}
                      </h3>
                      <div style={{ fontSize: '15px', color: INK, marginBottom: '6px' }}>{e.dateLabel} · {e.readingLabel}</div>
                      {e.summary && <p style={{ fontSize: '15px', lineHeight: 1.55, margin: 0 }}>{e.summary}</p>}
                      {/* Pushed to the foot of the card so cards in the same row line up. */}
                      <ContinueToArticle style={{ marginTop: 'auto', paddingTop: '6px' }} />
                    </Link>
                  );
                })}
              </div>
              </NoJsPager>
              </NoJsFold>
            </section>
          );
        })}
        {count === 0 && <p style={{ padding: '22px 0', fontSize: '15px', color: INK }}>No reports match.</p>}
      </div>

      {totalPages > 1 && (
        <nav className="reports-pager" aria-label="Reports pages" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '24px', fontFamily: MONO, fontSize: '15px', color: INK }}>
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} style={pageBtn(page <= 1)}>Previous</button>
          <span>page {page} of {totalPages}</span>
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} style={pageBtn(page >= totalPages)}>Next</button>
        </nav>
      )}
    </>
  );
}
