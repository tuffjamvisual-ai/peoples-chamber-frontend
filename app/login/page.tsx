import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginClient from './LoginClient';
import Navigation from '../components/Navigation';

// Dark-theme inline sign in / sign up page. The client component
// reads ?mode= (signup vs login) and ?returnTo= from the URL.

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in or create an account on The People’s Chamber.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#606060]">
      <Navigation />
      <Suspense fallback={<div className="text-white text-center p-12">Loading…</div>}>
        <LoginClient />
      </Suspense>
    </div>
  );
}
