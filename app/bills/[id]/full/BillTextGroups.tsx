'use client';

// The parts of a large bill that are not in the page itself (owner, 27 Oct 2026: pages stay under 2 MB). Each part has
// its own place and anchor; it loads when the reader scrolls near it, follows a contents link into it, or presses its
// button. The text comes from /api/bills/[id]/text, the same cleaned copy the page uses.
import { useEffect, useRef, useState } from 'react';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

// When the reader last followed a contents link. For a few seconds after that, each part that finishes loading puts the
// chosen clause back in view, because parts loading above it push it down.
let hashAt = 0;
const KEEP_IN_VIEW_MS = 5000;

export default function BillTextGroups({ billId, groups }: { billId: number; groups: { index: number; anchors: string[]; label: string }[] }) {
  return <>{groups.map((g) => <LazyGroup key={g.index} billId={billId} group={g} />)}</>;
}

function LazyGroup({ billId, group }: { billId: number; group: { index: number; anchors: string[]; label: string } }) {
  const [html, setHtml] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const load = () => {
    if (started.current) return;
    started.current = true;
    setState('loading');
    fetch(`/api/bills/${billId}/text?g=${group.index}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { html: string }) => setHtml(d.html))
      .catch(() => { started.current = false; setState('failed'); });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) load(); }, { rootMargin: '1200px 0px' });
    io.observe(el);
    // A contents link to a clause in this part: load it, then go to the clause.
    const onHash = () => {
      hashAt = Date.now();
      const want = decodeURIComponent(location.hash.slice(1));
      if (group.anchors.includes(want)) load();
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => { io.disconnect(); window.removeEventListener('hashchange', onHash); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!html) return;
    const want = decodeURIComponent(location.hash.slice(1));
    if (want && (group.anchors.includes(want) || Date.now() - hashAt < KEEP_IN_VIEW_MS)) document.getElementById(want)?.scrollIntoView();
  }, [html, group.anchors]);

  if (html) return <div className="bt-group" dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div ref={ref} className="bt-group" style={{ border: `1px dashed ${INK}`, padding: '14px 16px', margin: '18px 0', fontFamily: MONO, fontSize: '15px', color: INK }}>
      {/* The anchors exist before the text arrives, so a contents link lands here. */}
      {group.anchors.map((a) => <span key={a} id={a} />)}
      <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>{group.label}</p>
      <p style={{ margin: '0 0 10px' }}>{state === 'failed' ? 'This part could not be loaded.' : state === 'loading' ? 'Loading this part…' : 'This part of the bill loads as you reach it.'}</p>
      {state !== 'loading' && (
        <button type="button" onClick={load} style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, background: 'transparent', border: `1.5px solid ${ACCENT}`, padding: '5px 12px', cursor: 'pointer' }}>
          {state === 'failed' ? 'Try again' : 'Load this part now'}
        </button>
      )}
    </div>
  );
}
