// Server-rendered contextual link block. Four variants:
//   - variant="mp"           → Related party / dept / recent votes / sponsored bills / other MPs
//   - variant="bill"         → Sponsor / other bills by sponsor / department / division summary
//   - variant="department"   → Ministers / bills sponsored by dept / transparency / parties
//   - variant="pressRelease" → Issuing department / Secretary of State / more from same org
//
// Lifts the existing parallel-fetch data on each page into actual
// crawlable <a href> tags. Closes inbound-link gaps surfaced in
// today's internal-link audit: MP↔dept, MP↔party, bill↔sponsor,
// dept↔staff. Added 2026-06-05 as SEO Phase 1 Task 3.
//
// Pure server component. Renders nothing when there's nothing to link to.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { resolveOrgToDeptSlug } from '@/lib/govOrgSlug';
import { govUrlToSlug } from '@/lib/govUrlSlug';
import { departments } from '@/lib/departments';

const ACCENT = '#7a1612';
const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.18)';
const MONO = 'Special Elite, monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

const wrapStyle: React.CSSProperties = {
  marginTop: '32px',
  paddingTop: '20px',
  borderTop: `1px solid ${INK_HAIRLINE}`,
  fontFamily: MONO,
  color: INK,
};
const sectionStyle: React.CSSProperties = { marginBottom: '20px' };
const labelStyle: React.CSSProperties = {
  fontSize: '15px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: ACCENT,
  marginBottom: '8px',
  display: 'block',
};
const itemStyle: React.CSSProperties = {
  display: 'block',
  padding: '6px 0',
  color: INK,
  textDecoration: 'none',
  // Special Elite per the site-wide typewriter-for-body rule. SERIF
  // kept imported for any future headline use within this file.
  fontFamily: MONO,
  fontSize: '15px',
  lineHeight: 1.55,
  borderBottom: `1px dotted rgba(20,16,13,0.12)`,
};
const subStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '15px',
  fontFamily: MONO,
  color: INK_SOFT,
  marginTop: '2px',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================ MP variant =================================

type VoteRow = {
  division_title: string | null;
  division_date: string | null;
  vote_type: string;
  is_rebellion: boolean;
  bill_id: number | null;
};

type SponsoredBill = {
  id: number;
  title: string;
  current_stage: string | null;
};

interface MpProps {
  variant: 'mp';
  memberId: number;
  party: string | null;
  partySlug: string | null;
  partyPeers: Array<{ member_id: number; display_name: string | null; constituency: string | null }>;
  ministerialDeptSlug?: string | null;
  ministerialDeptName?: string | null;
  votes: VoteRow[];
  sponsoredBills: SponsoredBill[];
}

function renderMp(props: MpProps) {
  const partySlug = props.partySlug;
  const partyPeers = props.partyPeers;

  const recentVotes = props.votes
    .filter((v) => v.vote_type === 'aye' || v.vote_type === 'no')
    .slice(0, 5);
  const topBills = props.sponsoredBills.slice(0, 5);

  // Render nothing if there's literally nothing related to show
  const hasAnything =
    props.party || props.ministerialDeptSlug || recentVotes.length > 0 || topBills.length > 0 || partyPeers.length > 0;
  if (!hasAnything) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {props.party && partySlug && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Party</span>
          <Link href={`/parties/${partySlug}`} style={itemStyle}>
            {props.party}
          </Link>
        </section>
      )}

      {props.ministerialDeptSlug && props.ministerialDeptName && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Department</span>
          <Link href={`/departments/${props.ministerialDeptSlug}`} style={itemStyle}>
            {props.ministerialDeptName}
          </Link>
        </section>
      )}

      {recentVotes.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Recent votes</span>
          {recentVotes.map((v, i) => (
            <Link
              key={i}
              href={v.bill_id ? `/bills/${v.bill_id}` : '#'}
              style={itemStyle}
            >
              {v.division_title || 'Division'}
              <span style={subStyle}>
                {fmtDate(v.division_date)} · {v.vote_type.toUpperCase()}
                {v.is_rebellion ? ' · REBEL' : ''}
              </span>
            </Link>
          ))}
        </section>
      )}

      {topBills.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Bills sponsored</span>
          {topBills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} style={itemStyle}>
              {b.title}
              {b.current_stage && <span style={subStyle}>{b.current_stage}</span>}
            </Link>
          ))}
        </section>
      )}

      {partyPeers.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Other {props.party} MPs</span>
          {partyPeers.map((p) => (
            <Link key={p.member_id} href={`/mps/${p.member_id}`} style={itemStyle}>
              {p.display_name}
              {p.constituency && <span style={subStyle}>{p.constituency}</span>}
            </Link>
          ))}
        </section>
      )}
    </aside>
  );
}

