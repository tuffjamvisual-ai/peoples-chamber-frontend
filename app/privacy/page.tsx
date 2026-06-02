import type { Metadata } from 'next'
import DossierShell from '../components/DossierShell'
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for The People’s Chamber — what data we collect, how we use it, and your rights under UK GDPR.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          What data we collect, how we use it, and your rights under UK GDPR.
        </p>
      </header>

      <div className="max-w-3xl">
        <p className="text-[#14100d]/70 mb-4">Last updated: March 28, 2026</p>

        <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Information We Collect</h2>
        <p className="text-[#14100d] mb-4">People&apos;s Chamber collects minimal personal information:</p>
        <ul className="list-disc list-inside text-[#14100d] mb-4 space-y-2">
          <li>Email address (for account creation)</li>
          <li>Username (public display name)</li>
          <li>Postcode (optional, for constituency matching)</li>
          <li>Voting history on Parliamentary bills</li>
          <li>Comments posted on bills</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">How We Use Your Information</h2>
        <p className="text-[#14100d] mb-4">Your information is used to:</p>
        <ul className="list-disc list-inside text-[#14100d] mb-4 space-y-2">
          <li>Provide access to the People&apos;s Chamber platform</li>
          <li>Display aggregated voting statistics</li>
          <li>Match you with your local MP (if postcode provided)</li>
          <li>Enable community discussions on bills</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Data Storage</h2>
        <p className="text-[#14100d] mb-4">
          All data is stored securely using Supabase (PostgreSQL database) with industry-standard encryption. We do not sell or share your personal information with third parties.
        </p>

        <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Your Rights</h2>
        <p className="text-[#14100d] mb-4">You have the right to:</p>
        <ul className="list-disc list-inside text-[#14100d] mb-4 space-y-2">
          <li>Access your personal data</li>
          <li>Delete your account and all associated data</li>
          <li>Export your voting history</li>
          <li>Opt out of data collection</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Contact</h2>
        <p className="text-[#14100d] mb-4">
          For privacy concerns or data requests, contact: tuffjamvisual@gmail.com
        </p>
      </div>
    </DossierShell>
  );
}
