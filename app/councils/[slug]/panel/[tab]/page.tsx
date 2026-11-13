import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setPageReadTimer } from '@/lib/page-reads';
import { isCouncilLazyTab } from '@/lib/council-panels';
import { panelSources } from '@/lib/panel-sources';
import PageSources from '../../../../components/PageSources';
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
  // Each section that shows figures adds its source as it renders (lib/panel-sources.ts). Read them first, one after
  // another, so the tab's one Sources fold (T1-5c, 11 Nov 2026) lists them in the tab's order. The reads are the page's
  // own, from the data cache, so rendering the sections below repeats none of them against the database.
  for (const p of parts) await p.read();
  const sources = [...panelSources()];
  // The paper background (Cowork 13 Nov 2026, ENTRY 9, proposal 1): opened at its own address (a shared link, a crawler),
  // the panel had no shell, so its ink coloured text sat on the dark page. The council page's tab takes only the inside of
  // #council-panel-body (CouncilTabs), so the tab is unchanged.
  return (
    <div style={{ background: '#e1c495', minHeight: '100vh', padding: '0 8px', boxSizing: 'border-box' }}>
    <div id="council-panel-body">
      {parts.map((p, i) => <Fragment key={i}>{p.node}</Fragment>)}
      <PageSources sources={sources} marginTop="8px" />
    </div>
    </div>
  );
}
