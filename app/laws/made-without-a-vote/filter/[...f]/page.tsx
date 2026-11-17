import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PROCEDURE_MEANING } from '@/lib/parliament-si-treaties';
import { siDepartments, type SiFlag } from '@/lib/si-treaties-data';
import { listChoices, listPath, slug } from '@/lib/list-path';
import MadeWithoutAVoteListing, { FLAGS, MWV_METADATA } from '../../MadeWithoutAVoteListing';

// /laws/made-without-a-vote/filter/<key>/<value>/...: one department, procedure, flag and page (F04 batch 2, T2's
// f04-32-routes.md 7), keys in that fixed order. Every value is checked against its known list and anything else is a 404,
// so the cache holds a bounded set of pages; an address not in its canonical form moves to it.
export const revalidate = false; // A16: rebuilt only when the SI tables' tags are refreshed, or on a deploy
export function generateStaticParams() { return []; }

export const metadata: Metadata = MWV_METADATA;

const BASE = '/laws/made-without-a-vote';

export default async function MadeWithoutAVoteFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params;
  const c = listChoices(BASE, f);
  if (!c) notFound();
  const department = c.department ? (await siDepartments()).find((d) => slug(d) === c.department) : undefined;
  const procedure = c.procedure ? Object.keys(PROCEDURE_MEANING).find((p) => slug(p) === c.procedure) : undefined;
  const flag = c.flag ? FLAGS.find((x) => x.key === c.flag)?.key : undefined;
  if ((c.department && !department) || (c.procedure && !procedure) || (c.flag && !flag)) notFound();
  const page = c.page ? Number(c.page) : 1;
  const canonical = listPath(BASE, { department, procedure, flag, page: String(page) });
  if (canonical !== `${BASE}/filter/${f.join('/')}`) permanentRedirect(canonical);
  return <MadeWithoutAVoteListing department={department} procedure={procedure} flag={flag as SiFlag | undefined} page={page} />;
}
