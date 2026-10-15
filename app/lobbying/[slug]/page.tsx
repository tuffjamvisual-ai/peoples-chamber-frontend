// /lobbying/[slug] — one organisation: every published meeting with a minister, and every
// consultant lobbying firm that named it as a client. Data from lib/lobbying.ts.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { getOrgBySlug, getOrgMeetings, getOrgLobbying, cleanDept, fmtDate, ORG_TYPE_LABEL, type OrgMeeting } from '@/lib/lobbying';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const FONT = 'Special Elite, monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: 'Organisation not found' };
  return {
    title: `${org.name}: meetings with UK ministers and lobbying firms`,
    description: `Every published meeting between ${org.name} and UK government ministers${org.lobbying_firms > 0 ? ', and the consultant lobbying firms that act for it' : ''}, from GOV.UK transparency returns and the Registrar of Consultant Lobbyists.`,
    alternates: { canonical: `/lobbying/${org.slug}` },
  };
}

function meetingDate(m: OrgMeeting): string {
  if (m.date_flag === 'unreadable' || !m.meeting_date) return m.meeting_date_raw ? `${m.meeting_date_raw} (as published)` : 'Date not given';
  const d = fmtDate(m.meeting_date);
  return m.date_flag === 'future' ? `${d} (as published; after today)` : d;
}

export default async function LobbyingOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const [meetings, lobbying] = await Promise.all([getOrgMeetings(org.org_id), getOrgLobbying(org.org_id)]);
  const spellings = [...new Set(meetings.map((m) => m.raw_name.trim()))].filter((s) => s !== org.name).slice(0, 12);

  return (
    <OpenGovShell pageStamp="Lobbying">
      <BackLink
        fallbackHref="/lobbying"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <article style={{ padding: 'clamp(8px, 2vw, 24px) 0', color: '#1a140e', fontFamily: FONT }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            <Link href="/lobbying" className="no-hover-scale" style={{ color: INK_SOFT, textDecoration: 'none' }}>Lobbying</Link> · {ORG_TYPE_LABEL[org.org_type]}
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, lineHeight: 1.18, margin: 0, overflowWrap: 'anywhere' }}>{org.name}</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          <Stat label="Meetings with ministers" value={org.meetings_all.toLocaleString('en-GB')} />
          <Stat label="In the last 12 months" value={org.meetings_12m.toLocaleString('en-GB')} />
          <Stat label="Different ministers" value={org.ministers_all.toLocaleString('en-GB')} />
          <Stat label="Lobbying firms used" value={org.lobbying_firms.toLocaleString('en-GB')} />
        </div>

        <h2 style={sectionHead}>Meetings with ministers</h2>
        {meetings.length === 0 ? (
          <p style={para}>No published meetings with ministers since July 2024.</p>
        ) : (
          <>
            <style>{`
              .lbo-table { width: 100%; border-collapse: collapse; font-family: ${FONT}; color: ${INK}; font-size: 15px; }
              .lbo-table th { text-align: left; font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; padding: 8px 6px; border-bottom: 1.5px solid ${INK}; }
              .lbo-table td { padding: 9px 6px; border-bottom: 1px solid ${INK_HAIRLINE}; vertical-align: top; overflow-wrap: anywhere; }
              .lbo-date { white-space: nowrap; }
              @media (max-width: 640px) {
                .lbo-table thead { display: none; }
                .lbo-table tr { display: block; padding: 10px 2px; border-bottom: 1px solid ${INK_HAIRLINE}; }
                .lbo-table td { display: block; border: 0; padding: 2px 0; }
                .lbo-date { white-space: normal; font-weight: 700; }
              }
            `}</style>
            <table className="lbo-table">
              <thead><tr><th>Date</th><th>Minister</th><th>Purpose, as published</th></tr></thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.meeting_key}>
                    <td className="lbo-date">{meetingDate(m)}</td>
                    <td>{m.minister_name}{cleanDept(m.minister_dept) ? <span style={{ display: 'block', fontSize: '14px' }}>{cleanDept(m.minister_dept)}</span> : null}</td>
                    <td>{m.purpose || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 style={{ ...sectionHead, marginTop: '40px' }}>Consultant lobbying firms</h2>
        {lobbying.length === 0 ? (
          <p style={para}>Not named as a client of a consultant lobbying firm on the Register of Consultant Lobbyists in the quarters we hold. In-house lobbying does not have to be registered.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${INK_HAIRLINE}`, maxWidth: '46em' }}>
            {lobbying.map((f) => (
              <li key={f.firm} style={{ padding: '10px 2px', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK }}>
                <div style={{ fontSize: '16px', fontWeight: 700, overflowWrap: 'anywhere' }}>{f.firm}</div>
                <div style={{ fontSize: '15px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{f.quarters.map((q) => q.label).join('; ')}</div>
                {f.clientAs !== org.name && <div style={{ fontSize: '14px' }}>Client named as “{f.clientAs}”</div>}
              </li>
            ))}
          </ul>
        )}

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontSize: '15px', color: INK, lineHeight: 1.7, maxWidth: '46em' }}>
          <strong>About these records.</strong> Each row is one entry in a minister’s published
          meetings return, so a meeting with two ministers appears once for each. Dates and purposes
          are shown as the department published them.
          {spellings.length > 0 && <> Published under these names too: {spellings.map((s) => `“${s}”`).join(', ')}.</>}{' '}
          Sources: GOV.UK ministers’ meetings transparency returns and the Registrar of Consultant
          Lobbyists quarterly returns, both under the Open Government Licence v3.0.
        </section>
      </article>
    </OpenGovShell>
  );
}

const sectionHead = { fontFamily: FONT, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para = { fontFamily: FONT, fontSize: '15px', lineHeight: 1.7, color: INK, maxWidth: '46em' };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: `2px solid ${INK}`, padding: '10px 0 4px' }}>
      <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.18em', color: INK_SOFT, margin: '0 0 6px', fontWeight: 'bold', fontFamily: FONT }}>{label}</p>
      <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.1, fontFamily: FONT }}>{value}</p>
    </div>
  );
}
