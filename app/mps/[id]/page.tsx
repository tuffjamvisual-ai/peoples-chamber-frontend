import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MpDossier from './MpDossier';
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  SALARY_BAND_LABEL,
  type SalaryBand,
} from '@/lib/ministerial-salaries';
import { normaliseParty, isCoop, partyColourForMember } from '@/lib/party-helpers';

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 };

// 6-hour ISR. Cabinet pages prerender at build (see generateStaticParams);
// the other ~570 MPs render on first request and then cache at the edge
// for 6 hours before background revalidation.
export const revalidate = 21600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Cabinet-only prerender. Prerendering all 650 MPs saturated Vercel's
// 3-worker build (Supabase code 57014 statement timeouts). Prerendering
// only the ~80 distinct member_ids that hold a ministerial post keeps
// the build well within budget and ensures every Cabinet / Secretary
// of State / Minister of State / PUSS page is instant on first hit.
// dynamicParams defaults to true so every other MP renders on demand
// and caches via revalidate.
// Prerender only the top-tier cabinet (Secretaries of State + PM-band)
// — capped at the most senior 20 MPs to keep the Vercel build well
// under its 3-worker × 60s/page budget. Every other MP renders on
// demand and is cached at the edge via revalidate. The cap was chosen
// after 80-page prerenders saturated Supabase concurrently.
const PRERENDER_CAP = 20;

