import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sumDeclaredDonations } from '@/lib/mpDonationsTotal';
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

// Shared MP-row fetch. generateMetadata and the page component run as
// separate executions within the same request; React cache() dedupes the
// `mps` lookup so the row is fetched once, not twice, per render. select('*')
// is a superset of the few columns metadata needs.
const getMp = cache(async (memberId: number) => {
  const { data } = await supabase.from('mps').select('*').eq('member_id', memberId).single();
  return data;
});

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
  const [mp, votesCountRes, interestsCountRes, lastVoteRes] = await Promise.all([
    getMp(memberId),
    supabase.from('mp_division_votes').select('id', { count: 'exact', head: true }).eq('member_id', memberId).in('vote_type', ['aye', 'no']),
    supabase.from('mp_registered_interests').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('is_current', true),
    supabase.from('mp_division_votes').select('division_title, division_date').eq('member_id', memberId).in('vote_type', ['aye', 'no']).order('division_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

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

export default async function MPMagazineProfile({ params }: PageProps) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) notFound();

  // Voting record: the server renders only page 1, unfiltered — this is what
  // keeps /mps/[id] free of searchParams and therefore statically ISR-cached
  // (previously reading ?vp/?vq/?section forced dynamic rendering on every
  // request). Page 2+ and search are fetched client-side from
  // /api/mps/[id]/votes; the server-rendered page 1 stays for SEO / no-JS.
  const votePage = 1;
  const voteStart = 0;
  const voteEnd = VOTES_PER_PAGE - 1;
  const initialSection = null;
  const voteQuery = '';

  // All fetches in one parallel round-trip. The mp lookup was previously
  // awaited before this block, costing an extra serial round-trip on every
  // cold render. The notFound() check happens after — for valid member_ids
  // we save ~200-400ms; for invalid ones, the wasted concurrent queries
  // are negligible (notFound() short-circuits the render).
  const [
    mp,
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
    rebellionsCountRes,
    committeeMembershipsRes,
  ] = await Promise.all([
    getMp(memberId),
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
    // Current register only (is_current). Historical rows added by the backfill
    // are retained but excluded from the profile's primary interests list.
    supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).eq('is_current', true).order('category_sort_order', { ascending: true }),
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
    // Live rebellion count from the per-vote is_rebellion flag (parlparse).
    // mp_activity_metrics.rebellions_total is broken (0 for every MP), so we
    // count the flag directly to match the party whip page.
    supabase.from('mp_division_votes').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('is_rebellion', true),
    // Select committee memberships — current (end_date null) first, former newest-first.
    // Folded into this batch rather than awaited separately to avoid a serial round-trip.
    supabase
      .from('mp_committee_memberships')
      .select('committee_id, committee_name, role, start_date, end_date')
      .eq('member_id', memberId)
      .order('end_date', { ascending: false, nullsFirst: true }),
  ]);
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

  // ── Concurrency: launch every independent per-MP query chain at once ──
  // Each block further down depends only on the identity resolved above
  // (member_id, name key), not on the others, but they were previously
  // awaited in source order — a query waterfall that dominated the cold
  // render. Supabase builders are lazy (they fire on await/.then), so we
  // kick the primary query of each chain off HERE (Promise.all / Promise.
  // resolve both start them immediately); each block still awaits its own
  // promise at its original position, so the surrounding processing is
  // unchanged. Net effect: wall-clock ~= slowest chain, not their sum.
  const pMeetingsHosp = Promise.all([
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
  const pContribs = Promise.resolve(
    supabase
      .from('mp_contributions')
      .select('debate_title, sitting_date, section, house, speech_count, question_count, intervention_count, answer_count, statement_count, total_contributions, hansard_url')
      .eq('member_id', memberId)
      .order('sitting_date', { ascending: false })
      .limit(25),
  );
  const pOfficers = Promise.resolve(
    supabase
      .from('appg_officers')
      .select('appg_slug, role, party, removed')
      .eq('member_id', memberId)
      .eq('removed', false),
  );
  const pActivity = Promise.resolve(
    supabase
      .from('mp_activity_metrics')
      .select('divisions_voted, divisions_total, attendance_pct, rebellions_total, rebellion_rate_pct, speeches_year, questions_year, refreshed_at')
      .eq('member_id', memberId)
      .maybeSingle(),
  );
  const pConduct = Promise.resolve(
    supabase
      .from('mp_conduct_findings')
      .select('id, mp_name_at_time, closed_date, outcome, rule_breached, summary, penalty, url, source')
      .eq('member_id', memberId)
      .order('closed_date', { ascending: false }),
  );
  // Party slug + same-party peers: previously fetched by RelatedLinks as
  // its own serial async component. Both depend only on mp.party (available
  // after the main batch) and are cheap (17-row and 5-row results). Folded
  // into wave2 so RelatedLinks receives them as props and becomes sync.
  // normaliseParty maps 'Labour (Co-op)' → 'Labour'. parties.mp_party_string
  // has no row for 'Labour (Co-op)', so using mp.party directly would return
  // null slug and wrong peers for 45 co-op MPs. Normalise both queries.
  const partyKey = normaliseParty(mp.party);
  const pPartySlug = partyKey
    ? Promise.resolve(
        supabase.from('parties').select('slug').eq('mp_party_string', partyKey).maybeSingle(),
      )
    : Promise.resolve({ data: null });
  const pPartyPeers = partyKey
    ? Promise.resolve(
        supabase
          .from('mps')
          .select('member_id, display_name, constituency')
          .eq('party', partyKey)
          .eq('current_member', true)
          .neq('member_id', memberId)
          .order('display_name', { ascending: true })
          .range(0, 4),
      )
    : Promise.resolve({ data: [] });

  // Ministerial diary — meetings + hospitality recorded by gov.uk.
  // Only ministers have entries; backbenchers fall through with empty
  // arrays. minister_name is text (display-name format, no honorifics)
  // so we fuzzy-match against the stripped MP name same as donations.
  // Both queries fire in parallel.
  const [meetingsRes, hospitalityRes] = await pMeetingsHosp;
  // Tighten with first-and-last word check, same as donations.
  const meetings = (meetingsRes.data || []).filter((m: { minister_name?: string | null }) => {
    const n = String(m.minister_name || '').toLowerCase();
    return firstWord && lastWord && n.includes(firstWord) && n.includes(lastWord);
  });
  const hospitality = (hospitalityRes.data || []).filter((h: { minister_name?: string | null }) => {
    const n = String(h.minister_name || '').toLowerCase();
    return firstWord && lastWord && n.includes(firstWord) && n.includes(lastWord);
  });

  // Recent Hansard chamber contributions (mp_contributions), keyed by member_id.
  const { data: contributionsData } = await pContribs;
  const contributions = contributionsData || [];

  // APPGs (All-Party Parliamentary Groups) this MP is officer of, with
  // each group's registered funders. Sourced from mySociety/appg-
  // membership, sync'd into appgs + appg_officers + appg_funders. The
  // bridge between MP and lobbying interest: an MP runs the All-Party
  // Group on X, whose secretariat is paid by industry Y. Both sides of
  // that bridge are public, the join is not.
  const appgOfficersRes = await pOfficers;
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
  const activityRes = await pActivity;

  // Standards Committee findings against this MP — sourced from
  // committees-api.parliament.uk via scripts/sync-standards-committee.js.
  // Resolved findings (member_id matched) only; un-resolved former-MP
  // rows sit in the table unattached.
  const conductRes = await pConduct;

  const [partySlugRes, partyPeersRes] = await Promise.all([pPartySlug, pPartyPeers]);



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
        donations: [],
        donorOtherRecipients: [],
        sectorCrossRef: [],
        constituencyDonations: [],
        appgs: mpAppgs,
        ministerMeetings: meetings,
        ministerHospitality: hospitality,
        contributions,
        conductFindings: conductRes.data || [],
        activity: activityRes.data || null,
        rebellionsCount: rebellionsCountRes.count ?? 0,
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
        // Headline figure = current register only (is_current). Historical rows
        // added by the cumulative backfill are retained in the table but excluded
        // from this primary number. (is_current !== false treats today's rows,
        // which have no explicit false, as current.)
        declaredDonations: sumDeclaredDonations(
          (interestsRes.data || []).filter(
            (r) => (r as { is_current?: boolean }).is_current !== false,
          ),
          true,
        ),
        expenses: expensesRes.data || [],
        expensesDetail: expensesDetailRes.data || [],
        committeeMemberships: committeeMembershipsRes.data ?? [],
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
            partySlug={partySlugRes.data?.slug ?? null}
            partyPeers={partyPeersRes.data || []}
            votes={votesWithSi.slice(0, 5)}
            sponsoredBills={(sponsoredBillsRes.data || []).slice(0, 5)}
          />
        </div>
      }
    />
    </>
  );
}
