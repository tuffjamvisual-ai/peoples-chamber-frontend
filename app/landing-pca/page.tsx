import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import MpDossier from '../mps/[id]/MpDossier';
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  SALARY_BAND_LABEL,
  type SalaryBand,
} from '@/lib/ministerial-salaries';
import { normaliseParty, isCoop, partyColourForMember } from '@/lib/party-helpers';

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 };

export const metadata: Metadata = {
  title: "The People's Chamber",
  robots: { index: false, follow: false },
};

// ISR — render once, serve cached for 6h.
export const revalidate = 21600;

// Demo of the dossier profile template (Charlie Dewhirst, member 5169). The live profile
// pages at /mps/[id] render the same shared <MpDossier> with each MP's own data.
export default async function LandingPcaPage() {
  const memberId = 5169;
  const [
    mpRes, contactRes, bioRes, sponsoredBillsRes, votesRes, interestsRes,
    expensesRes, expensesDetailRes, ministerialRowsRes, outsideRowRes, siDivisionsRes,
  ] = await Promise.all([
    supabase.from('mps').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_contact').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_biography').select('*').eq('member_id', memberId).single(),
    supabase.from('bill').select('id, title, status, current_stage, plain_summary, is_act, last_update').eq('sponsor_member_id', memberId).order('created_at', { ascending: false }),
    supabase.from('mp_division_votes').select('id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id').eq('member_id', memberId).order('division_date', { ascending: false }).range(0, 199),
    supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).order('category_sort_order', { ascending: true }),
    supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false }),
    supabase.from('mp_expenses_detail').select('claim_number, year, claim_date, category, cost_type, short_description, amount_paid, status').eq('member_id', memberId).order('claim_date', { ascending: false }).range(0, 49),
    supabase.from('dept_ministers').select('salary_band').eq('member_id', memberId).not('salary_band', 'is', null),
    supabase.from('mp_outside_earnings_summary').select('total_extracted, claim_count, source_count').eq('member_id', memberId).maybeSingle(),
    supabase.from('statutory_instrument').select('division_id'),
  ]);
  const mp = mpRes.data;
  const siDivisionIds = new Set<number>((siDivisionsRes.data || []).map((r: { division_id: number }) => r.division_id));
  const votesWithSi = (votesRes.data || []).map((v) => ({ ...v, is_si: v.division_id != null && siDivisionIds.has(v.division_id) }));
  let highestBand: SalaryBand | null = null;
  for (const r of ministerialRowsRes.data || []) {
    const b = r.salary_band as SalaryBand | null;
    if (b && (!highestBand || BAND_RANK[b] > BAND_RANK[highestBand])) highestBand = b;
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
  const bioParas = (bioRes.data?.political_bio ?? '').split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);

  const fullName = mp?.display_name || mp?.name || '';
  const partyColour = partyColourForMember(mp?.party, mp?.party_colour);
  const partyDisplay = normaliseParty(mp?.party);
  const partyIsCoop = isCoop(mp?.party);

  return (
    <MpDossier
      memberId={memberId}
      fullName={fullName}
      constituency={mp?.constituency ?? null}
      partyDisplay={partyDisplay}
      partyExpand={partyDisplay || mp?.party || ''}
      partyColour={partyColour}
      partyIsCoop={partyIsCoop}
      photoUrl={mp?.photo_url ?? null}
      glance={{
        party: mp?.party ?? '',
        startDate: mp?.start_date ?? null,
        gender: mp?.gender ?? null,
        votes: votesWithSi,
        interestsCount: (interestsRes.data || []).length,
        sponsoredBillsCount: (sponsoredBillsRes.data || []).length,
      }}
      sections={{
        memberId,
        paragraphs: bioParas,
        contact: {
          phone:         contactRes.data?.phone         ?? mp?.phone         ?? null,
          email:         contactRes.data?.email         ?? mp?.email         ?? null,
          website:       contactRes.data?.website       ?? mp?.website       ?? null,
          twitter:       contactRes.data?.twitter       ?? mp?.twitter       ?? null,
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
