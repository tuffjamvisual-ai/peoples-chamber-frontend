// /preview rebuild — Sections 1–8.
// 1: masthead · 2: nav · 3: dark hero · 4: Live from Westminster strip
// 5: Top Stories (3-col) · 6: At a Glance · 7: Latest + Editorial · 8: Footer.
// Photos cropped directly from the design PNG, served from /design-extracts/.

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
      {/* Override the global body bg (#1a1a1a from globals.css) so the
          cream design shows edge-to-edge with no dark gutters. */}
      <style>{`html, body { background: #F3F0EA !important; }`}</style>

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

            {/* RIGHT — story panel. Typography sized to fit the photo's
                 16:9 aspect height — bigger sizes overflow and force the
                 hero band taller than the design. */}
            <div className="text-white px-8 py-7 lg:px-10 lg:py-8 flex flex-col justify-between gap-4">

              <div>
                <div className="uppercase tracking-[0.32em] text-[10px] text-[#B02A2A] font-bold mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B02A2A]" />
                  Top Story
                </div>
                <h2
                  className={`${playfair.className} text-[clamp(24px,2.6vw,36px)] leading-[1.06] tracking-tight`}
                  style={{ fontWeight: 700 }}
                >
                  Winter fuel cuts<br />spark public<br />backlash
                </h2>
                <p
                  className={`${playfair.className} italic text-[13px] leading-[1.5] text-white/70 mt-3 max-w-[420px]`}
                  style={{ fontStyle: 'italic' }}
                >
                  Ministers call it &ldquo;necessary discipline.&rdquo; Pensioners call it
                  something considerably less printable.
                </p>
              </div>

              {/* 4-stat row */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <div className={`${playfair.className} text-[#E74C3C] text-[clamp(22px,2.4vw,32px)] leading-none`} style={{ fontWeight: 400 }}>
                    68%
                  </div>
                  <div className="uppercase text-[9px] tracking-[0.16em] mt-1 text-white/80 font-semibold">Oppose</div>
                  <div className="text-[9px] text-[#E74C3C]/80 mt-0.5">↑ 5% this week</div>
                </div>
                <div>
                  <div className={`${playfair.className} text-[#3F6A55] text-[clamp(22px,2.4vw,32px)] leading-none`} style={{ fontWeight: 400 }}>
                    21%
                  </div>
                  <div className="uppercase text-[9px] tracking-[0.16em] mt-1 text-white/80 font-semibold">Support</div>
                  <div className="text-[9px] text-[#3F6A55] mt-0.5">↓ 2% this week</div>
                </div>
                <div>
                  <div className={`${playfair.className} text-[clamp(18px,2vw,26px)] leading-none`} style={{ fontWeight: 400 }}>
                    342
                  </div>
                  <div className="uppercase text-[9px] tracking-[0.16em] mt-1 text-white/80 font-semibold">MPs voted</div>
                </div>
                <div>
                  <div className={`${playfair.className} text-[clamp(18px,2vw,26px)] leading-none`} style={{ fontWeight: 400 }}>
                    12.4K
                  </div>
                  <div className="uppercase text-[9px] tracking-[0.16em] mt-1 text-white/80 font-semibold">Comments</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-2 flex-wrap">
                <a href="/bills" className="bg-[#B02A2A] hover:bg-[#8E2222] text-white px-4 py-2.5 uppercase tracking-[0.16em] text-[10px] font-bold flex items-center gap-2 transition-colors">
                  Read the full story <ArrowRight size={12} />
                </a>
                <a href="/bills" className="border border-white/30 hover:bg-white/5 text-white px-4 py-2.5 uppercase tracking-[0.16em] text-[10px] font-bold transition-colors">
                  See how MPs voted
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── SECTION 4: LIVE FROM WESTMINSTER STRIP ─────────── */}
      <section className="bg-[#F3F0EA] border-y border-black/15">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-6 text-[12px] text-black/75 overflow-hidden">

          {/* LEFT — red live label */}
          <div className="flex items-center gap-2 text-[#B02A2A] font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B02A2A] animate-pulse" />
            Live from Westminster
          </div>

          {/* MIDDLE — scrolling items separated by hairline dividers */}
          {[
            'Pensions Bill progressing',
            'Public Accounts Committee hearing now live',
            'Labour rebellion grows',
          ].map((item) => (
            <span
              key={item}
              className="whitespace-nowrap border-l border-black/15 pl-6 hidden md:inline"
            >
              {item}
            </span>
          ))}

          {/* RIGHT — PMQs countdown + view-all */}
          <span className="ml-auto text-black/60 text-[11px] uppercase tracking-[0.15em] whitespace-nowrap">
            PMQs in 1h 22m
          </span>
          <a
            href="/coverage"
            className="flex items-center gap-1 uppercase tracking-[0.18em] text-[10px] font-bold text-black whitespace-nowrap hover:text-[#B02A2A] transition-colors"
          >
            View all <ArrowRight size={12} />
          </a>
        </div>
      </section>

      {/* ─────────── SECTION 5: TOP STORIES (3-col) ─────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <SectionHeader label="Top Stories" right={<RightLink href="/coverage">View all</RightLink>} />

        <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-5">

          {/* LEFT — big featured card with photo overlay
               Aspect 16:10 to match design's landscape framing. */}
          <a href="/coverage" className="group relative block aspect-[16/10] overflow-hidden">
            <Image
              src="/design-extracts/featured-rebellion.png"
              alt="Labour rebellion over welfare cuts grows"
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
              sizes="(max-width: 1024px) 100vw, 640px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#E74C3C] mb-2">
                Politics
              </div>
              <h3 className={`${playfair.className} text-[clamp(22px,2.4vw,32px)] leading-[1.15] mb-2`} style={{ fontWeight: 700 }}>
                Labour rebellion over welfare cuts grows
              </h3>
              <p className="text-white/80 text-[13px] leading-relaxed max-w-md">
                More than 40 MPs expected to vote against government whip.
              </p>
              <div className="text-white/55 text-[10px] mt-2 uppercase tracking-wider">12m ago</div>
            </div>
          </a>

          {/* MIDDLE — stack of 3 small cards */}
          <div className="flex flex-col gap-3">
            {[
              { img: '/design-extracts/stack-1-transport.png', cat: 'Bills', title: 'Transport Bill passes second reading' },
              { img: '/design-extracts/stack-2-lobbying.png', cat: 'Investigation', title: "Ex-minister's lobbying emails revealed" },
              { img: '/design-extracts/stack-3-housing.png', cat: 'Housing', title: 'Renters rally across major UK cities' },
            ].map((s) => (
              <a key={s.title} href="/coverage" className="bg-white border border-black/10 flex gap-3 p-3 hover:border-black/30 transition-colors group">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image src={s.img} alt={s.title} fill className="object-cover" sizes="80px" />
                </div>
                <div className="flex flex-col justify-between min-w-0">
                  <div className="uppercase tracking-[0.18em] text-[9px] font-bold text-[#B02A2A]">{s.cat}</div>
                  <h4 className={`${playfair.className} text-[15px] leading-[1.25] group-hover:text-[#B02A2A] transition-colors`} style={{ fontWeight: 700 }}>
                    {s.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-black/50 font-semibold">
                    Read <ArrowRight size={9} />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* RIGHT — Public Hub donut + Transparency Desk */}
          <div className="flex flex-col gap-4">

            <div className="bg-white border border-black/10 p-5">
              <div className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#2F4F3E] mb-3">
                ◆ Public Hub
              </div>
              <div className="flex items-center gap-3">
                <Donut pct={23} />
                <div>
                  <div className="uppercase tracking-wider text-[9px] text-black/50 font-semibold">Government approval</div>
                  <p className={`${playfair.className} italic text-[12px] text-black/80 leading-snug mt-1`} style={{ fontStyle: 'italic' }}>
                    Lowest in 18 months. The other 77% are tired and waiting.
                  </p>
                </div>
              </div>
              <div className="mt-3 h-8">
                <Sparkline color="#B02A2A" />
              </div>
            </div>

            <div className="bg-white border border-black/10 p-5">
              <div className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#C8A76A] mb-3">
                ◆ Transparency Desk
              </div>
              <h4 className={`${playfair.className} text-[20px] leading-tight mb-3`} style={{ fontWeight: 700 }}>Following the money</h4>

              <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Total MP expenses this month</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`${playfair.className} text-[26px] tabular-nums`} style={{ fontWeight: 400 }}>£2,873,761</span>
                <span className="text-[#3F6A55] text-[11px] font-semibold">↑ 4.7%</span>
              </div>

              <div className="border-t border-black/10 mt-3 pt-3">
                <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Top expense claim</div>
                <div className={`${playfair.className} text-[14px] mt-1`}>2nd home mortgage</div>
                <div className="text-black/60 text-[11px]">£24,990</div>
              </div>

              <div className="border-t border-black/10 mt-3 pt-3">
                <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Most frequent claimant</div>
                <div className={`${playfair.className} text-[14px] mt-1`}>Sir M. Fabricant</div>
                <div className="text-black/60 text-[11px]">Conservative · Lichfield · £27,842 this month</div>
              </div>

              <a href="/expenses" className="mt-3 flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#C8A76A]">
                View all expenses <ArrowRight size={10} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── SECTION 6: AT A GLANCE (5 stat cards) ─────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <SectionHeader label="At a Glance" right={<RightLink href="/transparency">Explore the full dashboard</RightLink>} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { val: '68%', lab: "Today's polls", sub: '↓ 4% week-on-week', tint: '#B02A2A' },
            { val: '312', lab: 'Rebellious MPs', sub: 'this Parliament', tint: '#181C1F' },
            { val: '47', lab: 'Days to next election', sub: '(estimated)', tint: '#2F4F3E' },
            { val: '£4.2B', lab: 'Taxpayer waste', sub: 'this year', tint: '#B02A2A' },
            { val: '23%', lab: 'Trust in Westminster', sub: 'lowest in 18 months', tint: '#C8A76A' },
          ].map((s) => (
            <div key={s.lab} className="bg-white border border-black/10 p-5 text-center">
              <div className={`${playfair.className} text-[clamp(22px,2.4vw,28px)] tabular-nums`} style={{ fontWeight: 400 }}>
                {s.val}
              </div>
              <div className="uppercase tracking-wider text-[10px] mt-2 text-black/55 font-semibold">{s.lab}</div>
              <div className="mt-1 text-[10px] text-black/50">{s.sub}</div>
              <div className="mt-3 h-6">
                <Sparkline color={s.tint} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── SECTION 7: LATEST FROM WESTMINSTER + Today's Editorial ─────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-black/10">
        <SectionHeader label="Latest from Westminster" right={<RightLink href="/coverage">View all stories</RightLink>} />

        <div className="grid lg:grid-cols-[3fr_1fr] gap-6">

          {/* LEFT — 4 cards in a row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { img: '/design-extracts/latest-1-ppe.png', cat: 'Politics', title: 'Public Accounts Committee demands answers over PPE contracts', time: '1h ago' },
              { img: '/design-extracts/latest-2-nhs.png', cat: 'Health', title: 'NHS waiting list hits new record as ministers trade blame', time: '2h ago' },
              { img: '/design-extracts/latest-3-mps.png', cat: 'Investigation', title: "MPs' restaurant claims rise 34% in just three months", time: '3h ago' },
              { img: '/design-extracts/latest-4-treasury.png', cat: 'Economy', title: "Treasury insists 'everything is fine' despite leaked memo", time: '4h ago' },
            ].map((s) => (
              <a key={s.title} href="/coverage" className="bg-white border border-black/10 group overflow-hidden block">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={s.img} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 50vw, 200px" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="uppercase tracking-[0.18em] text-[9px] font-bold text-[#B02A2A]">{s.cat}</span>
                    <span className="text-[9px] text-black/50 uppercase">{s.time}</span>
                  </div>
                  <h4 className={`${playfair.className} text-[16px] leading-[1.25]`} style={{ fontWeight: 700 }}>{s.title}</h4>
                </div>
              </a>
            ))}
          </div>

          {/* RIGHT — Today's Editorial sidebar */}
          <aside className="bg-white border border-black/10 p-5">
            <div className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#2F4F3E] mb-3">
              ◆ Today&apos;s Editorial
            </div>
            <h3 className={`${playfair.className} text-[22px] leading-[1.2]`} style={{ fontWeight: 700 }}>
              A nation of experts in everything and accountable for nothing.
            </h3>
            <p className={`${playfair.className} italic text-[12px] text-black/70 leading-[1.6] mt-3`} style={{ fontStyle: 'italic' }}>
              Another day, another announcement, another &ldquo;in due course&rdquo;, another promise waiting quietly for its funeral. The committee meets. The minutes are taken.
            </p>
            <div className="mt-3 relative aspect-[4/3] bg-[#EAE3D2] border border-black/10 overflow-hidden">
              <Image
                src="/design-extracts/cabinet-illustration.png"
                alt="Cabinet meeting illustration"
                fill
                className="object-contain"
                sizes="220px"
              />
            </div>
            <a href="/coverage" className="mt-3 flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#2F4F3E]">
              Read editorial <ArrowRight size={10} />
            </a>
          </aside>
        </div>
      </section>

      {/* ─────────── SECTION 8: FOOTER ─────────── */}
      <footer className="bg-[#0D1117] text-white border-t-4 border-[#C8A76A] mt-8">
        <div className="max-w-7xl mx-auto px-6 py-12">

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10">

            {/* LEFT — lion + brand + signup */}
            <div>
              <div className="relative h-24 w-40">
                <Image src="/design-extracts/lion.png" alt="Heraldic lion" fill className="object-contain object-left" sizes="160px" />
              </div>
              <div className={`${playfair.className} text-[26px] mt-3`} style={{ fontWeight: 700 }}>The People&apos;s Chamber</div>
              <p className="text-white/55 text-[12px] leading-relaxed mt-2 max-w-md">
                A modern public chamber for a modern democracy. Built from official sources. Edited with raised eyebrows.
              </p>

              <h3 className={`${playfair.className} text-[20px] mt-6 mb-2`} style={{ fontWeight: 700 }}>
                Stay informed. Stay powerful.
              </h3>
              <p className="text-white/55 text-[11px] leading-relaxed max-w-md mb-3">
                Saturday mornings: the week&apos;s biggest contracts, donations, and revolving-door moves.
              </p>
              <form className="flex gap-2 max-w-md">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 h-10 px-4 bg-[#F3F0EA] text-black placeholder:text-black/40 outline-none text-[12px]"
                />
                <button type="button" className="h-10 px-5 bg-[#B02A2A] hover:bg-[#8E2222] text-white uppercase tracking-[0.16em] text-[10px] font-bold transition-colors">
                  Subscribe
                </button>
              </form>

              <div className="flex items-center gap-2 mt-4">
                {['X', 'FB', 'IG', 'YT', 'RSS'].map((label) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="w-8 h-8 rounded-full border border-[#C8A76A]/40 hover:border-[#C8A76A] hover:bg-white/5 flex items-center justify-center text-[9px] font-bold tracking-wider transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* RIGHT — Join the Chamber callout */}
            <div className="bg-[#1F2428] border border-[#C8A76A]/40 p-6 flex flex-col">
              <div className="uppercase tracking-[0.22em] text-[10px] font-bold text-[#C8A76A] mb-3">
                ◆ Join the Chamber
              </div>
              <h3 className={`${playfair.className} text-[22px] leading-tight mb-3`} style={{ fontWeight: 700 }}>
                Be part of the public&apos;s response to power.
              </h3>
              <ul className="space-y-2 text-[12px] text-white/80">
                {[
                  'Vote on every UK Parliament bill',
                  'Track contracts, donations & revolving doors',
                  'Join the public record',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 leading-snug">
                    <span className="text-[#C8A76A] mt-[2px]">◆</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a href="/about#join" className="mt-5 self-start bg-[#2F4F3E] hover:bg-[#1F3829] text-white px-5 py-2.5 uppercase tracking-[0.16em] text-[10px] font-bold transition-colors flex items-center gap-2">
                Sign up — free <ArrowRight size={11} />
              </a>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="border-t border-white/10 mt-10 pt-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-[10px] text-white/40">
            <div>© {new Date().getFullYear()} The People&apos;s Chamber · Public-record reporting</div>
            <div className="uppercase tracking-[0.22em] font-semibold">peopleschamber.uk</div>
          </div>
        </div>
      </footer>
    </main>
  )
}

/* ───── HELPERS ───── */

function SectionHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="block w-7 h-[3px] bg-[#B02A2A]" />
        <h2 className="uppercase tracking-[0.22em] text-[11px] font-bold text-black">{label}</h2>
      </div>
      {right}
    </div>
  )
}

function RightLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#2F4F3E] border-b-2 border-[#C8A76A] pb-0.5 hover:text-[#B02A2A] transition-colors">
      {children} <ArrowRight size={10} />
    </a>
  )
}

function Donut({ pct }: { pct: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-label={`${pct}% government approval`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E0DACE" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#2F4F3E" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 32 32)" />
      <text x="32" y="38" textAnchor="middle" fontFamily="ui-serif, Georgia, serif" fontWeight="700" fontSize="16" fill="#181C1F">
        {pct}%
      </text>
    </svg>
  )
}

function Sparkline({ color }: { color: string }) {
  const points = '0,18 12,14 24,16 36,10 48,12 60,7 72,9 84,4 96,6 108,1 120,3'
  return (
    <svg viewBox="0 0 120 22" width="100%" height="100%" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="120" cy="3" r="2" fill={color} />
    </svg>
  )
}
