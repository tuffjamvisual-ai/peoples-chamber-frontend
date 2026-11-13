import type { Metadata } from 'next';
import { timedClient } from '@/lib/page-reads';
import OpenGovShell from '../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { currentPeers } from '@/lib/lords';
import LordsIndex from './LordsIndex';
import BackLink from '@/app/components/BackLink';
import { dataListPage } from '@/app/components/DataList';

// House of Lords (owner's yes, 3 Nov 2026): every current member, from the peers table (lib/peers.ts, kept current by
// /api/sync-peers, which refreshes this page when the list changes), filterable by party and type of peerage.
// The list is a DataList (T1-GUARD, owner approved 13 Nov 2026): phones and tablets page it at ?page=, so the page renders on
// each visit; the peers read is cached for an hour (timedClient), so the database is read at most once an hour.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'House of Lords',
  description: 'Every member of the House of Lords: party, type of peerage and when they joined, with their posts, votes and written questions.',
  alternates: { canonical: '/lords' },
};

const INK = '#14100d';

export default async function LordsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[]; party?: string | string[]; type?: string | string[] }> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const page = dataListPage(sp.page);
  const peers = await currentPeers(timedClient(3600));
  return (
    <OpenGovShell>
      <BackLink fallbackHref="/" />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'House of Lords', path: '/lords' }])} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>House of Lords</h1>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 18px', maxWidth: '720px', lineHeight: 1.6 }}>
        The {peers.length.toLocaleString('en-GB')} current members of the House of Lords, from Parliament&rsquo;s records. Each page shows the
        member&rsquo;s party, type of peerage, posts held, votes since September 2024 and written questions.
      </p>
      <LordsIndex peers={peers} page={page} initialParty={one(sp.party)} initialType={one(sp.type)} />
    </OpenGovShell>
  );
}
