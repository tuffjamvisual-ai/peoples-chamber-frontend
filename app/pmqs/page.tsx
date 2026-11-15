import type { Metadata } from 'next';
import PageSources from '@/app/components/PageSources';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import PmqsAttendance, { PMQS_ATTENDANCE_SOURCE } from './PmqsAttendance';
import EverySession, { type PmqsFilters } from './EverySession';
import { pmqsSet } from '@/lib/pmqs';

// A search or filter (?q=, ?pm=, ?year=, ?page=, ?dpage=) is the same page narrowed: not indexed on its own, the canonical is /pmqs.
export async function generateMetadata({ searchParams }: { searchParams: Promise<PmqsFilters> }): Promise<Metadata> {
  const sp = await searchParams;
  const narrowed = !!(sp.q || sp.pm || sp.year || sp.page || sp.dpage);
  return {
    title: { absolute: "Prime Minister's Questions: every session and attendance" },
    description: "Prime Minister's Questions: every session since 1961, and the Prime Minister's attendance since 1979.",
    alternates: { canonical: '/pmqs' },
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
  };
}

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export default async function PmqsPage({ searchParams }: { searchParams: Promise<PmqsFilters> }) {
  const sp = await searchParams;
  const filters: PmqsFilters = Object.fromEntries((['q', 'pm', 'year', 'page', 'dpage'] as const).map((k) => [k, typeof sp[k] === 'string' ? sp[k] : undefined]));
  const set = await pmqsSet();
  return (
    <OpenGovShell pageStamp="PMQs">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none' }} />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 24px' }}>
        Prime Minister&rsquo;s Questions
      </h1>
      <EverySession set={set} filters={filters} />
      <PmqsAttendance />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside, in the page's one Sources fold. */}
      <PageSources sources={[PMQS_ATTENDANCE_SOURCE]} />
    </OpenGovShell>
  );
}
