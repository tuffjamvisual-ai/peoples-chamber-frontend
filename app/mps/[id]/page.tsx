import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MpDossier from './MpDossier';
import RelatedLinks from '../../components/RelatedLinks';
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

  // Compute mpNameKey/firstWord/lastWord up front — donations,
  // meetings, and hospitality all do the same name-based fuzzy match.
  const mpNameTop = (mp.display_name as string | null) || (mp.name as string | null) || '';
  const mpNameKey = mpNameTop
    .replace(/^(?:Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr|The )\s+/i, '')
    .replace(/\s+(?:MP|QC|KC|CBE|OBE|MBE)\s*$/i, '')
    .trim();
  const firstWord = mpNameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
  const lastWord = mpNameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';

  // Ministerial diary — meetings + hospitality recorded by gov.uk.
  // Only ministers have entries; backbenchers fall through with empty
  // arrays. minister_name is text (display-name format, no honorifics)
  // so we fuzzy-match against the stripped MP name same as donations.
  // Both queries fire in parallel.
  const [meetingsRes, hospitalityRes] = await Promise.all([
    supabase
      .from('ministers_meetings')
      .select('id, minister_name, minister_dept, meeting_date, organisation, purpose, quarter, enriched_description, source_publication_slug')
      .or(`minister_name.ilike.%${mpNameKey.replace(/[%_,]/g, '')}%`)
      .lte('meeting_date', new Date().toISOString().slice(0, 10))
      .order('meeting_date', { ascending: false })
      .limit(500),
    supabase
      .from('ministers_hospitality')
      .select('id, minister_name, minister_dept, hospitality_date, donor, description, value, quarter, source_publication_slug')
      .or(`minister_name.ilike.%${mpNameKey.replace(/[%_,]/g, '')}%`)
      .order('hospitality_date', { ascending: false })
      .limit(500),
  ]);
  // Tighten with first-and-last word check, same as donations.
  const meetings = (meetingsRes.data || []).filter((m: { minister_name?: string | null }) => {
    const n = String(m.minister_name || '').toLowerCase();
    return firstWord && lastWord && n.includes(firstWord) && n.includes(lastWord);
  });
  const hospitality = (hospitalityRes.data || []).filter((h: { minister_name?: string | null }) => {
    const n = String(h.minister_name || '').toLowerCase();
    return firstWord && lastWord && n.includes(firstWord) && n.includes(lastWord);
  });

  // APPGs (All-Party Parliamentary Groups) this MP is officer of, with
  // each group's registered funders. Sourced from mySociety/appg-
  // membership, sync'd into appgs + appg_officers + appg_funders. The
  // bridge between MP and lobbying interest: an MP runs the All-Party
  // Group on X, whose secretariat is paid by industry Y. Both sides of
  // that bridge are public, the join is not.
  const appgOfficersRes = await supabase
    .from('appg_officers')
    .select('appg_slug, role, party, removed')
    .eq('member_id', memberId)
    .eq('removed', false);
  type AppgOfficerRow = { appg_slug: string; role: string | null };
  const officerSlugs = ((appgOfficersRes.data || []) as AppgOfficerRow[]).map((r) => r.appg_slug);
  const officerRoleBySlug = new Map<string, string | null>(
    ((appgOfficersRes.data || []) as AppgOfficerRow[]).map((r) => [r.appg_slug, r.role]),
  );
  type AppgRow = {
    slug: string;
    title: string;
    purpose: string | null;
    category: string | null;
    secretariat: string | null;
    secretariat_url: string | null;
    registrable_benefits: string | null;
    website_url: string | null;
  };
  type AppgFunderRow = {
    appg_slug: string;
    source: string;
    description: string | null;
    value_band: string | null;
  };
  let mpAppgs: Array<AppgRow & { role: string | null; funders: AppgFunderRow[] }> = [];
  if (officerSlugs.length > 0) {
    const [appgsRes, fundersRes] = await Promise.all([
      supabase
        .from('appgs')
        .select('slug, title, purpose, category, secretariat, secretariat_url, registrable_benefits, website_url')
        .in('slug', officerSlugs),
      supabase
        .from('appg_funders')
        .select('appg_slug, source, description, value_band')
        .in('appg_slug', officerSlugs)
        .limit(2000),
    ]);
    const funderBySlug = new Map<string, AppgFunderRow[]>();
    for (const f of (fundersRes.data || []) as AppgFunderRow[]) {
      if (!funderBySlug.has(f.appg_slug)) funderBySlug.set(f.appg_slug, []);
      funderBySlug.get(f.appg_slug)!.push(f);
    }
    // Cross-reference: APPG funders that ALSO appear as donors in
    // political_donations. Hidden link — same entity pays for the
    // APPG secretariat AND gives to MPs / parties. We flag each
    // funder with their EC donation total when matched.
    const funderNames = Array.from(new Set(((fundersRes.data || []) as AppgFunderRow[]).map((f) => f.source.trim()).filter((s) => s && s !== '(unspecified)')));
    let funderDonationByName = new Map<string, { totalAmount: number; donationCount: number }>();
    if (funderNames.length > 0) {
      // Chunk the IN clause — PostgREST gets unhappy past ~200 names
      const chunkSize = 100;
      for (let i = 0; i < funderNames.length; i += chunkSize) {
        const chunk = funderNames.slice(i, i + chunkSize);
        const { data: matches } = await supabase
          .from('political_donations')
          .select('donor_name, amount')
          .in('donor_name', chunk)
          .limit(5000);
        for (const m of (matches || []) as Array<{ donor_name: string | null; amount: number | string | null }>) {
          const name = (m.donor_name || '').trim();
          if (!name) continue;
          const ex = funderDonationByName.get(name) ?? { totalAmount: 0, donationCount: 0 };
          ex.totalAmount += Number(m.amount) || 0;
          ex.donationCount += 1;
          funderDonationByName.set(name, ex);
        }
      }
    }

    mpAppgs = ((appgsRes.data || []) as AppgRow[]).map((a) => ({
      ...a,
      role: officerRoleBySlug.get(a.slug) ?? null,
      funders: (funderBySlug.get(a.slug) ?? []).map((f) => ({
        ...f,
        ecMatch: funderDonationByName.get(f.source.trim()) ?? null,
      })),
    })).sort((a, b) => {
      // Chairs first, then by funder count desc, then alphabetical
      const aChair = /chair/i.test(a.role || '') ? 0 : 1;
      const bChair = /chair/i.test(b.role || '') ? 0 : 1;
      if (aChair !== bChair) return aChair - bChair;
      if (a.funders.length !== b.funders.length) return b.funders.length - a.funders.length;
      return a.title.localeCompare(b.title);
    });
  }

  // Activity metrics — precomputed in mp_activity_metrics via
  // scripts/recompute-activity-metrics.js (weekly cron). Cold render
  // does one indexed lookup instead of aggregating mp_division_votes.
  const activityRes = await supabase
    .from('mp_activity_metrics')
    .select('divisions_voted, divisions_total, attendance_pct, rebellions_total, rebellion_rate_pct, speeches_year, questions_year, refreshed_at')
    .eq('member_id', memberId)
    .maybeSingle();

  // Standards Committee findings against this MP — sourced from
  // committees-api.parliament.uk via scripts/sync-standards-committee.js.
  // Resolved findings (member_id matched) only; un-resolved former-MP
  // rows sit in the table unattached.
  const conductRes = await supabase
    .from('mp_conduct_findings')
    .select('id, mp_name_at_time, closed_date, outcome, rule_breached, summary, penalty, url, source')
    .eq('member_id', memberId)
    .order('closed_date', { ascending: false });

  // Electoral Commission donations directed at this MP personally.
  // The political_donations table is donor-side, so it's name-keyed:
  // recipient_name fuzzy-matches MP's mpNameKey computed above.
  // recipient_type restricted to MP-individual classes: backbench /
  // Regulated Donee / Members Association / Member of Registered Party.
  //
  // Strategy (revised 2026-06-06 after audit found 7 MPs missing
  // donations because the previous '%mpNameKey%' contiguous-substring
  // match couldn't cross middle names or short-name vs formal-name
  // gaps): require BOTH firstWord AND lastWord as substrings (two
  // chained ilike calls combine as AND under PostgREST). Catches:
  //   Ed Davey            ↔ Edward Davey                  (ed → edward)
  //   Chi Onwurah         ↔ Ms Chinyelu Onwurah MP        (chi → chinyelu)
  //   Diana Johnson       ↔ Ms Diana Ruth Johnson MP      (middle name)
  //   Mark Garnier        ↔ Mr Mark Robert Timothy Garnier MP
  //   Iain Duncan Smith   ↔ Mr George Iain Duncan-Smith
  const donationsRes = firstWord.length >= 2 && lastWord.length >= 2
    ? await supabase
        .from('political_donations')
        .select('id, donor_name, donor_type, donor_status, amount, cash_value, non_cash_value, accepted_date, received_date, reported_date, published_date, dealt_with_date, nature, recipient_name, recipient_type, manner_in_which_made, purpose_of_visit, position_standing_for, campaigning_name, accounting_unit_name, donation_action, reporting_period_name, reporting_period_type, is_aggregation, is_bequest, is_sponsorship, is_anonymous, is_irish_source, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, concealment_details, trust_name, trust_creator_name, trust_creator_status, trust_created_date, company_registration_number, addr_line1, addr_town, addr_postcode, addr_country, explanatory_notes, ec_ref')
        .in('recipient_type', ['MP - Member of Parliament', 'Regulated Donee', 'Members Association', 'Member of Registered Political Party'])
        .ilike('recipient_name', `%${firstWord}%`)
        .ilike('recipient_name', `%${lastWord}%`)
        .order('accepted_date', { ascending: false })
        .limit(500)
    : { data: [] };
  // Build a small lookup of "where else does this MP's donor pool give?"
  // For each donor that funded this MP, fetch up to 5 other distinct
  // recipient names. Drives the 'Also funds:' line on each donor row.
  type RawDonationLite = { recipient_name?: string | null; donor_name?: string | null };
  type DonorOtherRecipient = { donor_name: string; recipient_name: string; total: number };
  const donorNames = Array.from(new Set(
    (donationsRes.data || []).map((d: RawDonationLite) => (d.donor_name || '').trim()).filter((n: string) => n.length > 0),
  )) as string[];
  let donorOtherRecipients: Map<string, Array<{ recipient: string; total: number }>> = new Map();
  if (donorNames.length > 0) {
    const { data: otherRows } = await supabase
      .from('political_donations')
      .select('donor_name, recipient_name, amount')
      .in('donor_name', donorNames.slice(0, 60))   // safety cap
      .not('recipient_name', 'is', null)
      .limit(5000);
    if (otherRows) {
      const agg = new Map<string, Map<string, number>>();
      for (const r of otherRows as unknown as Array<RawDonationLite & { amount: number | string | null }>) {
        const dn = (r.donor_name || '').trim();
        const rn = (r.recipient_name || '').trim();
        if (!dn || !rn) continue;
        // Skip rows where the recipient is THIS MP (avoid showing yourself)
        if (rn.toLowerCase().includes(mpNameKey.toLowerCase())) continue;
        if (!agg.has(dn)) agg.set(dn, new Map());
        const inner = agg.get(dn)!;
        inner.set(rn, (inner.get(rn) ?? 0) + (Number(r.amount) || 0));
      }
      donorOtherRecipients = new Map<string, Array<{ recipient: string; total: number }>>();
      for (const [dn, inner] of agg.entries()) {
        const sorted = Array.from(inner.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        donorOtherRecipients.set(dn, sorted.map(([recipient, total]) => ({ recipient, total })));
      }
    }
  }
  void donorOtherRecipients as unknown as DonorOtherRecipient;   // satisfy TS unused-var

  // Donor → vote cross-reference. For each donor sector this MP has
  // received money from, find Commons divisions this MP voted on
  // where the division title matches that sector's keywords. Lets a
  // reader see, in one place, every bill touching a donor sector and
  // how the MP voted on it. The data exists (donations + divisions)
  // but the cross-reference is invisible without this view.
  type VoteForSector = {
    id: number;
    division_title: string | null;
    division_date: string | null;
    division_date_only: string | null;
    division_number: number | null;
    vote_type: string;
    is_rebellion: boolean | null;
    division_id: number | null;
  };
  const { SECTORS: ALL_SECTORS, sectorForDonor, sectorForVote, ALL_VOTE_KEYWORDS } = await import('@/lib/donor-sectors');

  // Which sectors this MP has donor money from
  const donorSectorKeys = new Set<string>();
  for (const d of (donationsRes.data || []) as Array<{ donor_name: string | null }>) {
    const s = sectorForDonor(d.donor_name || '');
    if (s) donorSectorKeys.add(s.key);
  }

  // Pull this MP's votes that match ANY sector's keywords. Single OR
  // query with up-to-200 ILIKE conditions; PostgREST handles this
  // cleanly. Bounded to 500 rows even if the MP votes on many sector
  // bills — far more than any UI would render per section.
  let sectorVotesByKey: Record<string, VoteForSector[]> = {};
  if (donorSectorKeys.size > 0) {
    const orClause = ALL_VOTE_KEYWORDS.map((kw) => `division_title.ilike.%${kw.replace(/[%_,]/g, '')}%`).join(',');
    const { data: rawVotes } = await supabase
      .from('mp_division_votes')
      .select('id, division_title, division_date, division_date_only, division_number, vote_type, is_rebellion, division_id')
      .eq('member_id', memberId)
      .or(orClause)
      .in('vote_type', ['aye', 'no', 'both'])
      .order('division_date', { ascending: false })
      .limit(500);

    sectorVotesByKey = {};
    for (const v of (rawVotes ?? []) as VoteForSector[]) {
      const s = sectorForVote(v.division_title);
      if (!s) continue;
      if (!donorSectorKeys.has(s.key)) continue;   // skip sectors the MP has no donor money from
      if (!sectorVotesByKey[s.key]) sectorVotesByKey[s.key] = [];
      sectorVotesByKey[s.key].push(v);
    }
  }

  // Constituency-association donations: the indirect channel that
  // currently doesn't surface on the Donations tab because the EC
  // records it against the constituency Labour/Conservative party
  // (recipient_type='Political Party') with the local association
  // name in accounting_unit_name. Almost every six-figure donation
  // to a major-party MP flows through this route rather than directly.
  //
  // Match: accounting_unit_name ILIKE the MP's constituency, handling
  // '&' vs 'and' variants and bare-name (Conservative) vs '<name> CLP'
  // (Labour) suffix conventions. We don't restrict on recipient_type
  // here, the accounting_unit_name = constituency match is specific
  // enough.
  const constituency = (mp.constituency as string | null) || '';
  const constAnd = constituency.replace(/&/g, 'and').trim();
  const constAmp = constituency.replace(/\band\b/g, '&').trim();
  type LocalDonation = {
    id: number;
    donor_name: string | null;
    donor_type: string | null;
    amount: number | string | null;
    accepted_date: string | null;
    received_date: string | null;
    reported_date: string | null;
    nature: string | null;
    recipient_type: string | null;
    accounting_unit_name: string | null;
  };
  let constituencyDonations: LocalDonation[] = [];
  if (constituency.length > 2) {
    const orParts: string[] = [];
    const variants = Array.from(new Set([constituency, constAnd, constAmp].filter((s) => s.length > 2)));
    for (const v of variants) {
      const safe = v.replace(/[%_,]/g, '');
      orParts.push(`accounting_unit_name.ilike.%${safe}%`);
    }
    const { data: localRows } = await supabase
      .from('political_donations')
      .select('id, donor_name, donor_type, donor_status, amount, cash_value, non_cash_value, accepted_date, received_date, reported_date, published_date, nature, recipient_name, recipient_type, manner_in_which_made, accounting_unit_name, accounting_unit_id, is_aggregation, is_bequest, is_sponsorship, is_anonymous, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, concealment_details, trust_name, trust_creator_name, trust_creator_status, company_registration_number, addr_line1, addr_town, addr_postcode, addr_country, explanatory_notes, ec_ref')
      .or(orParts.join(','))
      .order('accepted_date', { ascending: false })
      .limit(500);
    // Tighten — accounting_unit_name token must include constituency
    // first word AND last word (handles 'Doncaster North CLP' for
    // constituency 'Doncaster North' but rejects coincidental matches
    // on common single words).
    const conTokens = constituency.toLowerCase().replace(/&/g, 'and').split(/\s+/).filter((w) => w.length > 2 && !['and','the','of','for','upon','on','le'].includes(w));
    constituencyDonations = ((localRows ?? []) as LocalDonation[]).filter((r) => {
      const aun = String(r.accounting_unit_name || '').toLowerCase().replace(/&/g, 'and');
      return conTokens.every((t) => aun.includes(t));
    });
  }

  // Build a serialisable array for the client.
  const sectorCrossRef = ALL_SECTORS
    .filter((s) => donorSectorKeys.has(s.key) && (sectorVotesByKey[s.key]?.length ?? 0) > 0)
    .map((s) => ({
      key: s.key,
      label: s.label,
      colour: s.colour,
      votes: sectorVotesByKey[s.key] ?? [],
    }));

  const donations = (donationsRes.data || []).filter((d: { recipient_name?: string | null }) => {
    const rn = String((d as { recipient_name?: string | null }).recipient_name || '').toLowerCase();
    // Tokenise on whitespace AND hyphens so 'Duncan-Smith' splits into
    // ['duncan','smith'] for the last-name comparison.
    const tokens = rn.split(/[\s,.\-]+/).filter(Boolean);
    // Last name must appear as an exact token.
    if (!tokens.includes(lastWord)) return false;
    // First name may appear as an exact token OR as the prefix of a longer
    // token (catches Ed -> Edward, Chi -> Chinyelu, Tom -> Thomas, etc.).
    // Require firstWord >= 2 chars to avoid 'A' / 'I' false matches.
    if (firstWord.length < 2) return false;
    return tokens.some((t) => t === firstWord || t.startsWith(firstWord));
  });

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
  // Map the MP's party to its /parties/<slug>/whip page for the
  // full-rebellion-analysis link. Keyed by mp_party_string (= normalised
  // mps.party); parties without a meaningful whip page (Independent,
  // Speaker) intentionally fall through to null.
  const PARTY_WHIP_SLUG: Record<string, string> = {
    'Labour': 'labour', 'Conservative': 'conservative', 'Liberal Democrat': 'liberal-democrats',
    'Reform UK': 'reform-uk', 'Green Party': 'green', 'Scottish National Party': 'snp',
    'Sinn Féin': 'sinn-fein', 'Democratic Unionist Party': 'dup', 'Plaid Cymru': 'plaid-cymru',
    'Social Democratic & Labour Party': 'sdlp', 'Alliance': 'alliance', 'Ulster Unionist Party': 'uup',
    'Traditional Unionist Voice': 'tuv', 'Restore Britain': 'restore-britain', 'Your Party': 'your-party',
  };
  const partyWhipSlug = PARTY_WHIP_SLUG[partyDisplay] ?? PARTY_WHIP_SLUG[mp.party ?? ''] ?? null;

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
        donations,
        donorOtherRecipients: Array.from(donorOtherRecipients.entries()).map(([donor_name, recipients]) => ({ donor_name, recipients })),
        sectorCrossRef,
        constituencyDonations,
        appgs: mpAppgs,
        ministerMeetings: meetings,
        ministerHospitality: hospitality,
        conductFindings: conductRes.data || [],
        activity: activityRes.data || null,
        partyWhipSlug,
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
      footer={
        /* Server-rendered RelatedLinks: same-party MPs, sponsored bills,
           recent votes, party page, optional ministerial dept. Lands as
           crawlable <a href> tags in static HTML for SEO. Wrapped in an
           sr-only-style 1px clipped container so the block is in the
           HTML response (Phase 1 SEO Check 15) but not visible at the
           bottom of the dossier where the user reported it as clutter. */
        <div
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'normal',
            border: 0,
          }}
          aria-hidden="false"
        >
          <RelatedLinks
            variant="mp"
            memberId={memberId}
            party={partyDisplay || mp.party || null}
            partySlug={null}
            votes={votesWithSi.slice(0, 5)}
            sponsoredBills={(sponsoredBillsRes.data || []).slice(0, 5)}
          />
        </div>
      }
    />
    </>
  );
}
