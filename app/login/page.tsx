import type { Metadata } from 'next';
import { Suspense } from 'react';
import MagazineLoginClient from './MagazineLoginClient';
import DossierShell from '../components/DossierShell';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in or create an account on The People’s Chamber.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <DossierShell>
      <a
        href="/"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← Back to home
      </a>
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <MagazineLoginClient />
      </Suspense>
    </DossierShell>
  );
}