export async function generateStaticParams() {
  try {
    const { data } = await supabase
      .from('dept_ministers')
      .select('member_id, salary_band')
      .not('member_id', 'is', null)
      .in('salary_band', ['pm', 'sos'])
      .order('salary_band', { ascending: true });
    const ids = Array.from(new Set((data || []).map((m: { member_id: number }) => m.member_id)));
    return ids.slice(0, PRERENDER_CAP).map((id) => ({ id: String(id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  const { data: mp } = await supabase
    .from('mps')
    .select('name, display_name, constituency, party')
    .eq('member_id', memberId)
    .single();
  if (!mp) return { title: 'MP profile' };
  const name = mp.display_name || mp.name;
  const subtitle = [normaliseParty(mp.party), mp.constituency].filter(Boolean).join(' · ');
  return {
    title: name,
    description: `${name}${subtitle ? ` — ${subtitle}.` : '.'} Voting record, registered interests, sponsored bills and contact details.`,
    alternates: { canonical: `/mps/${memberId}` },
  };
}

export default async function MPMagazineProfile({ params }: PageProps) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) notFound();

  // All 10 fetches in one parallel round-trip. The mp lookup was previously
  // awaited before this block, costing an extra serial round-trip on every
  // cold render. The notFound() check happens after — for valid member_ids
  // we save ~200-400ms; for invalid ones, the wasted concurrent queries
  // are negligible (notFound() short-circuits the render).
  const [
    mpRes,
    contactRes,
    bioRes,
    sponsoredBillsRes,
    votesRes,
    interestsRes,
    expensesRes,
    expensesDetailRes,
    ministerialRowsRes,
    outsideRowRes,
    siDivisionsRes,
  ] = await Promise.all([
    supabase.from('mps').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_contact').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_biography').select('*').eq('member_id', memberId).single(),
    supabase
      .from('bill')
      .select('id, title, status, current_stage, plain_summary, is_act, last_update')
      .eq('sponsor_member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('mp_division_votes')
      .select('id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id')
      .eq('member_id', memberId)
      .order('division_date', { ascending: false })
      .range(0, 199),
    supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).order('category_sort_order', { ascending: true }),
    supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false }),
    // Most-recent 50 claims — UI shows them on the expanded Expenses
    // year drilldown only. Cuts the heaviest query 4× (was .range(0, 199)
    // returning ~75 KB) without hurting first-paint UX.
    supabase
      .from('mp_expenses_detail')
      .select('claim_number, year, claim_date, category, cost_type, short_description, amount_paid, status')
      .eq('member_id', memberId)
      .order('claim_date', { ascending: false })
      .range(0, 49),
    supabase.from('dept_ministers').select('salary_band').eq('member_id', memberId).not('salary_band', 'is', null),
    supabase.from('mp_outside_earnings_summary').select('total_extracted, claim_count, source_count').eq('member_id', memberId).maybeSingle(),
    // Which division_ids are statutory instruments — lets the voting-record
    // render deep-link to /statutory-instruments/[division_id] instead of the
    // external Commons Votes site. Cheap single-column read; folded into the
    // parallel batch to avoid a serial round-trip on the cold render.
    supabase.from('statutory_instrument').select('division_id'),
  ]);
  const mp = mpRes.data;
  if (!mp) notFound();

  // Tag each vote whose division is a statutory instrument so the render can
  // pick the SI deep-link branch over the external Commons Votes fallback.
  const siDivisionIds = new Set<number>(
    (siDivisionsRes.data || []).map((r: { division_id: number }) => r.division_id),
  );
  const votesWithSi = (votesRes.data || []).map((v) => ({
    ...v,
    is_si: v.division_id != null && siDivisionIds.has(v.division_id),
  }));

  let highestBand: SalaryBand | null = null;
  for (const r of ministerialRowsRes.data || []) {
    const b = r.salary_band as SalaryBand | null;
    if (!b) continue;
    if (!highestBand || BAND_RANK[b] > BAND_RANK[highestBand]) highestBand = b;
  }

  const ministerialAmount = highestBand ? MINISTERIAL_SUPPLEMENT[highestBand] : 0;
  const outsideAmount = outsideRowRes.data?.total_extracted ? Number(outsideRowRes.data.total_extracted) : 0;
  const latestExpense = (expensesRes.data && expensesRes.data[0]) || null;
  const earnings = {
    base: MP_BASE_SALARY_2026,
    band: highestBand,
    band_label: highestBand ? SALARY_BAND_LABEL[highestBand] : null,
    ministerial: ministerialAmount,
    outside: outsideAmount,
    outside_claim_count: outsideRowRes.data?.claim_count || 0,
    outside_source_count: outsideRowRes.data?.source_count || 0,
    personal_total: MP_BASE_SALARY_2026 + ministerialAmount + outsideAmount,
    public_spend: latestExpense?.total_spend ? Number(latestExpense.total_spend) : 0,
    public_spend_year: latestExpense?.year || null,
  };

  const fullName = mp.display_name || mp.name || '';
  const partyColour = partyColourForMember(mp.party, mp.party_colour);
  const partyDisplay = normaliseParty(mp.party);
  const partyIsCoop = isCoop(mp.party);

  return (
    <MpDossier
      memberId={memberId}
      fullName={fullName}
      constituency={mp.constituency ?? null}
      partyDisplay={partyDisplay}
      partyExpand={partyDisplay || mp.party || ''}
      partyColour={partyColour}
      partyIsCoop={partyIsCoop}
      photoUrl={mp.photo_url ?? null}
      sections={{
        memberId,
        paragraphs: (bioRes.data?.political_bio ?? '').split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0),
        contact: {
          // Prefer mp_contact, fall back to fields on the mps row.
          phone:         contactRes.data?.phone         ?? mp.phone         ?? null,
          email:         contactRes.data?.email         ?? mp.email         ?? null,
          website:       contactRes.data?.website       ?? mp.website       ?? null,
          twitter:       contactRes.data?.twitter       ?? mp.twitter       ?? null,
          address_line1: contactRes.data?.address_line1 ?? null,
          postcode:      contactRes.data?.postcode      ?? null,
        },
        votes: votesWithSi,
        sponsoredBills: sponsoredBillsRes.data || [],
        interests: interestsRes.data || [],
        bio: bioRes.data,
        earnings,
        expenses: expensesRes.data || [],
        expensesDetail: expensesDetailRes.data || [],
      }}
    />
  );
}
