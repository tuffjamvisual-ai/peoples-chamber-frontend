import { updatedDate } from '@/lib/record-dates';
import { cache } from 'react';
import { metaDescription } from '@/lib/meta-description';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { lookupMember, parliamentMemberUrl } from '@/lib/former-mps';
import FormerMpProfile from './FormerMpProfile';
import { supabase } from '@/lib/supabase';
import { getMpBiography } from '@/lib/mp-biography';
import { getPeer } from '@/lib/lords';
import { peerHasPage } from '@/lib/peers';
import { questionsSummary, type QuestionsSummary } from '@/lib/mp-written-questions';
import { getHiddenBillIds } from '@/lib/hidden-bills';
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
import JsonLd, { buildMpPerson, buildBreadcrumbs } from '@/lib/JsonLd';
import { newestTimestamps } from '@/lib/data-freshness';
import { mpReportItems, MP_REPORTS_SHOWN } from '@/lib/mp-reports';
import type { MpReports, MinisterMeeting, MinisterHospitality } from './MagazineProfileSections';
import { titleWithin } from '@/lib/seo-title';
import RelatedLine from '../../components/RelatedLine';
import { mpRelated } from '@/lib/related-links';
import { displayMpName } from '@/lib/mp-name';
import { readAll, inList } from '@/lib/read-all';
import { recipientIsMp, lastNamePrefilter } from '@/lib/mp-recipient-match';
import { storedSpellings } from '@/lib/donor-registry';
import ArticleEndSignup from '../../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';
import type { SpadRow, SpadReleaseRow } from '@/lib/spad-display';

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 };

// Shared MP-row fetch. generateMetadata and the page component run as
// separate executions within the same request; React cache() dedupes the
// `mps` lookup so the row is fetched once, not twice, per render. select('*')
// is a superset of the few columns metadata needs.
const getMp = cache(async (memberId: number) => {
  // A database error must not become a cached 404 (see councils page); throw instead.
  const { data, error } = await supabase.from('mps').select('*').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`mp ${memberId}: ${error.message}`);
  return data;
});

// 6-hour ISR. All MP pages render on first request and cache at the edge
// for 6 hours before background revalidation. Prerendering at build was
// disabled after concurrent cabinet-page builds saturated Supabase —
// a single slow MP could time out and fail the entire build. On-demand
// ISR is equivalent for users after the first hit.
export const revalidate = 604800;  // a week (owner, 30 Oct 2026, cache Stage 2a part 3): the syncs refresh an MP's page when its data changes (lib/mp-refresh.ts)

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vp?: string; section?: string; vq?: string }>;
}

const VOTES_PER_PAGE = 20;
// Start of the current Parliament (general election, 4 July 2024).
const PARL_START = '2024-07-04';

// Treat the query as a plain literal — escape PostgREST ILIKE wildcards.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

// Early Day Motions: how many of each list the server sends to the tab
// (20 show open, the rest sit behind a "Show all" fold).
const EDMS_FETCHED = 500;

