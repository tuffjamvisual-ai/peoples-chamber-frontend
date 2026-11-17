import type { Metadata } from 'next';
import LordsListing from './LordsListing';

// House of Lords (owner's yes, 3 Nov 2026): every current member, from the peers table (lib/peers.ts, kept current by
// /api/sync-peers, which refreshes this page when the list changes), filterable by party and type of peerage.
// The list is a DataList (T1-GUARD, owner approved 13 Nov 2026): phones and tablets page it, page 2 onwards at
// /lords/page/<n> (F04 batch 2; an old ?page=N moves there, keeping ?party= and ?type=), so the page is static.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export const metadata: Metadata = {
  title: 'House of Lords',
  description: 'Every member of the House of Lords: party, type of peerage and when they joined, with their posts, votes and written questions.',
  alternates: { canonical: '/lords' },
};

export default function LordsPage() {
  return <LordsListing page={1} />;
}
