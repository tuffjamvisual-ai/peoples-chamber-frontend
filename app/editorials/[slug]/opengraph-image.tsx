// Share image for each article and briefing (23 Oct 2026; restyled 19 Nov 2026, Cowork ENTRY 397): the headline on the
// folder colour with the red stamp (lib/og-card.tsx). 1200 x 630 PNG, built on first
// request and cached like the page. Next.js points og:image here; the page's metadata points twitter:image at it too.

import { ogCard } from '@/lib/og-card';
import { getEditorial, editorialSlugsFor } from '@/lib/editorials-source';

export const alt = 'Report headline from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;

// Built at build time for every investigation (25 Oct 2026, report 43). Without this list the image route was dynamic
// and drew the image again on every request (p95 1.2 s).
export async function generateStaticParams() {
  return (await editorialSlugsFor('investigation')).map((slug) => ({ slug }));
}
export const dynamicParams = true;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  // Articles, commentary and briefings: the piece's own headline (owner, ENTRY 397: briefings too).
  return ogCard({ title: piece ? piece.headline : 'UK politics, in the open' });
}
