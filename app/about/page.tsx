import Navigation from '../components/Navigation'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />

      <main className="max-w-2xl mx-auto px-6 py-16 text-gray-300 leading-relaxed space-y-6">
        <h1 className="text-3xl font-semibold text-blue-400 mb-2">About</h1>

        <p>
          The People&apos;s Chamber is not just a voting platform. It is a
          live civic mirror of government. We track real legislation moving
          through the UK Parliament and open it up to public response. Every
          bill, every decision, every moment of political movement is
          translated into something simple: what does the public think about
          this? At its core, The People&apos;s Chamber exists to answer a
          question that rarely gets asked in real time — are the people and
          their government aligned, or just politely ignoring each other?
        </p>

        <p>
          We take complex parliamentary activity and make it accessible,
          visible, and interactive. We track real UK legislation as it
          happens, present it in a way that anyone can understand with no
          law degree required, allow the public to respond directly, and
          aggregate that response into a clear public signal. We also shine
          a light on the machinery behind the decisions — MP voting records,
          expenses and financial disclosures, parliamentary activity and
          behaviour. Think of it as a parallel chamber. Same topics, same
          decisions. Just with the receipts.
        </p>

        <p>
          Modern politics is often difficult to follow, harder to interpret,
          and almost impossible to influence as an individual. Information
          is fragmented. Decisions feel distant. Public opinion is reduced
          to occasional polls or a cross in a box every few years. The
          People&apos;s Chamber changes that. It creates a continuous,
          visible record of how the public reacts to the laws that govern
          them — and how those in power act while doing it. Not once every
          few years. But every day. Yes, even on the days when nothing
          seems to make sense.
        </p>

        <p>
          This is not a political party platform. It does not promote an
          ideology. It does not tell you what to think. We leave that to
          everyone else. Instead it provides transparency, accessibility,
          participation and accountability — a visible comparison between
          decisions and public sentiment. It sits somewhere between a
          public record, a civic tool, and a slightly raised eyebrow. Now
          with spreadsheets.
        </p>

        <p>
          The People&apos;s Chamber is an experiment in civic awareness. A
          system where government actions are not just recorded but
          reflected back through the public in real time. A place where
          people can observe, question, and engage with the decisions that
          shape their lives. Not from the sidelines, but from within the
          process. And occasionally, to look at a voting record or expense
          claim and think: right, that explains a lot.
        </p>

        <p>
          We are not here to speak for the public. We are here to show the
          public. Clear. Visible. Unfiltered. Because understanding what is
          happening is the first step to changing it. And if nothing else,
          at least now you can see the whole picture — not just the press
          release.
        </p>
      </main>
    </div>
  )
}
