import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setPageReadTimer } from '@/lib/page-reads';
import { isCouncilLazyTab } from '@/lib/council-panels';
import { loadPanelContext, panelParts } from '../../panels';

// One detail tab of a council page, read by CouncilTabs when the tab is opened (owner, 4 Nov 2026). Kept and refreshed
// like the council page itself (lib/council-refresh.ts). Only the #council-panel-body part is used. Not for search
// engines: the council page is the page to find.
export const revalidate = 604800;
export const fetchCache = 'default-cache';
export function generateStaticParams() { return []; }

export const metadata: Metadata = { title: 'Council figures', robots: { index: false, follow: true } };

export default async function CouncilPanel({ params }: { params: Promise<{ slug: string; tab: string }> }) {
  setPageReadTimer(revalidate);
  const { slug, tab } = await params;
  if (!isCouncilLazyTab(tab)) notFound();
  const ctx = await loadPanelContext(slug);
  if (!ctx) notFound();
  const parts = panelParts(tab, ctx, <div data-welfare-slot="1" />);
  return <div id="council-panel-body">{parts.map((p, i) => <Fragment key={i}>{p.node}</Fragment>)}</div>;
}
