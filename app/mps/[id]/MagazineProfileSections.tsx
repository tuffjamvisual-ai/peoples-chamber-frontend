'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type SectionId = 'bio' | 'contact' | 'voting' | 'bills' | 'interests' | 'roles' | 'earnings' | 'expenses';

const SECTIONS: Array<{ id: SectionId; label: string; rotate: string }> = [
  { id: 'bio',       label: 'POLITICAL BIO',    rotate: '0.1deg' },
  { id: 'contact',   label: 'CONTACT',          rotate: '-0.1deg' },
  { id: 'voting',    label: 'VOTING RECORD',    rotate: '0.15deg' },
  { id: 'bills',     label: 'BILLS SPONSORED',  rotate: '-0.2deg' },
  { id: 'interests', label: 'INTERESTS',        rotate: '0.1deg' },
  { id: 'roles',     label: 'ROLES',            rotate: '-0.15deg' },
  { id: 'earnings',  label: 'EARNINGS',         rotate: '0.2deg' },
  { id: 'expenses',  label: 'EXPENSES',         rotate: '-0.1deg' },
];
const VALID = new Set<SectionId>(SECTIONS.map((s) => s.id));

interface Props {
  memberId: number;
  paragraphs: string[];
  contact: { phone?: string | null; email?: string | null; website?: string | null; twitter?: string | null } | null;
  votes: Array<{ id: number; division_title: string; division_date: string; vote_type: string; is_rebellion?: boolean }>;
  sponsoredBills: Array<{ id: number; title: string }>;
  interests: Array<{ category_name: string; description: string }>;
  bio: {
    representations?: Array<{ name: string; startDate: string; endDate?: string | null }>;
    government_posts?: Array<{ name: string }>;
    opposition_posts?: Array<{ name: string }>;
    committee_memberships?: Array<{ id?: number; name?: string } | string>;
  } | null;
  earnings: {
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
  expenses: Array<{ year: number; total_spend: number | null }>;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0);

const sectionH2: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 'bold',
  marginBottom: '24px',
  color: '#14100d',
  fontFamily: 'Special Elite, monospace',
  transform: 'rotate(-0.2deg)',
  textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
};

