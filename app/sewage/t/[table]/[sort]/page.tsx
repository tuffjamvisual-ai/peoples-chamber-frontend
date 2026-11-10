// /sewage with another league table or sort order chosen, for phones with JavaScript off (UX2e, 10 Nov 2026): the phone
// selectors are a GET form (app/sewage/go). One cached page for each table and sort; the same page as /sewage, which is
// its canonical address, so it is not indexed.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SewageView from '../../../SewageView';
import { SEWAGE_TABLE_IDS, SORT_KEYS, type SortKey } from '../../../table-ids';

export const revalidate = 21600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SEWAGE_TABLE_IDS.flatMap((table) => SORT_KEYS.map((sort) => ({ table, sort })));
}

export const metadata: Metadata = {
  title: { absolute: 'Sewage spills by council, constituency and water company' },
  description:
    'How long storm overflows spilled sewage in every council area and constituency in England, Scotland and Northern Ireland, from water industry monitoring.',
  alternates: { canonical: '/sewage' },
  robots: { index: false, follow: true },
};

export default async function SewageTablePage({ params }: { params: Promise<{ table: string; sort: string }> }) {
  const { table, sort } = await params;
  if (!SEWAGE_TABLE_IDS.includes(table) || !(SORT_KEYS as string[]).includes(sort)) notFound();
  return <SewageView initialTable={table} initialSort={sort as SortKey} />;
}
