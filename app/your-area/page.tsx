// /your-area: everything Open Govt holds for one council area, reached from the homepage "Find your local council" search
// (a postcode, town or council). Councils only (owner, 11 Nov 2026, T1-MP: MPs are found through Search opengovt): no MP,
// constituency or petitions block.
//
// F04 batch 4 (A16, owner rule 15 Nov 2026): this page is the static prompt. A council's figures are on its own static page,
// /your-area/<GSS code> (AreaView.tsx); an old ?council= address is moved there by the proxy (308). A search sent without the
// page script (?q=, or ?lat=&lon=&place=) is rewritten to /your-area/find (next.config.ts), which looks it up and redirects.
// An old address's ?constituency= alone shows this prompt, as before.
import type { Metadata } from 'next';
import Shell, { para } from './Shell';

export const revalidate = false;

// The page itself is indexable (owner's brief, 3 Nov 2026: index, follow, canonical, in the sitemap); the result views
// (/your-area/<code>, /your-area/find) are noindex, follow.
export const metadata: Metadata = {
  title: 'Your area',
  description: 'Your council and the latest local figures for your area, from a postcode, town or council.',
  alternates: { canonical: '/your-area' },
  robots: { index: true, follow: true },
};

export default function YourAreaPage() {
  return (
    <Shell>
      <p style={para}>Enter a postcode, town or council to see your council and the latest figures for your area.</p>
    </Shell>
  );
}
