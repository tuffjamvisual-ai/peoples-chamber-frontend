// One council area on /your-area (F04 batch 4): /your-area/<GSS code>, the address the area search sends readers to
// (was /your-area?council=<code>, which the proxy now moves here). Static, built on first visit and kept until the council
// data's tags change (A16, owner rule 15 Nov 2026). Not indexed; the canonical is /your-area, as for the old result views.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AreaView, { councilByCode } from '../AreaView';

export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Your area',
  description: 'Your council and the latest local figures for your area, from a postcode, town or council.',
  alternates: { canonical: '/your-area' },
  robots: { index: false, follow: true },
};

export default async function YourAreaCouncil({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // 404 for a code that is not a council we hold, so a made-up code is never kept as a page (T2 review, 17 Nov 2026).
  if (!/^[ENSW]\d{8}$/.test(code) || !(await councilByCode(code))) notFound();
  return <AreaView councilCode={code} />;
}
