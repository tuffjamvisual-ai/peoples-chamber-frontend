'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/app/components/Pagination';

type SectionId = 'bio' | 'career' | 'contact' | 'voting' | 'bills' | 'interests' | 'roles' | 'earnings' | 'donations' | 'diary' | 'expenses';

const ALL_SECTIONS: Array<{ id: SectionId; label: string; rotate: string }> = [
  { id: 'bio',       label: 'POLITICAL BIO',    rotate: '0.1deg' },
  { id: 'career',    label: 'BEFORE POLITICS',  rotate: '-0.12deg' },
  { id: 'contact',   label: 'CONTACT',          rotate: '-0.1deg' },
  { id: 'voting',    label: 'VOTING RECORD',    rotate: '0.15deg' },
  { id: 'bills',     label: 'BILLS SPONSORED',  rotate: '-0.2deg' },
  { id: 'interests', label: 'INTERESTS',        rotate: '0.1deg' },
  { id: 'roles',     label: 'ROLES',            rotate: '-0.15deg' },
  { id: 'earnings',  label: 'EARNINGS',         rotate: '0.2deg' },
  { id: 'donations', label: 'DONATIONS',        rotate: '-0.15deg' },
  { id: 'diary',     label: 'DIARY',            rotate: '0.1deg' },
  { id: 'expenses',  label: 'EXPENSES',         rotate: '-0.1deg' },
];

type Vote = { id: number; division_title: string; division_date: string; vote_type: string; is_rebellion?: boolean; bill_id?: number | null; division_id?: number | null; division_date_only?: string | null; division_number?: number | null; is_si?: boolean };
type Bill = { id: number; title: string; status?: string | null; current_stage?: string | null; plain_summary?: string | null; is_act?: boolean | null; last_update?: string | null };
type ChildInterest = { id?: number; interest?: string | null };
type Interest = { category_name: string; interest_text: string | null; child_interests?: ChildInterest[] | null };
type ActivityMetrics = {
  divisions_voted: number | null;
  divisions_total: number | null;
  attendance_pct: number | string | null;
  rebellions_total: number | null;
  rebellion_rate_pct: number | string | null;
  speeches_year: number | null;
  questions_year: number | null;
  refreshed_at: string | null;
};
type MinisterMeeting = {
  id: number;
  minister_name: string | null;
  minister_dept: string | null;
  meeting_date: string | null;
  organisation: string | null;
  purpose: string | null;
  quarter: string | null;
  enriched_description?: string | null;
  source_publication_slug?: string | null;
};
type MinisterHospitality = {
  id: number;
  minister_name: string | null;
  minister_dept: string | null;
  hospitality_date: string | null;
  donor: string | null;
  description: string | null;
  value: string | null;
  quarter: string | null;
  source_publication_slug?: string | null;
};
type ConductFinding = {
  id: number;
  mp_name_at_time: string;
  closed_date: string | null;
  outcome: string | null;
  rule_breached: string | null;
  summary: string | null;
  penalty: string | null;
  url: string | null;
  source: string | null;
};
type DonorOtherRecipients = {
  donor_name: string;
  recipients: Array<{ recipient: string; total: number }>;
};

type AppgEntry = {
  slug: string;
  title: string;
  purpose: string | null;
  category: string | null;
  secretariat: string | null;
  secretariat_url: string | null;
  registrable_benefits: string | null;
  website_url: string | null;
  role: string | null;
  funders: Array<{
    appg_slug: string;
    source: string;
    description: string | null;
    value_band: string | null;
    ecMatch?: { totalAmount: number; donationCount: number } | null;
  }>;
};

type SectorCrossRefEntry = {
  key: string;
  label: string;
  colour: string;
  votes: Array<{
    id: number;
    division_title: string | null;
    division_date: string | null;
    division_date_only: string | null;
    division_number: number | null;
    vote_type: string;
    is_rebellion: boolean | null;
    division_id: number | null;
  }>;
};

// Pure-regex sector tagger — matches donor names against well-known
// industry keywords. Not exhaustive; meant to surface the obvious
// 'this donor is in sector X' so a reader can spot pattern.
const SECTOR_PATTERNS: Array<{ key: string; label: string; re: RegExp; colour: string }> = [
  { key: 'tradeunion', label: 'Trade union', re: /\b(unite the union|unite$|unison|gmb|usdaw|cwu|aslef|nasuwt|nut|nutuc|tuc|fbu|prospect|equity|musicians.{0,5}union|writers.{0,5}guild|community union|fda union|napo|nuj|nautilus|pcs|rmt|tssa|ucu|bda)\b/i, colour: '#a64030' },
  { key: 'property',   label: 'Property',   re: /\b(properties|property|estates|developments|homes ltd|housing|real estate|landlord|land ltd|builders|construction)\b/i, colour: '#5e3a14' },
  { key: 'finance',    label: 'Finance',    re: /\b(capital|partners|investments?|hedge|fund management|asset management|equity|holdings|securities|wealth|private bank|sovereign)\b/i, colour: '#1a4666' },
  { key: 'gambling',   label: 'Gambling',   re: /\b(gambling|bet365|bookmakers?|paddy power|ladbrokes|coral|william hill|casino|bingo|betting|wagering|lottery)\b/i, colour: '#7a4a16' },
  { key: 'defence',    label: 'Defence',    re: /\b(defence|defense|arms|aerospace|missile|naval systems|bae|qinetiq|babcock|leonardo|raytheon|lockheed)\b/i, colour: '#3b3b3b' },
  { key: 'energy',     label: 'Oil & gas',  re: /\b(oil|petroleum|gas ltd|shell|bp\s|exxon|chevron|drilling|exploration|lng|coal)\b/i, colour: '#222' },
  { key: 'media',      label: 'Media',      re: /\b(media|publishing|newspapers?|press ltd|broadcast|telegraph|times newspapers|news uk|news group|daily mail|guardian media|reach plc)\b/i, colour: '#444' },
  { key: 'pharma',     label: 'Pharma',     re: /\b(pharma|biotech|pharmaceuticals?|astrazeneca|gsk|glaxo|life sciences|medicines|vaccines|biopharma)\b/i, colour: '#4a8a3a' },
  { key: 'tech',       label: 'Tech',       re: /\b(technologies|technology|software|systems ltd|digital ltd|ai labs|data labs|microsoft|google|amazon|meta platforms|apple inc)\b/i, colour: '#005b8a' },
  { key: 'tobacco',    label: 'Tobacco',    re: /\b(tobacco|vape|vaping|imperial brands|british american tobacco|bat plc|philip morris|nicotine)\b/i, colour: '#8b4513' },
  { key: 'crypto',     label: 'Crypto',     re: /\b(crypto|coin ltd|bitcoin|blockchain|digital asset|web3|defi)\b/i, colour: '#704214' },
];

function sectorFor(donorName: string): { label: string; colour: string } | null {
  for (const s of SECTOR_PATTERNS) {
    if (s.re.test(donorName)) return { label: s.label, colour: s.colour };
  }
  return null;
}

type Donation = {
  id: number;
  donor_name: string | null;
  donor_type: string | null;
  donor_status?: string | null;
  amount: number | string | null;
  cash_value?: number | string | null;
  non_cash_value?: number | string | null;
  accepted_date: string | null;
  received_date: string | null;
  reported_date: string | null;
  published_date?: string | null;
  dealt_with_date?: string | null;
  nature: string | null;
  recipient_type: string | null;
  manner_in_which_made?: string | null;
  purpose_of_visit?: string | null;
  position_standing_for?: string | null;
  campaigning_name?: string | null;
  accounting_unit_name?: string | null;
  donation_action?: string | null;
  reporting_period_name?: string | null;
  reporting_period_type?: string | null;
  is_aggregation?: boolean | null;
  is_bequest?: boolean | null;
  is_sponsorship?: boolean | null;
  is_anonymous?: boolean | null;
  is_irish_source?: boolean | null;
  is_reported_pre_poll?: boolean | null;
  returned_date?: string | null;
  impermissibility_reason?: string | null;
  attempted_concealment?: boolean | null;
  concealment_details?: string | null;
  trust_name?: string | null;
  trust_creator_name?: string | null;
  trust_creator_status?: string | null;
  trust_created_date?: string | null;
  company_registration_number?: string | null;
  addr_line1?: string | null;
  addr_town?: string | null;
  addr_postcode?: string | null;
  addr_country?: string | null;
  explanatory_notes?: string | null;
  ec_ref?: string | null;
};
type Representation = { name: string; startDate: string; endDate?: string | null };
type PartyHistoryEntry = { party?: string; name?: string; startDate?: string; endDate?: string | null };
type ExpenseSummary = {
  year: number;
  total_spend: number | null;
  office_spend?: number | null;
  staffing_spend?: number | null;
  accommodation_spend?: number | null;
  travel_subsistence_spend?: number | null;
  other_costs_spend?: number | null;
  winding_up_spend?: number | null;
};
type ExpenseClaim = {
  claim_number?: string | null;
  year: number;
  claim_date: string | null;
  category: string | null;
  cost_type: string | null;
  short_description: string | null;
  details?: string | null;
  amount_claimed?: number | null;
  amount_paid: number | null;
  amount_not_paid?: number | null;
  amount_repaid?: number | null;
  status: string | null;
  reason_if_not_paid?: string | null;
  journey_from?: string | null;
  journey_to?: string | null;
  mileage?: number | null;
  nights?: number | null;
};
type Earnings = {
  base: number;
  band_label: string | null;
  ministerial: number;
  outside: number;
  outside_claim_count: number;
  outside_source_count: number;
  personal_total: number;
  public_spend: number;
  public_spend_year: number | null;
};
type Contact = {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  twitter?: string | null;
  address_line1?: string | null;
  postcode?: string | null;
} | null;

