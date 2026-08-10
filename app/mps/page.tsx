import type { Metadata } from 'next';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MagazineMPsClient from './MagazineMPsClient';
import AllMpsIndex from './AllMpsIndex';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK MPs, Voting Records, Earnings & Registered Interests",
  description:
    "Profiles of all 650 UK Members of Parliament, voting records, parliamentary divisions, expenses, registered interests and contact details. Search by name, party or constituency.",
  alternates: { canonical: '/mps' },
};

export default async function MPsPage({
  searchParams,
}: {
  searchParams: Promise<{ expand?: string; page?: string }>;
}) {
  // Read ?expand server-side so client <Link>s that only change ?expand (the party
  // headers and the "All parties" back link) re-render the route in production.
  const sp = await searchParams;
  const expand = typeof sp.expand === 'string' && sp.expand.length > 0 ? sp.expand : null;

  const { data: rows, error } = await supabase
    .from('mps')
    .select('member_id, name, display_name, party, party_colour, constituency, photo_url')
    .eq('current_member', true)
    .order('name', { ascending: true });

  if (error) console.error('Error fetching MPs:', error);

  const mps = (rows || []).map((r) => ({
    member_id: r.member_id,
    name: r.display_name || r.name || '',
    party: r.party,
    party_colour: r.party_colour,
    constituency: r.constituency,
    photo_url: r.photo_url,
  }));

  return (
    <OpenGovShell pageStamp="MPs">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-9%', marginBottom: '14px', color: '#14100d', textDecoration: 'none', transform: 'rotate(-0.2deg)' }}
      />
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <MagazineMPsClient mps={mps} expand={expand} key={expand ?? 'all'} />
      </Suspense>
      {/* Visually hidden, but kept in the static HTML so every MP detail
          page is crawlable in a flat link list from /mps (in addition to
          the sitemap and the ?expand=<party> drilldown pages). Rendered
          off-screen rather than display:none so crawlers still see the
          links. Only on the unfiltered /mps URL. */}
      {expand === null && (
        <div
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          <AllMpsIndex />
        </div>
      )}
    </OpenGovShell>
  );
}
