import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const billId = parseInt(id);
  if (Number.isNaN(billId)) return { title: 'Bill' };
  const { data: bill } = await supabase
    .from('bill')
    .select('title, long_title, current_stage')
    .eq('id', billId)
    .single();
  if (!bill) return { title: 'Bill' };
  const title = bill.title || bill.long_title || `Bill ${billId}`;
  const stagePart = bill.current_stage ? ` Currently at ${bill.current_stage}.` : '';
  return {
    title,
    description: `${title} — UK Parliament bill summary, voting record and how the public would vote.${stagePart}`,
    alternates: { canonical: `/bills/${billId}` },
  };
}

export default function BillIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