type EdmJoined = {
  title: string;
  uin_with_suffix: string | null;
  date_tabled: string;
  signature_count: number;
  status: string;
  is_prayer: boolean;
  amendment_to_motion_id: number | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// No build-time prerendering. generateStaticParams returns [] so the build
// never touches an MP's data. dynamicParams = true (default) means any
// /mps/[id] URL still resolves on-demand and is then edge-cached via
// revalidate above. Prerendering was disabled because concurrent cabinet
// builds repeatedly saturated Supabase connections — one slow MP failed
// the entire build.
export async function generateStaticParams() {
  return [];
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
  const [mp, votesCountRes, interestsCountRes, expensesCountRes] = await Promise.all([
    getMp(memberId),
    // Vote counts in one index-only read (mp_vote_counts, migration 2026-10-21b).
    supabase.rpc('mp_vote_counts', { p_member_id: memberId, p_since: PARL_START }),
    supabase.from('mp_registered_interests').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('is_current', true),
    supabase.from('mp_expenses_summary').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
  ]);

  if (!mp) {
    // A former MP not in our table (lib/former-mps.ts): a basic page from Parliament's record.
    const m = await lookupMember(memberId);
    if (m.kind !== 'former_mp') return { title: 'MP profile' };
    const seat = m.mp.seats[m.mp.seats.length - 1]?.constituency;
    const years = m.mp.firstYear && m.mp.lastYear ? ` (${m.mp.firstYear} to ${m.mp.lastYear})` : '';
    return {
      // Owner's brief, 3 Nov 2026: "<Name>: record and interests" for former MPs.
      title: titleWithin(`${m.mp.name}: record and interests`),
      description: metaDescription(`${m.mp.name}${m.mp.party ? `, ${m.mp.party}` : ''}, former MP${seat ? ` for ${seat}` : ''}${years}: seats held, dates served and any Standards findings, from UK Parliament's record.`),
      alternates: { canonical: `/mps/${memberId}` },
    };
  }

  const name = displayMpName(mp.display_name || mp.name);
  const party = normaliseParty(mp.party) || mp.party || '';
  const sinceYear = mp.start_date ? new Date(mp.start_date).getFullYear() : null;
  const untilYear = mp.end_date ? new Date(mp.end_date).getFullYear() : null;
  const isFormer = mp.current_member === false;

  // One plain sentence from the data (owner's brief, 3 Nov 2026): who the MP is, then what the page lists, with counts.
  const who = `${name}, ${[party, mp.constituency && `${isFormer ? 'former ' : ''}MP for ${mp.constituency}`].filter(Boolean).join(' ')}`
    + (isFormer ? (sinceYear && untilYear ? ` from ${sinceYear} to ${untilYear}` : '') : (sinceYear ? ` since ${sinceYear}` : ''));
  const lists: string[] = [];
  const vc = Number((votesCountRes.data as { aye_no?: number } | null)?.aye_no) || 0;
  if (vc > 0) lists.push(`voting record (${vc.toLocaleString('en-GB')} votes)`);
  const ic = interestsCountRes.count ?? 0;
  if (ic > 0) lists.push(`${ic} registered interest${ic === 1 ? '' : 's'}`);
  if ((expensesCountRes.count ?? 0) > 0) lists.push('expenses');
  lists.push('contributions in Parliament');
  const listed = lists.length > 1 ? `${lists.slice(0, -1).join(', ')} and ${lists[lists.length - 1]}` : lists[0];
  const description = metaDescription(`${who}: ${listed}.`);

  // Title (owner's brief, 3 Nov 2026): "<Name> MP: expenses, votes and interests", or "<Name>: record and interests"
  // for a former MP; with the " | opengovt" suffix when it fits in 60 characters, else on its own (lib/seo-title.ts).
  const title: Metadata['title'] = titleWithin(isFormer ? `${name}: record and interests` : `${name} MP: expenses, votes and interests`);

  return {
    title,
    description,
    alternates: { canonical: `/mps/${memberId}` },
  };
}

// Reports mentioning this MP (23 Oct 2026; up to 10 from 24 Oct 2026): every published piece whose relatedMemberIds
// include the MP, newest first, from the editorial registry at build time (no database query, lib/mp-reports.ts). Up to
// ten are shown, with a link to the full list at /mps/<id>/reports if there are more.
async function reportsFor(memberId: number, mpName: string): Promise<MpReports | null> {
  const all = await mpReportItems(memberId);
  if (all.length === 0) return null;
  return { total: all.length, items: all.slice(0, MP_REPORTS_SHOWN), memberId, mpName };
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
    voteCountsRes,
    interestsRes,
    expensesRes,
    ministerialRowsRes,
    outsideRowRes,
    committeeMembershipsRes,
    formerInterestsRes,
  ] = await withTimeout(Promise.all([
    getMp(memberId),
    supabase.from('mp_contact').select('*').eq('member_id', memberId).single(),
    // The written biography, its sources and background text only when bio_visible is true (lib/mp-biography.ts).
    getMpBiography(supabase, memberId),
    supabase
      .from('bill')
      .select('id, title, status, current_stage, description, long_title, is_act, last_update')
      .eq('sponsor_member_id', memberId)
      .is('hidden_reason', null)
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
    // Every vote count the page shows, in one index-only read (mp_vote_counts, migration 2026-10-21b; owner's
    // approval, 21 Oct 2026): the total for the pagination footer and "N divisions recorded", and the votes against
    // the party below. It replaces four exact counts over mp_division_votes (up to 1.4 s each when not cached).
    supabase.rpc('mp_vote_counts', { p_member_id: memberId, p_since: PARL_START }),
    // Current register only (is_current). Historical rows added by the backfill
    // are retained but excluded from the profile's primary interests list.
    // Named columns, not '*': the nightly last_seen_date stamp (and the search vector) stay out of the page (owner, 30 Oct
    // 2026, cache Stage 2a part 3).
    supabase.from('mp_registered_interests').select('id, member_id, category_id, category_name, category_sort_order, interest_id, interest_text, created_when, last_amended_when, is_correction, child_interests, created_at, is_current, first_seen_date, source, donor_name, donor_amount, payment_type, received_date, accepted_date').eq('member_id', memberId).eq('is_current', true).order('category_sort_order', { ascending: true }),
    supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false }),
    // Individual expense claims are fetched by the Expenses tab when it opens (app/api/mps/[id]/expenses).
    supabase.from('dept_ministers').select('salary_band, dept_slug').eq('member_id', memberId).not('salary_band', 'is', null),
    supabase.from('mp_outside_earnings_summary').select('total_extracted, claim_count, source_count').eq('member_id', memberId).maybeSingle(),
    // Select committee memberships — current (end_date null) first, former newest-first.
    // Folded into this batch rather than awaited separately to avoid a serial round-trip.
    supabase
      .from('mp_committee_memberships')
      .select('committee_id, committee_name, role, start_date, end_date')
      .eq('member_id', memberId)
      .order('end_date', { ascending: false, nullsFirst: true })
      // Ties in a fixed order (committee name, then start date), so the page is the same on every render.
      .order('committee_name', { ascending: true })
      .order('start_date', { ascending: true }),
    // Entries no longer on the register (owner, 3 Nov 2026): shown collapsed below the current interests, newest last
    // listing first. Never counted in the headline figures, which stay current only.
    supabase
      .from('mp_registered_interests')
      .select('category_name, interest_text, last_seen_date')
      .eq('member_id', memberId)
      .eq('is_current', false)
      .order('last_seen_date', { ascending: false, nullsFirst: false })
      .order('interest_id', { ascending: false }),
  ]), 9000);
  if (!mp) {
    // Not in our mps table: a former MP gets a basic page from Parliament's record; a member who only sat in the Lords
    // goes to their Parliament page; anyone else is not found (owner's decision, 28 Oct 2026).
    const m = await lookupMember(memberId);
    if (m.kind === 'former_mp') {
      // Their Standards findings too (owner's brief, 3 Nov 2026); a failed read shows the page without them.
      const { data: findings } = await supabase
        .from('mp_conduct_findings')
        .select('id, mp_name_at_time, closed_date, outcome, rule_breached, summary, penalty, url, source')
        .eq('member_id', memberId)
        .order('closed_date', { ascending: false });
      const [formerReports, peer] = await Promise.all([mpReportItems(memberId).catch(() => []), getPeer(supabase, memberId).catch(() => null)]);
      const related = formerReports.length ? [{ href: `/mps/${memberId}/reports`, label: `Reports on ${m.mp.name} (${formerReports.length})` }] : [];
      // A former MP now in the Lords links to their peer page, which links back (owner, 3 Nov 2026).
      if (peer && peerHasPage(peer)) related.unshift({ href: `/lords/${memberId}`, label: `${peer.name_display} in the House of Lords` });
      return <FormerMpProfile mp={m.mp} conductFindings={findings ?? []} related={related} />;
    }
    // A member who only sat in the Lords: their peer page (owner, 3 Nov 2026), or Parliament's profile if they have none.
    if (m.kind === 'lords_only') {
      const peer = await getPeer(supabase, memberId).catch(() => null);
      permanentRedirect(peer && peerHasPage(peer) ? `/lords/${memberId}` : parliamentMemberUrl(memberId));
    }
    notFound();
  }
  // A failed count read throws, like the page's other timeouts, rather than showing zero votes.
  if (voteCountsRes.error || !voteCountsRes.data) throw new Error(`mp_vote_counts(${memberId}): ${voteCountsRes.error?.message ?? 'no data'}`);
  const voteCounts = voteCountsRes.data as { all_votes: number; aye_no: number; aye_no_since: number; rebellions_since: number; rebellions_all: number };

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
  // Special advisers this minister appointed, from the Cabinet Office's latest named list (owner, 28 Oct 2026).
  // Shown in the Roles tab; an error or a slow answer leaves the block out rather than failing the page.
  const pSpad = withTimeout((async () => {
    const { data: rel } = await supabase.from('spad_releases').select('release_slug, as_at, headcount, fte, paybill, prior_paybill, source_url').order('as_at', { ascending: false }).limit(1).maybeSingle();
    if (!rel) return null;
    const { data } = await supabase.from('spad_appointments')
      .select('adviser_name, minister_title, minister_name, minister_member_id, pay_band, salary_band_text, salary_band_min, notes')
      .eq('release_slug', rel.release_slug).eq('minister_member_id', memberId).order('id', { ascending: true });
    if (!data || !data.length) return null;
    // How many declared interests (and recusals) each adviser has, for a short note per adviser.
    const { data: ints } = await supabase.from('spad_interests').select('adviser_name, is_recusal').in('adviser_name', [...new Set(data.map((r) => r.adviser_name))]);
    const interests: Record<string, { total: number; recusals: number }> = {};
    for (const i of ints ?? []) { const c = (interests[i.adviser_name] ??= { total: 0, recusals: 0 }); c.total++; if (i.is_recusal) c.recusals++; }
    // Whether the minister still holds each listed post (Members API, weekly).
    const { data: st } = await supabase.from('spad_minister_status').select('minister_title, still_in_post, left_on').eq('kind', 'listed').eq('member_id', memberId);
    const leftOn: Record<string, string | null> = {};
    for (const s of st ?? []) leftOn[s.minister_title] = s.still_in_post ? null : s.left_on;
    return { release: rel as SpadReleaseRow, rows: data as SpadRow[], interests, leftOn };
  })(), 5000).catch(() => null);
  // Ministers' diaries (owner, 31 Oct 2026): every row whose minister_name is this MP by lib/mp-recipient-match.ts
  // (the rule the Donations tab uses), read in full. The database prefilter is the longest hyphen part of the last name,
  // so "Davies-Jones" and "Davies Jones" both reach the rule. It replaced a full-name ILIKE capped at 500 rows, which
  // missed "Edward Miliband", "Catherine Smith" and the like, and cut off the oldest meetings of Sarah Jones, Rachel
  // Reeves and Peter Kyle.
  const diaryPart = lastNamePrefilter(lastWord).replace(/[%_,]/g, '');
  const pMeetingsHosp = withTimeout(Promise.all([
    readAll<MinisterMeeting>(() => supabase.from('ministers_meetings'), {
      columns: 'id, minister_name, minister_dept, meeting_date, organisation, purpose, quarter, enriched_description, source_publication_slug',
      filter: (q) => q.ilike('minister_name', `%${diaryPart}%`).lte('meeting_date', new Date().toISOString().slice(0, 10)),
      orderBy: [{ column: 'meeting_date', ascending: false }, { column: 'id', ascending: false }],
      label: `/mps/${memberId} ministers_meetings`,
    }),
    readAll<MinisterHospitality>(() => supabase.from('ministers_hospitality'), {
      columns: 'id, minister_name, minister_dept, hospitality_date, donor, description, value, quarter, source_publication_slug',
      filter: (q) => q.ilike('minister_name', `%${diaryPart}%`),
      orderBy: [{ column: 'hospitality_date', ascending: false }, { column: 'id', ascending: false }],
      label: `/mps/${memberId} ministers_hospitality`,
    }),
  ]), 7000);
  const pContribs = Promise.resolve(
    supabase
      .from('mp_contributions')
      .select('debate_title, sitting_date, section, house, speech_count, question_count, intervention_count, answer_count, statement_count, total_contributions, hansard_url')
      .eq('member_id', memberId)
      .order('sitting_date', { ascending: false })
      .limit(25),
  );
  // Written questions (owner, 3 Nov 2026): the count, first date and newest five, read alongside the contributions. A
  // failed or slow read shows the tab without them rather than holding up the page.
  const pQuestions: Promise<QuestionsSummary | null> = withTimeout(questionsSummary(supabase, memberId), 7000).catch((e) => {
    console.error(`/mps/${memberId} written questions:`, e instanceof Error ? e.message : e);
    return null;
  });
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
      .select('divisions_voted, divisions_total, attendance_pct, rebellions_total, rebellion_rate_pct, speeches_year, questions_year')
      .eq('member_id', memberId)
      .maybeSingle(),
  );
  // Staff with outside interests (owner's brief, 3 Nov 2026): job titles only, never names. A failed read (or the
  // table before its migration) shows no section rather than failing the page.
  const pStaffInterests = Promise.resolve(
    supabase
      .from('mp_staff_interests')
      .select('id, register_id, register_date, category, job_title, description, organisation, country, start_date, end_date')
      .eq('member_id', memberId)
      .limit(200),
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

  // Petitions most signed in this MP's constituency (petition.parliament.uk,
  // petitions with 10,000+ signatures only — threshold stated to readers on
  // the Petitions tab). Joined on the 2024-boundary ONS code stored on mps.
  // Plus the newest synced_at for the tab's "last updated" line. Failures
  // or a slow response degrade to an empty tab (hidden) rather than
  // breaking the whole profile.
  const constituencyGss = (mp.constituency_gss_code as string | null) ?? null;
  // Only whether the constituency has any (owner, 30 Oct 2026, cache Stage 2a part 4): the counts change daily, so the
  // tab loads them from /api/mps/[id]/petitions when opened, and this page (kept for a week) holds none.
  const pPetitions: Promise<boolean> = constituencyGss
    ? withTimeout(
        Promise.resolve(supabase.from('petition_constituency_signatures').select('petition_id').eq('constituency_gss_code', constituencyGss).limit(1)),
        5000,
      ).then((r) => (r.data ?? []).length > 0).catch(() => false)
    : Promise.resolve(false);

  // Early Day Motions this MP started (primary sponsor) and signed
  // (sponsoring_order > 1, i.e. every signature except the primary
  // sponsor's own; withdrawn signatures excluded). Counts come from
  // head-only queries so they're exact even past the EDMS_FETCHED cap.
  // Failures or a slow response degrade to an empty tab (hidden).
  type EdmTabData = {
    started: Array<{ id: number } & EdmJoined>;
    signed: Array<{ edm_id: number; sponsoring_order: number | null; signed_at: string | null; early_day_motions: EdmJoined | null }>;
    startedCount: number;
    signedCount: number;
    lastUpdated: string | null;
  };
  const pEdms: Promise<EdmTabData> = withTimeout(
    Promise.all([
      supabase
        .from('early_day_motions')
        .select('id, title, uin_with_suffix, date_tabled, signature_count, status, is_prayer, amendment_to_motion_id', { count: 'exact' })
        .eq('primary_sponsor_id', memberId)
        .order('date_tabled', { ascending: false })
        .limit(EDMS_FETCHED),
      supabase
        .from('early_day_motion_signatures')
        .select('edm_id, sponsoring_order, signed_at, early_day_motions(title, uin_with_suffix, date_tabled, signature_count, status, is_prayer, amendment_to_motion_id)', { count: 'exact' })
        .eq('member_id', memberId)
        .eq('is_withdrawn', false)
        .gt('sponsoring_order', 1)
        .order('signed_at', { ascending: false })
        .limit(EDMS_FETCHED),
    ]),
    5000,
  )
    .then(([startedRes, signedRes]) => {
      const started = (startedRes.data as unknown as EdmTabData['started'] | null) ?? [];
      const signed = (signedRes.data as unknown as EdmTabData['signed'] | null) ?? [];
      // This MP's own newest motion (owner, 30 Oct 2026), not the table wide sync time: the newest motion they tabled
      // or signed (both lists are newest first).
      const dates = [started[0]?.date_tabled, signed[0]?.signed_at].filter((d): d is string => !!d).sort();
      return { started, signed, startedCount: startedRes.count ?? 0, signedCount: signedRes.count ?? 0, lastUpdated: dates.length ? dates[dates.length - 1] : null };
    })
    .catch(() => ({ started: [], signed: [], startedCount: 0, signedCount: 0, lastUpdated: null }));

  // Ministerial diary — meetings + hospitality recorded by gov.uk.
  // Only ministers have entries; backbenchers fall through with empty
  // arrays. minister_name is text (display-name format, no honorifics).
  // Both reads run in parallel and are read in full; a failed read throws, so the last good page stays up.
  const [meetingsRows, hospitalityRows] = await pMeetingsHosp;
  const spadAdvisers = await pSpad;
  // Keep only rows that are this MP by the shared rule (lib/mp-recipient-match.ts), same as donations.
  const meetings = meetingsRows.filter((m) => recipientIsMp(m.minister_name, firstWord, lastWord));
  const hospitality = hospitalityRows.filter((h) => recipientIsMp(h.minister_name, firstWord, lastWord));

  // Recent Hansard chamber contributions (mp_contributions), keyed by member_id.
  const { data: contributionsData } = await pContribs;
  const contributions = contributionsData || [];
  const writtenQuestions = await pQuestions;

  const edmsRes = await pEdms;
  // "Last updated" under each profile section whose table lib/data-freshness.ts tracks (owner, 1 Nov 2026): the newest
  // update time of each table, read together once, from the same source as the site's freshness lines. Cached with the
  // page like its other reads. On a read error or timeout no dates are shown and the page still renders.
  const SECTION_SOURCES = { bills: 'bills', voting: 'division_votes', house: 'hansard_contributions', petitions: 'petitions', edms: 'early_day_motions', interests: 'registered_interests', expenses: 'mp_expenses' } as const;
  const sectionUpdated: Partial<Record<keyof typeof SECTION_SOURCES, string>> = {};
  try {
    const newest = await withTimeout(newestTimestamps(Object.values(SECTION_SOURCES)), 9000);
    for (const [section, key] of Object.entries(SECTION_SOURCES) as [keyof typeof SECTION_SOURCES, string][]) {
      const d = newest[key];
      if (d) sectionUpdated[section] = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
    }
  } catch (e) {
    console.error(`/mps/${memberId} section dates:`, e instanceof Error ? e.message : e);
  }
  // The other sections' tables, each read about four times a day across all pages (lib/record-dates.ts). The contact
  // details table holds no update date, so Contact has no line.
  const [rolesUpdated, earningsUpdated, donationsUpdated, diaryUpdated] = await Promise.all([
    updatedDate('mp_committee_memberships', 'synced_at'),
    updatedDate('mp_outside_earnings_summary', 'updated_at'),
    updatedDate('political_donations', 'updated_at'),
    updatedDate('ministers_meetings', 'updated_at'),
  ]);
  const allSectionDates = { ...sectionUpdated, ...(rolesUpdated && { roles: rolesUpdated }), ...(earningsUpdated && { earnings: earningsUpdated }), ...(donationsUpdated && { donations: donationsUpdated }), ...(diaryUpdated && { diary: diaryUpdated }) };
  const edmEntry = (id: number, e: EdmJoined) => ({
    id,
    title: e.title,
    uin: e.uin_with_suffix,
    dateTabled: e.date_tabled,
    signatureCount: e.signature_count,
    withdrawn: e.status === 'withdrawn',
    isPrayer: e.is_prayer,
    isAmendment: e.amendment_to_motion_id != null,
  });
  const mpEdms = {
    startedCount: edmsRes.startedCount,
    signedCount: edmsRes.signedCount,
    started: edmsRes.started.map((e) => ({ ...edmEntry(e.id, e), signedAt: null as string | null, role: 'started' as const })),
    signed: edmsRes.signed
      .filter((s) => s.early_day_motions)
      .map((s) => ({
        ...edmEntry(s.edm_id, s.early_day_motions!),
        signedAt: s.signed_at,
        role: (s.sponsoring_order != null && s.sponsoring_order <= 6 ? 'sponsor' : 'signed') as 'sponsor' | 'signed',
      })),
    lastUpdated: edmsRes.lastUpdated,
  };

  const petitionsAvailable = await pPetitions;

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
    value_exact: number | string | null;
  };
  let mpAppgs: Array<AppgRow & { role: string | null; funders: AppgFunderRow[] }> = [];
  let appgDonorCheckFailed = false;
  if (officerSlugs.length > 0) {
    const [appgsRes, fundersRes] = await Promise.all([
      supabase
        .from('appgs')
        .select('slug, title, purpose, category, secretariat, secretariat_url, registrable_benefits, website_url')
        .in('slug', officerSlugs),
      supabase
        .from('appg_funders')
        .select('appg_slug, source, description, value_band, value_exact')
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
    const funderDonationByName = new Map<string, { totalAmount: number; donationCount: number }>();
    // A failure of this cross check alone is logged and the page renders without the donation figures, with one line
    // saying so, instead of the whole page failing (29 Oct 2026).
    if (funderNames.length > 0) try {
      // Chunk the IN clause — PostgREST gets unhappy past ~200 names.
      // Every stored spelling of each name, quoted, so donor names saved with leading or trailing spaces match, and
      // every row via lib/read-all.ts (the old .limit(5000) still stopped at the API's 1,000 rows). 24 Oct 2026, report 37.
      const chunkSize = 100;
      for (let i = 0; i < funderNames.length; i += chunkSize) {
        const spellings = await storedSpellings(funderNames.slice(i, i + chunkSize));
        const matches = await readAll<{ donor_name: string | null; amount: number | string | null }>(() => supabase.from('political_donations'), {
          columns: 'id, donor_name, amount',
          filter: (q) => q.filter('donor_name', 'in', inList(spellings)),
          orderBy: 'id',
          label: '/mps/[id] APPG funder donations',
        });
        for (const m of matches) {
          const name = (m.donor_name || '').trim();
          if (!name) continue;
          const ex = funderDonationByName.get(name) ?? { totalAmount: 0, donationCount: 0 };
          ex.totalAmount += Number(m.amount) || 0;
          ex.donationCount += 1;
          funderDonationByName.set(name, ex);
        }
      }
    } catch (e) {
      console.error(`/mps/${memberId} APPG funder donations cross check failed:`, e instanceof Error ? e.message : String(e));
      funderDonationByName.clear();
      appgDonorCheckFailed = true;
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
  // committees-api.parliament.uk via app/api/sync-standards-committee (and scripts/sync-standards-committee.js).
  // Resolved findings (member_id matched) only; a name the sync could not match to one member stays unattached.
  const conductRes = await pConduct;
  const staffInterestsRes = await pStaffInterests;
  if (staffInterestsRes.error) console.error(`/mps/${memberId} mp_staff_interests: ${staffInterestsRes.error.message}`);

  const [partySlugRes, partyPeersRes] = await Promise.all([pPartySlug, pPartyPeers]);



  // Tag each vote whose division is a statutory instrument so the render can
  // pick the SI deep-link branch over the external Commons Votes fallback.
  const siPageDivisionIds = (votesRes.data || [])
    .map((v: { division_id: number | null }) => v.division_id)
    .filter((d): d is number => d != null);
  let siDivisionIds = new Set<number>();
  if (siPageDivisionIds.length) {
    const { data: siRows, error: siRowsErr } = await supabase
      .from('statutory_instrument')
      .select('division_id')
      .in('division_id', siPageDivisionIds);
    if (siRowsErr && siRowsErr.code !== 'PGRST116') throw new Error(`/mps/[id] statutory_instrument: ${siRowsErr.message}`);
    siDivisionIds = new Set((siRows || []).map((r: { division_id: number }) => r.division_id));
  }
  // A vote on a hidden bill (bill.hidden_reason) keeps its row but loses the bill link: that page is a 404.
  const hiddenBills = (votesRes.data || []).some((v: { bill_id: number | null }) => v.bill_id != null) ? await getHiddenBillIds() : new Set<number>();
  const votesWithSi = (votesRes.data || []).map((v) => ({
    ...v,
    bill_id: v.bill_id != null && hiddenBills.has(v.bill_id) ? null : v.bill_id,
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

  const fullName = displayMpName(mp.display_name || mp.name || '');
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

  const mpReports = await reportsFor(memberId, fullName);
  const related = await mpRelated({
    memberId,
    name: fullName,
    reportsCount: mpReports?.total ?? 0,
    constituencyGss: mp.current_member === false ? null : ((mp.constituency_gss_code as string | null) ?? null),
    interestsCount: (interestsRes.data || []).filter((r) => (r as { is_current?: boolean }).is_current !== false).length,
    votesCount: Number(voteCounts.all_votes ?? votesWithSi.length) || 0,
  });

  return (
    <>
      <JsonLd data={buildMpPerson({
        memberId,
        fullName,
        party: partyDisplay || mp.party,
        photoUrl: mp.photo_url,
        former: mp.current_member === false,
      })} />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, { name: fullName, path: `/mps/${memberId}` }])} />
    <MpDossier
      memberId={memberId}
      fullName={fullName}
      constituency={mp.constituency ?? null}
      formerMember={mp.current_member === false}
      servedFromYear={mp.start_date ? new Date(mp.start_date).getFullYear() : null}
      servedToYear={mp.end_date ? new Date(mp.end_date).getFullYear() : null}
      partyDisplay={partyDisplay}
      partyExpand={partyDisplay || mp.party || ''}
      partyColour={partyColour}
      partyIsCoop={partyIsCoop}
      photoUrl={mp.photo_url ?? null}
      followable
      sections={{
        memberId,
        paragraphs: (bioRes.data?.bio_visible === true ? bioRes.data.political_bio ?? '' : '').split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0),
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
        phoneHeadline: true,
        donations: [],
        donorOtherRecipients: [],
        sectorCrossRef: [],
        constituencyDonations: [],
        appgs: mpAppgs,
        appgDonorCheckFailed,
        ministerMeetings: meetings,
        ministerHospitality: hospitality,
        spadAdvisers: spadAdvisers ? { ...spadAdvisers, ministerName: fullName, gender: mp.gender ?? null } : null,
        contributions,
        writtenQuestions,
        conductFindings: conductRes.data || [],
        staffInterests: staffInterestsRes.data || [],
        activity: activityRes.data || null,
        // Votes against most of their party (is_rebellion, set from the MP's party on the day of the vote; see the
        // 2026-10-15c migration): since the July 2024 election with the votes cast in that time, and across all the
        // votes we hold. Same rule and counts as the party whip page.
        rebellions: { sinceElection: voteCounts.rebellions_since, votesSinceElection: voteCounts.aye_no_since, allVotes: voteCounts.rebellions_all },
        partyWhipSlug,
        totalVotes: voteCounts.all_votes ?? votesWithSi.length,
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
        committeeMemberships: committeeMembershipsRes.data ?? [],
        formerInterests: formerInterestsRes.data ?? [],
        petitionsAvailable,
        edms: mpEdms,
        reports: mpReports,
        lastUpdated: allSectionDates,
      }}
      footer={
        <>
        {/* Newsletter sign-up at the end of the profile, for readers who are not signed in (report 81). */}
        <ArticleEndSignup source="data-mp-profile" line={DATA_SIGNUP_LINE} />
        {/* The compact Related line, last of the visible content (owner's brief, 3 Nov 2026; lib/related-links.ts). */}
        {/* Not under 640px (owner, 4 Nov 2026): its links repeat sections already on the page. */}
        <style>{'@media (max-width: 639.98px) { .mp-related-line { display: none; } }'}</style>
        <div className="mp-related-line"><RelatedLine links={related} /></div>
        {/* Server-rendered RelatedLinks: same-party MPs, sponsored bills,
           recent votes, party page, optional ministerial dept. Lands as
           crawlable <a href> tags in static HTML for SEO. Wrapped in an
           sr-only-style 1px clipped container so the block is in the
           HTML response (Phase 1 SEO Check 15) but not visible at the
           bottom of the dossier where the user reported it as clutter. */}
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
        </>
      }
    />
    </>
  );
}
