import type { Metadata } from 'next';
import Link from 'next/link';
import '../components/magazine-layout.css';
import ScrollToTopButton from '../components/ScrollToTopButton';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About The People’s Chamber — methodology, sources and editorial principles for our UK political transparency project.',
  alternates: { canonical: '/about' },
};

const paragraphs = [
  `The People's Chamber isn't just a voting platform. It's more like holding a mirror up to government and seeing what blinks first.`,
  `We track real legislation as it moves through the UK Parliament and open it up to the public. Every bill, every decision, every carefully worded statement gets translated into a simpler question: what do people actually think about this?`,
  `Because for something called a representative democracy, that question doesn't get asked nearly as often, or as quickly, as you'd expect.`,
  `At its core, The People's Chamber exists to test a quiet suspicion: are the public and their government broadly aligned, or just politely nodding past each other?`,
  `We take the machinery of Parliament and strip it down to something readable. No legal background required. No need to decode three layers of committee language just to work out what's going on. You can follow real legislation as it happens, see how MPs vote, respond yourself, and watch that response build into a clear public signal.`,
  `Alongside that, we keep the lights on in the back rooms: voting records, expenses, financial interests, parliamentary activity. The bits that are technically public, but rarely seen all in one place. Think of it as a parallel chamber. Same debates. Same decisions. Just with the receipts.`,
  `Modern politics isn't short on information. It's just scattered, delayed, and often wrapped in language that suggests clarity while carefully avoiding it. Most people get the headline, maybe the argument, and every few years, a ballot paper. The rest happens somewhere else. The People's Chamber closes that gap. It creates a continuous, visible record of how the public reacts to the laws that govern them, alongside how those laws are actually made. Not every few years. Every day. Yes, even on the days when it all feels slightly surreal.`,
  `This isn't a political party platform. It doesn't tell you what to think. There are plenty of places already doing that at full volume. Instead, it does something simpler: it shows what's happening, who's doing it, and how people respond. Transparency, accessibility, participation, accountability. All the words you'd expect. Just applied properly. It sits somewhere between a public record, a civic tool, and a raised eyebrow. Now, admittedly, with quite a lot of data behind it.`,
  `The People's Chamber is an ongoing experiment in civic awareness. A system where decisions aren't just recorded, but reflected back in real time. A place where you can observe, question, and engage with the process, not from the sidelines, but while it's actually happening. And occasionally, to look at a voting record or an expense claim and think: right, that explains a lot.`,
  `We're not here to speak for the public. We're here to show it. Clear. Visible. Unfiltered. Because understanding what's happening is the first step to changing it. And if nothing else, at least now you can see the whole picture. Not just the press release.`,
];

export default function AboutPage() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1086px',
      margin: '0 auto',
      background: '#2a1810',
      backgroundImage:
        'url("/preview-header.png"), url("/preview-footer.png"), url("/preview-middle.png")',
      backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
      backgroundPosition: 'top center, bottom center, top center',
      backgroundSize: '100% auto, 100% auto, 100% auto',
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <nav
        aria-label="Site"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: '1023 / 330',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {([
          ['/',            'Home',           5,    9],
          ['/bills',       'Bills',          16,   8],
          ['/laws',        'Laws',           25,   7],
          ['/polls',       "People's Polls", 34,   14],
          ['/mps',         'MPs',            50,   7],
          ['/departments', 'Departments',    59,   15],
          ['/login',       'Login',          76,   8],
          ['/about',       'About',          87,   9],
        ] as const).map(([href, label, left, width]) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              position: 'absolute',
              top: '87%',
              left: `${left}%`,
              width: `${width}%`,
              height: '10%',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ))}
      </nav>

      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2, color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#14100d',
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to home
        </a>

        <article style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
            The People&apos;s Chamber
          </p>
          <h1 style={{ fontSize: '52px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '32px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            About
          </h1>

          <div style={{ fontSize: '17px', lineHeight: 1.85, letterSpacing: '0.01em' }}>
            {paragraphs.map((para, idx) => {
              const tilt = idx % 4;
              const rot = tilt === 0 ? '0.08deg' : tilt === 1 ? '-0.12deg' : tilt === 2 ? '0.1deg' : '-0.08deg';
              return (
                <p key={idx} style={{ marginBottom: '20px', transform: `rotate(${rot})` }}>
                  {para}
                </p>
              );
            })}
          </div>
        </article>

        <ScrollToTopButton />
      </div>
    </div>
  );
}
