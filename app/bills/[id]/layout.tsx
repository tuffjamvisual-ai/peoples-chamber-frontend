import { billSummary } from '@/lib/bill-summary';
import type { Metadata } from 'next';
import { fitTitle, titleWithin } from '@/lib/seo-title';
import { asSentence, ledBy, sentencesOf } from '@/lib/meta-description';
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

  type SponsorList = { items?: { name?: string }[] } | null;
  const sponsorName =
    (bill.sponsors as SponsorList)?.items?.[0]?.name || bill.sponsor_name || '';

  // Session (28 Oct 2026, Search Console): bills reintroduced under the same name in another session were read by Google
  // as copies of each other, so each description names its session.
  let sessionName: string | null = null;
  if (bill.introduced_session_id != null) {
    const { data: sess, error: sessErr } = await supabase.from('parliament_sessions').select('name').eq('id', bill.introduced_session_id).maybeSingle();
    if (sessErr) throw new Error(`/bills/[id] parliament_sessions: ${sessErr.message}`);
    sessionName = (sess?.name as string | null) || null;
  }
  const stageDay = bill.stage_date ? new Date(bill.stage_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

  // Description in whole sentences within 160 characters (owner, 7 Nov 2026, L7), led by where the bill stands, from
  // Parliament's record: an Act, withdrawn, defeated, or its latest stage and date. Then its session, the Commons vote,
  // its sponsor and the first sentence of Parliament's summary, each only where it still fits. The bill's name is never
  // shortened: a name too long for any lead is given alone.
  const the = /^the /i.test(title) ? title : `the ${title}`;
  const The = the.charAt(0).toUpperCase() + the.slice(1);
  const summaryFirst = sentencesOf(billSummary(bill))[0];
  const description = ledBy(title, [
    bill.is_act ? `${The} became an Act of Parliament${bill.current_stage === 'Royal Assent' && stageDay ? ` on ${stageDay}` : ''}.`
      : bill.bill_withdrawn ? `${The} was withdrawn before becoming law.`
      : bill.is_defeated ? `${The} was defeated.`
      : bill.current_stage ? `The latest stage of ${the} was ${bill.current_stage}${stageDay ? `, on ${stageDay}` : ''}.`
      : null,
    `${asSentence(The)}`,
  ], [
    sessionName && `It was introduced in the ${sessionName} session.`,
    bill.commons_division_id != null && `In its Commons division, MPs voted ${bill.commons_ayes ?? 0} to ${bill.commons_noes ?? 0}.`,
    sponsorName && `Its sponsor is ${sponsorName}.`,
    summaryFirst,
  ]);

  // Two bills of one name in one session (Data Protection and Digital Information Bill, 2022-23) add the sponsor, as we hold no
  // bill number from Parliament, so no two pages share a title (owner, 7 Nov 2026).
  let sponsorTag = '';
  if (sponsorName && bill.introduced_session_id != null) {
    const { count: sameName, error: sameErr } = await supabase.from('bill').select('id', { count: 'exact', head: true })
      .eq('title', bill.title).eq('introduced_session_id', bill.introduced_session_id).is('hidden_reason', null).neq('id', billId);
    if (sameErr) throw new Error(`/bills/[id] same name: ${sameErr.message}`);
    if ((sameName ?? 0) > 0) sponsorTag = ` (${sponsorName})`;
  }

  return {
    title: sessionName
      ? (sponsorTag ? titleWithin(`${title}, ${sessionName}${sponsorTag}`) : fitTitle(`${title}, ${sessionName} session`, `${title}, ${sessionName}`))
      : titleWithin(`${title}${sponsorTag}`),
    description,
    alternates: { canonical: `/bills/${billId}` },
  };
}

export default function BillIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
