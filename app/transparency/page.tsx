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

const SECTIONS = [
  {
    slug: 'ministers-meetings',
    title: "Ministers' Meetings",
    description: 'Records of meetings ministers have held with external organisations and lobbyists, published quarterly under GOV.UK transparency releases.',
  },
  {
    slug: 'lobbyists',
    title: 'Lobbyist Register',
    description: 'The statutory register of consultant lobbyists who engage ministers and permanent secretaries on behalf of clients.',
  },
  {
    slug: 'appgs',
    title: 'All-Party Parliamentary Groups',
    description: 'Cross-party informal interest groups in Parliament, the funding they receive, and the secretariat support behind them.',
  },
  {
    slug: 'hospitality',
    title: "Ministers' Hospitality",
    description: 'Gifts, hospitality and overseas travel accepted by ministers, published quarterly by every department.',
  },
  {
    slug: 'revolving-door',
    title: 'Revolving Door',
    description: 'Senior officials and ministers taking up post-government roles, including ACOBA recommendations and conditions attached.',
  },
  {
    slug: 'donations',
    title: 'Political Donations',
    description: 'Reportable donations to political parties and individual MPs, sourced from the Electoral Commission register.',
  },
  {
    slug: 'contracts',
    title: 'Government Contracts',
    description: 'Awarded public-sector contracts above the disclosure threshold, published via Contracts Finder.',
  },
  {
    slug: 'companies',
    title: 'Companies House',
    description: 'Company directorships and persons of significant control connected to MPs, ministers, and senior officials.',
  },
]

export default function TransparencyHubPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <h1 className="text-3xl font-bold text-white mb-2">Transparency Hub</h1>
        <p className="text-gray-400 text-sm mb-10 max-w-2xl">
          Eight datasets covering how ministers, MPs, lobbyists, donors, contractors and former officials interact with the UK state. Each section links through to a searchable list of the underlying records.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <Link
              key={s.slug}
              href={`/transparency/${s.slug}`}
              className="block group"
            >
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#60a5fa' }}>
                {s.title} <span className="ml-1 transition-transform inline-block group-hover:translate-x-1">→</span>
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">{s.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
