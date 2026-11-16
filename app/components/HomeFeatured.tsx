'use client';
// The homepage's featured reports (ENTRY 140): the four slots change every day by lib/home-rotation.ts. The server
// sends the 16 candidates once (HomeFeaturedProvider) and renders the day it rendered, so the page is complete without
// JavaScript; the browser then uses today's date in London (useToday), and the page is never rebuilt for the date.
import { createContext, useContext, type ReactNode } from 'react';
import Link from 'next/link';
import { dayNumber } from '@/lib/london-date';
import { rotate, type FeaturedItem } from '@/lib/home-rotation';
import { useToday } from './useToday';
import ContinueToArticle from './ContinueToArticle';

const Picked = createContext<FeaturedItem[]>([]);
const LABEL: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d', letterSpacing: '0.04em', margin: '0 0 6px' };

export function HomeFeaturedProvider({ pool, lead, leadSlug, renderedOn, children }: { pool: FeaturedItem[]; lead: FeaturedItem | null; leadSlug: string; renderedOn: string; children: ReactNode }) {
  const today = useToday(renderedOn);
  return <Picked.Provider value={rotate(pool, dayNumber(today), leadSlug, lead)}>{children}</Picked.Provider>;
}

/** Slot 1, the lead story: the headline is the link, the summary and opening plain text after it (UX1g, 9 Nov 2026). */
export function FeaturedLead() {
  const s = useContext(Picked)[0];
  if (!s) return null;
  return (
    <article className="og-block og-lead-story">
      <a className="og-head og-lead-head" href={`/editorials/${s.slug}`}>{s.headline}</a>
      <div style={LABEL}>{s.label}</div>
      <div className="og-standfirst">{s.summary}</div>
      {s.lede && <p className="og-lede">{s.lede}</p>}
    </article>
  );
}

/** Slots 2 to 4, as the other report blocks. */
export function FeaturedBrief({ n, plainLink = false }: { n: 1 | 2 | 3; plainLink?: boolean }) {
  const s = useContext(Picked)[n];
  if (!s) return null;
  const inner = (<><div className="og-head">{s.headline}</div><div style={LABEL}>{s.label}</div><p>{s.summary}</p><ContinueToArticle /></>);
  return plainLink
    ? <a className="og-block og-brief" href={`/editorials/${s.slug}`}>{inner}</a>
    : <Link className="og-block og-brief" href={`/editorials/${s.slug}`}>{inner}</Link>;
}
