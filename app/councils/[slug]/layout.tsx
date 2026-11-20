import type { Metadata } from 'next';
import { X_CARD, X_SQUARE_IMAGE } from '@/lib/og/x-card';
import { SITE } from '@/lib/JsonLd';

// The council's share card for every page under it (AQ1, 8 Nov 2026), as bills do in app/bills/[id]/layout.tsx:
// ./opengraph-image.tsx fills og:image (OG1), and this gives the same address to twitter:image, so the schools, sewage
// and figures pages share the council's preview rather than the site's. No database read: the address needs only the slug.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { twitter: { card: X_CARD, images: [X_SQUARE_IMAGE] } };
}

export default function CouncilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
