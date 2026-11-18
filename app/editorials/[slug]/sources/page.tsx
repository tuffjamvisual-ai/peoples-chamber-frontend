// /editorials/<slug>/sources: was the page listing every record an investigation was checked against (23 Oct 2026). Since
// ART-SOURCES (owner approved 18 Nov 2026, Cowork ENTRY 290) the sources are folded at the end of the article itself, so
// this address, kept for links already shared, redirects permanently there with the fold open (#sources). A briefing's
// goes to /briefings/<slug>#sources. Not indexed; not in the sitemap.
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getEditorial } from '@/lib/editorials-source';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

export const metadata: Metadata = { title: 'Sources', robots: { index: false, follow: true } };

export default async function EditorialSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  if (!piece) notFound();
  permanentRedirect(`${piece.kind === 'briefing' ? '/briefings' : '/editorials'}/${slug}#sources`);
}
