import { notFound } from 'next/navigation';
import { SHOW_DEMO_PAGES, HIDDEN_PAGE_METADATA } from '@/lib/feature-flags';
import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';

const PAGE_METADATA: Metadata = {
  title: "opengovt",
  robots: { index: false, follow: false },
};
// While hidden, the page says what a missing page says (not-found title, noindex), not its own title.
export async function generateMetadata(): Promise<Metadata> {
  return SHOW_DEMO_PAGES ? PAGE_METADATA : HIDDEN_PAGE_METADATA;
}

// Blank dossier template — the People's Chamber masthead with an empty folder. Copy this
// file to start a new page and drop your content where indicated; the folder grows to fit.
export default function TemplatePage() {
  if (!SHOW_DEMO_PAGES) notFound(); // hidden (lib/feature-flags.ts)
  return (
    <OpenGovShell pageStamp="Template">
      {/* ── Your page content goes here ── */}
      <div
        style={{
          fontFamily: 'Special Elite, monospace',
          color: '#14100d',
          textAlign: 'center',
          padding: '18% 0',
          fontSize: 'clamp(16px, 2.2vw, 30px)',
          opacity: 0.45,
        }}
      >
        Blank folder, add your content here.
      </div>
    </OpenGovShell>
  );
}
