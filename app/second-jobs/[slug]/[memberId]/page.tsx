import type { Metadata } from 'next';
import MemberDetail, { memberMetadata } from '../../_lib/MemberDetail';

// /second-jobs/[slug]/[memberId]: one MP's second jobs (body in app/second-jobs/_lib/MemberDetail.tsx). Static (F04 batch 2):
// the roles list's page 2 onwards is /second-jobs/<party>/<id>/page/<n>, and an old ?page=N moves there (proxy.ts). The
// hotfix of 14 Nov 2026 (ENTRY 15) took generateStaticParams out only because the page then read ?page=; it reads nothing
// from the address now.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

type Params = { slug: string; memberId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, memberId } = await params;
  return memberMetadata(slug, memberId);
}

export default async function MpSecondJobsDetail({ params }: { params: Promise<Params> }) {
  const { slug, memberId } = await params;
  return <MemberDetail slug={slug} memberId={memberId} page={1} />;
}
