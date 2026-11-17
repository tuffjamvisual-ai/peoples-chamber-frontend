import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { currentPeers } from '@/lib/lords';
import LordsIndex, { LordsIndexView } from './LordsIndex';
import BackLink from '@/app/components/BackLink';

const INK = '#14100d';

// The /lords body for one page of the DataList (F04 batch 2, T2's f04-32-routes.md 8): /lords is page 1, /lords/page/<n> the
// rest. Party and type are read in the browser inside Suspense, whose fallback is the unfiltered list, so both are static.
export default async function LordsListing({ page }: { page: number }) {
  const peers = await currentPeers(supabase); // F04 batch 1: cachedQuery keeps it under the peers tag; no hourly fetch timer
  return (
    <OpenGovShell>
      <BackLink fallbackHref="/" />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'House of Lords', path: '/lords' }])} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>House of Lords</h1>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 18px', maxWidth: '720px', lineHeight: 1.6 }}>
        The {peers.length.toLocaleString('en-GB')} current members of the House of Lords, from Parliament&rsquo;s records. Each page shows the
        member&rsquo;s party, type of peerage, posts held, votes since September 2024 and written questions.
      </p>
      <Suspense fallback={<LordsIndexView peers={peers} page={page} />}><LordsIndex peers={peers} page={page} /></Suspense>
    </OpenGovShell>
  );
}