// ============================ Bill variant ===============================

interface BillProps {
  variant: 'bill';
  billId: number;
  sponsorMemberId: number | null;
  sponsorName: string | null;
  sponsorPartySlug?: string | null;
  sponsorParty?: string | null;
  commonsAyes: number | null;
  commonsNoes: number | null;
  commonsDivisionId: number | null;
}

async function renderBill(props: BillProps) {
  // Other bills by same sponsor (server query, top 5 by recency)
  let siblingBills: Array<{ id: number; title: string }> = [];
  let sponsorHasProfile = false;
  if (props.sponsorMemberId != null) {
    const [{ data: bills }, { data: sponsorRow }] = await Promise.all([
      supabase
        .from('bill')
        .select('id, title')
        .eq('sponsor_member_id', props.sponsorMemberId)
        .neq('id', props.billId)
        .order('last_update', { ascending: false, nullsFirst: false })
        .range(0, 4),
      // Only current MPs have a /mps/<id> page. A former-MP sponsor (e.g. a bill
      // from an earlier Parliament) has no profile, so link only if present.
      supabase.from('mps').select('member_id').eq('member_id', props.sponsorMemberId).maybeSingle(),
    ]);
    siblingBills = bills || [];
    sponsorHasProfile = !!sponsorRow;
  }

  const hasAnything =
    props.sponsorMemberId != null ||
    siblingBills.length > 0 ||
    props.commonsDivisionId != null;
  if (!hasAnything) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {props.sponsorMemberId != null && props.sponsorName && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Sponsor</span>
          {sponsorHasProfile ? (
            <Link href={`/mps/${props.sponsorMemberId}`} style={itemStyle}>
              {props.sponsorName}
              {props.sponsorParty && <span style={subStyle}>{props.sponsorParty}</span>}
            </Link>
          ) : (
            <div style={itemStyle}>
              {props.sponsorName}
              {props.sponsorParty && <span style={subStyle}>{props.sponsorParty}</span>}
            </div>
          )}
        </section>
      )}

      {siblingBills.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Other bills by this sponsor</span>
          {siblingBills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} style={itemStyle}>
              {b.title}
            </Link>
          ))}
        </section>
      )}

      {props.commonsDivisionId != null && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Commons division</span>
          <div style={{ ...itemStyle, borderBottom: 'none' }}>
            Aye {props.commonsAyes ?? 0} · No {props.commonsNoes ?? 0}
            <span style={subStyle}>Division #{props.commonsDivisionId}</span>
          </div>
        </section>
      )}
    </aside>
  );
}

// ======================== Department variant =============================

interface DepartmentProps {
  variant: 'department';
  slug: string;
  ministerMemberIds: number[];
}

async function renderDepartment(props: DepartmentProps) {
  // Department ministers as MP links (the names already render in
  // DepartmentMasthead / DepartmentClient, but they don't all link
  // out — this gives Google a clean block of /mps/<id> hrefs from
  // the dept page)
  let ministerLinks: Array<{ member_id: number; display_name: string | null; constituency: string | null; party: string | null }> = [];
  if (props.ministerMemberIds.length > 0) {
    const { data } = await supabase
      .from('mps')
      .select('member_id, display_name, constituency, party')
      .in('member_id', props.ministerMemberIds);
    ministerLinks = data || [];
  }

  // Bills sponsored by any minister of this dept (top 5 most recent)
  let deptBills: Array<{ id: number; title: string }> = [];
  if (props.ministerMemberIds.length > 0) {
    const { data } = await supabase
      .from('bill')
      .select('id, title')
      .in('sponsor_member_id', props.ministerMemberIds)
      .order('last_update', { ascending: false, nullsFirst: false })
      .range(0, 4);
    deptBills = data || [];
  }

  if (ministerLinks.length === 0 && deptBills.length === 0) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {ministerLinks.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Ministers, MP profiles</span>
          {ministerLinks.map((m) => (
            <Link key={m.member_id} href={`/mps/${m.member_id}`} style={itemStyle}>
              {m.display_name}
              {m.constituency && (
                <span style={subStyle}>
                  {m.party ? `${m.party} · ` : ''}
                  {m.constituency}
                </span>
              )}
            </Link>
          ))}
        </section>
      )}

      {deptBills.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Bills sponsored by ministers of this department</span>
          {deptBills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} style={itemStyle}>
              {b.title}
            </Link>
          ))}
        </section>
      )}

      <section style={sectionStyle}>
        <span style={labelStyle}>Transparency for this department</span>
        <Link href={`/transparency/ministers-meetings?dept=${props.slug}`} style={itemStyle}>
          Ministers&rsquo; meetings
        </Link>
        <Link href={`/transparency/hospitality?dept=${props.slug}`} style={itemStyle}>
          Ministers&rsquo; hospitality
        </Link>
      </section>
    </aside>
  );
}

