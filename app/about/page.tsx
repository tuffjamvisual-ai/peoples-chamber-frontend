import Navigation from '../components/Navigation'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />

      <main className="max-w-2xl mx-auto px-6 py-16 text-gray-300 leading-relaxed space-y-6">
        <h1 className="text-3xl font-semibold text-blue-400 mb-2">About</h1>

        <p>
          People&apos;s Chamber is a website that collects publicly available
          information about the United Kingdom&apos;s Parliament and presents
          it in one place. It contains no original reporting, no commentary,
          and no editorial position. The information is all on the record. It
          has simply been brought together.
        </p>

        <p>
          The site holds the text of bills before Parliament, the divisions
          in which Members voted on them, the constituencies those Members
          represent, and the departments and ministers responsible for the
          policies under consideration.
        </p>

        <p>
          Alongside these, it carries the registers of MPs&apos; financial
          interests, party donations, ministerial hospitality, and lobbying
          activity that government, by law, requires itself to make public.
        </p>

        <p>
          Data is drawn from <span className="text-blue-400">GOV.UK</span>,
          the <span className="text-blue-400">UK Parliament API</span>, the{' '}
          <span className="text-blue-400">Electoral Commission</span>, and{' '}
          <span className="text-blue-400">Companies House</span> — the same
          official sources the government uses when describing itself.
        </p>

        <p>
          None of this is a matter of opinion. What you make of it is.
        </p>
      </main>
    </div>
  )
}
