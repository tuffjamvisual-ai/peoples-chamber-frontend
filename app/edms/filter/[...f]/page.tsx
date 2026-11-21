import type { Metadata } from 'next';
import { skipDataCache } from '@/lib/data-cache-skip';
import { notFound, permanentRedirect } from 'next/navigation';
import EdmsListing, { STEP } from '../../EdmsListing';
import { listChoices, listPath } from '@/lib/list-path';
import { allEdms } from '@/lib/edm-pages';
import { supabaseAdminRead } from '@/lib/supabase-admin';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

// /edms by state, prayer, sort, member, role and Show more (F04 batch 3, pattern P+): each variant static, built on its first
// visit and rebuilt only when the EDM tag is refreshed or on a deploy. Every value is checked, so the cache stays bounded:
// unknown keys or values 404; a member must be an MP we hold; role only with a member; show a multiple of 25 over 25 and at most
// the whole list rounded up to 25. Not indexed (as the filtered query addresses were).
export const dynamic = 'force-dynamic'; // ENTRY 487 (owner approved 21 Nov 2026): no saved copy (no ISR write); rendered on demand and held by Vercel's CDN for a day (next.config.ts headers)

export const metadata: Metadata = {
  title: 'Early day motions in the Commons',
  description: 'Every early day motion tabled in the House of Commons since the July 2024 general election, with its text, sponsors, signatures and amendments.',
  alternates: { canonical: '/edms' },
  robots: { index: false, follow: true },
};

export default async function EdmsFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  skipDataCache(); // ENTRY 487: this request's per record reads are not written to the data cache
  const { f } = await params;
  const c = listChoices('/edms', f);
  if (!c) notFound();
  if (c.state && c.state !== 'open' && c.state !== 'closed') notFound();
  if (c.prayer && c.prayer !== '1') notFound();
  if (c.sort && c.sort !== 'signatures') notFound();
  if (c.role && ((c.role !== 'tabled' && c.role !== 'signed') || !c.member)) notFound();
  if (c.member) {
    if (!/^\d{1,7}$/.test(c.member)) notFound();
    // The same read (and cache entry) as the listing's member name.
    const { data } = await cachedQuery(['q:app/edms/page.tsx:65196be815', JSON.stringify([Number(c.member)])], tableTags('mps'), () => supabaseAdminRead.from('mps').select('display_name, name').eq('member_id', Number(c.member)).maybeSingle());
    if (!data) notFound();
  }
  if (c.show) {
    // A count that is not a multiple of 25 (no site link makes one) rounds up to the next step, as T2's plan says.
    const n = Math.ceil(Number(c.show) / STEP) * STEP;
    const { rows } = await allEdms();
    if (n > Math.ceil(rows.length / STEP) * STEP) notFound();
    if (n <= STEP) delete c.show; else c.show = String(n);
  }
  const canon = listPath('/edms', c);
  if (canon !== `/edms/filter/${f.join('/')}`) permanentRedirect(canon);
  return <EdmsListing s={c} />;
}
