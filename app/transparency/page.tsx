import type { Metadata } from 'next'
import Link from 'next/link'
import DossierShell from '../components/DossierShell'
import BackLink from '../components/BackLink';

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Transparency Hub',
  description:
    'Government contracts, revolving door appointments, ministerial meetings, political donations and lobbying data in one place.',
  alternates: { canonical: '/transparency' },
}

const INK = '#14100d'

// Lobbyist Register section removed 2026-06-02. The statutory UK Register of
// Consultant Lobbyists (1,251 rows still in the lobbyist_register table) only
// covers consultant lobbyists, not the much larger in-house lobbying universe,
// and the underlying disclosure is too thin to be journalistically useful.
// Hidden until a better source can be identified. DB data preserved.
//
// Companies House section removed 2026-06-03. The companies_house table only
// holds a thin slice of director/PSC links to MPs and ministers — limited
// data, not journalistically useful in its current shape. Hidden until a
// fuller ingest can be wired. DB data preserved.
const SECTIONS = [
  { slug: 'ministers-meetings', title: "Ministers' Meetings", description: 'Records of meetings ministers have held with external organisations and lobbyists, published quarterly under GOV.UK transparency releases.' },
  { slug: 'appgs',              title: 'All Party Parliamentary Groups',   description: 'Cross party informal interest groups in Parliament, the funding they receive, and the secretariat support behind them.' },
  { slug: 'hospitality',        title: "Ministers' Hospitality",           description: 'Gifts, hospitality and overseas travel accepted by ministers, published quarterly by every department.' },
  { slug: 'revolving-door',     title: 'Revolving Door',                   description: 'Senior officials and ministers taking up post government roles, including ACOBA recommendations and conditions attached.' },
  { slug: 'donations',          title: 'Political Donations',              description: 'Reportable donations to political parties and individual MPs.' },
  { slug: 'contracts',          title: 'Government Contracts',             description: 'Awarded public sector contracts above the disclosure threshold, published via Contracts Finder.' },
]

export default function TransparencyHubPage() {
  return (
    <DossierShell>
      <style>{`
        .t-card { transition: background-color 150ms ease, border-color 150ms ease; }
        .t-card:hover { background-color: rgba(20,16,13,0.06); border-left-color: ${INK}; }
      `}</style>

      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Transparency Hub
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Six datasets covering how ministers, MPs, donors, contractors and former officials interact with the UK state. Each section links to a searchable list of the underlying records.
        </p>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          {SECTIONS.length} datasets · drawn from public registers
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {SECTIONS.map((s, i) => (
          <Link
            key={s.slug}
            href={`/transparency/${s.slug}`}
            className="t-card no-hover-scale"
            style={{ display: 'block', padding: '18px 20px', border: '1px solid rgba(20,16,13,0.25)', borderLeft: '3px solid rgba(20,16,13,0.4)', color: INK, textDecoration: 'none' }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.55, marginBottom: '8px' }}>
              Dataset · {String(i + 1).padStart(2, '0')}
            </div>
            <h2 style={{ fontSize: '21px', fontWeight: 'bold', marginBottom: '6px', lineHeight: 1.15 }}>
              {s.title} <span style={{ opacity: 0.55 }}>→</span>
            </h2>
            <p style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.85 }}>{s.description}</p>
          </Link>
        ))}
      </div>
    </DossierShell>
  )
}
