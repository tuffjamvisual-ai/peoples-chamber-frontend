import { notFound } from 'next/navigation';
import { SHOW_DEMO_PAGES, HIDDEN_PAGE_METADATA } from '@/lib/feature-flags';
import type { Metadata } from 'next';
import './landing1012.css';

// /landing1012 — currently just the bg-folders backdrop, no content.
// All text and images removed per request; previous build is in git history.
const PAGE_METADATA: Metadata = {
  title: 'OPEN GOVERNMENT — landing1012 (preview)',
  robots: { index: false, follow: false },
};
// While hidden, the page says what a missing page says (not-found title, noindex), not its own title.
export async function generateMetadata(): Promise<Metadata> {
  return SHOW_DEMO_PAGES ? PAGE_METADATA : HIDDEN_PAGE_METADATA;
}

export default function Landing1012() {
  if (!SHOW_DEMO_PAGES) notFound(); // hidden (lib/feature-flags.ts)
  return <div className="og-stage" />;
}
