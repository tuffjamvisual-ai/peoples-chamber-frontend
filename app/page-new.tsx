// /preview rebuild — Section 1 of N: cream masthead only.
// No ticker, no nav, no hero. Just the masthead block.
// Load Playfair Display via next/font so the serif matches the design.

import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export default function HomePageNew() {
  return (
    <main className="bg-[#F3F0EA] min-h-screen text-[#181C1F]">
      <header className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 items-center gap-6">

            {/* LEFT — italic tagline */}
            <div
              className={`${playfair.className} italic text-[15px] leading-[1.5] text-black/65 max-w-[220px]`}
              style={{ fontStyle: 'italic' }}
            >
              The government speaks.<br />
              The public replies.
            </div>

            {/* CENTER — crown + masthead title + caption */}
            <div className="text-center">
              <CrownGlyph />
              <h1
                className={`${playfair.className} text-[clamp(40px,5vw,68px)] leading-[0.95] tracking-tight text-black mt-3`}
                style={{ fontWeight: 800 }}
              >
                The People&apos;s Chamber
              </h1>
              <p className="uppercase tracking-[0.42em] text-[10px] mt-4 text-[#2F4F3E] font-semibold">
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
    </main>
  )
}

/* Small heraldic crown — flat-line drawing inspired by Royal Standard.
   Sized small (24px) to sit above the masthead title. */
function CrownGlyph() {
  return (
    <svg
      viewBox="0 0 64 32"
      width="36"
      height="18"
      role="img"
      aria-label="Crown"
      className="mx-auto"
    >
      <g fill="none" stroke="#2F4F3E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Base band */}
        <line x1="6" y1="26" x2="58" y2="26" />
        <line x1="6" y1="22" x2="58" y2="22" />
        {/* Three peaks */}
        <path d="M8 22 L18 8 L24 18 L32 4 L40 18 L46 8 L56 22" />
        {/* Three small finials at peaks */}
        <circle cx="18" cy="6" r="1.6" fill="#2F4F3E" stroke="none" />
        <circle cx="32" cy="2" r="1.8" fill="#2F4F3E" stroke="none" />
        <circle cx="46" cy="6" r="1.6" fill="#2F4F3E" stroke="none" />
      </g>
    </svg>
  )
}
