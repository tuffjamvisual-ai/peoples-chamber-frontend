import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import DonateForm from './DonateForm';

export const metadata: Metadata = {
  title: 'Support this project',
  description: 'Make a one-off donation to help keep opengovt free and independent.',
  alternates: { canonical: '/donate' },
};

const INK = '#14100d';

export default function DonatePage() {
  return (
    <OpenGovShell pageStamp="Donate">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)' }}>
          Support this project
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Opengovt is free, independent and unbranded. A one-off donation helps cover hosting, data and development. No subscription, no account, no catch.
        </p>
      </header>

      <DonateForm />
    </OpenGovShell>
  );
}
