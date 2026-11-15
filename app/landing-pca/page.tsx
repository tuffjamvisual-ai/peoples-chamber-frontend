import { notFound } from 'next/navigation';
import { SHOW_DEMO_PAGES, HIDDEN_PAGE_METADATA } from '@/lib/feature-flags';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { getMpBiography } from '@/lib/mp-biography';
import MpDossier from '../mps/[id]/MpDossier';
import { mpPay } from '@/lib/ministerial-salaries';
import { normaliseParty, isCoop, partyColourForMember } from '@/lib/party-helpers';
import { displayMpName } from '@/lib/mp-name';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';


const PAGE_METADATA: Metadata = {
  title: "opengovt",
  robots: { index: false, follow: false },
};
// While hidden, the page says what a missing page says (not-found title, noindex), not its own title.
export async function generateMetadata(): Promise<Metadata> {
  return SHOW_DEMO_PAGES ? PAGE_METADATA : HIDDEN_PAGE_METADATA;
}

// ISR — render once, serve cached for 6h.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

// Demo of the dossier profile template (Charlie Dewhirst, member 5169). The live profile
// pages at /mps/[id] render the same shared <MpDossier> with each MP's own data.
export default async function LandingPcaPage() {
  if (!SHOW_DEMO_PAGES) notFound(); // hidden (lib/feature-flags.ts)
  const memberId = 5169;
  const [
    mpRes, contactRes, bioRes, sponsoredBillsRes, votesRes, interestsRes,
    expensesRes, expensesDetailRes, pay, outsideRowRes, siDivisionsRes,
  ] = await Promise.all([
    cachedQuery(['q:app/landing-pca/page.tsx:b72a2cc083', JSON.stringify([memberId])], tableTags('mps'), () => supabase.from('mps').select('*').eq('member_id', memberId).single()),
    cachedQuery(['q:app/landing-pca/page.tsx:183a6a1541', JSON.stringify([memberId])], tableTags('mp_contact'), () => supabase.from('mp_contact').select('*').eq('member_id', memberId).single()),
    getMpBiography(supabase, memberId),
    cachedQuery(['q:app/landing-pca/page.tsx:b809a5dffc', JSON.stringify([memberId])], tableTags('bill'), () => supabase.from('bill').select('id, title, status, current_stage, plain_summary, is_act, last_update').eq('sponsor_member_id', memberId).is('hidden_reason', null).order('created_at', { ascending: false })),
    cachedQuery(['q:app/landing-pca/page.tsx:e9dbcf1ecd', JSON.stringify([memberId])], tableTags('mp_division_votes'), () => supabase.from('mp_division_votes').select('id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id').eq('member_id', memberId).order('division_date', { ascending: false }).range(0, 199)),
    cachedQuery(['q:app/landing-pca/page.tsx:2b5e9c48b1', JSON.stringify([memberId])], tableTags('mp_registered_interests'), () => supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).eq('is_current', true).order('category_sort_order', { ascending: true })),
    cachedQuery(['q:app/landing-pca/page.tsx:1345cf0f50', JSON.stringify([memberId])], tableTags('mp_expenses_summary'), () => supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false })),
    cachedQuery(['q:app/landing-pca/page.tsx:1c8c76d6bb', JSON.stringify([memberId])], tableTags('mp_expenses_detail'), () => supabase.from('mp_expenses_detail').select('claim_number, year, claim_date, category, cost_type, short_description, amount_paid, status').eq('member_id', memberId).order('claim_date', { ascending: false }).range(0, 49)),
    mpPay(memberId),
    cachedQuery(['q:app/landing-pca/page.tsx:9ee4a9fe95', JSON.stringify([memberId])], tableTags('mp_outside_earnings_summary'), () => supabase.from('mp_outside_earnings_summary').select('total_extracted, claim_count, source_count').eq('member_id', memberId).maybeSingle()),
    cachedQuery(['q:app/landing-pca/page.tsx:96680e83b3'], tableTags('statutory_instrument'), () => supabase.from('statutory_instrument').select('division_id')),
  ]);
  const mp = mpRes.data;
  const siDivisionIds = new Set<number>((siDivisionsRes.data || []).map((r: { division_id: number }) => r.division_id));
  const votesWithSi = (votesRes.data || []).map((v) => ({ ...v, is_si: v.division_id != null && siDivisionIds.has(v.division_id) }));
  const outsideAmount = outsideRowRes.data?.total_extracted ? Number(outsideRowRes.data.total_extracted) : 0;
  const latestExpense = (expensesRes.data && expensesRes.data[0]) || null;
  const earnings = {
    base: pay.base,
    base_source: pay.baseSource,
    ministerial: pay.ministerial,
    ministerial_text: pay.ministerialText,
    ministerial_pending: pay.ministerialPending,
    ministerial_label: pay.ministerialLabel,
    outside: outsideAmount,
    outside_claim_count: outsideRowRes.data?.claim_count || 0,
    outside_source_count: outsideRowRes.data?.source_count || 0,
    personal_total: pay.base + pay.ministerial + outsideAmount,
    public_spend: latestExpense?.total_spend ? Number(latestExpense.total_spend) : 0,
    public_spend_year: latestExpense?.year || null,
  };
  const bioParas = (bioRes.data?.bio_visible === true ? bioRes.data.political_bio ?? '' : '').split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);

  const fullName = displayMpName(mp?.display_name || mp?.name || '');
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
