// Editorial preview — provided by user 7 May, dropped in verbatim with one
// adjustment: default export renamed `HomePageNew` so app/preview/page.tsx
// keeps importing it cleanly. NOTE: this implementation uses static mocks
// (polls, stories, stats, hero figures) — no DB queries. See preview only.

import Image from "next/image";
import {
  Search,
  ArrowRight,
  Radio,
  Cloud,
  PoundSterling,
  Users,
  Clock3,
  Landmark,
} from "lucide-react";

const polls = [
  {
    title: "Winter Fuel Payment Bill",
    oppose: 68,
    support: 21,
  },
  {
    title: "Online Safety (Amendment) Bill",
    oppose: 54,
    support: 32,
  },
  {
    title: "Renters' Rights Bill",
    oppose: 41,
    support: 46,
  },
];

const stories = [
  {
    category: "POLITICS",
    title: "Labour rebellion over welfare cuts grows",
    time: "12m ago",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=1200&auto=format&fit=crop",
  },
  {
    category: "BILLS",
    title: "Transport Bill passes second reading",
    time: "28m ago",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
  },
  {
    category: "INVESTIGATION",
    title: "Ex-minister's lobbying emails revealed",
    time: "1h ago",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    category: "SOCIETY",
    title: "Renters rally across major UK cities",
    time: "2h ago",
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop",
  },
];

const stats = [
  {
    icon: Landmark,
    value: "23%",
    label: "Government Approval",
    sub: "↓ 3% this week",
  },
  {
    icon: Users,
    value: "68%",
    label: "Public Trust",
    sub: "in decline",
  },
  {
    icon: Radio,
    value: "312",
    label: "Rebellious MPs",
    sub: "this parliament",
  },
  {
    icon: Clock3,
    value: "47",
    label: "Days To Election",
    sub: "(estimated)",
  },
  {
    icon: PoundSterling,
    value: "£4.2B",
    label: "Taxpayer Waste",
    sub: "on declared expenses",
  },
];

