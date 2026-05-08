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

            {/* CENTER — masthead title + caption (no crown — not in design) */}
            <div className="text-center">
              <h1
                className={`${playfair.className} text-[clamp(40px,5vw,68px)] leading-[0.95] tracking-tight text-black`}
                style={{ fontWeight: 800 }}
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
    </main>
  )
}

