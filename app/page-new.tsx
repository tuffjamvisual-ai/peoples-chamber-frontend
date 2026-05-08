// /preview rebuild — Sections 1 + 2 + 3 of N.
// Section 1: cream masthead. Section 2: nav bar. Section 3: dark hero.
// Each section added incrementally with screenshot sign-off in between.

import Image from 'next/image'
import { Playfair_Display } from 'next/font/google'
import { Search, ArrowRight } from 'lucide-react'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const NAV_LINKS = [
  ['Bills', '/bills'],
  ['MPs', '/mps'],
  ['Departments', '/departments'],
  ['Transparency', '/transparency'],
  ['Expenses', '/expenses'],
  ['Polls', '/polls'],
  ['Satire Desk', '/coverage'],
  ['News & Analysis', '/coverage'],
] as const

export default function HomePageNew() {
  return (
    <main className="bg-[#F3F0EA] min-h-screen text-[#181C1F]">
      {/* ─────────── SECTION 1: MASTHEAD ─────────── */}
      <header className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">

            {/* LEFT — italic tagline */}
            <div
              className={`${playfair.className} italic text-[15px] leading-[1.5] text-black/65 max-w-[220px]`}
              style={{ fontStyle: 'italic' }}
            >
              The government speaks.<br />
              The public replies.
            </div>

            {/* CENTER — masthead title + caption */}
            <div className="text-center">
              <h1
                className={`${playfair.className} text-[clamp(40px,5vw,68px)] leading-[0.95] tracking-tight text-black whitespace-nowrap`}
                style={{ fontWeight: 700 }}
              >
                The People&apos;s Chamber
              </h1>
              <p className="uppercase tracking-[0.42em] text-[10px] mt-4 text-black font-semibold">
                Holding power to account
              </p>
            </div>

            {/* RIGHT — italic tagline */}
            <div
              className={`${playfair.className} italic text-[15px] leading-[1.5] text-black/65 max-w-[220px] ml-auto text-right`}
              style={{ fontStyle: 'italic' }}
            >
              A modern public chamber<br />
              for a modern democracy.
            </div>
          </div>
        </div>
      </header>

      {/* ─────────── SECTION 2: NAV BAR ─────────── */}
      <nav className="border-b border-black/10 bg-[#F3F0EA]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

          {/* LEFT — link list */}
          <div className="flex items-center gap-7 text-[12px] font-semibold tracking-[0.14em] uppercase text-black/85">
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="hover:text-[#B02A2A] transition-colors whitespace-nowrap"
              >
                {label}
              </a>
            ))}
          </div>

          {/* RIGHT — search + Join the Chamber */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button aria-label="Search" className="text-black/70 hover:text-black transition-colors">
              <Search size={18} strokeWidth={1.8} />
            </button>
            <a
              href="/about#join"
              className="bg-[#B02A2A] hover:bg-[#8E2222] text-white px-5 py-2.5 uppercase tracking-[0.18em] text-[11px] font-bold transition-colors"
            >
              Join the Chamber
            </a>
          </div>
        </div>
      </nav>

      {/* ─────────── SECTION 3: DARK HERO ─────────── */}
      <section className="bg-[#0D1117]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2">

            {/* LEFT — Westminster photo. Container is aspect-locked to the
                 design's hero-photo proportion (~16/9). Right panel inherits
                 this height via CSS grid — see panel below. */}
            <div className="relative aspect-[16/9]">
              <Image
                src="/design-extracts/hero-westminster.png"
                alt="The Palace of Westminster"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-[#0D1117]/40" />
            </div>

            {/* RIGHT — story panel */}
            <div className="text-white p-10 lg:p-14 flex flex-col justify-between gap-8">

              <div>
                <div className="uppercase tracking-[0.32em] text-[11px] text-[#B02A2A] font-bold mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B02A2A]" />
                  Top Story
                </div>
                <h2
                  className={`${playfair.className} text-[clamp(34px,4.4vw,56px)] leading-[1.05] tracking-tight`}
                  style={{ fontWeight: 700 }}
                >
                  Winter fuel cuts<br />spark public<br />backlash
                </h2>
                <p
                  className={`${playfair.className} italic text-[17px] leading-[1.55] text-white/70 mt-6 max-w-[480px]`}
                  style={{ fontStyle: 'italic' }}
                >
                  Ministers call it &ldquo;necessary discipline.&rdquo; Pensioners call it
                  something considerably less printable.
                </p>
              </div>

              {/* 4-stat row */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div
                    className={`${playfair.className} text-[#E74C3C] text-[clamp(34px,4vw,52px)] leading-none`}
                    style={{ fontWeight: 400 }}
                  >
                    68%
                  </div>
                  <div className="uppercase text-[10px] tracking-[0.18em] mt-2 text-white/85 font-semibold">
                    Oppose
                  </div>
                  <div className="text-[10px] text-[#E74C3C]/80 mt-1">↑ 5% this week</div>
                </div>
                <div>
                  <div
                    className={`${playfair.className} text-[#3F6A55] text-[clamp(34px,4vw,52px)] leading-none`}
                    style={{ fontWeight: 400 }}
                  >
                    21%
                  </div>
                  <div className="uppercase text-[10px] tracking-[0.18em] mt-2 text-white/85 font-semibold">
                    Support
                  </div>
                  <div className="text-[10px] text-[#3F6A55] mt-1">↓ 2% this week</div>
                </div>
                <div>
                  <div
                    className={`${playfair.className} text-[clamp(28px,3.4vw,40px)] leading-none`}
                    style={{ fontWeight: 400 }}
                  >
                    342
                  </div>
                  <div className="uppercase text-[10px] tracking-[0.18em] mt-2 text-white/85 font-semibold">
                    MPs voted
                  </div>
                </div>
                <div>
                  <div
                    className={`${playfair.className} text-[clamp(28px,3.4vw,40px)] leading-none`}
                    style={{ fontWeight: 400 }}
                  >
                    12.4K
                  </div>
                  <div className="uppercase text-[10px] tracking-[0.18em] mt-2 text-white/85 font-semibold">
                    Comments
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 flex-wrap">
                <a
                  href="/bills"
                  className="bg-[#B02A2A] hover:bg-[#8E2222] text-white px-6 py-3.5 uppercase tracking-[0.18em] text-[11px] font-bold flex items-center gap-2 transition-colors"
                >
                  Read the full story
                  <ArrowRight size={14} />
                </a>
                <a
                  href="/bills"
                  className="border border-white/30 hover:bg-white/5 text-white px-6 py-3.5 uppercase tracking-[0.18em] text-[11px] font-bold transition-colors"
                >
                  See how MPs voted
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