interface Props {
  memberId: number;
  paragraphs: string[];
  contact: Contact;
  votes: Vote[];
  /** Total vote count across all pages — for the "N divisions recorded" line. */
  totalVotes?: number;
  /** 1-indexed current page within the voting tab. */
  votePage?: number;
  /** Page size for the voting tab. Pagination derives totalPages from this. */
  votesPerPage?: number;
  /** When set (via ?section= on the URL), opens the named section on mount. */
  initialSection?: string | null;
  /** Server-evaluated search term applied to the voting record's titles. */
  voteQuery?: string;
  sponsoredBills: Bill[];
  interests: Interest[];
  donations?: Donation[];
  donorOtherRecipients?: DonorOtherRecipients[];
  sectorCrossRef?: SectorCrossRefEntry[];
  constituencyDonations?: Donation[];
  appgs?: AppgEntry[];
  ministerMeetings?: MinisterMeeting[];
  ministerHospitality?: MinisterHospitality[];
  conductFindings?: ConductFinding[];
  activity?: ActivityMetrics | null;
  bio: {
    representations?: Representation[];
    government_posts?: Array<{ name: string }>;
    opposition_posts?: Array<{ name: string }>;
    committee_memberships?: Array<{ id?: number; name?: string } | string>;
    party_history?: PartyHistoryEntry[];
    occupation_before_politics?: string | null;
    career_history?: Array<{ role: string; organisation?: string | null; period?: string | null; detail?: string | null }> | null;
  } | null;
  earnings: Earnings;
  expenses: ExpenseSummary[];
  expensesDetail: ExpenseClaim[];
  // Opt-in (landing page only): float the sidebar with a JS scroll handler instead of
  // CSS position: sticky, so it survives a transformed ancestor (the tilted folder).
  // Default off — the live MP profile pages keep their native CSS sticky.
  jsSticky?: boolean;
  // Visual zoom applied to this component by the parent (so the JS sticky can convert
  // viewport px into the element's local px). 1 = no zoom.
  stickyScale?: number;
  // Landing page only: abbreviate the expenses column headers and drop any breakdown
  // column that is zero across every year, so the table fits a narrow folder.
  compactExpenses?: boolean;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const sectionH2: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 'bold',
  marginBottom: '24px',
  color: '#14100d',
  fontFamily: 'Special Elite, monospace',
  transform: 'rotate(-0.2deg)',
  textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
};

const sectionH3: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '24px',
  marginBottom: '12px',
  color: '#14100d',
  fontFamily: 'Special Elite, monospace',
};

const inkLink: React.CSSProperties = { color: '#7a1612', textDecoration: 'underline' };
const inkDivider = '1px dashed rgba(20,16,13,0.2)';

const thStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: '11px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const callP: React.CSSProperties = {
  margin: 0,
  marginBottom: '10px',
  fontFamily: 'Special Elite, monospace',
  fontSize: '13px',
  lineHeight: 1.65,
};

const callPLast: React.CSSProperties = { ...callP, marginBottom: 0 };

const pillStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontFamily: 'Special Elite, monospace',
  background: 'transparent',
  whiteSpace: 'nowrap',
};

