// /preview rebuild — Sections 1–8.
// 1: masthead · 2: nav · 3: dark hero · 4: Live from Westminster strip
// 5: Top Stories (3-col) · 6: At a Glance · 7: Latest + Editorial · 8: Footer.
// Photos cropped directly from the design PNG, served from /design-extracts/.

import Image from 'next/image'
import { Playfair_Display } from 'next/font/google'
import {
  Search,
  ArrowRight,
  Landmark,
  Users,
  FileText,
  Clock3,
  PoundSterling,
  TrendingUp,
  Frown,
  Smile,
} from 'lucide-react'

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
      <section>
        <div className="max-w-7xl mx-auto bg-[#0D1117]">
          <div className="grid lg:grid-cols-2">

            {/* LEFT — Westminster photo. Container is aspect-locked to the
                 design's hero-photo proportion (~16/9). Right panel inherits
                 this height via CSS grid — see panel below. */}
            <div className="relative min-h-[300px] h-full">
              <Image
                src="/design-extracts/hero-westminster.png"
                alt="The Palace of Westminster"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
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

                {/* Story photo */}
                <div className="relative aspect-[1672/941] w-full max-w-[360px] mb-4">
                  <Image
                    src="/design-extracts/hero-mp-expenses.png"
                    alt="MP claims £367,659 in expenses"
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </div>

                <h2
                  className={`${playfair.className} text-[clamp(24px,2.6vw,36px)] leading-[1.06] tracking-tight`}
                  style={{ fontWeight: 700 }}
                >
                  MP claims £367,659 in expenses, insists it&apos;s &ldquo;terribly efficient&rdquo; compared to last year
                </h2>
                <a
                  href="/coverage"
                  className="inline-flex items-center gap-1 mt-4 uppercase tracking-[0.18em] text-[10px] font-bold text-[#C8A76A] border-b-2 border-[#C8A76A] pb-0.5 hover:text-white hover:border-white transition-colors"
                >
                  Read the full story <ArrowRight size={11} />
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

      {/* ─────────── SECTION 5: 3 EDITORIAL COLUMNS ─────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_1.4fr_1fr] gap-5">

          {/* LEFT — The Public Chamber polls */}
          <article className="bg-white border border-black/10 p-6">
            <div className="uppercase tracking-[0.22em] text-[10px] font-bold text-[#B02A2A] mb-1">
              ◆ The Public Chamber
            </div>
            <h3 className={`${playfair.className} text-[22px] leading-tight mb-5`} style={{ fontWeight: 700 }}>
              Popular polls
            </h3>

            <div className="flex flex-col gap-7">
              {[
                { title: 'Winter Fuel Payment Bill', approval: 22, change: -5 },
                { title: 'Online Safety (Amendment) Bill', approval: 35, change: -2 },
                { title: "Renters' Rights Bill", approval: 14, change: -3 },
              ].map((p) => (
                <div key={p.title} className="text-center">
                  <div className="flex items-end justify-center gap-3">
                    <FaceDisc kind="sad" />
                    <PollGauge approval={p.approval} />
                    <FaceDisc kind="happy" />
                  </div>
                  <div
                    className="text-[12px] mt-3 font-semibold"
                    style={{ color: p.change < 0 ? '#B02A2A' : '#2F4F3E' }}
                  >
                    {p.change < 0 ? '↓' : '↑'} {Math.abs(p.change)}% this week
                  </div>
                  <div className={`${playfair.className} text-[15px] leading-tight mt-2 text-black`} style={{ fontWeight: 700 }}>
                    {p.title}
                  </div>
                </div>
              ))}
            </div>

            <a href="/polls" className="mt-6 inline-flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#B02A2A]">
              View all polls <ArrowRight size={10} />
            </a>
          </article>

          {/* CENTER — Today's Editorial */}
          <article className="bg-white border border-black/10 p-7">
            <div className="uppercase tracking-[0.22em] text-[10px] font-bold text-[#2F4F3E] mb-2">
              ◆ Today&apos;s Editorial
            </div>
            <h3 className={`${playfair.className} text-[clamp(22px,2.4vw,30px)] leading-[1.18] mb-4`} style={{ fontWeight: 700 }}>
              Westminster: a nation of experts in everything and accountable for nothing.
            </h3>
            <p className={`${playfair.className} italic text-[13px] text-black/70 leading-[1.6] mb-4`} style={{ fontStyle: 'italic' }}>
              Another day, another announcement, another &ldquo;in due course&rdquo;, another promise waiting quietly for its funeral. The committee meets. The minutes are taken.
            </p>
            <div className="relative aspect-[4/3] bg-[#EAE3D2] border border-black/10 overflow-hidden mb-4">
              <Image
                src="/design-extracts/cabinet-illustration.png"
                alt="Cabinet meeting illustration"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 400px"
              />
            </div>
            <a href="/coverage" className="inline-flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#2F4F3E]">
              Read editorial <ArrowRight size={10} />
            </a>
          </article>

          {/* RIGHT — Transparency Desk */}
          <article className="bg-white border border-black/10 p-6">
            <div className="uppercase tracking-[0.22em] text-[10px] font-bold text-[#C8A76A] mb-1">
              ◆ Transparency Desk
            </div>
            <h3 className={`${playfair.className} italic text-[18px] leading-tight mb-5`} style={{ fontWeight: 400, fontStyle: 'italic' }}>
              Following the money
            </h3>

            <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">
              Total MP expenses this month
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`${playfair.className} text-[clamp(24px,2.4vw,32px)] tabular-nums leading-none`} style={{ fontWeight: 400 }}>
                £2,873,761
              </span>
              <span className="text-[#3F6A55] text-[11px] font-semibold">↑ 4.7%</span>
            </div>

            <div className="border-t border-black/10 mt-4 pt-3">
              <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Top expense claim</div>
              <div className={`${playfair.className} text-[14px] mt-1`} style={{ fontWeight: 700 }}>2nd home mortgage</div>
              <div className="text-black/60 text-[11px]">£24,990</div>
            </div>

            <div className="border-t border-black/10 mt-3 pt-3">
              <div className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Most frequent claimant</div>
              <div className={`${playfair.className} text-[14px] mt-1`} style={{ fontWeight: 700 }}>Sir M. Fabricant</div>
              <div className="text-black/60 text-[11px]">Conservative · Lichfield · £27,842 this month</div>
            </div>

            <a href="/expenses" className="mt-4 inline-flex items-center gap-1 uppercase tracking-[0.16em] text-[10px] font-bold text-[#C8A76A]">
              View all expenses <ArrowRight size={10} />
            </a>
          </article>
        </div>
      </section>

      {/* ─────────── SECTION 6: AT A GLANCE — 5 stats + 1 CTA, with circular icons ─────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <SectionHeader label="At a Glance" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { Icon: Landmark, val: '23%', lab: 'Government approval', sub: '↓ 3% this week', tint: '#2F4F3E' },
            { Icon: Users, val: '68%', lab: "Today's polls", sub: '↑ 4% this week', tint: '#B02A2A' },
            { Icon: FileText, val: '312', lab: 'Bills tracked', sub: 'this Parliament', tint: '#181C1F' },
            { Icon: Clock3, val: '47', lab: 'Days to election', sub: '(estimated)', tint: '#B02A2A' },
            { Icon: PoundSterling, val: '£4.2B', lab: 'Taxpayer waste', sub: 'this year', tint: '#C8A76A' },
          ].map((s) => (
            <div key={s.lab} className="bg-white border border-black/10 p-4 text-center">
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: s.tint + '14', color: s.tint, border: `1px solid ${s.tint}33` }}
              >
                <s.Icon size={18} />
              </div>
              <div className={`${playfair.className} text-[clamp(22px,2.2vw,28px)] tabular-nums leading-none`} style={{ fontWeight: 400 }}>
                {s.val}
              </div>
              <div className="uppercase tracking-wider text-[9px] mt-2 text-black/55 font-semibold">{s.lab}</div>
              <div className="mt-0.5 text-[9px] text-black/50">{s.sub}</div>
              <div className="mt-2 h-5">
                <Sparkline color={s.tint} />
              </div>
            </div>
          ))}

          {/* Explore CTA card */}
          <a
            href="/transparency"
            className="bg-white border border-black/10 p-4 flex flex-col justify-between text-left hover:border-[#C8A76A] transition-colors group"
          >
            <div>
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: '#C8A76A14', color: '#C8A76A', border: '1px solid #C8A76A33' }}
              >
                <TrendingUp size={18} />
              </div>
              <div className={`${playfair.className} text-[14px] leading-[1.25] text-center`} style={{ fontWeight: 700 }}>
                Explore the full dashboard
              </div>
              <p className="text-[9px] text-black/55 mt-2 leading-snug text-center">
                Live data, trends and historical insights.
              </p>
            </div>
            <div className="mt-2 h-5">
              <Sparkline color="#C8A76A" />
            </div>
          </a>
        </div>
      </section>

      {/* ─────────── SECTION 7: LATEST FROM THE CHAMBER — 4 cards full width ─────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-black/10">
        <SectionHeader label="Latest from the Chamber" right={<RightLink href="/coverage">View all stories</RightLink>} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { img: '/design-extracts/featured-rebellion.png', cat: 'Politics', title: 'Labour rebellion over welfare cuts grows', excerpt: 'More than 40 MPs expected to vote against government whip.', time: '12m ago' },
            { img: '/design-extracts/stack-1-transport.png', cat: 'Bills', title: 'Transport Bill passes second reading', excerpt: 'Committee stage scheduled for next month.', time: '28m ago' },
            { img: '/design-extracts/stack-2-lobbying.png', cat: 'Investigation', title: "Ex-minister's lobbying emails revealed", excerpt: 'Undisclosed correspondence with industry contacts.', time: '1h ago' },
            { img: '/design-extracts/stack-3-housing.png', cat: 'Housing', title: 'Renters rally across major UK cities', excerpt: 'Demonstrations call for stronger eviction protections.', time: '2h ago' },
          ].map((s) => (
            <a key={s.title} href="/coverage" className="bg-white border border-black/10 group overflow-hidden block">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={s.img} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 50vw, 250px" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="uppercase tracking-[0.18em] text-[9px] font-bold text-[#B02A2A]">{s.cat}</span>
                  <span className="text-[9px] text-black/50 uppercase">{s.time}</span>
                </div>
                <h4 className={`${playfair.className} text-[17px] leading-[1.25] mb-2`} style={{ fontWeight: 700 }}>{s.title}</h4>
                <p className="text-[12px] text-black/60 leading-relaxed line-clamp-2">{s.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ─────────── SECTION 8: FOOTER ─────────── */}
      <footer className="text-[#181C1F] mt-8">
        <div className="max-w-7xl mx-auto px-6 py-8 bg-[#E5E5E5]">
          <div className="flex items-center gap-8 flex-wrap">

            {/* lion */}
            <div className="relative h-20 w-20 flex-shrink-0">
              <Image src="/design-extracts/lion.png" alt="Heraldic lion" fill className="object-contain" sizes="80px" />
            </div>

            {/* brand */}
            <div>
              <div className={`${playfair.className} text-[20px] leading-tight`} style={{ fontWeight: 700 }}>
                The People&apos;s Chamber
              </div>
              <p className="text-black/55 text-[11px] leading-relaxed mt-1">
                A modern public chamber for a modern democracy.
              </p>
            </div>

            {/* social — pushed right */}
            <div className="flex items-center gap-2 ml-auto">
              {['X', 'FB', 'IG', 'YT', 'RSS'].map((label) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-black/30 hover:border-black hover:bg-black/5 flex items-center justify-center text-[8px] font-bold tracking-wider transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-black/15 flex justify-between text-[10px] text-black/45">
            <span>© {new Date().getFullYear()} The People&apos;s Chamber</span>
            <span className="uppercase tracking-[0.22em] font-semibold">peopleschamber.uk</span>
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
  const r = 48
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg viewBox="0 0 120 120" width="110" height="110" aria-label={`${pct}% government approval`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#E0DACE" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#2F4F3E" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" fontFamily="ui-serif, Georgia, serif" fontWeight="700" fontSize="28" fill="#181C1F">
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

function PollGauge({ approval }: { approval: number }) {
  // Semicircle gauge (speedometer style). Arc has a red→green gradient.
  // 0% sits at the left end of the arc, 100% at the right end.
  const cx = 80
  const cy = 90
  const r = 60
  const arcLen = Math.PI * r // full semicircle path length
  const dash = (approval / 100) * arcLen
  // Indicator position along the arc
  const angle = Math.PI * (1 - approval / 100) // radians from positive x-axis
  const ix = cx + r * Math.cos(angle)
  const iy = cy - r * Math.sin(angle)
  return (
    <svg viewBox="0 0 160 110" width="160" height="110" aria-label={`${approval}% approval`}>
      <defs>
        <linearGradient id={`pg-grad-${approval}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B02A2A" />
          <stop offset="50%" stopColor="#C8A76A" />
          <stop offset="100%" stopColor="#2F4F3E" />
        </linearGradient>
      </defs>
      {/* track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#E5E5E5"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* gradient approval arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={`url(#pg-grad-${approval})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${arcLen - dash}`}
      />
      {/* indicator notch where the value sits */}
      <circle cx={ix} cy={iy} r="6" fill="#181C1F" stroke="#fff" strokeWidth="2" />
      {/* big percentage text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontWeight="800"
        fontSize="36"
        fill="#181C1F"
      >
        {approval}%
      </text>
    </svg>
  )
}

function FaceDisc({ kind }: { kind: 'sad' | 'happy' }) {
  const colour = kind === 'sad' ? '#B02A2A' : '#2F4F3E'
  return (
    <svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={colour} />
      <circle cx="11" cy="13" r="1.6" fill="#fff" />
      <circle cx="21" cy="13" r="1.6" fill="#fff" />
      {kind === 'sad' ? (
        <path d="M 10 22 Q 16 17 22 22" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M 10 19 Q 16 24 22 19" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}