// ======================== Press release variant ===========================

interface PressReleaseProps {
  variant: 'pressRelease';
  organisation: string | null;
  currentGovUrl: string | null;
}

async function renderPressRelease(props: PressReleaseProps) {
  const org = props.organisation;
  const deptSlug = org ? resolveOrgToDeptSlug(org) : null;

  // Fetch SoS and recent releases in parallel. Both are best-effort —
  // the block renders gracefully with whatever resolves.
  const [sosResult, recentResult] = await Promise.all([
    deptSlug
      ? supabase
          .from('dept_ministers')
          .select('name, member_id, role')
          .eq('dept_slug', deptSlug)
          .eq('is_secretary_of_state', true)
          .neq('resigned', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    org
      ? supabase
          .from('press_releases')
          .select('title, gov_url, published_at')
          .eq('organisation', org)
          .not('gov_url', 'is', null)
          .not('removed_upstream', 'is', true)
          .order('published_at', { ascending: false })
          .limit(7)
      : Promise.resolve({ data: [] }),
  ]);

  const sos = sosResult.data as { name: string; member_id: number | null; role: string } | null;

  // Exclude the current release from the "more from" list, take up to 4.
  const currentSlug = props.currentGovUrl ? govUrlToSlug(props.currentGovUrl) : null;
  const recent = ((recentResult.data ?? []) as { title: string; gov_url: string; published_at: string | null }[])
    .filter((r) => {
      if (!r.gov_url) return false;
      if (!currentSlug) return true;
      return govUrlToSlug(r.gov_url) !== currentSlug;
    })
    .slice(0, 4);

  const hasDept = Boolean(deptSlug);
  const hasSos = Boolean(sos);
  const hasRecent = recent.length > 0;

  if (!hasDept && !hasRecent) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {hasDept && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Department</span>
          <Link href={`/departments/${deptSlug}`} style={itemStyle}>
            {org}
          </Link>
        </section>
      )}

      {hasSos && sos && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Secretary of State</span>
          {sos.member_id ? (
            <Link href={`/mps/${sos.member_id}`} style={itemStyle}>
              {sos.name}
              <span style={subStyle}>{sos.role}</span>
            </Link>
          ) : (
            <div style={itemStyle}>
              {sos.name}
              <span style={subStyle}>{sos.role}</span>
            </div>
          )}
        </section>
      )}

      {hasRecent && (
        <section style={sectionStyle}>
          <span style={labelStyle}>More from {org}</span>
          {recent.map((r, i) => {
            const slug = govUrlToSlug(r.gov_url);
            if (!slug) return null;
            return (
              <Link key={i} href={`/news/${slug}`} style={itemStyle}>
                {r.title}
                {r.published_at && (
                  <span style={subStyle}>
                    {new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </Link>
            );
          })}
        </section>
      )}
    </aside>
  );
}

// ========================== Editorial variant =============================

interface EditorialProps {
  variant: 'editorial';
  relatedDeptSlugs?: string[];
  relatedMemberIds?: number[];
  relatedBillIds?: number[];
  relatedProgrammeSlugs?: string[];
}

async function renderEditorial(props: EditorialProps) {
  const deptSlugs = props.relatedDeptSlugs ?? [];
  const memberIds = props.relatedMemberIds ?? [];
  const billIds = props.relatedBillIds ?? [];
  const programmeSlugs = props.relatedProgrammeSlugs ?? [];

  if (
    deptSlugs.length === 0 &&
    memberIds.length === 0 &&
    billIds.length === 0 &&
    programmeSlugs.length === 0
  ) return null;

  const [mpRows, billRows, programmeRows] = await Promise.all([
    memberIds.length > 0
      ? supabase.from('mps').select('member_id, display_name').in('member_id', memberIds)
      : Promise.resolve({ data: [] as { member_id: number; display_name: string | null }[] }),
    billIds.length > 0
      ? supabase.from('bill').select('id, title').in('id', billIds)
      : Promise.resolve({ data: [] as { id: number; title: string }[] }),
    // Anon client — RLS enforces is_live=true; unresolved slugs simply return no row.
    programmeSlugs.length > 0
      ? supabase.from('policy_programmes').select('slug, name').in('slug', programmeSlugs).eq('is_live', true)
      : Promise.resolve({ data: [] as { slug: string; name: string }[] }),
  ]);

  const mps = (mpRows.data ?? []) as { member_id: number; display_name: string | null }[];
  const bills = (billRows.data ?? []) as { id: number; title: string }[];
  const programmes = (programmeRows.data ?? []) as { slug: string; name: string }[];
  const depts = deptSlugs
    .map((slug) => ({ slug, name: departments.find((d) => d.slug === slug)?.name ?? slug }));

  if (depts.length === 0 && mps.length === 0 && bills.length === 0 && programmes.length === 0) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {depts.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Departments</span>
          {depts.map((d) => (
            <Link key={d.slug} href={`/departments/${d.slug}`} style={itemStyle}>
              {d.name}
            </Link>
          ))}
        </section>
      )}

      {mps.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>People</span>
          {mps.map((m) => (
            <Link key={m.member_id} href={`/mps/${m.member_id}`} style={itemStyle}>
              {m.display_name ?? `Member ${m.member_id}`}
            </Link>
          ))}
        </section>
      )}

      {bills.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Legislation</span>
          {bills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} style={itemStyle}>
              {b.title}
            </Link>
          ))}
        </section>
      )}

      {programmes.length > 0 && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Programmes</span>
          {programmes.map((p) => (
            <Link key={p.slug} href={`/programmes/${p.slug}`} style={itemStyle}>
              {p.name}
            </Link>
          ))}
        </section>
      )}
    </aside>
  );
}