export default function MagazineProfileSections({
  memberId,
  paragraphs,
  contact,
  votes,
  totalVotes,
  votePage = 1,
  votesPerPage = 20,
  initialSection = null,
  voteQuery = '',
  sponsoredBills,
  interests,
  donations = [],
  donorOtherRecipients = [],
  sectorCrossRef = [],
  constituencyDonations = [],
  appgs = [],
  ministerMeetings = [],
  ministerHospitality = [],
  conductFindings = [],
  activity = null,
  bio,
  earnings,
  expenses,
  expensesDetail,
  jsSticky = false,
  stickyScale = 1,
  compactExpenses = false,
}: Props) {
  const has: Record<SectionId, boolean> = {
    bio: paragraphs.length > 0,
    career: !!(bio?.career_history && bio.career_history.length > 0),
    contact: !!(contact && (contact.phone || contact.email || contact.website || contact.twitter || contact.address_line1)),
    voting: (totalVotes ?? votes.length) > 0,
    bills: sponsoredBills.length > 0,
    interests: interests.length > 0,
    roles: !!(
      (bio?.government_posts && bio.government_posts.length > 0) ||
      (bio?.opposition_posts && bio.opposition_posts.length > 0) ||
      (bio?.committee_memberships && bio.committee_memberships.length > 0) ||
      (bio?.representations && bio.representations.length > 0) ||
      (bio?.party_history && bio.party_history.length > 0)
    ),
    earnings: true, // Always shown — every MP has the base salary at minimum.
    donations: donations.length > 0,
    diary: ministerMeetings.length > 0 || ministerHospitality.length > 0,
    expenses: expenses.length > 0,
  };
  const sections = ALL_SECTIONS.filter((s) => has[s.id]);
  const validIds = new Set<SectionId>(sections.map((s) => s.id));

  // Honour ?section= on initial mount so paginating the voting record
  // (which forces a full reload via the href-based <Pagination>) lands
  // the user back on the voting tab rather than the default first tab.
  const initialActive: SectionId =
    initialSection && validIds.has(initialSection as SectionId)
      ? (initialSection as SectionId)
      : (sections[0]?.id ?? 'bio');
  const [active, setActive] = useState<SectionId>(initialActive);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // JS-driven float (opt-in). CSS sticky can't work under a transformed ancestor, so when
  // jsSticky is on we translate the sidebar down to keep it pinned ~24px from the top,
  // clamped to its container. All measurements use getBoundingClientRect (viewport/visual
  // px); the offset is divided by stickyScale to convert back to the element's local px.
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stickyOffset, setStickyOffset] = useState(0);
  useEffect(() => {
    if (!jsSticky) return;
    const el = stickyRef.current;
    if (!el) return;
    const TOP_GAP = 24;
    const compute = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const maxVisual = Math.max(0, pr.height - er.height - 8);
      const visualDelta = Math.max(0, Math.min(TOP_GAP - pr.top, maxVisual));
      setStickyOffset(visualDelta / stickyScale);
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [jsSticky, stickyScale]);

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.slice(1) as SectionId;
      if (h && validIds.has(h)) setActive(h);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [validIds]);

  const select = (id: SectionId) => {
    setActive(id);
    if (typeof window !== 'undefined') history.replaceState(null, '', `#${id}`);
  };

  // Index expense claims by year for the drilldown.
  const claimsByYear = useMemo(() => {
    const map = new Map<number, ExpenseClaim[]>();
    for (const c of expensesDetail) {
      if (!map.has(c.year)) map.set(c.year, []);
      map.get(c.year)!.push(c);
    }
    return map;
  }, [expensesDetail]);

  const allBreakdown: Array<{ key: keyof ExpenseSummary; label: string; short: string }> = [
    { key: 'office_spend',             label: 'Office',               short: 'Office' },
    { key: 'staffing_spend',           label: 'Staffing',             short: 'Staff' },
    { key: 'accommodation_spend',      label: 'Accommodation',        short: 'Accom.' },
    { key: 'travel_subsistence_spend', label: 'Travel + Subsistence', short: 'Travel' },
    { key: 'other_costs_spend',        label: 'Other costs',          short: 'Other' },
    { key: 'winding_up_spend',         label: 'Winding-up',           short: 'Wind.' },
  ];
  // Compact mode (landing folder): abbreviate headers and drop any column that is zero
  // across every year, so the table fits without horizontal scrolling.
  const breakdownLabels = allBreakdown
    .filter((b) => !compactExpenses || expenses.some((e) => Number(e[b.key]) > 0))
    .map((b) => ({ key: b.key, label: compactExpenses ? b.short : b.label }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-px" style={{ marginTop: '-80px' }}>
      <aside className="lg:col-span-1">
        <div
          ref={stickyRef}
          className={jsSticky ? undefined : 'lg:sticky lg:top-16'}
          style={jsSticky ? { transform: `translateY(${stickyOffset}px)`, willChange: 'transform' } : undefined}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px', marginRight: '24px' }}>
            {sections.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => select(s.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #7a1612' : '4px solid transparent',
                    background: isActive ? 'rgba(122,22,18,0.08)' : 'transparent',
                    boxShadow: isActive ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: isActive ? 'bold' : 'normal',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#14100d',
                    fontFamily: 'inherit',
                    transform: `rotate(${s.rotate})`,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="lg:col-span-3 p-6 sm:p-8" style={{ color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        {active === 'career' && (
          <>
            <h2 style={sectionH2}>Before Politics</h2>
            <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '20px' }}>Career and roles held before entering Parliament.</p>
            {(bio?.career_history ?? []).map((job, idx) => {
              const last = idx === (bio?.career_history?.length ?? 0) - 1;
              return (
                <div key={idx} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: last ? 'none' : '1px solid rgba(20,16,13,0.15)' }}>
                  <div style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: 1.3 }}>{job.role}</div>
                  {job.organisation && <div style={{ fontSize: '15px', opacity: 0.85, marginTop: '2px' }}>{job.organisation}</div>}
                  {job.period && <div style={{ fontSize: '13px', opacity: 0.6, fontStyle: 'italic', marginTop: '2px' }}>{job.period}</div>}
                  {job.detail && <div style={{ fontSize: '14px', lineHeight: 1.6, marginTop: '6px' }}>{job.detail}</div>}
                </div>
              );
            })}
          </>
        )}
        {active === 'bio' && (
          <>
            <h2 style={sectionH2}>Political Biography</h2>

            {/* Activity stat-tile strip removed 2026-06-06 per user request.
                The mp_activity_metrics data is still fetched and passed in
                as the `activity` prop; the ActivityTile component is still
                defined below. Reinstate by restoring the <section> block
                here if the metrics view is wanted back. */}

            <div style={{ lineHeight: '1.8', fontSize: '16px', letterSpacing: '0.01em' }}>
              {paragraphs.length === 0 ? (
                <p>Biography unavailable.</p>
              ) : paragraphs.map((para, idx) => {
                const tilt = idx % 4;
                const rot = tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                return <p key={idx} style={{ marginBottom: '16px', transform: `rotate(${rot})` }}>{para}</p>;
              })}
            </div>

            {conductFindings.length > 0 && (
              <section style={{ marginTop: '32px', padding: '14px 16px', border: '1px solid #a64030', background: 'rgba(166,64,48,0.04)' }}>
                <h3 style={{ ...sectionH3, marginTop: 0, marginBottom: '8px', color: '#a64030' }}>
                  Standards findings <span style={{ opacity: 0.6, fontWeight: 'normal', fontSize: '13px' }}>({conductFindings.length})</span>
                </h3>
                <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
                  Cases referred to the House of Commons Committee on Standards. The Committee publishes a numbered report for each case; outcome and penalty (where applicable) live inside the report PDF.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', lineHeight: 1.55 }}>
                  {conductFindings.map((f) => (
                    <li key={f.id} style={{ padding: '8px 0', borderBottom: inkDivider }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong style={{ fontFamily: 'monospace' }}>{f.closed_date ? new Date(f.closed_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ', '}</strong>
                        <span>{f.summary || `Finding against ${f.mp_name_at_time}`}</span>
                      </div>
                      {(f.outcome || f.rule_breached || f.penalty) && (
                        <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>
                          {f.outcome && <span>Outcome: <strong>{f.outcome}</strong>. </span>}
                          {f.rule_breached && <span>Rule: {f.rule_breached}. </span>}
                          {f.penalty && <span>Penalty: {f.penalty}.</span>}
                        </div>
                      )}
                      {f.url && (
                        <div style={{ marginTop: '4px' }}>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ ...inkLink, fontSize: '12px' }}>View original ruling &rarr;</a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {active === 'contact' && contact && (
          <>
            <h2 style={sectionH2}>Contact</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '16px', lineHeight: '1.8' }}>
              {contact.phone && <li><strong>Phone:</strong> <span style={{ fontFamily: 'monospace' }}>{contact.phone}</span></li>}
              {contact.email && <li><strong>Email:</strong> <a href={`mailto:${contact.email}`} style={inkLink}>{contact.email}</a></li>}
              {contact.website && <li><strong>Website:</strong> <a href={contact.website.match(/^https?:\/\//) ? contact.website : `https://${contact.website.replace(/^\/+/, '')}`} target="_blank" rel="noopener noreferrer" style={inkLink}>{contact.website}</a></li>}
              {contact.twitter && <li><strong>X / Twitter:</strong> <a href={contact.twitter} target="_blank" rel="noopener noreferrer" style={inkLink}>{contact.twitter}</a></li>}
              {(contact.address_line1 || contact.postcode) && (
                <li style={{ marginTop: '12px' }}>
                  <strong>Constituency office:</strong>
                  <div style={{ marginLeft: '12px', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                    {contact.address_line1 || ''}
                    {contact.address_line1 && contact.postcode ? '\n' : ''}
                    {contact.postcode || ''}
                  </div>
                </li>
              )}
            </ul>
          </>
        )}

        {active === 'voting' && (
          <>
            <h2 style={sectionH2}>Voting Record</h2>

            {/* Per-section search. Native HTML <form> with GET so it works
                without JS and the URL captures the query for sharing.
                Submitting always lands on page 1 of the matches. */}
            <form
              action={`/mps/${memberId}`}
              method="GET"
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '16px',
                fontFamily: 'Special Elite, monospace',
                fontSize: '14px',
              }}
            >
              <input type="hidden" name="section" value="voting" />
              <input type="hidden" name="vp" value="1" />
              <input
                type="search"
                name="vq"
                defaultValue={voteQuery}
                placeholder="Search this MP's votes…"
                aria-label="Search voting record"
                style={{
                  flex: '1 1 220px',
                  minWidth: 0,
                  padding: '6px 10px',
                  fontFamily: 'Special Elite, monospace',
                  fontSize: '14px',
                  color: '#14100d',
                  border: '1px solid rgba(20,16,13,0.3)',
                  background: 'transparent',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  fontFamily: 'Special Elite, monospace',
                  fontSize: '13px',
                  letterSpacing: '0.04em',
                  color: '#14100d',
                  border: '1px solid rgba(20,16,13,0.3)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
              {voteQuery && (
                <Link
                  href={`/mps/${memberId}?section=voting`}
                  style={{ ...inkLink, fontSize: '13px', marginLeft: '4px' }}
                >
                  Clear
                </Link>
              )}
            </form>

            <p style={{ marginBottom: '16px' }}>
              {voteQuery ? (
                <>
                  <strong>{(totalVotes ?? votes.length).toLocaleString()}</strong>{' '}
                  match{(totalVotes ?? votes.length) === 1 ? '' : 'es'} for &ldquo;{voteQuery}&rdquo;
                </>
              ) : (
                <>
                  <strong>{(totalVotes ?? votes.length).toLocaleString()}</strong> divisions recorded
                </>
              )}
              {(totalVotes ?? votes.length) > votesPerPage && (
                <>
                  {' '}
                  · showing {votesPerPage * (votePage - 1) + 1}-
                  {Math.min(votesPerPage * votePage, totalVotes ?? votes.length)}
                </>
              )}
              .
            </p>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
              {votes.map((v) => (
                <li key={v.id} style={{ padding: '8px 0', borderBottom: inkDivider }}>
                  <div>
                    {v.bill_id ? (
                      <Link href={`/bills/${v.bill_id}`} style={inkLink}>
                        {v.division_title}
                      </Link>
                    ) : v.is_si && v.division_id ? (
                      <Link href={`/statutory-instruments/${v.division_id}`} style={inkLink}>
                        {v.division_title}
                      </Link>
                    ) : v.division_date_only && v.division_number != null ? (
                      // Our own division detail page renders the full per-MP
                      // breakdown grouped by party — built on the parlparse
                      // import data we already hold. Slug matches the
                      // parlparse id format so external sites linking to us
                      // can use the same URL shape.
                      <Link
                        href={`/divisions/pw-${v.division_date_only}-${v.division_number}-commons`}
                        style={inkLink}
                      >
                        {v.division_title}
                      </Link>
                    ) : (
                      v.division_title
                    )}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.7 }}>
                    {fmtDate(v.division_date)} · <strong>{v.vote_type.toUpperCase()}</strong>
                    {v.is_rebellion && <span style={{ color: '#7a1612' }}> · REBEL</span>}
                  </div>
                </li>
              ))}
            </ul>
            {(totalVotes ?? votes.length) > votesPerPage && (
              <div style={{ marginTop: '24px' }}>
                <Pagination
                  currentPage={votePage}
                  totalPages={Math.ceil((totalVotes ?? votes.length) / votesPerPage)}
                  baseUrl={`/mps/${memberId}`}
                  qsExtra={`&section=voting${voteQuery ? `&vq=${encodeURIComponent(voteQuery)}` : ''}`}
                  pageParam="vp"
                />
              </div>
            )}

            {/* Empty-state when a search returns nothing. The clear link
                routes back to the unfiltered first page. */}
            {voteQuery && votes.length === 0 && (
              <p style={{ marginTop: '20px', fontStyle: 'italic', opacity: 0.7 }}>
                No divisions matched &ldquo;{voteQuery}&rdquo;.{' '}
                <Link href={`/mps/${memberId}?section=voting`} style={inkLink}>
                  Show all
                </Link>
                .
              </p>
            )}
          </>
        )}

        {active === 'bills' && (
          <>
            <h2 style={sectionH2}>Bills Sponsored</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
              {sponsoredBills.map((b) => (
                <li key={b.id} style={{ padding: '12px 0', borderBottom: inkDivider }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Link href={`/bills/${b.id}`} style={{ ...inkLink, fontWeight: 'bold' }}>{b.title}</Link>
                    {b.is_act && <span style={{ background: '#7a1612', color: '#f4e8d4', padding: '1px 6px', fontSize: '13px', letterSpacing: '0.08em' }}>✓ ACT</span>}
                    {b.status && <span style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.status}</span>}
                  </div>
                  {b.current_stage && (
                    <div style={{ fontSize: '13px', opacity: 0.75 }}>Stage: {b.current_stage}{b.last_update ? ` · updated ${fmtDate(b.last_update)}` : ''}</div>
                  )}
                  {b.plain_summary && (
                    <p style={{ marginTop: '6px', fontSize: '14px', lineHeight: '1.55', opacity: 0.9 }}>{b.plain_summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {active === 'interests' && (() => {
          // Register taxonomy folded into 7 themed buckets so a reader
          // can scan 'what does this MP get gifts from' without parsing
          // category numbers. Empty buckets don't render. Order chosen
          // so the high-misuse-potential categories surface first:
          // Gifts → Visits → Land → Shareholdings → Family → Indirect
          // support → Misc. Employment & earnings (Cat 1) is intentionally
          // omitted here because it's already covered on the Earnings tab
          // with a richer per-payer breakdown.
          const buckets: Array<{ key: string; label: string; match: (cat: string) => boolean }> = [
            { key: 'gifts', label: 'Gifts, benefits & hospitality',
              match: (c) => /^3\.|^5\./.test(c) },
            { key: 'visits', label: 'Visits outside the UK',
              match: (c) => /^4\./.test(c) },
            { key: 'land', label: 'Land & property portfolio',
              match: (c) => /^6\./.test(c) },
            { key: 'shares', label: 'Shareholdings',
              match: (c) => /^7\./.test(c) },
            { key: 'family', label: 'Family employment & lobbying',
              match: (c) => /^9\.|^10\./.test(c) },
            { key: 'support', label: 'Campaign & office support',
              match: (c) => /^2\./.test(c) },
            { key: 'misc', label: 'Miscellaneous',
              match: (c) => /^8\./.test(c) },
            { key: 'earnings', label: 'Employment & earnings (see Earnings tab for breakdown)',
              match: (c) => /^1\./.test(c) },
          ];
          const grouped = buckets
            .map((b) => ({ ...b, rows: interests.filter((i) => b.match(i.category_name || '')) }))
            .filter((b) => b.rows.length > 0);

          function renderRow(i: Interest, idx: number) {
            const children = Array.isArray(i.child_interests) ? i.child_interests : [];
            return (
              <li key={idx} style={{ padding: '8px 0', borderBottom: inkDivider }}>
                <div style={{ fontSize: '11px', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>{i.category_name}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{i.interest_text}</div>
                {children.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', marginLeft: '12px', borderLeft: '2px solid rgba(20,16,13,0.15)' }}>
                    {children.map((c, ci) => (
                      <li key={c.id ?? ci} style={{ padding: '4px 0 4px 12px', fontSize: '14px', opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                        {c.interest || ''}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          }

          return (
            <>
              <h2 style={sectionH2}>Registered Interests</h2>
              <p style={{ marginBottom: '16px', fontSize: '13px', opacity: 0.7, lineHeight: 1.6 }}>
                Mandatory declarations under the House of Commons Register of Members&rsquo; Financial Interests. Grouped by the Register&rsquo;s own categories: items potentially material to an MP&rsquo;s parliamentary work. This is the MP&rsquo;s own disclosure, the donor-side view of political donations lives on the Donations tab and may overlap with the &ldquo;Campaign &amp; office support&rdquo; section below.
              </p>
              {grouped.map((b) => (
                <section key={b.key} style={{ marginBottom: '20px' }}>
                  <h3 style={{ ...sectionH3, marginTop: '8px' }}>
                    {b.label} <span style={{ opacity: 0.55, fontWeight: 'normal', fontSize: '13px' }}>({b.rows.length})</span>
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
                    {b.rows.map((i, idx) => renderRow(i, idx))}
                  </ul>
                </section>
              ))}
            </>
          );
        })()}

        {active === 'roles' && (
          <div style={{ fontSize: '15px', lineHeight: '1.7' }}>
            <h2 style={sectionH2}>Roles</h2>

            {bio?.representations && bio.representations.length > 0 && (
              <>
                <h3 style={sectionH3}>Parliamentary career</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {bio.representations.map((r, i) => (
                    <li key={i} style={{ padding: '6px 0', borderBottom: inkDivider }}>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: '13px', opacity: 0.75, fontFamily: 'monospace' }}>
                        {fmtDate(r.startDate)}, {r.endDate ? fmtDate(r.endDate) : 'present'}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {bio?.government_posts && bio.government_posts.length > 0 && (
              <>
                <h3 style={sectionH3}>Government posts</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
                  {bio.government_posts.map((p, i) => <li key={i}>{p.name}</li>)}
                </ul>
              </>
            )}

            {bio?.opposition_posts && bio.opposition_posts.length > 0 && (
              <>
                <h3 style={sectionH3}>Opposition posts</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
                  {bio.opposition_posts.map((p, i) => <li key={i}>{p.name}</li>)}
                </ul>
              </>
            )}

            {bio?.committee_memberships && bio.committee_memberships.length > 0 && (
              <>
                <h3 style={sectionH3}>Committee memberships</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
                  {bio.committee_memberships.map((c, i) => <li key={i}>{typeof c === 'string' ? c : c.name}</li>)}
                </ul>
              </>
            )}

            {bio?.party_history && bio.party_history.length > 0 && (
              <>
                <h3 style={sectionH3}>Party history</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {bio.party_history.map((p, i) => (
                    <li key={i} style={{ padding: '4px 0' }}>
                      <strong>{p.party || p.name}</strong>
                      {(p.startDate || p.endDate) && (
                        <span style={{ marginLeft: '8px', fontSize: '13px', opacity: 0.75, fontFamily: 'monospace' }}>
                          {p.startDate ? fmtDate(p.startDate) : '?'}, {p.endDate ? fmtDate(p.endDate) : 'present'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {appgs.length > 0 && (
              <>
                <h3 style={sectionH3}>All-Party Parliamentary Groups officered</h3>
                <p style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.55, marginBottom: '12px', maxWidth: '60ch' }}>
                  APPGs are unofficial cross-party groups MPs run on specific topics. Each group&rsquo;s registered funders are the entities paying for its secretariat, research and events. Officers are the MPs responsible for the group. Together they are the formal lobbying channel inside Westminster, the one that doesn&rsquo;t appear on the Register of Members&rsquo; Financial Interests.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: 1.55 }}>
                  {appgs.map((a) => (
                    <li key={a.slug} style={{ padding: '10px 0', borderBottom: inkDivider }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong>{a.title}</strong>
                        {a.role && (
                          <span style={{ ...pillStyle, color: /chair/i.test(a.role) ? '#a64030' : 'rgba(20,16,13,0.7)', border: `1px solid ${/chair/i.test(a.role) ? '#a64030' : 'rgba(20,16,13,0.25)'}` }}>
                            {a.role}
                          </span>
                        )}
                        {a.category && (
                          <span style={{ fontSize: '11px', opacity: 0.6 }}>{a.category}</span>
                        )}
                      </div>
                      {a.secretariat && (() => {
                        // Same slug rule as /secretariats/[slug]/page.tsx
                        const secSlug = a.secretariat.toLowerCase()
                          .replace(/&/g, ' and ')
                          .replace(/'/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '')
                          .slice(0, 100);
                        return (
                          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85 }}>
                            <span style={{ opacity: 0.6 }}>Secretariat:</span>{' '}
                            <Link href={`/secretariats/${secSlug}`} style={inkLink}>{a.secretariat}</Link>
                            {a.secretariat_url && (
                              <> · <a href={a.secretariat_url} target="_blank" rel="noopener noreferrer" style={{ ...inkLink, fontSize: '11px' }}>website ↗</a></>
                            )}
                          </div>
                        );
                      })()}
                      {a.funders.length > 0 && (
                        <details style={{ marginTop: '6px', fontSize: '12px' }}>
                          <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', color: '#7a1612' }}>
                            Funders of this group ({a.funders.length})
                          </summary>
                          <ul style={{ listStyle: 'none', padding: '6px 0 0 12px', borderLeft: '2px solid rgba(122,22,18,0.25)', marginLeft: '6px', marginTop: '4px' }}>
                            {a.funders.slice(0, 20).map((f, i) => (
                              <li key={i} style={{ padding: '4px 0', fontSize: '12px' }}>
                                <strong>{f.source}</strong>
                                {f.value_band && <span style={{ opacity: 0.75 }}> · £{f.value_band}</span>}
                                {f.ecMatch && f.ecMatch.donationCount > 0 && (
                                  <span style={{ marginLeft: '6px', ...pillStyle, color: '#7a1612', border: '1px solid #7a1612', fontSize: '10px' }} title="Also a registered political donor under this name in Electoral Commission records">
                                    Also donates · {fmtMoney(f.ecMatch.totalAmount)} · {f.ecMatch.donationCount}×
                                  </span>
                                )}
                                {f.description && (
                                  <div style={{ opacity: 0.7, marginTop: '2px', whiteSpace: 'pre-wrap' }}>{f.description}</div>
                                )}
                              </li>
                            ))}
                            {a.funders.length > 20 && (
                              <li style={{ opacity: 0.6 }}>… and {a.funders.length - 20} more</li>
                            )}
                          </ul>
                        </details>
                      )}
                      {a.website_url && (
                        <div style={{ marginTop: '4px', fontSize: '12px' }}>
                          <a href={a.website_url} target="_blank" rel="noopener noreferrer" style={{ ...inkLink, fontSize: '12px' }}>Group website &rarr;</a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {active === 'earnings' && (() => {
          // Per-payer breakdown of outside earnings — extracted from the
          // Category 1 "Employment and earnings" register declarations
          // we already pass in via `interests`. Matches the parsing logic
          // in scripts/backfill-outside-earnings.js so the totals here
          // reconcile with mp_outside_earnings_summary.
          const AMOUNT_RE = /£\s*([\d,]+(?:\.\d{1,2})?)/g;
          const PAYER_RE = /(?:^|\|)\s*Payer:\s*([^|]+?)(?:\s*\(|\s*\|\s*ACOBA|$)/i;
          const ROLE_RE = /Role,?\s*work\s*or\s*services:\s*([^\r\n|]+)/i;
          const ACOBA_RE = /ACOBA\s*consulted:\s*(Yes|No)/i;
          const FROM_RE = /From:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i;
          const UNTIL_RE = /Until:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i;
          const HOURS_RE = /Hours:\s*([\d.,]+)\s*hr?s?/i;
          const DONATED_RE = /Donated to:/i;
          const FX_RE = /converted from|spot rate|the original currency/i;

          function parseUkDate(s: string): Date | null {
            const d = new Date(s);
            return Number.isNaN(d.getTime()) ? null : d;
          }

          const cat1 = interests.filter((i) => /employment and earnings/i.test(i.category_name));
          type Row = {
            payer: string;
            roles: Set<string>;
            total: number;
            count: number;
            hours: number;
            acoba: 'Yes' | 'No' | null;
            donated: boolean;
            fx: boolean;
            fromDate: Date | null;
            untilDate: Date | null;
            anyOngoing: boolean;     // any role with no Until date
          };
          const byPayer = new Map<string, Row>();
          const now = new Date();

          for (const i of cat1) {
            const raw = String(i.interest_text || '').replace(/\r\n/g, '|');
            const pm = PAYER_RE.exec(raw);
            const payer = (pm ? pm[1].split(',')[0].trim() : '(unspecified payer)');
            const rm = ROLE_RE.exec(raw);
            const role = rm ? rm[1].trim() : '';
            const am = ACOBA_RE.exec(raw);
            const acoba = am ? (am[1] as 'Yes' | 'No') : null;
            const fm = FROM_RE.exec(raw);
            const fromDate = fm ? parseUkDate(fm[1]) : null;
            const um = UNTIL_RE.exec(raw);
            const untilDate = um ? parseUkDate(um[1]) : null;

            const children = Array.isArray(i.child_interests) ? i.child_interests : [];
            for (const c of children) {
              const text = String(c.interest || '');
              const ms = [...text.matchAll(AMOUNT_RE)];
              let subtotal = 0;
              for (const mm of ms) subtotal += parseFloat(mm[1].replace(/,/g, ''));
              if (subtotal === 0 && ms.length === 0) continue;

              const hm = HOURS_RE.exec(text);
              const hours = hm ? parseFloat(hm[1].replace(/,/g, '')) || 0 : 0;
              const childUntilM = UNTIL_RE.exec(text);
              const childUntil = childUntilM ? parseUkDate(childUntilM[1]) : null;
              const effectiveUntil = childUntil || untilDate;

              const existing = byPayer.get(payer) ?? {
                payer,
                roles: new Set<string>(),
                total: 0, count: 0, hours: 0,
                acoba: null, donated: false, fx: false,
                fromDate: null, untilDate: null, anyOngoing: false,
              };
              existing.total += subtotal;
              existing.count += 1;
              existing.hours += hours;
              if (role) existing.roles.add(role);
              if (acoba && !existing.acoba) existing.acoba = acoba;
              if (DONATED_RE.test(text)) existing.donated = true;
              if (FX_RE.test(text)) existing.fx = true;
              if (fromDate && (!existing.fromDate || fromDate < existing.fromDate)) existing.fromDate = fromDate;
              if (effectiveUntil && (!existing.untilDate || effectiveUntil > existing.untilDate)) existing.untilDate = effectiveUntil;
              if (!effectiveUntil) existing.anyOngoing = true;
              byPayer.set(payer, existing);
            }
          }
          const rows = Array.from(byPayer.values()).sort((a, b) => b.total - a.total);

          function isActiveRow(r: Row): boolean {
            if (r.anyOngoing) return true;
            return r.untilDate ? r.untilDate >= now : false;
          }

          return (
            <>
              <h2 style={sectionH2}>Earnings</h2>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.8' }}>
                <li><strong>Base MP salary:</strong> {fmtMoney(earnings.base)}</li>
                <li><strong>Ministerial salary:</strong> {fmtMoney(earnings.ministerial)} {earnings.band_label ? `(${earnings.band_label})` : ''}</li>
                <li><strong>Outside earnings:</strong> {fmtMoney(earnings.outside)} ({earnings.outside_claim_count} payments from {earnings.outside_source_count} sources)</li>
                <li style={{ marginTop: '12px', fontSize: '20px' }}><strong>Total personal earnings:</strong> {fmtMoney(earnings.personal_total)}</li>
                <li style={{ marginTop: '12px', fontSize: '13px', opacity: 0.7 }}>Public spend (IPSA, {earnings.public_spend_year ?? ', '}): {fmtMoney(earnings.public_spend)}</li>
              </ul>

              {rows.length > 0 && (
                <>
                  <h3 style={{ ...sectionH3, marginTop: '28px' }}>Outside earnings by payer</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '8px', tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(20,16,13,0.4)', textAlign: 'left' }}>
                        <th style={thStyle}>Payer / role</th>
                        <th style={thStyle}>Payments</th>
                        <th style={thStyle}>Hours</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>£/hr</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const active = isActiveRow(r);
                        const hourly = r.hours > 0 ? r.total / r.hours : null;
                        const roleList = Array.from(r.roles).slice(0, 3).join(' · ');
                        return (
                          <tr key={r.payer} style={{ borderBottom: inkDivider, verticalAlign: 'top' }}>
                            <td style={{ padding: '6px 4px' }}>
                              <div style={{ fontWeight: 'bold' }}>{r.payer}</div>
                              {roleList && (
                                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{roleList}</div>
                              )}
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {/* Status badge */}
                                <span style={{ ...pillStyle, color: active ? '#4a8a3a' : 'rgba(20,16,13,0.5)', border: `1px solid ${active ? '#4a8a3a' : 'rgba(20,16,13,0.25)'}` }}>
                                  {active ? 'Active' : 'Ended'}
                                </span>
                                {/* ACOBA */}
                                {r.acoba && (
                                  <span style={{ ...pillStyle, color: r.acoba === 'Yes' ? 'rgba(20,16,13,0.7)' : '#a64030', border: `1px solid ${r.acoba === 'Yes' ? 'rgba(20,16,13,0.25)' : '#a64030'}` }}>
                                    ACOBA: {r.acoba}
                                  </span>
                                )}
                                {/* Donated to charity */}
                                {r.donated && (
                                  <span style={{ ...pillStyle, color: '#4a8a3a', border: '1px solid #4a8a3a' }}>↻ Donated</span>
                                )}
                                {/* FX-converted note */}
                                {r.fx && (
                                  <span style={{ ...pillStyle, color: 'rgba(20,16,13,0.6)', border: '1px solid rgba(20,16,13,0.25)' }} title="Amount converted from a non-GBP original">
                                    £ converted
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{r.count}</td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{r.hours > 0 ? r.hours.toLocaleString('en-GB') : ', '}</td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {hourly !== null ? fmtMoney(hourly) : ', '}
                            </td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
                Base salary is set by IPSA and reviewed annually each 1 April. The ministerial supplement has been frozen at 2010 levels by successive prime ministers; figures shown are the rates actually drawn, not the statutory entitlement. Outside earnings come from the Register of Members&rsquo; Financial Interests and reflect cumulative declarations since this Parliament started; the Register is updated as MPs declare, typically within two weeks of the payment. Public spend is the most recent closed IPSA financial year on file, the current year is not totalled until IPSA reconciles year-end.
              </p>
              {rows.some((r) => r.acoba) && (
                <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
                  <strong>ACOBA</strong> is the Advisory Committee on Business Appointments, the independent body that vets new jobs taken by former ministers and senior officials in the two years after they leave government. It reviews each role for conflicts of interest and can recommend conditions such as lobbying bans or waiting periods, though it cannot block an appointment. &ldquo;ACOBA: Yes&rdquo; means the appointment was submitted for review; &ldquo;ACOBA: No&rdquo; means it was not, which is sometimes legitimate (the rules did not apply) and sometimes a story (an ex minister$1 bypassing the vetting).
                </p>
              )}
            </>
          );
        })()}

        {active === 'donations' && (() => {
          // EC donations directed at this MP (recipient_type IN ('MP - Member
          // of Parliament', 'Regulated Donee', ...) AND recipient_name fuzzy-
          // matched in the server query). Aggregate + per-donor + flagged
          // rows (returned / impermissible / concealed) surfaced separately.
          const total = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
          const cashTotal = donations.reduce((s, d) => s + (d.nature?.toLowerCase().includes('cash') ? (Number(d.amount) || 0) : 0), 0);
          const nonCashTotal = total - cashTotal;
          const prePollTotal = donations.reduce((s, d) => s + (d.is_reported_pre_poll === true ? (Number(d.amount) || 0) : 0), 0);
          const returned = donations.filter((d) => d.returned_date);
          const impermissible = donations.filter((d) => d.impermissibility_reason);
          const concealed = donations.filter((d) => d.attempted_concealment);
          // Other-recipients lookup keyed by donor name, computed server-side
          // so this is a cheap O(1) probe inside the render.
          const otherByDonor = new Map<string, Array<{ recipient: string; total: number }>>();
          for (const o of donorOtherRecipients) otherByDonor.set(o.donor_name, o.recipients);

          const byDonor = new Map<string, { name: string; total: number; count: number; first: string | null; last: string | null; donor_type: string | null; crn: string | null; trust: boolean }>();
          for (const d of donations) {
            const name = (d.donor_name || '(anonymous)').trim() || '(anonymous)';
            const v = Number(d.amount) || 0;
            const existing = byDonor.get(name) ?? { name, total: 0, count: 0, first: null, last: null, donor_type: null, crn: null, trust: false };
            existing.total += v;
            existing.count += 1;
            const dateStr = d.accepted_date || d.received_date;
            if (dateStr) {
              if (!existing.first || dateStr < existing.first) existing.first = dateStr;
              if (!existing.last || dateStr > existing.last) existing.last = dateStr;
            }
            if (!existing.donor_type && d.donor_type) existing.donor_type = d.donor_type;
            const crnNorm = (d.company_registration_number || '').trim();
            if (!existing.crn && crnNorm) existing.crn = crnNorm;
            if (!existing.trust && (d.trust_name || d.trust_creator_name)) existing.trust = true;
            byDonor.set(name, existing);
          }
          const donorRows = Array.from(byDonor.values()).sort((a, b) => b.total - a.total);

          // Concentration: top 3 donors' share of total
          const top3 = donorRows.slice(0, 3).reduce((s, r) => s + r.total, 0);
          const concentrationPct = total > 0 ? (top3 / total) * 100 : 0;
          const prePollPct = total > 0 ? (prePollTotal / total) * 100 : 0;

          // Cumulative running totals per donor — sort each donor's
          // donations chronologically and accumulate; map keyed by donation id.
          const cumulativeById = new Map<number, number>();
          {
            const perDonor = new Map<string, Donation[]>();
            for (const d of donations) {
              const name = (d.donor_name || '(anonymous)').trim() || '(anonymous)';
              if (!perDonor.has(name)) perDonor.set(name, []);
              perDonor.get(name)!.push(d);
            }
            for (const list of perDonor.values()) {
              const sorted = list.slice().sort((a, b) => {
                const ad = a.accepted_date || a.received_date || a.reported_date || '';
                const bd = b.accepted_date || b.received_date || b.reported_date || '';
                if (ad === bd) return 0;
                return ad < bd ? -1 : 1;
              });
              let running = 0;
              for (const d of sorted) {
                running += Number(d.amount) || 0;
                cumulativeById.set(d.id, running);
              }
            }
          }

          return (
            <>
              <h2 style={sectionH2}>Donations</h2>

              {/* Short summary at the top of the tab; the full critique
                  lives at /explainers/donations and is linked below. */}
              <section style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(20,16,13,0.04)', borderLeft: '3px solid #7a1612' }}>
                <p style={callPLast}>
                  The UK&rsquo;s political donation system asks politicians to declare who funds them and trusts them to tell the truth. There is no independent audit of what MPs receive. Donations below £500 need not be declared at all. Unincorporated associations and trusts can donate without revealing who provided the money. A company registered at Companies House with entirely foreign ownership and no UK employees is a permissible donor. Fines for non compliance are low enough to be treated as a cost of doing business. No major reform has been implemented since 2000. The register records what politicians chose to disclose, not what actually happened.
                </p>
                <p style={{ margin: '10px 0 0 0', fontFamily: 'Special Elite, monospace', fontSize: '12px' }}>
                  <Link href="/explainers/donations" style={{ color: '#7a1612', textDecoration: 'underline' }}>
                    Read the full explainer &rarr;
                  </Link>
                </p>
              </section>

              <p style={{ marginBottom: '8px', fontSize: '14px', opacity: 0.85 }}>
                <strong>{fmtMoney(total)}</strong> directed at this MP personally across {donations.length.toLocaleString()} donation{donations.length === 1 ? '' : 's'} from {donorRows.length.toLocaleString()} donor{donorRows.length === 1 ? '' : 's'}.
                {donorRows.length >= 3 && (
                  <> Top 3 donors account for <strong>{concentrationPct.toFixed(1)}%</strong> of all donations.</>
                )}
                {prePollTotal > 0 && (
                  <> Pre-poll period: <strong>{prePollPct.toFixed(1)}%</strong>.</>
                )}
              </p>

              {/* Constituency-association donations — the indirect
                  channel that bypasses MP-direct accounting. Rendered
                  before the by-donor table so readers see the bigger
                  number for MPs whose money flows through the local
                  party. */}
              {constituencyDonations.length > 0 && (() => {
                const localTotal = constituencyDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                const localDonorSet = new Set(constituencyDonations.map((d) => (d.donor_name || '').trim()).filter((n) => n));
                // Per-donor roll-up
                const localByDonor = new Map<string, { name: string; total: number; count: number }>();
                for (const d of constituencyDonations) {
                  const name = (d.donor_name || '(anonymous)').trim() || '(anonymous)';
                  const ex = localByDonor.get(name) ?? { name, total: 0, count: 0 };
                  ex.total += Number(d.amount) || 0;
                  ex.count += 1;
                  localByDonor.set(name, ex);
                }
                const localDonorRows = Array.from(localByDonor.values()).sort((a, b) => b.total - a.total);
                return (
                  <section style={{ marginBottom: '24px', padding: '14px 16px', background: 'rgba(20,16,13,0.04)', borderLeft: '3px solid #7a4a16' }}>
                    <h3 style={{ ...sectionH3, marginTop: 0, marginBottom: '6px' }}>
                      Plus {fmtMoney(localTotal)} to this MP&rsquo;s local constituency party
                    </h3>
                    <p style={{ fontSize: '12px', opacity: 0.75, lineHeight: 1.55, marginBottom: '12px' }}>
                      {constituencyDonations.length.toLocaleString()} donation{constituencyDonations.length === 1 ? '' : 's'} from {localDonorSet.size.toLocaleString()} donor{localDonorSet.size === 1 ? '' : 's'}, recorded against the local constituency association rather than against the MP individually. This is the channel through which the majority of substantive funding to major-party MPs flows. Same donors, same political effect, different accounting envelope.
                    </p>
                    <details>
                      <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', fontWeight: 'bold', fontSize: '13px', padding: '6px 0' }}>
                        Top donors to this MP&rsquo;s local association ({localDonorRows.length})
                      </summary>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(20,16,13,0.3)', textAlign: 'left' }}>
                            <th style={thStyle}>Donor</th>
                            <th style={thStyle}>Donations</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {localDonorRows.slice(0, 50).map((d) => {
                            const sector = sectorFor(d.name);
                            return (
                              <tr key={d.name} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                                <td style={{ padding: '4px 4px' }}>
                                  <strong>{d.name}</strong>
                                  {sector && (
                                    <span style={{ marginLeft: '6px', ...pillStyle, color: sector.colour, border: `1px solid ${sector.colour}` }}>{sector.label}</span>
                                  )}
                                </td>
                                <td style={{ padding: '4px 4px', fontFamily: 'monospace' }}>{d.count}</td>
                                <td style={{ padding: '4px 4px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{fmtMoney(d.total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {localDonorRows.length > 50 && <p style={{ padding: '4px 0', fontSize: '12px', opacity: 0.7 }}>Showing top 50 of {localDonorRows.length}.</p>}
                    </details>
                  </section>
                );
              })()}

              {(returned.length > 0 || impermissible.length > 0 || concealed.length > 0) && (
                <section style={{ marginBottom: '20px', padding: '10px 12px', border: '1px solid #a64030', background: 'rgba(166,64,48,0.06)' }}>
                  <h3 style={{ ...sectionH3, marginTop: 0, marginBottom: '6px', color: '#a64030' }}>Flagged</h3>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: 1.7 }}>
                    {returned.length > 0 && (
                      <li><strong>{returned.length}</strong> donation{returned.length === 1 ? '' : 's'} returned to donor totalling {fmtMoney(returned.reduce((s, d) => s + (Number(d.amount) || 0), 0))}</li>
                    )}
                    {impermissible.length > 0 && (
                      <li><strong>{impermissible.length}</strong> recorded as impermissible (e.g. donor not on the UK electoral register) totalling {fmtMoney(impermissible.reduce((s, d) => s + (Number(d.amount) || 0), 0))}</li>
                    )}
                    {concealed.length > 0 && (
                      <li><strong>{concealed.length}</strong> attempted-concealment cases totalling {fmtMoney(concealed.reduce((s, d) => s + (Number(d.amount) || 0), 0))}</li>
                    )}
                  </ul>
                </section>
              )}

              <h3 style={sectionH3}>By donor</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(20,16,13,0.4)', textAlign: 'left' }}>
                    <th style={thStyle}>Donor</th>
                    <th style={thStyle}>Donations</th>
                    <th style={thStyle}>First</th>
                    <th style={thStyle}>Latest</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {donorRows.map((d) => {
                    const sector = sectorFor(d.name);
                    const others = otherByDonor.get(d.name) ?? [];
                    // Slug matches the rule used by /donors/[slug]
                    const donorSlug = d.name.toLowerCase().replace(/&/g, ' and ').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
                    return (
                      <tr key={d.name} style={{ borderBottom: inkDivider, verticalAlign: 'top' }}>
                        <td style={{ padding: '5px 4px' }}>
                          <div style={{ fontWeight: 'bold' }}>
                            <Link href={`/donors/${donorSlug}`} style={inkLink}>{d.name}</Link>
                            {d.crn && (
                              <>
                                {' '}
                                <a
                                  href={`https://find-and-update.company-information.service.gov.uk/company/${d.crn}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ ...inkLink, fontSize: '11px', fontWeight: 'normal' }}
                                  title={`Companies House, ${d.crn}`}
                                >
                                  CH&nbsp;↗
                                </a>
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                            {d.donor_type && (
                              <span style={{ ...pillStyle, color: 'rgba(20,16,13,0.7)', border: '1px solid rgba(20,16,13,0.25)' }}>{d.donor_type}</span>
                            )}
                            {sector && (
                              <span style={{ ...pillStyle, color: sector.colour, border: `1px solid ${sector.colour}` }}>{sector.label}</span>
                            )}
                            {d.trust && (
                              <span style={{ ...pillStyle, color: '#7a4a16', border: '1px solid #7a4a16' }} title="One or more donations from this donor was paid via a trust">↻ via trust</span>
                            )}
                          </div>
                          {others.length > 0 && (
                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                              Also funds:{' '}
                              {others.map((o, i) => (
                                <span key={o.recipient}>
                                  {i > 0 && ', '}
                                  {o.recipient}
                                  <span style={{ opacity: 0.6 }}> ({fmtMoney(o.total)})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '5px 4px', fontFamily: 'monospace' }}>{d.count}</td>
                        <td style={{ padding: '5px 4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.first ? new Date(d.first).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ', '}</td>
                        <td style={{ padding: '5px 4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.last ? new Date(d.last).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ', '}</td>
                        <td style={{ padding: '5px 4px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{fmtMoney(d.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {sectorCrossRef.length > 0 && (() => {
                const totalByKey = new Map<string, { total: number; donors: Set<string> }>();
                for (const d of donations) {
                  const sec = sectorFor((d.donor_name || '').trim());
                  if (!sec) continue;
                  const ex = totalByKey.get(sec.label.toLowerCase()) ?? { total: 0, donors: new Set<string>() };
                  ex.total += Number(d.amount) || 0;
                  if (d.donor_name) ex.donors.add(d.donor_name);
                  totalByKey.set(sec.label.toLowerCase(), ex);
                }
                return (
                  <section style={{ marginBottom: '24px', padding: '14px 16px', background: 'rgba(122,22,18,0.05)', borderLeft: '3px solid #7a1612' }}>
                    <h3 style={{ ...sectionH3, marginTop: 0, marginBottom: '8px' }}>Voted on bills touching their donor sectors</h3>
                    <p style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.55, marginBottom: '12px' }}>
                      Each block below pairs a sector this MP received money from with every Commons division they voted on that touched that sector. Both halves of this data are public, the cross-reference is not. Read it and decide whether the pattern is coincidence or alignment.
                    </p>
                    {sectorCrossRef.map((s) => {
                      const stat = totalByKey.get(s.label.toLowerCase());
                      return (
                        <div key={s.key} style={{ marginBottom: '20px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap', borderBottom: `2px solid ${s.colour}`, paddingBottom: '4px', marginBottom: '8px' }}>
                            <span style={{ ...pillStyle, color: s.colour, border: `1px solid ${s.colour}`, fontSize: '11px' }}>{s.label}</span>
                            {stat && (
                              <span style={{ fontSize: '12px', opacity: 0.75 }}>
                                {fmtMoney(stat.total)} from {stat.donors.size} donor{stat.donors.size === 1 ? '' : 's'} · {s.votes.length} sector vote{s.votes.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: 1.55 }}>
                            {s.votes.slice(0, 20).map((v) => {
                              const dateText = v.division_date ? new Date(v.division_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                              const voteColour = v.vote_type === 'aye' ? '#4a8a3a' : v.vote_type === 'no' ? '#a64030' : 'rgba(20,16,13,0.6)';
                              const slug = v.division_date_only && v.division_number != null
                                ? `pw-${v.division_date_only}-${v.division_number}-commons`
                                : null;
                              return (
                                <li key={v.id} style={{ padding: '4px 0', borderBottom: inkDivider, display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', opacity: 0.75, whiteSpace: 'nowrap' }}>{dateText}</span>
                                  {slug ? (
                                    <Link href={`/divisions/${slug}`} style={{ ...inkLink, fontSize: '13px' }}>{v.division_title}</Link>
                                  ) : (
                                    <span>{v.division_title}</span>
                                  )}
                                  <span style={{ marginLeft: 'auto', color: voteColour, fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase' }}>{v.vote_type}</span>
                                  {v.is_rebellion && <span style={{ color: '#7a1612', fontSize: '11px', fontWeight: 'bold' }}>REBEL</span>}
                                </li>
                              );
                            })}
                          </ul>
                          {s.votes.length > 20 && (
                            <p style={{ fontSize: '12px', opacity: 0.6, margin: '4px 0 0 0' }}>Showing 20 of {s.votes.length}.</p>
                          )}
                        </div>
                      );
                    })}
                  </section>
                );
              })()}

              {donations.length > 0 && (
                <details style={{ marginBottom: '20px' }}>
                  <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', fontWeight: 'bold', fontSize: '13px', padding: '6px 0' }}>
                    Every donation chronologically ({donations.length})
                  </summary>
                  <div style={{ marginTop: '8px' }}>
                    {donations
                      .slice()
                      .sort((a, b) => {
                        // Newest first by the same date-resolution logic the row displays.
                        // Server-side `.order('accepted_date', desc)` doesn't agree with the
                        // displayed date when accepted_date is NULL but received_date is set.
                        const ad = a.accepted_date || a.received_date || a.reported_date || '';
                        const bd = b.accepted_date || b.received_date || b.reported_date || '';
                        if (ad === bd) return 0;
                        return ad < bd ? 1 : -1;
                      })
                      .slice(0, 200)
                      .map((d) => {
                      const date = d.accepted_date || d.received_date || d.reported_date;
                      const dateText = date ? new Date(date).toLocaleDateString('en-GB') : ', ';
                      const crn = (d.company_registration_number || '').trim();
                      const donorRunning = cumulativeById.get(d.id) ?? null;
                      const donorRow = byDonor.get((d.donor_name || '(anonymous)').trim() || '(anonymous)');
                      const isRepeat = donorRow && donorRow.count > 1 && donorRunning != null && donorRunning < donorRow.total;
                      return (
                        <details key={d.id} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)', padding: '6px 0' }}>
                          <summary style={{ cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap', fontSize: '13px' }}>
                            <span style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', opacity: 0.85 }}>{dateText}</span>
                            <span style={{ fontWeight: 'bold' }}>{d.donor_name || '(anonymous)'}</span>
                            <span style={{ opacity: 0.7, fontSize: '12px' }}>{d.donor_type || ', '}</span>
                            <span style={{ opacity: 0.7, fontSize: '12px' }}>· {d.nature || ', '}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(Number(d.amount) || 0)}</span>
                            {isRepeat && donorRunning != null && (
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.7, whiteSpace: 'nowrap' }}>
                                ({fmtMoney(donorRunning)} cumulative)
                              </span>
                            )}
                          </summary>
                          <DonationDetail d={d} crn={crn} />
                        </details>
                      );
                    })}
                  </div>
                  {donations.length > 200 && <p style={{ padding: '6px 0', fontSize: '12px', opacity: 0.7 }}>Showing first 200 of {donations.length}.</p>}
                </details>
              )}

              <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
                Cash and non-cash combined: {fmtMoney(cashTotal)} cash, {fmtMoney(nonCashTotal)} non-cash. Source: Electoral Commission donation register, refreshed weekly.
              </p>

            </>
          );
        })()}

        {active === 'diary' && (() => {
          // Ministerial diary — meetings + hospitality recorded by gov.uk
          // and published quarterly per department. Joined to this MP by
          // name on the server side. Cabinet meetings + departmental
          // engagements + Spads' arrangements all appear here.
          const meetings = ministerMeetings;
          const hospitality = ministerHospitality;
          const meetByOrg = new Map<string, { name: string; count: number; latest: string | null }>();
          for (const m of meetings) {
            const k = (m.organisation || '(unspecified)').trim();
            const ex = meetByOrg.get(k) ?? { name: k, count: 0, latest: null };
            ex.count += 1;
            if (m.meeting_date && (!ex.latest || m.meeting_date > ex.latest)) ex.latest = m.meeting_date;
            meetByOrg.set(k, ex);
          }
          const topOrgs = Array.from(meetByOrg.values()).sort((a, b) => b.count - a.count);

          const hospByDonor = new Map<string, { name: string; count: number; total: number; latest: string | null }>();
          let hospitalityCashTotal = 0;
          for (const h of hospitality) {
            const k = (h.donor || '(unspecified)').trim();
            const vNum = (() => {
              const m = String(h.value || '').match(/£\s*([\d,]+(?:\.\d{1,2})?)/);
              return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
            })();
            const ex = hospByDonor.get(k) ?? { name: k, count: 0, total: 0, latest: null };
            ex.count += 1;
            ex.total += vNum;
            hospitalityCashTotal += vNum;
            if (h.hospitality_date && (!ex.latest || h.hospitality_date > ex.latest)) ex.latest = h.hospitality_date;
            hospByDonor.set(k, ex);
          }
          const topDonors = Array.from(hospByDonor.values()).sort((a, b) => b.total - a.total || b.count - a.count);

          return (
            <>
              <h2 style={sectionH2}>Ministerial diary</h2>
              <p style={{ marginBottom: '16px', fontSize: '13px', opacity: 0.7, lineHeight: 1.6 }}>
                Meetings and hospitality recorded by the relevant government department under the ministerial transparency regime. Published quarterly with a 2-3 month lag. Backbench engagements and constituency surgeries are not included.
              </p>

              {meetings.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h3 style={sectionH3}>Meetings <span style={{ opacity: 0.55, fontWeight: 'normal', fontSize: '13px' }}>({meetings.length.toLocaleString()})</span></h3>
                  <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Distinct organisations met: {topOrgs.length.toLocaleString()}.</p>
                  <details style={{ marginBottom: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', fontWeight: 'bold', fontSize: '13px', padding: '6px 0' }}>
                      Top organisations by meeting count
                    </summary>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(20,16,13,0.3)', textAlign: 'left' }}>
                          <th style={thStyle}>Organisation</th>
                          <th style={thStyle}>Meetings</th>
                          <th style={thStyle}>Latest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOrgs.slice(0, 50).map((o) => (
                          <tr key={o.name} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                            <td style={{ padding: '4px 4px' }}>{o.name}</td>
                            <td style={{ padding: '4px 4px', fontFamily: 'monospace' }}>{o.count}</td>
                            <td style={{ padding: '4px 4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{o.latest ? new Date(o.latest).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ', '}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  <details>
                    <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', fontWeight: 'bold', fontSize: '13px', padding: '6px 0' }}>
                      Every meeting chronologically
                    </summary>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: 1.55 }}>
                      {meetings.slice(0, 300).map((m) => (
                        <li key={m.id} style={{ padding: '5px 0', borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ', '}</span>
                          {' · '}{m.organisation || '(unspecified)'}
                          {m.purpose && <div style={{ fontSize: '12px', opacity: 0.75, marginLeft: '8px' }}>{m.purpose}</div>}
                        </li>
                      ))}
                    </ul>
                    {meetings.length > 300 && <p style={{ padding: '4px 0', fontSize: '12px', opacity: 0.7 }}>Showing first 300 of {meetings.length}.</p>}
                  </details>
                </section>
              )}

              {hospitality.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h3 style={sectionH3}>Hospitality received <span style={{ opacity: 0.55, fontWeight: 'normal', fontSize: '13px' }}>({hospitality.length.toLocaleString()})</span></h3>
                  <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                    Recorded value where stated: {fmtMoney(hospitalityCashTotal)} across {topDonors.length.toLocaleString()} distinct providers.
                  </p>
                  <details>
                    <summary style={{ cursor: 'pointer', fontFamily: 'Special Elite, monospace', fontWeight: 'bold', fontSize: '13px', padding: '6px 0' }}>
                      Hospitality by provider
                    </summary>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(20,16,13,0.3)', textAlign: 'left' }}>
                          <th style={thStyle}>Provider</th>
                          <th style={thStyle}>Items</th>
                          <th style={thStyle}>Latest</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Recorded £</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topDonors.slice(0, 50).map((d) => (
                          <tr key={d.name} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                            <td style={{ padding: '4px 4px' }}>{d.name}</td>
                            <td style={{ padding: '4px 4px', fontFamily: 'monospace' }}>{d.count}</td>
                            <td style={{ padding: '4px 4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.latest ? new Date(d.latest).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ', '}</td>
                            <td style={{ padding: '4px 4px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>{d.total > 0 ? fmtMoney(d.total) : ', '}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </section>
              )}
            </>
          );
        })()}

        {active === 'expenses' && (() => {
          // Refused / repaid roll-up across this MP's entire detail set.
          // Powerful accountability signal that was previously invisible —
          // amount_not_paid + amount_repaid + reason_if_not_paid columns
          // are populated by IPSA but weren't surfaced anywhere.
          const refused: ExpenseClaim[] = expensesDetail.filter((c) => Number(c.amount_not_paid) > 0);
          const repaid:  ExpenseClaim[] = expensesDetail.filter((c) => Number(c.amount_repaid) > 0);
          const refusedTotal = refused.reduce((s, c) => s + Number(c.amount_not_paid ?? 0), 0);
          const repaidTotal  = repaid.reduce((s, c) => s + Number(c.amount_repaid ?? 0), 0);
          return (
          <>
            <h2 style={sectionH2}>Expenses</h2>
            <p style={{ marginBottom: '8px', fontSize: '14px', opacity: 0.85 }}>Annual IPSA totals with category breakdown. Click a year to drill into individual claims.</p>
            <p style={{ marginBottom: '16px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
              The IPSA financial year runs 1 April to 31 March. Annual totals are published a few months after each year ends; individual claims are released quarterly with a two to three month lag, so the most recent months in any year are typically still filling in.
            </p>

            {(refused.length > 0 || repaid.length > 0) && (
              <section style={{ marginBottom: '24px', padding: '12px 14px', border: '1px solid rgba(20,16,13,0.25)', background: 'rgba(166,64,48,0.05)' }}>
                <h3 style={{ ...sectionH3, marginTop: 0, marginBottom: '8px' }}>Refused &amp; repaid</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.55, marginBottom: '8px' }}>
                  {refused.length > 0 && (
                    <>
                      IPSA refused <strong>{fmtMoney(refusedTotal)}</strong> across {refused.length.toLocaleString()} claim{refused.length === 1 ? '' : 's'}.
                    </>
                  )}
                  {refused.length > 0 && repaid.length > 0 && ' '}
                  {repaid.length > 0 && (
                    <>
                      Amount this MP later repaid: <strong>{fmtMoney(repaidTotal)}</strong> across {repaid.length.toLocaleString()} claim{repaid.length === 1 ? '' : 's'}.
                    </>
                  )}
                </p>
                {refused.length > 0 && (
                  <details style={{ fontSize: '12px', marginTop: '6px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Refused claims ({refused.length})</summary>
                    <ul style={{ listStyle: 'none', padding: '6px 0 0 0' }}>
                      {refused.slice(0, 50).map((c, i) => (
                        <li key={c.claim_number ?? `r-${i}`} style={{ padding: '4px 0', borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                          <span style={{ fontFamily: 'monospace' }}>{c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-GB') : ', '}</span>
                          {' · '}{c.category || '?'}
                          {(c.short_description || c.cost_type) && <> · {c.short_description || c.cost_type}</>}
                          {', '}<strong>{fmtMoney(Number(c.amount_not_paid))}</strong>
                          {c.reason_if_not_paid && <span style={{ opacity: 0.8 }}> · {c.reason_if_not_paid}</span>}
                        </li>
                      ))}
                    </ul>
                    {refused.length > 50 && <p style={{ opacity: 0.7, padding: '4px 0' }}>Showing 50 of {refused.length}.</p>}
                  </details>
                )}
                {repaid.length > 0 && (
                  <details style={{ fontSize: '12px', marginTop: '6px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Repaid claims ({repaid.length})</summary>
                    <ul style={{ listStyle: 'none', padding: '6px 0 0 0' }}>
                      {repaid.slice(0, 50).map((c, i) => (
                        <li key={c.claim_number ?? `p-${i}`} style={{ padding: '4px 0', borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                          <span style={{ fontFamily: 'monospace' }}>{c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-GB') : ', '}</span>
                          {' · '}{c.category || '?'}
                          {(c.short_description || c.cost_type) && <> · {c.short_description || c.cost_type}</>}
                          {', repaid '}<strong>{fmtMoney(Number(c.amount_repaid))}</strong>
                        </li>
                      ))}
                    </ul>
                    {repaid.length > 50 && <p style={{ opacity: 0.7, padding: '4px 0' }}>Showing 50 of {repaid.length}.</p>}
                  </details>
                )}
              </section>
            )}
            {/* Cell padding tightened (8px 6px → 4px 3px on the summary,
                4px 6px → 3px 3px on the drilldown) so all seven breakdown
                columns fit inside the folder content width without
                horizontal scroll. Numeric cells drop to 12px monospace. */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(20,16,13,0.4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 3px' }}>Year</th>
                  {breakdownLabels.map((b) => (
                    <th key={b.key} style={{ padding: '6px 3px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{b.label}</th>
                  ))}
                  <th style={{ padding: '6px 3px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const expanded = expandedYear === e.year;
                  const yearClaims = claimsByYear.get(e.year) || [];
                  return (
                    <>
                      <tr
                        key={`row-${e.year}`}
                        onClick={() => setExpandedYear(expanded ? null : e.year)}
                        style={{ borderBottom: inkDivider, cursor: yearClaims.length > 0 ? 'pointer' : 'default' }}
                      >
                        <td style={{ padding: '4px 3px', fontWeight: 'bold' }}>
                          {e.year}{yearClaims.length > 0 ? (expanded ? ' ▾' : ' ▸') : ''}
                        </td>
                        {breakdownLabels.map((b) => (
                          <td key={b.key} style={{ padding: '4px 3px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmtMoney(Number(e[b.key]) || 0)}</td>
                        ))}
                        <td style={{ padding: '4px 3px', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney(Number(e.total_spend) || 0)}</td>
                      </tr>
                      {expanded && yearClaims.length > 0 && (
                        <tr key={`detail-${e.year}`}>
                          <td colSpan={breakdownLabels.length + 2} style={{ padding: '0 3px 8px', background: 'rgba(122,22,18,0.04)' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0', opacity: 0.8 }}>
                              {yearClaims.length} claims in {e.year}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'auto' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(20,16,13,0.3)', textAlign: 'left' }}>
                                  <th style={{ padding: '3px 3px' }}>Date</th>
                                  <th style={{ padding: '3px 3px' }}>Category</th>
                                  <th style={{ padding: '3px 3px' }}>Description</th>
                                  <th style={{ padding: '3px 3px' }}>Status</th>
                                  <th style={{ padding: '3px 3px', textAlign: 'right' }}>Claimed</th>
                                  <th style={{ padding: '3px 3px', textAlign: 'right' }}>Paid</th>
                                </tr>
                              </thead>
                              <tbody>
                                {yearClaims.slice(0, 200).map((c, i) => {
                                  const claimed = Number(c.amount_claimed ?? c.amount_paid) || 0;
                                  const paid = Number(c.amount_paid) || 0;
                                  const notPaid = Number(c.amount_not_paid) || 0;
                                  const repaid = Number(c.amount_repaid) || 0;
                                  const hasGap = claimed !== paid;
                                  // Compose description: short_description + cost_type when both exist,
                                  // plus travel route when the row is a travel claim.
                                  const route = (c.journey_from || c.journey_to)
                                    ? `${c.journey_from || '?'} → ${c.journey_to || '?'}${c.mileage ? ` (${Number(c.mileage).toLocaleString('en-GB')} mi)` : ''}`
                                    : null;
                                  const desc = [c.short_description, c.cost_type !== c.short_description ? c.cost_type : null, route]
                                    .filter(Boolean)
                                    .join(' · ') || '-';
                                  // Status colour: rejected/repaid get attention; paid stays neutral.
                                  const statusLabel = c.status || '-';
                                  const statusColor = notPaid > 0 ? '#a64030' : repaid > 0 ? '#7a4a16' : 'inherit';
                                  return (
                                    <tr key={c.claim_number ?? `${e.year}-${i}`} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                                      <td style={{ padding: '3px 3px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-GB') : '-'}</td>
                                      <td style={{ padding: '3px 3px' }}>{c.category || '-'}</td>
                                      <td style={{ padding: '3px 3px' }}>{desc}</td>
                                      <td style={{ padding: '3px 3px', color: statusColor }}>
                                        {statusLabel}
                                        {notPaid > 0 && <span style={{ display: 'block', fontSize: '11px', opacity: 0.85 }}>refused {fmtMoney(notPaid)}{c.reason_if_not_paid ? ` · ${c.reason_if_not_paid}` : ''}</span>}
                                        {repaid > 0 && <span style={{ display: 'block', fontSize: '11px', opacity: 0.85 }}>repaid {fmtMoney(repaid)}</span>}
                                      </td>
                                      <td style={{ padding: '3px 3px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', opacity: hasGap ? 1 : 0.7 }}>{fmtMoney(claimed)}</td>
                                      <td style={{ padding: '3px 3px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney(paid)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {yearClaims.length > 200 && (
                              <div style={{ padding: '6px 3px', fontSize: '12px', opacity: 0.7 }}>Showing first 200 of {yearClaims.length} claims.</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </>
          );
        })()}
      </div>
    </div>
  );
}

function ActivityTile({ label, value, sub, href, hrefLabel, external }: { label: string; value: string; sub: string; href?: string; hrefLabel?: string; external?: boolean }) {
  return (
    <div style={{ border: "1px solid rgba(20,16,13,0.25)", padding: "10px 12px", background: "rgba(255,255,255,0.04)", display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.7, marginBottom: "4px" }}>{label}</div>
        <div style={{ fontFamily: "\"Special Elite\", monospace", fontSize: "22px", fontWeight: "bold", color: "#14100d" }}>{value}</div>
        <div style={{ fontSize: "11px", opacity: 0.65, marginTop: "4px", lineHeight: 1.3 }}>{sub}</div>
      </div>
      {href && (
        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          {external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#7a1612', textDecoration: 'underline', fontFamily: 'Special Elite, monospace' }}
            >
              {hrefLabel || 'View'} &rarr;
            </a>
          ) : (
            <Link href={href} style={{ color: '#7a1612', textDecoration: 'underline', fontFamily: 'Special Elite, monospace' }}>
              {hrefLabel || 'View'} &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}


function DonationDetail({ d, crn }: { d: Donation; crn: string }) {
  const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? ', ' : String(v));
  const fmtBool = (v: boolean | null | undefined) => (v === true ? 'Yes' : v === false ? 'No' : ', ');
  const fmtMoneyOpt = (v: number | string | null | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? '£' + n.toLocaleString('en-GB') : ', ';
  };
  const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ', ');
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <>
      <dt style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, padding: '2px 8px 2px 0' }}>{label}</dt>
      <dd style={{ fontSize: '13px', margin: 0, padding: '2px 0', wordBreak: 'break-word' }}>{value}</dd>
    </>
  );
  const trustUsed = !!(d.trust_name || d.trust_creator_name || d.trust_creator_status || d.trust_created_date);
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, max-content) 1fr', gap: '2px 16px', margin: '8px 0 4px 8px', padding: '8px 12px', background: 'rgba(20,16,13,0.04)', border: '1px solid rgba(20,16,13,0.1)' }}>
      <Row label="Accepted" value={fmtDate(d.accepted_date)} />
      <Row label="Received" value={fmtDate(d.received_date)} />
      <Row label="Reported" value={fmtDate(d.reported_date)} />
      {d.published_date && <Row label="Published" value={fmtDate(d.published_date)} />}
      {d.dealt_with_date && <Row label="Dealt with" value={fmtDate(d.dealt_with_date)} />}
      <Row label="Amount" value={fmtMoney(Number(d.amount) || 0)} />
      {Number(d.cash_value) > 0 && <Row label="Cash value" value={fmtMoneyOpt(d.cash_value)} />}
      {Number(d.non_cash_value) > 0 && <Row label="Non-cash value" value={fmtMoneyOpt(d.non_cash_value)} />}
      <Row label="Manner" value={fmt(d.manner_in_which_made)} />
      <Row label="Nature" value={fmt(d.nature)} />
      <Row label="Donation type" value={fmt(d.donor_type)} />
      <Row label="Donor status" value={fmt(d.donor_status)} />
      {crn && (
        <Row
          label="Company no."
          value={
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${crn}`}
              target="_blank"
              rel="noopener noreferrer"
              style={inkLink}
            >
              {crn} ↗
            </a>
          }
        />
      )}
      {(d.addr_line1 || d.addr_town || d.addr_postcode || d.addr_country) && (
        <Row
          label="Donor address"
          value={[d.addr_line1, d.addr_town, d.addr_postcode, d.addr_country].filter(Boolean).join(', ')}
        />
      )}
      {d.position_standing_for && <Row label="Position sought" value={d.position_standing_for} />}
      {d.purpose_of_visit && <Row label="Purpose of visit" value={d.purpose_of_visit} />}
      {d.campaigning_name && <Row label="Campaigning name" value={d.campaigning_name} />}
      {d.accounting_unit_name && <Row label="Accounting unit" value={d.accounting_unit_name} />}
      {d.donation_action && <Row label="EC decision" value={d.donation_action} />}
      {(d.reporting_period_name || d.reporting_period_type) && (
        <Row label="Reporting period" value={[d.reporting_period_name, d.reporting_period_type].filter(Boolean).join(' · ')} />
      )}
      {d.is_reported_pre_poll === true && <Row label="Pre-poll" value="Yes, declared during an election campaign window" />}
      {d.is_aggregation === true && <Row label="Aggregation" value="Yes, sum of multiple smaller donations" />}
      {d.is_bequest === true && <Row label="Bequest" value="Yes, from a deceased estate" />}
      {d.is_sponsorship === true && <Row label="Sponsorship" value="Yes, sponsorship arrangement" />}
      {d.is_anonymous === true && <Row label="Anonymous" value="Yes" />}
      {d.is_irish_source === true && <Row label="Irish source" value="Yes, donation from a Northern Ireland source under the Irish regime" />}
      {trustUsed && (
        <>
          <Row label="Paid via trust" value="Yes" />
          {d.trust_name && <Row label="Trust name" value={d.trust_name} />}
          {d.trust_creator_name && <Row label="Trust creator" value={d.trust_creator_name} />}
          {d.trust_creator_status && <Row label="Creator status" value={d.trust_creator_status} />}
          {d.trust_created_date && <Row label="Trust created" value={fmtDate(d.trust_created_date)} />}
        </>
      )}
      {d.returned_date && <Row label="Returned to donor" value={fmtDate(d.returned_date)} />}
      {d.impermissibility_reason && <Row label="Impermissibility" value={d.impermissibility_reason} />}
      {d.attempted_concealment === true && <Row label="Concealment attempted" value="Yes" />}
      {d.concealment_details && <Row label="Concealment details" value={d.concealment_details} />}
      {d.explanatory_notes && <Row label="EC notes" value={d.explanatory_notes} />}
      {d.ec_ref && (
        <Row
          label="EC reference"
          value={
            <a
              href={`https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=10&query=${encodeURIComponent(d.ec_ref)}&sort=AcceptedDate&order=desc`}
              target="_blank"
              rel="noopener noreferrer"
              style={inkLink}
            >
              {d.ec_ref} ↗
            </a>
          }
        />
      )}
      <Row label="Concealment flag" value={fmtBool(d.attempted_concealment)} />
    </dl>
  );
}
