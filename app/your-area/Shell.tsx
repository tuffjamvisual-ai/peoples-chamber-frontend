// The /your-area frame (F04 batch 4): heading, back link and the "Search another area" box, shared by the static prompt
// (/your-area), each council's static page (/your-area/<GSS code>) and the lookup route (/your-area/find).
import type { CSSProperties, ReactNode } from 'react';
import OpenGovShell from '../components/OpenGovShell';
import AreaSearch from '../components/AreaSearch';
import BackLink from '@/app/components/BackLink';

export const INK = '#14100d';
export const ACCENT = '#7a1612';
export const MONO = "var(--font-special-elite), monospace";
export const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 6px' };
export const link: CSSProperties = { color: ACCENT, textDecoration: 'underline' };

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <OpenGovShell>
      <BackLink fallbackHref="/" />
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>Your area</h1>
      </header>
      {children}
      <div style={{ marginTop: '32px', maxWidth: '640px' }}>
        <p style={{ ...para, marginBottom: '8px' }}>Search another area</p>
        <AreaSearch placeholder="Postcode, town or council" />
      </div>
    </OpenGovShell>
  );
}
