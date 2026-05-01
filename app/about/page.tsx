import Navigation from '../components/Navigation'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#001520] text-white">
      <Navigation />

      <main className="max-w-2xl mx-auto px-6 py-20 text-white leading-loose space-y-8">
        <h1 className="text-4xl sm:text-5xl font-semibold text-[#ffffff] mb-6 tracking-tight">
          About
        </h1>

        <p>
          The People&apos;s Chamber isn&apos;t just a voting platform.
          It&apos;s more like holding a mirror up to government and seeing
          what blinks first.
        </p>

        <p>
          We track real legislation as it moves through the UK Parliament
          and open it up to the public. Every bill, every decision, every
          carefully worded statement gets translated into a simpler
          question: what do people actually think about this?
        </p>

        <p>
          Because for something called a representative democracy, that
          question doesn&apos;t get asked nearly as often, or as quickly,
          as you&apos;d expect.
        </p>

        <p>
          At its core, The People&apos;s Chamber exists to test a quiet
          suspicion: are the public and their government broadly aligned,
          or just politely nodding past each other?
        </p>

        <p>
          We take the machinery of Parliament and strip it down to
          something readable. No legal background required. No need to
          decode three layers of committee language just to work out
          what&apos;s going on. You can follow real legislation as it
          happens, see how MPs vote, respond yourself, and watch that
          response build into a clear public signal.
        </p>

        <p>
          Alongside that, we keep the lights on in the back rooms: voting
          records, expenses, financial interests, parliamentary activity.
          The bits that are technically public, but rarely seen all in one
          place. Think of it as a parallel chamber. Same debates. Same
          decisions. Just with the receipts.
        </p>

        <p>
          Modern politics isn&apos;t short on information. It&apos;s just
          scattered, delayed, and often wrapped in language that suggests
          clarity while carefully avoiding it. Most people get the
          headline, maybe the argument, and every few years, a ballot
          paper. The rest happens somewhere else. The People&apos;s
          Chamber closes that gap. It creates a continuous, visible record
          of how the public reacts to the laws that govern them, alongside
          how those laws are actually made. Not every few years.
          Every day. Yes, even on the days when it all feels slightly
          surreal.
        </p>

        <p>
          This isn&apos;t a political party platform. It doesn&apos;t tell
          you what to think. There are plenty of places already doing that
          at full volume. Instead, it does something simpler: it shows
          what&apos;s happening, who&apos;s doing it, and how people
          respond. Transparency, accessibility, participation,
          accountability. All the words you&apos;d expect. Just applied
          properly. It sits somewhere between a public record, a civic
          tool, and a raised eyebrow. Now, admittedly, with quite a lot of
          data behind it.
        </p>

        <p>
          The People&apos;s Chamber is an ongoing experiment in civic
          awareness. A system where decisions aren&apos;t just recorded,
          but reflected back in real time. A place where you can observe,
          question, and engage with the process, not from the sidelines,
          but while it&apos;s actually happening. And occasionally, to
          look at a voting record or an expense claim and think: right,
          that explains a lot.
        </p>

        <p>
          We&apos;re not here to speak for the public. We&apos;re here to
          show it. Clear. Visible. Unfiltered. Because understanding
          what&apos;s happening is the first step to changing it. And if
          nothing else, at least now you can see the whole picture. Not
          just the press release.
        </p>
      </main>
    </div>
  )
}
