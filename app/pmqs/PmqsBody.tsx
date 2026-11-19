import type { Metadata } from 'next';
import PageSources from '@/app/components/PageSources';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import PmqsAttendance, { PMQS_ATTENDANCE_SOURCE } from './PmqsAttendance';
import EverySession, { type PmqsFilters } from './EverySession';
import { pmqsSet } from '@/lib/pmqs';
import PmqsYearLinks from './PmqsYearLinks';

// The metadata of /pmqs, shared with its filter and search routes (F04 batch 3).
export const PMQS_META: Metadata = {
  title: { absolute: "Prime Minister's Questions: every session and attendance" },
  description: "Prime Minister's Questions: every session since 1961, and the Prime Minister's attendance since 1979.",
  alternates: { canonical: '/pmqs' },
};

// The page's body, shared with /pmqs/filter/[...f] and /pmqs/search.
export default async function PmqsBody({ filters }: { filters: PmqsFilters }) {
  const set = await pmqsSet();
  return (
    <OpenGovShell pageStamp="PMQs">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none' }} />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 24px' }}>
        Prime Minister&rsquo;s Questions
      </h1>
      <EverySession set={set} filters={filters} />
      <PmqsYearLinks />
      <PmqsAttendance />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside, in the page's one Sources fold. */}
      <PageSources sources={[PMQS_ATTENDANCE_SOURCE]} />
    </OpenGovShell>
  );
}

