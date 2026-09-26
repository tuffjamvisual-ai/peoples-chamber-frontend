import { Suspense } from 'react';
import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  return (
    <OpenGovShell pageStamp="Account">
      <BackLink
        fallbackHref="/login"
        label="← Back"
        className="no-hover-scale"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '-6%', marginBottom: '12px',
          color: '#14100d', textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)',
        }}
      />
      <header style={{ textAlign: 'center', marginBottom: '7%' }}>
        <h1 style={{
          fontSize: 'clamp(26px, 3.6vw, 42px)', fontWeight: 'bold',
          letterSpacing: '-0.02em', marginBottom: '10px',
          transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
        }}>
          Set new password
        </h1>
      </header>
      <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
        <ResetPasswordClient token={token ?? ''} />
      </Suspense>
    </OpenGovShell>
  );
}
