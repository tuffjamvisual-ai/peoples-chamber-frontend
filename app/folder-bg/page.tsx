// Temp composition: the "confidential files" photo (background.png, 1448x1086) as the
// full-viewport backdrop, with the single blank folder (blankfolder.png, 1023x1537)
// placed centred on top. Both copied from ~/Downloads into /public.
/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import { SHOW_DEMO_PAGES, HIDDEN_PAGE_METADATA } from '@/lib/feature-flags';
import type { Metadata } from 'next';

const PAGE_METADATA: Metadata = {
  title: "opengovt",
  robots: { index: false, follow: false },
};
// While hidden, the page says what a missing page says (not-found title, noindex), not its own title.
export async function generateMetadata(): Promise<Metadata> {
  return SHOW_DEMO_PAGES ? PAGE_METADATA : HIDDEN_PAGE_METADATA;
}

export default function FolderBgPage() {
  if (!SHOW_DEMO_PAGES) notFound(); // hidden (lib/feature-flags.ts)
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#140d07',
        backgroundImage: 'url(/bg-folders.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '3vh 0',
      }}
    >
      <img
        src="/blank-folder.png"
        alt="Blank folder"
        style={{
          height: 'min(92vh, calc(94vw * 1537 / 1023))',
          width: 'auto',
          maxWidth: '94vw',
          objectFit: 'contain',
          filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))',
        }}
      />
    </div>
  );
}
