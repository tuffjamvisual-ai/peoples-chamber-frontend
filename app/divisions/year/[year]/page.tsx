import type { Metadata } from 'next';
import YearListing, { yearMetadata } from '../YearListing';

// /divisions/year/<yyyy> (owner, 31 Oct 2026): every Commons division in one year, newest first, 100 a page, as plain
// links, so each division page is two clicks from /divisions (Search Console: most division pages were found only in
// the sitemap). /divisions/[slug] takes one path segment, so this two-segment route does not clash with it. A year
// with no divisions, or not a four digit year, is a 404. Each page names itself canonical.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
// Page 2 onwards is /divisions/year/<yyyy>/page/<n> (F04 batch 2); an old ?page=N moves there (proxy.ts, lib/list-path.ts).
export function generateStaticParams() { return []; }

type Params = { year: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return yearMetadata((await params).year, 1);
}

export default async function DivisionYearPage({ params }: { params: Promise<Params> }) {
  return <YearListing rawYear={(await params).year} page={1} />;
}
