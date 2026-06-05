'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/app/components/Pagination';

type SectionId = 'bio' | 'contact' | 'voting' | 'bills' | 'interests' | 'roles' | 'earnings' | 'expenses';

const ALL_SECTIONS: Array<{ id: SectionId; label: string; rotate: string }> = [
  { id: 'bio',       label: 'POLITICAL BIO',    rotate: '0.1deg' },
  { id: 'contact',   label: 'CONTACT',          rotate: '-0.1deg' },
  { id: 'voting',    label: 'VOTING RECORD',    rotate: '0.15deg' },
  { id: 'bills',     label: 'BILLS SPONSORED',  rotate: '-0.2deg' },
  { id: 'interests', label: 'INTERESTS',        rotate: '0.1deg' },
  { id: 'roles',     label: 'ROLES',            rotate: '-0.15deg' },
  { id: 'earnings',  label: 'EARNINGS',         rotate: '0.2deg' },
  { id: 'expenses',  label: 'EXPENSES',         rotate: '-0.1deg' },
];

type Vote = { id: number; division_title: string; division_date: string; vote_type: string; is_rebellion?: boolean; bill_id?: number | null; division_id?: number | null; division_date_only?: string | null; division_number?: number | null; is_si?: boolean };
type Bill = { id: number; title: string; status?: string | null; current_stage?: string | null; plain_summary?: string | null; is_act?: boolean | null; last_update?: string | null };
type Interest = { category_name: string; interest_text: string | null };
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
  amount_paid: number | null;
  status: string | null;
  // `details` (long-form text) was previously fetched but unused in the UI;
  // dropped from the page's column select to keep the prerender budget tight.
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
  bio: {
    representations?: Representation[];
    government_posts?: Array<{ name: string }>;
    opposition_posts?: Array<{ name: string }>;
    committee_memberships?: Array<{ id?: number; name?: string } | string>;
    party_history?: PartyHistoryEntry[];
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
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
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
        {active === 'bio' && (
          <>
            <h2 style={sectionH2}>Political Biography</h2>
            <div style={{ lineHeight: '1.8', fontSize: '16px', letterSpacing: '0.01em' }}>
              {paragraphs.length === 0 ? (
                <p>Biography unavailable.</p>
              ) : paragraphs.map((para, idx) => {
                const tilt = idx % 4;
                const rot = tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                return <p key={idx} style={{ marginBottom: '16px', transform: `rotate(${rot})` }}>{para}</p>;
              })}
            </div>
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
                  · showing {votesPerPage * (votePage - 1) + 1}–
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

        {active === 'interests' && (
          <>
            <h2 style={sectionH2}>Registered Interests</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
              {interests.map((i, idx) => (
                <li key={idx} style={{ padding: '8px 0', borderBottom: inkDivider }}>
                  <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{i.category_name}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{i.interest_text}</div>
                </li>
              ))}
            </ul>
          </>
        )}

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
          </div>
        )}

        {active === 'earnings' && (
          <>
            <h2 style={sectionH2}>Earnings</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.8' }}>
              <li><strong>Base MP salary:</strong> {fmtMoney(earnings.base)}</li>
              <li><strong>Ministerial salary:</strong> {fmtMoney(earnings.ministerial)} {earnings.band_label ? `(${earnings.band_label})` : ''}</li>
              <li><strong>Outside earnings:</strong> {fmtMoney(earnings.outside)} ({earnings.outside_claim_count} payments from {earnings.outside_source_count} sources)</li>
              <li style={{ marginTop: '12px', fontSize: '20px' }}><strong>Total personal earnings:</strong> {fmtMoney(earnings.personal_total)}</li>
              <li style={{ marginTop: '12px', fontSize: '13px', opacity: 0.7 }}>Public spend (IPSA, {earnings.public_spend_year ?? '—'}): {fmtMoney(earnings.public_spend)}</li>
            </ul>
            <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
              Base salary is set by IPSA and reviewed annually each 1 April. The ministerial supplement has been frozen at 2010 levels by successive prime ministers; figures shown are the rates actually drawn, not the statutory entitlement. Outside earnings come from the Register of Members&rsquo; Financial Interests and reflect cumulative declarations since this Parliament started; the Register is updated as MPs declare, typically within two weeks of the payment. Public spend is the most recent closed IPSA financial year on file — the current year is not totalled until IPSA reconciles year-end.
            </p>
          </>
        )}

        {active === 'expenses' && (
          <>
            <h2 style={sectionH2}>Expenses</h2>
            <p style={{ marginBottom: '8px', fontSize: '14px', opacity: 0.85 }}>Annual IPSA totals with category breakdown. Click a year to drill into individual claims.</p>
            <p style={{ marginBottom: '16px', fontSize: '12px', opacity: 0.6, lineHeight: 1.55 }}>
              The IPSA financial year runs 1 April to 31 March. Annual totals are published a few months after each year ends; individual claims are released quarterly with a two to three month lag, so the most recent months in any year are typically still filling in.
            </p>
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
                                  <th style={{ padding: '3px 3px', textAlign: 'right' }}>Paid</th>
                                </tr>
                              </thead>
                              <tbody>
                                {yearClaims.slice(0, 200).map((c, i) => (
                                  <tr key={c.claim_number ?? `${e.year}-${i}`} style={{ borderBottom: '1px dashed rgba(20,16,13,0.15)' }}>
                                    <td style={{ padding: '3px 3px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td style={{ padding: '3px 3px' }}>{c.category || '-'}</td>
                                    <td style={{ padding: '3px 3px' }}>{c.short_description || c.cost_type || '-'}</td>
                                    <td style={{ padding: '3px 3px' }}>{c.status || '-'}</td>
                                    <td style={{ padding: '3px 3px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney(Number(c.amount_paid) || 0)}</td>
                                  </tr>
                                ))}
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
        )}
      </div>
    </div>
  );
}
