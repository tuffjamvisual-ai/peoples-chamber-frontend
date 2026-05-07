// Editorial preview — pixel-target: ~/Downloads/f206adcc-6842-4be8-919f-e7781a7f0f70.png
//
// Faithful to the design image. Static mocks throughout — content
// matches the screenshot exactly so visual review is unambiguous.
// Wire DB later (the JSX shape is stable).

import Image from "next/image";
import NewsletterForm from "./components/NewsletterForm";
import {
  Search,
  ArrowRight,
  Radio,
  Cloud,
  PoundSterling,
  Users,
  Clock3,
  Landmark,
  TrendingDown,
} from "lucide-react";

const NAV = [
  "Bills",
  "MPs",
  "Departments",
  "Transparency",
  "Expenses",
  "Polls",
  "Satire Desk",
  "News & Analysis",
];

const FEATURED_STORY = {
  category: "POLITICS",
  title: "Labour rebellion over welfare cuts grows",
  excerpt: "More than 40 MPs expected to vote against government whip.",
  time: "12m ago",
  image:
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=1600&auto=format&fit=crop",
};

const STACK_STORIES = [
  {
    category: "BILLS",
    title: "Transport Bill passes second reading",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=600&auto=format&fit=crop",
  },
  {
    category: "INVESTIGATION",
    title: "Ex-minister's lobbying emails revealed",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=600&auto=format&fit=crop",
  },
  {
    category: "HOUSING",
    title: "Renters rally across major UK cities",
    image:
      "https://images.unsplash.com/photo-1591189824344-9b3e2c3e3e3a?q=80&w=600&auto=format&fit=crop",
  },
];

const LATEST = [
  {
    category: "POLITICS",
    title: "Public Accounts Committee demands answers over PPE contracts",
    time: "1h ago",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=800&auto=format&fit=crop",
  },
  {
    category: "HEALTH",
    title: "NHS waiting list hits new record as ministers trade blame",
    time: "2h ago",
    image:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=800&auto=format&fit=crop",
  },
  {
    category: "INVESTIGATION",
    title: "MPs' restaurant claims rise 34% in just three months",
    time: "3h ago",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
  },
  {
    category: "ECONOMY",
    title: "Treasury insists 'everything is fine' despite leaked memo",
    time: "4h ago",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=800&auto=format&fit=crop",
  },
];

const STATS = [
  { icon: Landmark, value: "68%", label: "Today's Polls", sub: "↓ 4% week-on-week" },
  { icon: Users, value: "312", label: "Rebellious MPs", sub: "this Parliament" },
  { icon: Clock3, value: "47", label: "Days to next election", sub: "(estimated)" },
  { icon: PoundSterling, value: "£4.2B", label: "Taxpayer waste", sub: "this year" },
  { icon: TrendingDown, value: "23%", label: "Trust in Westminster", sub: "lowest in 18 months" },
];

