import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import MemberDetail, { memberMetadata } from '../../../../_lib/MemberDetail';

// /second-jobs/<party>/<id>/page/<n>: page 2 onwards of an MP's roles list on phones and tablets (F04 batch 2), built on
// first visit and rebuilt by the tags of its reads. Page 1 is the MP's address. The canonical stays the MP's address.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

type Params = { slug: string; memberId: string; page: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, memberId } = await params;
  return memberMetadata(slug, memberId);
}

export default async function MpSecondJobsDetailN({ params }: { params: Promise<Params> }) {
  const { slug, memberId, page } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(page)) notFound();
  const n = Number(page);
  if (n === 1) permanentRedirect(`/second-jobs/${slug}/${Number(memberId)}`);
  return <MemberDetail slug={slug} memberId={memberId} page={n} />;
}
