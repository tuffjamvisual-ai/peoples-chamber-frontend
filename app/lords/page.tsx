import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { currentPeers } from '@/lib/lords';
import LordsIndex from './LordsIndex';

// House of Lords (owner's yes, 3 Nov 2026): every current member, from the peers table (lib/peers.ts, kept current by
// /api/sync-peers, which refreshes this page when the list changes), filterable by party and type of peerage.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'House of Lords',
  description: 'Every member of the House of Lords: party, type of peerage and when they joined, with their posts, votes and written questions.',
  alternates: { canonical: '/lords' },
};

const INK = '#14100d';

export default async function LordsPage() {
  const peers = await currentPeers(supabase);
  return (
    <OpenGovShell pageStamp="House of Lords">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'House of Lords', path: '/lords' }])} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>House of Lords</h1>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 18px', maxWidth: '720px', lineHeight: 1.6 }}>
        The {peers.length.toLocaleString('en-GB')} current members of the House of Lords, from Parliament&rsquo;s records. Each page shows the
        member&rsquo;s party, type of peerage, posts held, votes since September 2024 and written questions.
      </p>
      <LordsIndex peers={peers} />
    </OpenGovShell>
  );
}
