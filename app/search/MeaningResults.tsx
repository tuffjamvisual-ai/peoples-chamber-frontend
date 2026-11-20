'use client';
// 'Related by meaning' on /search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026). After the exact results are on the
// page, one request to /api/meaning-search for the records closest in meaning; any the page already lists are left out
// (seen: their keys, lib/meaning/kinds.ts seenKey) and at most SHOWN are listed, under every other group, in the same row
// style, each with its kind. Nothing shows (no heading, no gap) while it loads, after WAIT_MS, or if the request fails or
// finds nothing new: the exact search is never changed or held up. Without JavaScript the group is simply absent.
// Each row: its kind, its title and, as the exact results show, its date (and a debate's House): 'Commons debate ·
// 12 Mar 2025' (lib/meaning/kinds.ts meaningDetail).
// Phones: like every group after the first, a closed fold labelled with its count (SubFold); open when it is the only
// group on the page. In the fold the group's own heading is hidden on phones, as the fold's label names it (Cowork
// ENTRY 390 PICTURES); the note line stays. The fold's width is PhoneFolds' (globals.css .pf-sd, phoneUpTo(767.98)).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SubFold } from '../components/PhoneFolds';
import { MEANING_LABEL, meaningDetail, seenKey, type MeaningKind } from '@/lib/meaning/kinds';
import { phoneUpTo } from '@/lib/breakpoints';

const SHOWN = 5;
const WAIT_MS = 5000;
const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const MONO = 'var(--font-special-elite), monospace';
const BADGE = '#4a4a4a';

type Row = { kind: MeaningKind; path: string; title: string; date?: string | null; house?: string | null };

// Records of one kind together (a debate list reads better than debates between bills), the kinds in the order of their
// closest record; within a kind, closest first.
function grouped(rows: Row[]): Row[] {
  const order: MeaningKind[] = [];
  for (const r of rows) if (!order.includes(r.kind)) order.push(r.kind);
  return order.flatMap((k) => rows.filter((r) => r.kind === k));
}

export default function MeaningResults({ q, seen, fold }: { q: string; seen: string[]; fold: boolean }) {
  const seenList = seen.join('\n'); // a stable dependency (a new array from the server each render would refetch)
  // The rows with the search they answer, so a new search never shows the last one's rows.
  const [got, setGot] = useState<{ for: string; rows: Row[] }>({ for: '', rows: [] });
  const forKey = `${q}\n${seenList}`;

  useEffect(() => {
    if (q.trim().length < 3) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WAIT_MS);
    const skip = new Set(seenList.split('\n'));
    fetch(`/api/meaning-search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j: { results?: Row[] }) => {
        const out: Row[] = [];
        for (const r of j.results ?? []) {
          const key = seenKey(r.path);
          // One row per title and kind: Hansard holds many debates called just 'Knife Crime'.
          const same = `${r.kind}|${r.title.toLowerCase().trim()}`;
          if (!MEANING_LABEL[r.kind] || !r.path.startsWith('/') || r.path.startsWith('//') || skip.has(key) || skip.has(same)) continue;
          skip.add(key);
          skip.add(same);
          out.push(r);
          if (out.length === SHOWN) break;
        }
        setGot({ for: `${q}\n${seenList}`, rows: grouped(out) });
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q, seenList]);

  const rows = got.for === forKey ? got.rows : [];
  if (!rows.length) return null;
  const body = (
    <section aria-labelledby="search-meaning" style={{ marginTop: '28px', marginBottom: '28px' }}>
      {fold && <style>{`@media ${phoneUpTo(767.98)} { .srch-mh-fold { display: none; } }`}</style>}
      <h2 id="search-meaning" className={fold ? 'srch-mh-fold' : undefined} style={{ fontSize: '19px', fontWeight: 'bold', color: INK, margin: '0 0 2px' }}>Related by meaning</h2>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 16px', lineHeight: 1.5 }}>
        Close in meaning to your search, though they may not use your words. Matched automatically, so some may be wide of the mark.
      </p>
      <ul id="results-meaning" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((r) => { const detail = meaningDetail(r.kind, r.date ?? null, r.house ?? null); return (
          <li key={r.path} style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
            <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em', color: INK, border: `1px solid ${BADGE}`, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px', textTransform: 'uppercase' }}>
                {MEANING_LABEL[r.kind]}
              </span>
              <div style={{ minWidth: 0 }}>
                <Link href={r.path} style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                  {r.title}
                </Link>
                {detail && <span style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>{detail}</span>}
              </div>
            </div>
          </li>
        ); })}
      </ul>
    </section>
  );
  return fold ? <SubFold label={`Related by meaning (${rows.length})`}>{body}</SubFold> : body;
}
