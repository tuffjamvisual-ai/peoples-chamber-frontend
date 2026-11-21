import type { Metadata } from 'next';
import { skipDataCache } from '@/lib/data-cache-skip';
import { notFound, permanentRedirect } from 'next/navigation';
import PmqsBody, { PMQS_META } from '../../PmqsBody';
import { pmqsModel } from '../../EverySession';
import { pmqsSet } from '@/lib/pmqs';
import { listChoices, listPath } from '@/lib/list-path';

// /pmqs by Prime Minister, year and page (F04 batch 3, pattern P+): each variant static, built on its first visit and rebuilt
// only when its tags are refreshed or on a deploy. A Prime Minister or year the list does not know, or a page past the end,
// is 404 (the page itself ignores them), so the cache holds a bounded set of pages. Not indexed.
export const dynamic = 'force-dynamic'; // ENTRY 487 (owner approved 21 Nov 2026): no saved copy (no ISR write); rendered on demand and held by Vercel's CDN for a day (next.config.ts headers)

export const metadata: Metadata = { ...PMQS_META, robots: { index: false, follow: true } };

export default async function PmqsFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  skipDataCache(); // ENTRY 487: this request's per record reads are not written to the data cache
  const { f } = await params;
  const c = listChoices('/pmqs', f);
  if (!c || !(await pmqsModel(await pmqsSet(), c)).valid) notFound();
  const canon = listPath('/pmqs', c);
  if (canon !== `/pmqs/filter/${f.join('/')}`) permanentRedirect(canon);
  return <PmqsBody filters={c} />;
}