export default function HomePageNew() {
  return (
    <main className="bg-[#f5f2ed] text-[#111] min-h-screen">
      {/* TOP BAR */}

      <div className="bg-[#0d1117] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between text-sm">
          <div className="flex items-center gap-8 overflow-hidden">
            <div className="flex items-center gap-2 text-red-500 font-medium">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </div>

            <div className="text-white/80 whitespace-nowrap">
              Winter Fuel Payment Bill: Public opposition at 68%
            </div>

            <div className="text-white/50">•</div>

            <div className="text-white/80 whitespace-nowrap">
              MP Expenses updated 12 mins ago
            </div>

            <div className="text-white/50">•</div>

            <div className="text-white/80 whitespace-nowrap">
              Transport Bill enters committee stage
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-white/70">
            <span>Westminster</span>
            <span>14°C</span>
            <Cloud size={18} />
          </div>
        </div>
      </div>

      {/* HEADER */}

      <header className="border-b border-black/10 bg-[#f7f4ef]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-3 items-center">
            <div className="text-[20px] leading-relaxed text-black/70 max-w-[220px]">
              <p>The government speaks.</p>
              <p>The public replies.</p>
            </div>

            <div className="text-center">
              <h1 className="font-serif text-6xl tracking-tight">
                The People&apos;s Chamber
              </h1>

              <p className="uppercase tracking-[0.45em] text-xs mt-4 text-black/60">
                Holding power to account
              </p>
            </div>

            <div className="ml-auto text-right text-[20px] leading-relaxed text-black/70 max-w-[220px]">
              <p>A modern public chamber</p>
              <p>for a modern democracy.</p>
            </div>
          </div>
        </div>

        {/* NAV */}

        <div className="border-t border-black/10">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <nav className="flex items-center gap-10 font-medium text-[15px]">
              {[
                "Bills",
                "MPs",
                "Departments",
                "Transparency",
                "Expenses",
                "Polls",
                "News & Analysis",
              ].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="uppercase tracking-wide hover:text-green-800 transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-6">
              <button className="text-black/70 hover:text-black">
                <Search size={24} />
              </button>

              <button className="bg-[#23422d] hover:bg-[#1d3625] transition-colors text-white px-8 py-4 uppercase tracking-wide text-sm font-semibold">
                Join The Chamber
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] overflow-hidden bg-black rounded-sm">
          {/* IMAGE */}

          <div className="relative min-h-[700px]">
            <Image
              src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2000&auto=format&fit=crop"
              alt="Westminster"
              fill
              className="object-cover"
            />
          </div>

          {/* CONTENT */}

          <div className="bg-[radial-gradient(circle_at_top,#1e3b2a_0%,#0d1117_40%,#0d1117_100%)] text-white p-14 flex flex-col justify-center">
            <div className="uppercase tracking-[0.25em] text-sm text-green-400 font-semibold">
              Top Story
            </div>

            <h2 className="font-serif text-7xl leading-[1.02] mt-6">
              Winter fuel cuts spark public backlash
            </h2>

            <p className="text-white/75 text-2xl leading-relaxed mt-8 max-w-xl">
              Ministers call it &ldquo;necessary discipline&rdquo;. Pensioners call it
              something considerably less printable.
            </p>

            {/* STATS */}

            <div className="grid grid-cols-4 gap-10 mt-14">
              <div>
                <div className="text-red-500 text-6xl font-light">68%</div>
                <div className="uppercase text-sm tracking-wide mt-2">
                  Oppose
                </div>
                <div className="text-red-400 text-sm mt-1">
                  ↓ 5% since yesterday
                </div>
              </div>

              <div>
                <div className="text-green-500 text-6xl font-light">21%</div>
                <div className="uppercase text-sm tracking-wide mt-2">
                  Support
                </div>
                <div className="text-green-400 text-sm mt-1">
                  ↑ 2% since yesterday
                </div>
              </div>

              <div>
                <div className="text-5xl font-light">342</div>
                <div className="uppercase text-sm tracking-wide mt-2">
                  MPs Voted
                </div>
              </div>

              <div>
                <div className="text-5xl font-light">12.4K</div>
                <div className="uppercase text-sm tracking-wide mt-2">
                  Comments
                </div>
              </div>
            </div>

            {/* BUTTONS */}

            <div className="flex gap-6 mt-14">
              <button className="bg-[#23422d] hover:bg-[#1b3222] transition-colors text-white px-8 py-5 uppercase tracking-wide text-sm font-semibold flex items-center gap-3">
                Read The Full Story
                <ArrowRight size={18} />
              </button>

              <button className="border border-white/20 hover:bg-white/5 transition-colors text-white px-8 py-5 uppercase tracking-wide text-sm font-semibold">
                See How MPs Voted
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE STRIP */}

      <section className="border-y border-black/10 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-10 overflow-hidden">
          <div className="flex items-center gap-3 text-red-600 font-semibold uppercase tracking-wide whitespace-nowrap">
            <Radio size={18} />
            Live From Westminster
          </div>

          {[
            "Pensions Bill progressing",
            "Public Accounts Committee hearing now live",
            "Labour rebellion grows",
            "PMQs in 23m",
          ].map((item) => (
            <div
              key={item}
              className="text-black/70 whitespace-nowrap border-l border-black/10 pl-10"
            >
              {item}
            </div>
          ))}

          <button className="ml-auto flex items-center gap-2 uppercase tracking-wide text-sm font-semibold">
            View All
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* THREE COLUMN SECTION */}

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[0.28fr_0.44fr_0.28fr] gap-6">
          {/* POLLS */}

          <div className="bg-white border border-black/10 p-8">
            <div className="uppercase tracking-wide text-sm font-semibold text-black/60">
              The Public Chamber
            </div>

            <h3 className="font-serif text-3xl mt-4">
              Live sentiment on key issues
            </h3>

            <div className="space-y-8 mt-10">
              {polls.map((poll) => (
                <div key={poll.title}>
                  <div className="font-medium">{poll.title}</div>

                  <div className="flex justify-between text-sm mt-3">
                    <span className="text-red-600">
                      {poll.oppose}% oppose
                    </span>

                    <span className="text-green-700">
                      {poll.support}% support
                    </span>
                  </div>

                  <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-black/5">
                    <div
                      className="bg-red-500"
                      style={{ width: `${poll.oppose}%` }}
                    />

                    <div
                      className="bg-green-700"
                      style={{ width: `${poll.support}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-10 flex items-center gap-2 uppercase tracking-wide text-sm font-semibold">
              View All Polls
              <ArrowRight size={18} />
            </button>
          </div>

          {/* EDITORIAL */}

          <div className="bg-white border border-black/10 p-10 relative overflow-hidden">
            <div className="uppercase tracking-wide text-sm font-semibold text-[#7c4c38]">
              Today&apos;s Editorial
            </div>

            <div className="grid md:grid-cols-2 gap-10 mt-8 items-center">
              <div>
                <h3 className="font-serif text-5xl leading-tight">
                  Westminster: a nation of experts in everything and accountable
                  for nothing
                </h3>

                <p className="mt-8 text-black/70 leading-relaxed text-lg">
                  Another day, another announcement, another U-turn denied,
                  another promise waiting quietly for its funeral.
                </p>

                <button className="mt-8 flex items-center gap-2 uppercase tracking-wide text-sm font-semibold">
                  Read Editorial
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="relative h-[420px]">
                <Image
                  src="https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=1200&auto=format&fit=crop"
                  alt="Editorial"
                  fill
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </div>

          {/* TRANSPARENCY */}

          <div className="bg-white border border-black/10 p-8">
            <div className="uppercase tracking-wide text-sm font-semibold text-black/60">
              Transparency Desk
            </div>

            <h3 className="font-serif text-4xl mt-4">
              Following the money
            </h3>

            <div className="mt-10 space-y-10">
              <div>
                <div className="text-sm uppercase tracking-wide text-black/50">
                  Total MP expenses this month
                </div>

                <div className="flex items-end gap-4 mt-3">
                  <div className="text-5xl font-light">£2,873,761</div>

                  <div className="text-green-700">↑ 4.7%</div>
                </div>
              </div>

              <div className="border-t border-black/10 pt-8">
                <div className="text-sm uppercase tracking-wide text-black/50">
                  Top expense claim
                </div>

                <div className="text-2xl font-medium mt-3">
                  2nd home mortgage
                </div>

                <div className="text-black/60 mt-2">£24,990</div>
              </div>

              <div className="border-t border-black/10 pt-8">
                <div className="text-sm uppercase tracking-wide text-black/50">
                  Most frequent claimant
                </div>

                <div className="text-2xl font-medium mt-3">
                  Sir M. Fabricant
                </div>

                <div className="text-black/60 mt-2">
                  Conservative | Lichfield
                </div>

                <div className="mt-2">£27,842 this month</div>
              </div>
            </div>

            <button className="mt-10 flex items-center gap-2 uppercase tracking-wide text-sm font-semibold">
              View All Expenses
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* STATS ROW */}

      <section className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 border border-black/10 bg-white">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className={`p-8 ${
                  index !== stats.length - 1
                    ? "border-r border-black/10"
                    : ""
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-[#23422d] text-white flex items-center justify-center">
                  <Icon size={24} />
                </div>

                <div className="text-5xl mt-6 font-light">{stat.value}</div>

                <div className="uppercase tracking-wide text-sm mt-4 text-black/60">
                  {stat.label}
                </div>

                <div className="mt-2 text-black/70">{stat.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STORIES */}

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="uppercase tracking-wide text-sm font-semibold">
            Latest From The Chamber
          </h2>

          <button className="flex items-center gap-2 uppercase tracking-wide text-sm font-semibold">
            View All Stories
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stories.map((story) => (
            <article
              key={story.title}
              className="bg-white border border-black/10 overflow-hidden group"
            >
              <div className="relative h-[220px] overflow-hidden">
                <Image
                  src={story.image}
                  alt={story.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center text-xs uppercase tracking-wide text-black/50">
                  <span>{story.category}</span>
                  <span>{story.time}</span>
                </div>

                <h3 className="font-serif text-3xl leading-tight mt-5">
                  {story.title}
                </h3>

                <button className="mt-8 flex items-center gap-2 text-sm uppercase tracking-wide font-semibold">
                  Read Story
                  <ArrowRight size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-[#11161d] text-white mt-20">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-[0.45fr_0.55fr] gap-20">
            <div>
              <h2 className="font-serif text-6xl leading-tight">
                Stay informed.
                <br />
                Stay powerful.
              </h2>

              <p className="text-white/70 text-xl leading-relaxed mt-8 max-w-xl">
                Your weekly digest of politics, transparency and the stories
                they don&apos;t want you to miss.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 h-16 px-6 bg-white/5 border border-white/10 text-white placeholder:text-white/40 outline-none"
              />

              <button className="h-16 px-10 bg-[#23422d] hover:bg-[#1b3222] transition-colors uppercase tracking-wide text-sm font-semibold">
                Subscribe
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 mt-20 pt-10 flex flex-col lg:flex-row gap-10 justify-between">
            <div>
              <div className="font-serif text-4xl">
                The People&apos;s Chamber
              </div>

              <div className="text-white/50 mt-4 max-w-sm leading-relaxed">
                A modern public chamber for a modern democracy.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-16 text-white/70">
              <div className="space-y-3">
                <div className="text-white font-semibold uppercase tracking-wide text-sm">
                  Explore
                </div>

                <div>Bills</div>
                <div>MPs</div>
                <div>Departments</div>
                <div>Transparency</div>
              </div>

              <div className="space-y-3">
                <div className="text-white font-semibold uppercase tracking-wide text-sm">
                  About
                </div>

                <div>Our Mission</div>
                <div>Methodology</div>
                <div>Support</div>
                <div>Donate</div>
              </div>

              <div className="space-y-3">
                <div className="text-white font-semibold uppercase tracking-wide text-sm">
                  Join
                </div>

                <div>Membership</div>
                <div>Public Votes</div>
                <div>Newsletter</div>
                <div>Community</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
