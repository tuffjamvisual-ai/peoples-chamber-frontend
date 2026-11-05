import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import PmqsAttendance from './PmqsAttendance';
import EverySession from './EverySession';
import { pmqsSet } from '@/lib/pmqs';

export const metadata: Metadata = {
  title: { absolute: "Prime Minister's Questions: every session and attendance" },
  description: "Prime Minister's Questions: every session since 1961, and the Prime Minister's attendance since 1979.",
  alternates: { canonical: '/pmqs' },
};

export const revalidate = 3600;

export default async function PmqsPage() {
  const set = await pmqsSet();
  return (
    <OpenGovShell pageStamp="PMQs">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none' }} />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 24px' }}>
        Prime Minister&rsquo;s Questions
      </h1>
      <EverySession set={set} />
      <PmqsAttendance />
    </OpenGovShell>
  );
}
