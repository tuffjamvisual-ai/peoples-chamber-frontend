import type { Metadata } from 'next';
import { Suspense } from 'react';
import MagazineLoginClient from './MagazineLoginClient';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in or create an account on The People’s Chamber.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ textAlign: 'center', marginBottom: '7%' }}>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '10px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Your Account
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.6, opacity: 0.78, maxWidth: '440px', margin: '0 auto' }}>
          Sign in or create an account to follow MPs, track bills and have your say in the People&apos;s Polls.
        </p>
      </header>

      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <MagazineLoginClient />
      </Suspense>
    </DossierShell>
  );
}
