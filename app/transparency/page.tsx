import type { Metadata } from 'next'
import Link from 'next/link'
import Navigation from '../components/Navigation'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Transparency Hub',
  description:
    'Government contracts, revolving door appointments, ministerial meetings, political donations and lobbying data in one place.',
  alternates: { canonical: '/transparency' },
}

const ACCENT = '#ffffff'
const ACCENT_2 = '#818cf8'

const SECTIONS = [
  { slug: 'ministers-meetings', title: "Ministers' Meetings", description: 'Records of meetings ministers have held with external organisations and lobbyists, published quarterly under GOV.UK transparency releases.' },
  { slug: 'lobbyists',          title: 'Lobbyist Register',                description: 'The statutory register of consultant lobbyists who engage ministers and permanent secretaries on behalf of clients.' },
  { slug: 'appgs',              title: 'All-Party Parliamentary Groups',   description: 'Cross-party informal interest groups in Parliament, the funding they receive, and the secretariat support behind them.' },
  { slug: 'hospitality',        title: "Ministers' Hospitality",           description: 'Gifts, hospitality and overseas travel accepted by ministers, published quarterly by every department.' },
  { slug: 'revolving-door',     title: 'Revolving Door',                   description: 'Senior officials and ministers taking up post-government roles, including ACOBA recommendations and conditions attached.' },
  { slug: 'donations',          title: 'Political Donations',              description: 'Reportable donations to political parties and individual MPs, sourced from the Electoral Commission register.' },
  { slug: 'contracts',          title: 'Government Contracts',             description: 'Awarded public-sector contracts above the disclosure threshold, published via Contracts Finder.' },
  { slug: 'companies',          title: 'Companies House',                  description: 'Company directorships and persons of significant control connected to MPs, ministers, and senior officials.' },
]

export default function TransparencyHubPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#2a2a2a] pb-10 mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Transparency
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Transparency Hub
          </h1>
          <p className="text-[#999999] text-[14px] leading-[1.7] max-w-2xl">
            Eight datasets covering how ministers, MPs, lobbyists, donors, contractors and former officials interact with the UK state. Each section links to a searchable list of the underlying records.
          </p>

          <div className="grid grid-cols-3 gap-px bg-[#2a2a2a] border border-[#2a2a2a] mt-10">
            <Stat label="Datasets" value={SECTIONS.length} />
            <Stat label="Sources" value="6" />
            <Stat label="Refresh" value="Daily" accent />
          </div>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2a2a2a] border border-[#2a2a2a]">
          {SECTIONS.map((s, i) => {
            const colour = i % 2 === 0 ? ACCENT : ACCENT_2
            return (
              <li key={s.slug} className="bg-[#1a1a1a]">
                <Link
                  href={`/transparency/${s.slug}`}
                  className="group block p-6 hover:bg-[#111827] transition-colors border-l-2 border-transparent hover:border-l-[#ffffff]"
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: colour }}>
                    Dataset · {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="text-xl font-black tracking-tight mb-2 leading-tight text-white group-hover:text-[#ffffff] transition-colors">
                    {s.title}
                    <span className="ml-2 text-base text-[#999999] inline-block transition-transform group-hover:translate-x-1 group-hover:text-[#ffffff]">→</span>
                  </h2>
                  <p className="text-[#999999] text-[13px] leading-[1.7]">{s.description}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-[#1a1a1a] px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#999999] font-medium mb-2">{label}</p>
      <p className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${accent ? 'text-[#ffffff]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
