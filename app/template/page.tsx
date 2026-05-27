import type { Metadata } from 'next';
import DossierShell from '../components/DossierShell';

export const metadata: Metadata = {
  title: "The People's Chamber",
  robots: { index: false, follow: false },
};

// Blank dossier template — the People's Chamber masthead with an empty folder. Copy this
// file to start a new page and drop your content where indicated; the folder grows to fit.
export default function TemplatePage() {
  return (
    <DossierShell>
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
        Blank folder — add your content here.
      </div>
    </DossierShell>
  );
}
