import type { Metadata } from 'next';
import DivisionsListing from './DivisionsListing';

// Browsable index of Commons divisions (recorded votes), newest first. Each
// links to the in-house division page. Data we already hold in mp_division_votes
// (surfaced one row per division via commons_divisions_fts, the materialized copy of
// the commons_divisions_titled view: the live view re-aggregates ~1.14M vote rows and
// exceeds the anon role's 3-second statement timeout. refresh_sitemap_views(), called
// after every votes sync, refreshes the copy).
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

// Each list page names itself canonical (owner, 31 Oct 2026); pages 2 onwards are /divisions/page/<n> (F04 batch 2), and an
// old /divisions?page=N moves there (proxy.ts, lib/list-path.ts).
export const metadata: Metadata = {
  title: 'Commons Divisions',
  description: 'Recorded votes in the House of Commons back to October 2004, with how the House divided on each.',
  alternates: { canonical: '/divisions' },
};

export default function DivisionsIndexPage() {
  return <DivisionsListing pageNum={1} />;
}
