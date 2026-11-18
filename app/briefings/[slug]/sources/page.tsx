// /briefings/<slug>/sources: was the page listing a briefing's sources (23 Oct 2026). Since ART-SOURCES (owner approved
// 18 Nov 2026, Cowork ENTRY 290) the sources are folded at the end of the briefing itself, so this address, kept for links
// already shared, redirects permanently there with the fold open (#sources). Not indexed; not in the sitemap.
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const revalidate = false; // A16: static; the redirect does not depend on data
export function generateStaticParams() { return []; }

export const metadata: Metadata = { title: 'Sources', robots: { index: false, follow: true } };

export default async function BriefingSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/briefings/${slug}#sources`);
}
