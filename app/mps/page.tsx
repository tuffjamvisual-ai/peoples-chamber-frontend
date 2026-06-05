import type { Metadata } from 'next';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MagazineMPsClient from './MagazineMPsClient';
import DossierShell from '../components/DossierShell';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK MPs — Voting Records, Earnings & Registered Interests | The People's Chamber",
  description:
    "Profiles of all 650 UK Members of Parliament — voting records, parliamentary divisions, expenses, registered interests and contact details. Search by name, party or constituency.",
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
