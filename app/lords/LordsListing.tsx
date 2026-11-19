import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import Link from 'next/link';
import MoreChain from '../components/MoreChain';
import { currentPeers, formerPeersWithPages } from '@/lib/lords';
import LordsIndex, { LordsIndexView } from './LordsIndex';
import BackLink from '@/app/components/BackLink';
import { notFound } from 'next/navigation';
import { DATALIST_PER_PAGE } from '@/app/components/DataList';

const INK = '#14100d';

// The /lords body for one page of the DataList (F04 batch 2, T2's f04-32-routes.md 8): /lords is page 1, /lords/page/<n> the
// rest. Party and type are read in the browser inside Suspense, whose fallback is the unfiltered list, so both are static.
export default async function LordsListing({ page }: { page: number }) {
  const peers = await currentPeers(supabase); // F04 batch 1: cachedQuery keeps it under the peers tag; no hourly fetch timer
  // A page past the end of the whole list is a 404, as /bills does (Search Console, Cowork ENTRY 364: /lords/page/9999 was 200).
  if (page > Math.max(1, Math.ceil(peers.length / DATALIST_PER_PAGE))) notFound();
  // Cowork ENTRY 367 item 6: the former members who have a page (left on or after 4 July 2024, lib/peers.ts peerHasPage),
  // each linked, in a MoreChain after the current members: 3 then 'Show 10 more' on phones and tablets, whole from 1,024px.
  // A failed read leaves the list out rather than failing the page.
  const former = await formerPeersWithPages(supabase).catch((e) => { console.error('/lords former members:', e instanceof Error ? e.message : String(e)); return []; });
  const left = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
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
      {former.length > 0 && (
        <section aria-labelledby="lords-former" style={{ color: INK, marginTop: '32px' }}>
          <h2 id="lords-former" style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px' }}>Former members since 4 July 2024</h2>
          <p style={{ fontSize: '15px', margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.6 }}>
            {former.length.toLocaleString('en-GB')} member{former.length === 1 ? '' : 's'} who left the House of Lords on or after the 4 July 2024 general election.
          </p>
          <MoreChain style={{ fontSize: '15px' }} items={former.map((p) => (
            <li key={p.member_id} style={{ padding: '7px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)', display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Link href={`/lords/${p.member_id}`} style={{ color: '#7a1612', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name_display}</Link>
              <span>{[p.party, p.end_date ? `left ${left(p.end_date)}` : ''].filter(Boolean).join(' · ')}</span>
            </li>
          ))} />
        </section>
      )}
    </OpenGovShell>
  );
}
