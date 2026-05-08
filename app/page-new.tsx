// /preview rebuild — Sections 1 + 2 of N.
// Section 1: cream masthead. Section 2: nav bar.
// Each section added incrementally with screenshot sign-off in between.

import { Playfair_Display } from 'next/font/google'
import { Search } from 'lucide-react'

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
    </main>
  )
}