export default function HomePageNew() {
  return (
    <main className="bg-[#f5f2ed] text-[#111] min-h-screen font-sans">

      {/* ─── RED TICKER ─── */}
      <div className="bg-[#b02a2a] text-white border-b border-[#c8a76a]">
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-6 overflow-hidden">
            <div className="flex items-center gap-2 font-bold tracking-widest text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            <span className="whitespace-nowrap">Winter Fuel Payment Bill: Public opposition at 68%</span>
            <span className="opacity-60">•</span>
            <span className="whitespace-nowrap">MP Expenses updated 12 mins ago</span>
            <span className="opacity-60">•</span>
            <span className="whitespace-nowrap">Transport Bill enters committee stage</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] tracking-wider uppercase font-semibold whitespace-nowrap">
            <Cloud size={14} />
            <span>Westminster · 14°C</span>
          </div>
        </div>
      </div>

      {/* ─── MASTHEAD ─── */}
      <header className="bg-[#f5f2ed] border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 items-center gap-6">
            <div className="italic text-[13px] text-black/55 leading-relaxed max-w-[200px]">
              The government speaks.<br />The public replies.
            </div>
            <div className="text-center">
              <h1 className="font-serif text-5xl md:text-6xl tracking-tight text-black">
                The People&apos;s Chamber
              </h1>
              <p className="uppercase tracking-[0.4em] text-[10px] mt-3 text-[#2f4f3e] font-semibold">
                Holding power to account
              </p>
            </div>
            <div className="ml-auto text-right italic text-[13px] text-black/55 leading-relaxed max-w-[200px]">
              A modern public chamber<br />for a modern democracy.
            </div>
          </div>
        </div>

        {/* NAV */}
        <div className="border-t border-black/10">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <nav className="flex items-center gap-7 text-[12px] font-medium tracking-[0.12em] uppercase">
              {NAV.map((item) => (
                <a key={item} href="#" className="text-black/80 hover:text-[#b02a2a] transition-colors">
                  {item}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <button aria-label="Search" className="text-black/70 hover:text-black">
                <Search size={18} />
              </button>
              <button className="bg-[#b02a2a] hover:bg-[#8e2222] text-white px-5 py-2.5 uppercase tracking-[0.15em] text-[11px] font-bold transition-colors">
                Join the Chamber
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── DARK HERO ─── */}
      <section className="bg-[#0d1117]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <div className="relative min-h-[520px]">
              <Image
                src="https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=1600&auto=format&fit=crop"
                alt="The Palace of Westminster"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d1117]" />
            </div>

            <div className="text-white p-10 lg:p-14 flex flex-col justify-between gap-8">
              <div>
                <div className="uppercase tracking-[0.3em] text-[11px] text-[#b02a2a] font-bold mb-5">
                  Top Story
                </div>
                <h2 className="font-serif text-4xl md:text-5xl lg:text-[56px] leading-[1.05] tracking-tight">
                  Winter fuel cuts<br />spark public<br />backlash
                </h2>
                <p className="text-white/70 text-[17px] leading-relaxed mt-6 max-w-md italic">
                  Ministers call it &ldquo;necessary discipline.&rdquo; Pensioners call it
                  something considerably less printable.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-[#e74c3c] text-4xl md:text-5xl font-light leading-none">68%</div>
                  <div className="uppercase text-[10px] tracking-widest mt-2 text-white/80">Oppose</div>
                  <div className="text-[10px] text-[#e74c3c]/80 mt-1">↓ 5% since yesterday</div>
                </div>
                <div>
                  <div className="text-[#3f6a55] text-4xl md:text-5xl font-light leading-none">21%</div>
                  <div className="uppercase text-[10px] tracking-widest mt-2 text-white/80">Support</div>
                  <div className="text-[10px] text-[#3f6a55] mt-1">↑ 2% since yesterday</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-light leading-none">342</div>
                  <div className="uppercase text-[10px] tracking-widest mt-2 text-white/80">MPs voted</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-light leading-none">12.4K</div>
                  <div className="uppercase text-[10px] tracking-widest mt-2 text-white/80">Comments</div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button className="bg-[#b02a2a] hover:bg-[#8e2222] text-white px-6 py-3.5 uppercase tracking-[0.15em] text-[11px] font-bold flex items-center gap-2 transition-colors">
                  Read the full story
                  <ArrowRight size={14} />
                </button>
                <button className="border border-white/30 hover:bg-white/5 text-white px-6 py-3.5 uppercase tracking-[0.15em] text-[11px] font-bold transition-colors">
                  See how MPs voted
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE STRIP ─── */}
      <section className="bg-[#1f2428] border-y border-black/10">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-6 overflow-hidden text-white/80 text-[12px]">
          <div className="flex items-center gap-2 text-[#b02a2a] font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b02a2a] animate-pulse" />
            Live from Westminster
          </div>
          {[
            "Pensions Bill progressing",
            "Public Accounts Committee hearing now live",
            "Labour rebellion grows",
          ].map((item) => (
            <span key={item} className="whitespace-nowrap border-l border-white/15 pl-6">{item}</span>
          ))}
          <span className="ml-auto text-white/60 text-[11px] uppercase tracking-wider whitespace-nowrap">PMQs in 1h 22m</span>
          <a href="#" className="flex items-center gap-1 uppercase tracking-[0.15em] text-[10px] font-bold text-white whitespace-nowrap">
            View all <ArrowRight size={12} />
          </a>
        </div>
      </section>

      {/* ─── TOP STORIES ─── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <SectionHeader label="Top Stories" />

        <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-5">
          {/* LEFT — featured big card */}
          <a href="#" className="group block relative min-h-[440px] overflow-hidden">
            <Image
              src={FEATURED_STORY.image}
              alt={FEATURED_STORY.title}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
              <div className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#e74c3c] mb-3">
                {FEATURED_STORY.category}
              </div>
              <h3 className="font-serif text-4xl leading-[1.1] mb-3">
                {FEATURED_STORY.title}
              </h3>
              <p className="text-white/85 text-[14px] leading-relaxed max-w-md">
                {FEATURED_STORY.excerpt}
              </p>
              <div className="text-white/60 text-[11px] mt-3 uppercase tracking-wider">{FEATURED_STORY.time}</div>
            </div>
          </a>

          {/* MIDDLE — stack of 3 small cards */}
          <div className="flex flex-col gap-4">
            {STACK_STORIES.map((s) => (
              <a key={s.title} href="#" className="bg-white border border-black/10 flex gap-4 p-4 hover:border-black/20 transition-colors group">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image src={s.image} alt={s.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col justify-between min-w-0">
                  <div className="uppercase tracking-[0.18em] text-[10px] font-bold text-[#b02a2a]">{s.category}</div>
                  <h4 className="font-serif text-[17px] leading-[1.25] group-hover:text-[#b02a2a] transition-colors">{s.title}</h4>
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-black/50 font-semibold">
                    Read story <ArrowRight size={10} />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* RIGHT — Public Hub + Transparency Desk */}
          <div className="flex flex-col gap-4">
            {/* Public Hub */}
            <div className="bg-white border border-black/10 p-5">
              <div className="uppercase tracking-[0.18em] text-[10px] font-bold text-[#2f4f3e] mb-3">
                ◆ Public Hub
              </div>
              <div className="flex items-center gap-4">
                <Donut pct={23} />
                <div>
                  <div className="uppercase tracking-wider text-[10px] text-black/50 font-semibold">Government approval</div>
                  <p className="font-serif italic text-[13px] text-black/80 leading-snug mt-1">
                    Lowest in 18 months. The other 77% are tired and waiting.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-10">
                <Sparkline color="#b02a2a" />
              </div>
            </div>

            {/* Transparency Desk */}
            <div className="bg-white border border-black/10 p-5">
              <div className="uppercase tracking-[0.18em] text-[10px] font-bold text-[#c8a76a] mb-3">
                ◆ Transparency Desk
              </div>
              <h4 className="font-serif text-2xl leading-tight mb-4">Following the money</h4>

              <div className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">Total MP expenses this month</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl font-light tabular-nums">£2,873,761</span>
                <span className="text-[#3f6a55] text-[12px] font-semibold">↑ 4.7%</span>
              </div>

              <div className="border-t border-black/10 mt-4 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">Top expense claim</div>
                <div className="font-serif text-[16px] mt-1">2nd home mortgage</div>
                <div className="text-black/60 text-[12px]">£24,990</div>
              </div>

              <div className="border-t border-black/10 mt-3 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">Most frequent claimant</div>
                <div className="font-serif text-[16px] mt-1">Sir M. Fabricant</div>
                <div className="text-black/60 text-[12px]">Conservative · Lichfield · £27,842 this month</div>
              </div>

              <a href="#" className="mt-4 flex items-center gap-1 uppercase tracking-[0.15em] text-[10px] font-bold">
                View all expenses <ArrowRight size={11} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AT A GLANCE ─── */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <SectionHeader label="At a Glance" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border border-black/10 bg-white">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`p-6 ${i !== STATS.length - 1 ? 'lg:border-r border-b lg:border-b-0 border-black/10' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-[#b02a2a]/10 text-[#b02a2a] flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <div className="font-serif text-3xl mt-4 font-light tabular-nums">{stat.value}</div>
                <div className="uppercase tracking-wider text-[10px] mt-2 text-black/55 font-semibold">{stat.label}</div>
                <div className="mt-1 text-[11px] text-black/60">{stat.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── LATEST FROM WESTMINSTER + Today's Editorial ─── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <SectionHeader label="Latest from Westminster" right={
          <a href="#" className="flex items-center gap-1 uppercase tracking-[0.15em] text-[10px] font-bold text-[#2f4f3e]">
            View all stories <ArrowRight size={11} />
          </a>
        } />

        <div className="grid lg:grid-cols-[3fr_1fr] gap-6">
          {/* LEFT — 4 cards in a row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {LATEST.map((s) => (
              <a key={s.title} href="#" className="bg-white border border-black/10 group overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={s.image} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="uppercase tracking-[0.18em] text-[9px] font-bold text-[#b02a2a]">{s.category}</span>
                    <span className="text-[10px] text-black/50">{s.time}</span>
                  </div>
                  <h4 className="font-serif text-[18px] leading-[1.25] mt-3">{s.title}</h4>
                </div>
              </a>
            ))}
          </div>

          {/* RIGHT — Today's Editorial */}
          <aside className="bg-white border border-black/10 p-6">
            <div className="uppercase tracking-[0.18em] text-[10px] font-bold text-[#2f4f3e] mb-3">
              ◆ Today&apos;s Editorial
            </div>
            <h3 className="font-serif text-[24px] leading-[1.2]">
              A nation of experts in everything and accountable for nothing.
            </h3>
            <p className="text-[13px] text-black/70 leading-relaxed italic mt-4 font-serif">
              Another day, another announcement, another &ldquo;in due course&rdquo;, another promise waiting quietly for its funeral. The committee meets. The minutes are taken.
            </p>
            <div className="bg-[#eae3d2] border border-black/10 mt-4 p-3 flex items-center justify-center min-h-[140px]">
              <CabinetIllustration />
            </div>
            <a href="#" className="mt-4 flex items-center gap-1 uppercase tracking-[0.15em] text-[10px] font-bold text-[#2f4f3e]">
              Read editorial <ArrowRight size={11} />
            </a>
          </aside>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0d1117] text-white mt-12 border-t-4 border-[#c8a76a]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12">

            {/* LEFT — lion + brand + signup */}
            <div>
              <LionEngraving />
              <div className="font-serif text-3xl font-bold mt-4">The People&apos;s Chamber</div>
              <p className="text-white/55 text-[13px] leading-relaxed mt-2 max-w-md">
                A modern public chamber for a modern democracy. Built from official sources. Edited with raised eyebrows.
              </p>
              <h3 className="font-serif text-2xl mt-8 mb-2">Stay informed. Stay powerful.</h3>
              <p className="text-white/55 text-[12px] leading-relaxed max-w-md mb-4">
                Saturday mornings: the week&apos;s biggest contracts, donations, and revolving-door moves.
              </p>
              <NewsletterForm />
            </div>

            {/* RIGHT — Join the Chamber callout */}
            <div className="bg-[#1f2428] border border-[#c8a76a]/40 p-7 flex flex-col">
              <div className="uppercase tracking-[0.22em] text-[10px] font-bold text-[#c8a76a] mb-3">
                ◆ Join the Chamber
              </div>
              <h3 className="font-serif text-2xl leading-tight mb-4">Be part of the public&apos;s response to power.</h3>
              <ul className="space-y-2 text-[13px] text-white/80">
                <Bullet>Vote on every UK Parliament bill</Bullet>
                <Bullet>Track contracts, donations & revolving doors</Bullet>
                <Bullet>Join the public record</Bullet>
              </ul>
              <button className="mt-6 self-start bg-[#2f4f3e] hover:bg-[#1f3829] text-white px-6 py-3 uppercase tracking-[0.15em] text-[11px] font-bold transition-colors flex items-center gap-2">
                Sign up — free <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[11px] text-white/40">
            <div>© {new Date().getFullYear()} The People&apos;s Chamber · Public-record reporting</div>
            <div className="uppercase tracking-[0.22em] font-semibold">peopleschamber.uk</div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ───── SUB-COMPONENTS ───── */

function SectionHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className="block w-8 h-[3px] bg-[#b02a2a]" />
        <h2 className="uppercase tracking-[0.22em] text-[11px] font-bold text-black">{label}</h2>
      </div>
      {right}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-snug">
      <span className="text-[#c8a76a] mt-[3px]">◆</span>
      <span>{children}</span>
    </li>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-label={`${pct}% government approval`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e0dace" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke="#2f4f3e" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 36 36)"
      />
      <text x="36" y="42" textAnchor="middle" fontFamily="ui-serif, Georgia, serif" fontWeight="700" fontSize="18" fill="#111">
        {pct}%
      </text>
    </svg>
  );
}

function Sparkline({ color }: { color: string }) {
  const points = "0,28 12,22 24,24 36,18 48,20 60,12 72,15 84,8 96,10 108,5 120,7 132,2";
  return (
    <svg viewBox="0 0 132 32" width="100%" height="100%" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="132" cy="2" r="2.5" fill={color} />
    </svg>
  );
}

function CabinetIllustration() {
  return (
    <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: 280 }} role="img" aria-label="Cabinet meeting illustration">
      <g opacity="0.18" fill="#1f2428">
        <rect x="20" y="30" width="14" height="60" />
        <rect x="34" y="40" width="40" height="50" />
        <rect x="74" y="25" width="10" height="65" />
        <rect x="84" y="45" width="50" height="45" />
        <rect x="220" y="35" width="14" height="55" />
        <rect x="234" y="45" width="60" height="45" />
      </g>
      <ellipse cx="160" cy="125" rx="105" ry="20" fill="#5c5c58" opacity="0.25" />
      <ellipse cx="160" cy="120" rx="105" ry="18" fill="#3f3a30" />
      {[42, 80, 118, 158, 200, 240, 278].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={i % 2 === 0 ? 86 : 92} r="8" fill="#1f2428" />
          <path d={`M${x - 12},${i % 2 === 0 ? 120 : 124} q12,-20 24,0 z`} fill="#1f2428" />
          <path d={`M${x - 1},${i % 2 === 0 ? 100 : 105} l2,13 l-2,4 l-2,-4 z`} fill={i % 3 === 0 ? "#b02a2a" : "#c8a76a"} />
        </g>
      ))}
      <g>
        <path d="M178 22 q0 -14 16 -14 h54 q16 0 16 14 v16 q0 14 -16 14 h-30 l-10 12 v-12 h-14 q-16 0 -16 -14 z" fill="#fff" stroke="#1f2428" strokeWidth="1.2" />
        <text x="186" y="34" fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fontSize="12" fill="#1f2428">Order!</text>
        <text x="186" y="48" fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fontSize="12" fill="#1f2428">Order!</text>
      </g>
    </svg>
  );
}

