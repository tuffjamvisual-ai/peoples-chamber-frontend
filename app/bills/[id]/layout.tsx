import { billSummary } from '@/lib/bill-summary';
import type { Metadata } from 'next';
import { fitTitle } from '@/lib/seo-title';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const billId = parseInt(id);
  if (Number.isNaN(billId)) return { title: 'Bill' };
  const { data: bill, error: billErr } = await supabase
    .from('bill')
    .select(
      // Single string literal — Supabase's compile-time type inference
      // can't parse a runtime-concatenated select, and falls back to
      // GenericStringError, which then trips every bill.* access below.
      'title, long_title, description, current_stage, stage_date, introduced_session_id, is_act, is_defeated, bill_withdrawn, commons_division_id, commons_ayes, commons_noes, sponsor_name, sponsors, hidden_reason'
    )
    .eq('id', billId)
    .single();
  if (billErr && billErr.code !== 'PGRST116') throw new Error(`/bills/[id] bill: ${billErr.message}`);
  if (!bill) return { title: 'Bill' };
  if (bill.hidden_reason) return { title: 'Bill not found', robots: { index: false, follow: false } };
  const title = bill.title || bill.long_title || `Bill ${billId}`;

  // First sentence of Parliament's summary, capped at ~130 chars so we have
  // room for a status fragment + sponsor name. Tackles Soft 404 (each
  // bill gets a unique snippet) and Duplicate without canonical (same-
  // titled siblings now diverge because their division / stage /
  // sponsor differ). GSC 2026-06-04.
  const summary = billSummary(bill);
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
    ? `MPs voted ${bill.commons_ayes ?? 0}-${bill.commons_noes ?? 0}.`
    : bill.current_stage
    ? `Currently at ${bill.current_stage}.`
    : '';

  type SponsorList = { items?: { name?: string }[] } | null;
  const sponsorName =
    (bill.sponsors as SponsorList)?.items?.[0]?.name || bill.sponsor_name || '';

  // Session and last stage date (28 Oct 2026, Search Console): bills reintroduced under the same name in another
  // session (European Union (Referendum) Bill 2014-15, European Union Referendum Bill 2017-19) were read by Google
  // as copies of each other, so each title names its session and each description its session and dates.
  let sessionName: string | null = null;
  if (bill.introduced_session_id != null) {
    const { data: sess, error: sessErr } = await supabase.from('parliament_sessions').select('name').eq('id', bill.introduced_session_id).maybeSingle();
    if (sessErr) throw new Error(`/bills/[id] parliament_sessions: ${sessErr.message}`);
    sessionName = (sess?.name as string | null) || null;
  }
  const stageDay = bill.stage_date ? new Date(bill.stage_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  const when = [sessionName ? `Introduced in the ${sessionName} session` : null, stageDay ? `last stage ${stageDay}` : null].filter(Boolean).join('; ');
  const tail = [status, sponsorName ? `Sponsored by ${sponsorName}.` : '', when ? `${when}.` : ''].filter(Boolean).join(' ');

  // The summary's first sentence is shortened first, so the session and dates always fit in 200 characters.
  let description = [lead, tail].filter(Boolean).join(' ');
  if (description.length > 200 && lead) {
    const room = 200 - tail.length - 2;
    description = room > 40 ? `${lead.slice(0, room).replace(/\s+\S*$/, '')}… ${tail}` : tail;
  }
  if (!description)
    description = `${title}, UK Parliament bill summary, voting record and how the public would vote.`;
  if (description.length > 200)
    description = description.slice(0, 197).trimEnd() + '…';

  return {
    title: sessionName ? fitTitle(`${title}, ${sessionName} session`, `${title}, ${sessionName}`) : title,
    description,
    alternates: { canonical: `/bills/${billId}` },
  };
}

export default function BillIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
