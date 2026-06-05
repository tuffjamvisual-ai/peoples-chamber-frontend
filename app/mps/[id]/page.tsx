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
import JsonLd, { buildMpPerson } from '@/lib/JsonLd';

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 };

// 6-hour ISR. Cabinet pages prerender at build (see generateStaticParams);
// the other ~570 MPs render on first request and then cache at the edge
// for 6 hours before background revalidation.
export const revalidate = 21600;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vp?: string; section?: string; vq?: string }>;
}

const VOTES_PER_PAGE = 20;

// Treat the query as a plain literal — escape PostgREST ILIKE wildcards.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
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
  if (Number.isNaN(memberId)) return { title: 'MP profile' };

  // Previously this shipped a boilerplate template ("Voting record, registered
  // interests, sponsored bills and contact details.") across all 650 MPs. That
  // string was a Duplicate-without-canonical / Soft 404 contributor in GSC.
  // Now we assemble 3-4 specific facts per MP: party + constituency + first
  // elected + vote count + interests count + most recent vote. Four small
  // queries in parallel — each is index-hit and head-only, so the per-MP
  // metadata fetch stays well inside the page's render budget. GSC fix
  // 2026-06-04.
  const [mpRes, votesCountRes, interestsCountRes, lastVoteRes] = await Promise.all([
    supabase.from('mps').select('name, display_name, constituency, party, start_date').eq('member_id', memberId).single(),
    supabase.from('mp_division_votes').select('id', { count: 'exact', head: true }).eq('member_id', memberId).in('vote_type', ['aye', 'no']),
    supabase.from('mp_registered_interests').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    supabase.from('mp_division_votes').select('division_title, division_date').eq('member_id', memberId).in('vote_type', ['aye', 'no']).order('division_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const mp = mpRes.data;
  if (!mp) return { title: 'MP profile' };

  const name = mp.display_name || mp.name;
  const party = normaliseParty(mp.party) || mp.party || '';
  const sinceYear = mp.start_date ? new Date(mp.start_date).getFullYear() : null;

  const head = `${name}, ${[party, mp.constituency && `MP for ${mp.constituency}`].filter(Boolean).join(', ')}${sinceYear ? ` since ${sinceYear}` : ''}.`;

  const facts: string[] = [];
  const vc = votesCountRes.count ?? 0;
  if (vc > 0) facts.push(`${vc} votes cast`);
  const ic = interestsCountRes.count ?? 0;
  if (ic > 0) facts.push(`${ic} registered interest${ic === 1 ? '' : 's'}`);
  const lv = lastVoteRes.data;
  if (lv?.division_title && lv?.division_date) {
    const d = new Date(lv.division_date);
    if (!Number.isNaN(d.getTime())) {
      facts.push(`last voted on ${lv.division_title} (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`);
    }
  }

  let description = head + (facts.length ? ' ' + facts.join(', ') + '.' : '');
  if (description.length > 200) description = description.slice(0, 197).trimEnd() + '…';

  return {
    title: name,
    description,
    alternates: { canonical: `/mps/${memberId}` },
  };
}

export default async function MPMagazineProfile({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) notFound();

  // Voting record pagination: 20 per page. Default page 1. ?section=voting
  // (set by the Pagination component's links) makes the voting tab the
  // initial active section so the user lands back where they left off.
  const votePage = Math.max(1, parseInt(sp.vp ?? '1', 10) || 1);
  const voteStart = (votePage - 1) * VOTES_PER_PAGE;
  const voteEnd = voteStart + VOTES_PER_PAGE - 1;
  const initialSection = sp.section ?? null;
  // Per-page search just over the voting record's division titles.
  // Server-side so it survives no-JS / crawler access and paginates
  // cleanly. Trim + length-cap to keep the URL well-behaved.
  const voteQuery = (sp.vq ?? '').trim().slice(0, 80);

  // All fetches in one parallel round-trip. The mp lookup was previously
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
    votesCountRes,
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
    // 20-per-page paginated voting record. ParlParse backfill (2026-06-05)
    // means some MPs now have hundreds of votes — Abbott alone has 308 —
    // so the previous bulk 999-row fetch became a heavy cold payload.
    // When ?vq= is set the same filter is applied to both the list query
    // and the count query so totalPages reflects the matches, not all
    // votes.
    (() => {
      let q = supabase
        .from('mp_division_votes')
        .select('id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id, division_date_only, division_number')
        .eq('member_id', memberId);
      if (voteQuery) q = q.ilike('division_title', `%${escapeIlike(voteQuery)}%`);
      return q.order('division_date', { ascending: false }).range(voteStart, voteEnd);
    })(),
    // Total count for the pagination footer + the "N divisions recorded"
    // summary line. head:true => no rows transferred, just the count.
    (() => {
      let q = supabase
        .from('mp_division_votes')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', memberId);
      if (voteQuery) q = q.ilike('division_title', `%${escapeIlike(voteQuery)}%`);
      return q;
    })(),
    supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).order('category_sort_order', { ascending: true }),
    supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false }),
    // Expense claim drilldowns. 50 was too few once we imported the
    // 25_26 detail (29,832 rows site-wide, all newer than 24_25): the
    // 50 most-recent for any one MP were all 25_26 claims, but 25_26
    // has no summary row yet (IPSA year-end pending), so the rendered
    // 24_25 row had zero claims to drill into. Back to 999 — at
    // ~150 bytes per row that's ~150 KB cap for the heaviest MPs,
    // same order of magnitude as the other queries in this batch.
    supabase
      .from('mp_expenses_detail')
      .select('claim_number, year, claim_date, category, cost_type, short_description, details, amount_claimed, amount_paid, amount_not_paid, amount_repaid, status, reason_if_not_paid, journey_from, journey_to, mileage, nights')
      .eq('member_id', memberId)
      .order('claim_date', { ascending: false })
      .range(0, 999),
    supabase.from('dept_ministers').select('salary_band, dept_slug').eq('member_id', memberId).not('salary_band', 'is', null),
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
    <>
      <JsonLd data={buildMpPerson({
        memberId,
        fullName,
        party: partyDisplay || mp.party,
        constituency: mp.constituency,
        photoUrl: mp.photo_url,
      })} />
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
        totalVotes: votesCountRes.count ?? votesWithSi.length,
        votePage,
        votesPerPage: VOTES_PER_PAGE,
        initialSection,
        voteQuery,
        sponsoredBills: sponsoredBillsRes.data || [],
        interests: interestsRes.data || [],
        bio: bioRes.data,
        earnings,
        expenses: expensesRes.data || [],
        expensesDetail: expensesDetailRes.data || [],
      }}
    />
    </>
  );
}