function LionEngraving() {
  return (
    <svg viewBox="0 0 220 130" width="170" height="auto" role="img" aria-label="Heraldic lion engraving">
      <g fill="none" stroke="#c8a76a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 96 q0 -12 14 -16 q-2 -10 6 -16 q-4 -10 4 -14 q6 -2 10 4 q4 -8 14 -8 q12 0 16 10 q12 -2 18 6 q22 4 30 18 q14 4 18 16 q4 10 -2 18 q-6 6 -16 6 q-2 6 -10 6 q-6 0 -10 -4 q-12 6 -28 6 q-14 0 -22 -4 q-6 4 -16 4 q-12 0 -18 -8 q-8 -2 -8 -14 z" />
        <path d="M44 80 q4 -4 8 0 m-2 -8 q4 -4 8 0 m-4 -8 q4 -4 8 0 m-2 -10 q4 -4 8 0 m4 -6 q4 -4 8 0" opacity="0.7" />
        <circle cx="74" cy="62" r="1.4" fill="#c8a76a" stroke="none" />
        <path d="M82 70 q3 -2 6 0" />
        <path d="M192 92 q14 -4 18 -16 q4 -10 -2 -16" />
        <line x1="20" y1="110" x2="200" y2="110" />
        <circle cx="100" cy="38" r="1.6" fill="#c8a76a" stroke="none" />
        <circle cx="110" cy="32" r="1.6" fill="#c8a76a" stroke="none" />
        <circle cx="120" cy="38" r="1.6" fill="#c8a76a" stroke="none" />
      </g>
    </svg>
  );
}
