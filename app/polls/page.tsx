import type { Metadata } from 'next'
import Link from 'next/link'
import PollsClient from './PollsClient'
import '../components/magazine-layout.css'
import ScrollToTopButton from '../components/ScrollToTopButton'

export const metadata: Metadata = {
  title: "People's Polls",
  description:
    'Live public polls on every UK Parliament bill — see how the public would vote, then compare it to the official Commons tally.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
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
        {(
          [
            ['/', 'Home', 5, 9],
            ['/bills', 'Bills', 16, 8],
            ['/laws', 'Laws', 25, 7],
            ['/polls', "People's Polls", 34, 14],
            ['/mps', 'MPs', 48, 11],
            ['/departments', 'Departments', 59, 15],
            ['/login', 'Login', 76, 8],
            ['/about', 'About', 87, 9],
          ] as const
        ).map(([href, label, left, width]) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              position: 'absolute',
              top: '80%',
              left: `${left}%`,
              width: `${width}%`,
              height: '18%',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ))}
      </nav>

      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: '#14100d',
          fontFamily: 'Special Elite, monospace',
        }}
      >
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

        <header style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
            }}
          >
            People&rsquo;s Polls
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
            Have your say on the issues that matter. Vote on questions about policy, politics and public life — then see how Westminster voted.
          </p>
        </header>

        <PollsClient />

        <ScrollToTopButton />
      </div>
    </div>
  )
}
