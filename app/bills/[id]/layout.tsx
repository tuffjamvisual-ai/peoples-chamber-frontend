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
    .select(
      // Single string literal — Supabase's compile-time type inference
      // can't parse a runtime-concatenated select, and falls back to
      // GenericStringError, which then trips every bill.* access below.
      'title, long_title, current_stage, plain_summary, is_act, is_defeated, bill_withdrawn, commons_division_id, commons_ayes, commons_noes, sponsor_name, sponsors'
    )
    .eq('id', billId)
    .single();
  if (!bill) return { title: 'Bill' };
  const title = bill.title || bill.long_title || `Bill ${billId}`;

  // First sentence of the AI summary, capped at ~130 chars so we have
  // room for a status fragment + sponsor name. Tackles Soft 404 (each
  // bill gets a unique snippet) and Duplicate without canonical (same-
  // titled siblings now diverge because their division / stage /
  // sponsor differ). GSC 2026-06-04.
  const summary = (bill.plain_summary || '').replace(/\s+/g, ' ').trim();
  let lead = '';
  if (summary) {
    const period = summary.indexOf('.');
    lead = period > 0 ? summary.slice(0, period + 1) : summary;
    if (lead.length > 130) {
      const cut = lead.slice(0, 127);
      const back = cut.lastIndexOf(' ');
      lead = (back > 100 ? cut.slice(0, back) : cut) + '…';
    }
  }

  // Status precedence: is_act > withdrawn > defeated > division > stage.
  // 'Now an Act of Parliament' wins over the division count even when
  // both are present — the outcome is the headline signal; the vote
  // count is secondary information available on the page itself.
  const status = bill.is_act
    ? 'Now an Act of Parliament.'
    : bill.bill_withdrawn
    ? 'Withdrawn before becoming law.'
    : bill.is_defeated
    ? 'Defeated.'
    : bill.commons_division_id != null
    ? `MPs voted ${bill.commons_ayes ?? 0}–${bill.commons_noes ?? 0}.`
    : bill.current_stage
    ? `Currently at ${bill.current_stage}.`
    : '';

  type SponsorList = { items?: { name?: string }[] } | null;
  const sponsorName =
    (bill.sponsors as SponsorList)?.items?.[0]?.name || bill.sponsor_name || '';

  let description = '';
  if (lead) description = lead;
  if (status) description = description ? `${description} ${status}` : status;
  if (sponsorName)
    description = description
      ? `${description} Sponsored by ${sponsorName}.`
      : `Sponsored by ${sponsorName}.`;
  if (!description)
    description = `${title} — UK Parliament bill summary, voting record and how the public would vote.`;
  if (description.length > 200)
    description = description.slice(0, 197).trimEnd() + '…';

  return {
    title,
    description,
    alternates: { canonical: `/bills/${billId}` },
  };
}

export default function BillIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