// ========================== Division variant ==============================

interface DivisionProps {
  variant: 'division';
  divisionTitle: string | null;
}

// HIGH-CONFIDENCE threshold for division → bill matching.
//
// Strip recognized parliamentary stage markers from the division title (same
// regex chain as stripProceduralSuffix in the division page), then query
// bill.title with an exact case-insensitive match. Only show a bill link if
// EXACTLY ONE bill matches — zero or two+ results both render nothing.
//
// This is intentionally strict: no fuzzy/partial matching, no substring
// matching, no fallback guesses. Procedural titles (Closure motion,
// Opposition Day, Business of the House) do not strip down to any bill title
// and safely return 0 results.
function stripDivisionStage(title: string): string {
  const t = title
    .replace(/\s*[:–-]?\s*\b(Report Stage|Committee Stage|Third Reading|Second Reading|First Reading|Remaining Stages?|Legislative Grand Committee|Programme Motion|Money Resolution|Ways and Means|Consideration of Lords (?:Amendments?|Message)|Motion to (?:disagree|agree|insist))\b.*$/i, '')
    .replace(/\s+Committee:\s.*$/i, '')
    .replace(/:\s*(?:New Clause|New Schedule|Amendments?|Lords Amendments?)\b.*$/i, '')
    .replace(/[\s:,–-]+$/, '')
    .trim();
  return t.length >= 10 ? t : '';
}

async function renderDivision(props: DivisionProps) {
  if (!props.divisionTitle) return null;

  const candidateTitle = stripDivisionStage(props.divisionTitle);
  if (!candidateTitle) return null;

  // Fetch up to 2 to detect ambiguity — 2 results means we cannot know which
  // bill is correct, so we show nothing rather than guess.
  const { data: matchedBills } = await supabase
    .from('bill')
    .select('id, title, sponsor_member_id')
    .ilike('title', candidateTitle)
    .limit(2);

  if (!matchedBills || matchedBills.length !== 1) return null;

  const bill = matchedBills[0] as { id: number; title: string; sponsor_member_id: number | null };

  // Department: only shown when the bill's sponsor is a current, non-resigned
  // minister. Both conditions must hold — no dept link if bill link doesn't.
  let deptSlug: string | null = null;
  let deptName: string | null = null;
  if (bill.sponsor_member_id != null) {
    const { data: dmRow } = await supabase
      .from('dept_ministers')
      .select('dept_slug')
      .eq('member_id', bill.sponsor_member_id)
      .neq('resigned', true)
      .limit(1)
      .maybeSingle();
    if (dmRow?.dept_slug) {
      deptSlug = dmRow.dept_slug;
      deptName = departments.find((d) => d.slug === deptSlug)?.name ?? deptSlug;
    }
  }

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '15px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>
      <section style={sectionStyle}>
        <span style={labelStyle}>Bill</span>
        <Link href={`/bills/${bill.id}`} style={itemStyle}>
          {bill.title}
        </Link>
      </section>
      {deptSlug && deptName && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Department</span>
          <Link href={`/departments/${deptSlug}`} style={itemStyle}>
            {deptName}
          </Link>
        </section>
      )}
    </aside>
  );
}

// ============================= Entry point ===============================

export default async function RelatedLinks(
  props: MpProps | BillProps | DepartmentProps | PressReleaseProps | DivisionProps | EditorialProps,
) {
  if (props.variant === 'mp') return renderMp(props);
  if (props.variant === 'bill') return renderBill(props);
  if (props.variant === 'department') return renderDepartment(props);
  if (props.variant === 'pressRelease') return renderPressRelease(props);
  if (props.variant === 'division') return renderDivision(props);
  if (props.variant === 'editorial') return renderEditorial(props);
  return null;
}
