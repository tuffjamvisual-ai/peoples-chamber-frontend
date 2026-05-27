import type { Metadata } from 'next';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MagazineMPsClient from './MagazineMPsClient';
import DossierShell from '../components/DossierShell';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'MPs',
  description:
    'Search and explore profiles of all 650 current Members of Parliament including voting records, financial interests and contact details.',
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
    <DossierShell>
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <MagazineMPsClient mps={mps} expand={expand} key={expand ?? 'all'} />
      </Suspense>
    </DossierShell>
  );
}