export default function MagazineProfileSections({
  memberId,
  paragraphs,
  contact,
  votes,
  sponsoredBills,
  interests,
  bio,
  earnings,
  expenses,
}: Props) {
  const [active, setActive] = useState<SectionId>(paragraphs.length > 0 ? 'bio' : 'contact');

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.slice(1) as SectionId;
      if (h && VALID.has(h)) setActive(h);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const select = (id: SectionId) => {
    setActive(id);
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-px" style={{ marginTop: '-80px' }}>
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-16">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
            {SECTIONS.map((s) => {
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
                <p style={{ marginBottom: '16px' }}>Biography unavailable.</p>
              ) : (
                paragraphs.map((para, idx) => {
                  const tilt = idx % 4;
                  const rot = tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                  return (
                    <p key={idx} style={{ marginBottom: '16px', transform: `rotate(${rot})` }}>{para}</p>
                  );
                })
              )}
            </div>
          </>
        )}

        {active === 'contact' && (
          <>
            <h2 style={sectionH2}>Contact</h2>
            <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
              {contact ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {contact.phone && <li><strong>Phone:</strong> <span style={{ fontFamily: 'monospace' }}>{contact.phone}</span></li>}
                  {contact.email && <li><strong>Email:</strong> <a href={`mailto:${contact.email}`} style={{ color: '#7a1612' }}>{contact.email}</a></li>}
                  {contact.website && <li><strong>Website:</strong> <a href={contact.website} target="_blank" rel="noopener noreferrer" style={{ color: '#7a1612' }}>{contact.website}</a></li>}
                  {contact.twitter && <li><strong>X / Twitter:</strong> <a href={contact.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#7a1612' }}>{contact.twitter}</a></li>}
                </ul>
              ) : <p>No contact information available.</p>}
            </div>
          </>
        )}

        {active === 'voting' && (
          <>
            <h2 style={sectionH2}>Voting Record</h2>
            <div style={{ fontSize: '15px', lineHeight: '1.7' }}>
              <p style={{ marginBottom: '16px' }}><strong>{votes.length}</strong> divisions recorded. Latest 20 below.</p>
              {votes.length === 0 ? <p>No voting record available.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {votes.slice(0, 20).map((v) => (
                    <li key={v.id} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)' }}>
                      <div>{v.division_title}</div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        {new Date(v.division_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}<strong>{v.vote_type.toUpperCase()}</strong>
                        {v.is_rebellion && <span style={{ color: '#7a1612' }}> · REBEL</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {active === 'bills' && (
          <>
            <h2 style={sectionH2}>Bills Sponsored</h2>
            {sponsoredBills.length === 0 ? <p>No bills sponsored.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
                {sponsoredBills.map((b) => (
                  <li key={b.id} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)' }}>
                    <Link href={`/bills/${b.id}`} style={{ color: '#7a1612' }}>{b.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {active === 'interests' && (
          <>
            <h2 style={sectionH2}>Registered Interests</h2>
            {interests.length === 0 ? <p>No registered interests.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px', lineHeight: '1.7' }}>
                {interests.map((i, idx) => (
                  <li key={idx} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)' }}>
                    <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{i.category_name}</div>
                    <div>{i.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {active === 'roles' && (
          <>
            <h2 style={sectionH2}>Roles</h2>
            <div style={{ fontSize: '15px', lineHeight: '1.7' }}>
              {bio?.government_posts && bio.government_posts.length > 0 && (
                <>
                  <h3 style={{ fontWeight: 'bold', marginTop: '16px' }}>Government Posts</h3>
                  <ul>{bio.government_posts.map((p, i) => <li key={i}>{p.name}</li>)}</ul>
                </>
              )}
              {bio?.opposition_posts && bio.opposition_posts.length > 0 && (
                <>
                  <h3 style={{ fontWeight: 'bold', marginTop: '16px' }}>Opposition Posts</h3>
                  <ul>{bio.opposition_posts.map((p, i) => <li key={i}>{p.name}</li>)}</ul>
                </>
              )}
              {bio?.committee_memberships && bio.committee_memberships.length > 0 && (
                <>
                  <h3 style={{ fontWeight: 'bold', marginTop: '16px' }}>Committee Memberships</h3>
                  <ul>{bio.committee_memberships.map((c, i) => <li key={i}>{typeof c === 'string' ? c : c.name}</li>)}</ul>
                </>
              )}
              {(!bio?.government_posts?.length && !bio?.opposition_posts?.length && !bio?.committee_memberships?.length) && (
                <p>No roles or committee memberships.</p>
              )}
            </div>
          </>
        )}

        {active === 'earnings' && (
          <>
            <h2 style={sectionH2}>Earnings</h2>
            <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><strong>Base MP salary:</strong> {fmtMoney(earnings.base)}</li>
                <li><strong>Ministerial salary:</strong> {fmtMoney(earnings.ministerial)} {earnings.band_label ? `(${earnings.band_label})` : ''}</li>
                <li><strong>Outside earnings:</strong> {fmtMoney(earnings.outside)} ({earnings.outside_claim_count} payments from {earnings.outside_source_count} sources)</li>
                <li style={{ marginTop: '12px', fontSize: '20px' }}><strong>Total personal earnings:</strong> {fmtMoney(earnings.personal_total)}</li>
                <li style={{ marginTop: '12px', fontSize: '13px', opacity: 0.7 }}>Public spend (IPSA, {earnings.public_spend_year}): {fmtMoney(earnings.public_spend)}</li>
              </ul>
            </div>
          </>
        )}

        {active === 'expenses' && (
          <>
            <h2 style={sectionH2}>Expenses</h2>
            <div style={{ fontSize: '15px', lineHeight: '1.7' }}>
              <p style={{ marginBottom: '16px' }}>Annual IPSA totals.</p>
              {expenses.length === 0 ? <p>No expenses recorded.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {expenses.map((e) => (
                    <li key={e.year} style={{ padding: '6px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)' }}>
                      <strong>{e.year}:</strong> {fmtMoney(Number(e.total_spend) || 0)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
