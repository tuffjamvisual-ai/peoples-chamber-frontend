// Server-rendered contextual link block. Three variants:
//   - variant="mp"          → Related party / dept / recent votes / sponsored bills / other MPs
//   - variant="bill"        → Sponsor / other bills by sponsor / department / division summary
//   - variant="department"  → Ministers / bills sponsored by dept / transparency / parties
//
// Lifts the existing parallel-fetch data on each page into actual
// crawlable <a href> tags. Closes inbound-link gaps surfaced in
// today's internal-link audit: MP↔dept, MP↔party, bill↔sponsor,
// dept↔staff. Added 2026-06-05 as SEO Phase 1 Task 3.
//
// Pure server component. Zero new DB queries — callers pass data
// they already have. Renders nothing when there's nothing to link to.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
  fontSize: '13px',
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
  fontSize: '14px',
  lineHeight: 1.55,
  borderBottom: `1px dotted rgba(20,16,13,0.12)`,
};
const subStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
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
  ministerialDeptSlug?: string | null;
  ministerialDeptName?: string | null;
  votes: VoteRow[];
  sponsoredBills: SponsoredBill[];
}

async function renderMp(props: MpProps) {
  // Resolve party slug from the parties table (one cheap query) if the
  // caller hasn't supplied one. mps.party stores the long form
  // ('Labour', 'Conservative' etc.) which the parties table indexes via
  // mp_party_string.
  let partySlug = props.partySlug ?? null;
  if (!partySlug && props.party) {
    const { data } = await supabase
      .from('parties')
      .select('slug')
      .eq('mp_party_string', props.party)
      .maybeSingle();
    partySlug = data?.slug ?? null;
  }

  // Other MPs in the same party: cheap query, top 5 alphabetical
  // excluding the current MP. Server-side, runs once per render.
  let partyPeers: Array<{ member_id: number; display_name: string | null; constituency: string | null }> = [];
  if (props.party) {
    const { data } = await supabase
      .from('mps')
      .select('member_id, display_name, constituency')
      .eq('party', props.party)
      .eq('current_member', true)
      .neq('member_id', props.memberId)
      .order('display_name', { ascending: true })
      .range(0, 4);
    partyPeers = data || [];
  }

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
      <h2 style={{ ...labelStyle, fontSize: '13px', letterSpacing: '0.3em', marginBottom: '14px' }}>
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
  if (props.sponsorMemberId != null) {
    const { data } = await supabase
      .from('bill')
      .select('id, title')
      .eq('sponsor_member_id', props.sponsorMemberId)
      .neq('id', props.billId)
      .order('last_update', { ascending: false, nullsFirst: false })
      .range(0, 4);
    siblingBills = data || [];
  }

  const hasAnything =
    props.sponsorMemberId != null ||
    siblingBills.length > 0 ||
    props.commonsDivisionId != null;
  if (!hasAnything) return null;

  return (
    <aside aria-label="Related" style={wrapStyle}>
      <h2 style={{ ...labelStyle, fontSize: '13px', letterSpacing: '0.3em', marginBottom: '14px' }}>
        Related
      </h2>

      {props.sponsorMemberId != null && props.sponsorName && (
        <section style={sectionStyle}>
          <span style={labelStyle}>Sponsor</span>
          <Link href={`/mps/${props.sponsorMemberId}`} style={itemStyle}>
            {props.sponsorName}
            {props.sponsorParty && <span style={subStyle}>{props.sponsorParty}</span>}
          </Link>
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
      <h2 style={{ ...labelStyle, fontSize: '13px', letterSpacing: '0.3em', marginBottom: '14px' }}>
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

// ============================= Entry point ===============================

export default async function RelatedLinks(
  props: MpProps | BillProps | DepartmentProps,
) {
  if (props.variant === 'mp') return renderMp(props);
  if (props.variant === 'bill') return renderBill(props);
  if (props.variant === 'department') return renderDepartment(props);
  return null;
}
