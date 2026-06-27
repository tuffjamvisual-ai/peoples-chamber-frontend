import {
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Heart,
  Home,
  Landmark,
  Search,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";

const bills = [
  ["Renters’ Reform Bill", "In Committee"],
  ["Employment Rights Bill", "Report Stage"],
  ["Energy Security Bill", "2nd Reading"],
  ["Online Safety Amendment", "Committee"],
  ["Public Order Reform Bill", "1st Reading"],
];

const people = [
  ["Keir Starmer", "Prime Minister"],
  ["Rachel Reeves", "Chancellor"],
  ["David Lammy", "Foreign Secretary"],
  ["Yvette Cooper", "Home Secretary"],
  ["Wes Streeting", "Health Secretary"],
];

const parties = [
  "Labour",
  "Conservative",
  "Liberal Democrats",
  "Green Party",
  "Reform UK",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#101010]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[245px] shrink-0 border-r border-black/15 bg-[#070707] text-white lg:flex lg:flex-col">
          <div className="p-7">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <Landmark className="h-9 w-9" />
                <div className="font-black uppercase leading-[0.9] tracking-tight text-3xl">
                  The
                  <br />
                  People’s
                  <br />
                  Chamber
                </div>
              </div>
              <p className="mt-4 max-w-[150px] text-xs font-bold uppercase tracking-wide text-[#f3f0e8]">
                UK Government. In Public View.
              </p>
              <div className="mt-4 h-1 w-10 bg-[#c91517]" />
            </div>

            <nav className="space-y-1 text-sm font-bold uppercase tracking-wide">
              <SidebarLink icon={<Home />} label="Home" active />
              <SidebarLink icon={<Landmark />} label="Parliament" />
              <SidebarLink icon={<FileText />} label="Bills" />
              <SidebarLink icon={<Banknote />} label="Money" />
              <SidebarLink icon={<Vote />} label="Votes" />
              <SidebarLink icon={<Users />} label="People" />
              <SidebarLink icon={<Search />} label="Policy Search" />
              <SidebarLink icon={<Eye />} label="About" />
            </nav>
          </div>

          <div className="mt-auto p-7">
            <div className="mb-5 rotate-[-2deg] border border-white/15 bg-[#f3f0e8] p-4 text-black shadow-xl">
              <p className="text-sm font-black uppercase leading-tight">
                Democracy works best when everyone can see the receipts.
              </p>
            </div>

            <button className="mb-4 flex w-full items-center justify-between border border-[#c91517] px-4 py-3 text-sm font-black uppercase text-[#ff4b4b] transition hover:bg-[#c91517] hover:text-white">
              Support Us
              <Heart className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 border border-white/20 px-3 py-3">
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                placeholder="Search"
              />
              <Search className="h-4 w-4 text-white/70" />
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f3f0e8]/90 px-5 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8" />
                <div>
                  <div className="text-xl font-black uppercase leading-none">
                    Open Govt
                  </div>
                  <div className="text-[12px] font-bold uppercase text-[#c91517]">
                    UK Government. In Public View.
                  </div>
                </div>
              </div>
              <Search className="h-5 w-5" />
            </div>
          </header>

          <div className="mx-auto max-w-[1420px]">
            <section className="grid min-h-[640px] border-b border-black/15 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14">
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-xs font-black uppercase tracking-[0.25em]">
                    Cover Story
                  </span>
                  <div className="h-px flex-1 bg-black/25" />
                </div>

                <h1 className="max-w-[650px] font-serif text-[4.6rem] font-black leading-[0.92] tracking-[-0.06em] sm:text-[6.5rem] lg:text-[7.4rem]">
                  Power
                  <br />
                  isn’t hidden.
                  <br />
                  It’s{" "}
                  <span className="italic decoration-[#c91517] decoration-4 underline-offset-8 underline">
                    published.
                  </span>
                </h1>

                <p className="mt-8 max-w-[510px] text-lg leading-8 text-black/80">
                  We dig through the spin, follow the money, and fact-check the
                  official line. Because democracy works better when the truth is
                  in the open.
                </p>

                <div className="mt-9 flex flex-wrap gap-4">
                  <button className="group flex items-center gap-3 bg-black px-6 py-4 text-sm font-black uppercase text-white transition hover:bg-[#c91517]">
                    Explore Parliament
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                  <button className="group flex items-center gap-3 border border-black px-6 py-4 text-sm font-black uppercase transition hover:bg-black hover:text-white">
                    Follow The Money
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              <div className="relative min-h-[520px] overflow-hidden border-t border-black/15 bg-[#101010] lg:border-l lg:border-t-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(255,255,255,0.35),transparent_26%),linear-gradient(135deg,#f3f0e8_0%,#d8d3c8_34%,#111_35%,#111_100%)]" />

                <div className="absolute bottom-0 right-0 h-[82%] w-[88%] bg-[linear-gradient(135deg,transparent_0%,transparent_35%,rgba(255,255,255,0.18)_36%,rgba(255,255,255,0.18)_37%,transparent_38%),radial-gradient(circle_at_50%_30%,#777,transparent_24%)] opacity-60 grayscale" />

                <div className="absolute bottom-0 right-0 h-[48%] w-full bg-[linear-gradient(to_top,rgba(0,0,0,0.95),transparent)]" />

                <div className="absolute right-8 top-10 rotate-2 border-2 border-black bg-[#d7c4a3] px-8 py-7 shadow-2xl sm:right-14 sm:top-16">
                  <p className="text-center text-5xl font-black uppercase leading-none tracking-tight">
                    Yours.
                    <br />
                    Not Theirs.
                  </p>
                </div>

                <div className="absolute bottom-10 left-8 max-w-[360px] border border-white/20 bg-black/80 p-5 text-white backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff4b4b]">
                    Public record
                  </p>
                  <p className="mt-2 text-2xl font-black leading-tight">
                    Westminster, without the velvet rope.
                  </p>
                </div>
              </div>
            </section>

            <section className="border-b border-black/15 px-6 py-5 sm:px-10 lg:px-14">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-bold uppercase">
                <span className="flex items-center gap-2 text-[#c91517]">
                  <span className="h-2 w-2 rounded-full bg-[#c91517]" />
                  Live Updates
                </span>
                <span>2m ago: Defence contract worth £2.1bn awarded</span>
                <span>7m ago: Health Select Committee publishes report</span>
                <span>12m ago: MPs vote on Planning Reform Bill</span>
                <span>18m ago: Treasury land sale data updated</span>
              </div>
            </section>

            <section className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c91517]">
                    Today in Parliament
                  </p>
                  <h2 className="mt-2 text-4xl font-black tracking-tight">
                    The public record, sharpened.
                  </h2>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr_0.95fr]">
                <ArticleCard />
                <BillsCard />
                <StreetCard />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <MoneyCard />
                <PeopleCard />
                <PulseCard />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <PolicySearch />
                <PartyCompare />
              </div>
            </section>

            <section className="grid border-y border-black/15 bg-white/45 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-14">
              <TrustItem
                icon={<ShieldCheck />}
                title="100% Independent"
                body="Not funded by government or political parties."
              />
              <TrustItem
                icon={<Clock3 />}
                title="Real-time Data"
                body="Live updates from official sources across the UK."
              />
              <TrustItem
                icon={<Users />}
                title="Open to All"
                body="Built for citizens, not politicians."
              />
              <TrustItem
                icon={<Eye />}
                title="Accountability First"
                body="Because transparency drives better government."
              />
            </section>

            <footer className="bg-black px-6 py-8 text-white sm:px-10 lg:px-14">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <Landmark className="h-8 w-8" />
                  <div>
                    <div className="text-xl font-black uppercase">
                      Open Govt
                    </div>
                    <div className="text-xs font-bold uppercase text-[#ff4b4b]">
                      UK Government. In Public View.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 text-xs font-bold uppercase text-white/70">
                  <span>About Us</span>
                  <span>Methodology</span>
                  <span>Data Sources</span>
                  <span>FAQs</span>
                  <span>Contact</span>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarLink({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 border border-white/0 px-3 py-3 ${
        active
          ? "bg-white text-black"
          : "text-white/80 hover:border-white/15 hover:text-white"
      }`}
    >
      <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function ArticleCard() {
  return (
    <div className="group overflow-hidden border border-black/15 bg-white">
      <div className="relative min-h-[290px] bg-[#141414]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.2),rgba(0,0,0,0.92)),radial-gradient(circle_at_70%_35%,#9a9a9a,transparent_30%)]" />
        <div className="absolute left-5 top-5 bg-[#c91517] px-3 py-2 text-xs font-black uppercase text-white">
          Top Story
        </div>
        <div className="absolute bottom-6 left-6 max-w-[370px] text-white">
          <h3 className="text-4xl font-black leading-tight">
            Renters’ Reform Bill passes first reading
          </h3>
          <p className="mt-4 max-w-[330px] text-sm leading-6 text-white/80">
            The bill aims to overhaul the private rental sector. What changes
            are proposed and who is opposing them?
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase">
            Read the story <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BillsCard() {
  return (
    <div className="border border-black/15 bg-white p-6">
      <CardHeader title="Bills to Watch" />
      <div className="mt-5 space-y-3">
        {bills.map(([name, status]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-4 border-b border-black/10 pb-3 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center border border-black/15">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold">{name}</p>
            </div>
            <span className="whitespace-nowrap border border-black/20 px-2 py-1 text-[12px] font-black uppercase">
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreetCard() {
  return (
    <div className="relative overflow-hidden border border-black/15 bg-[#f7f4eb] p-6">
      <CardHeader title="Street View" />
      <div className="mt-8">
        <p className="text-5xl font-black leading-[0.95] tracking-tight">
          “Another week,
          <br />
          another scandal.”
        </p>
        <p className="mt-4 text-sm font-black uppercase text-[#c91517]">
          @Londoner
        </p>
        <p className="mt-8 max-w-[280px] text-sm leading-6 text-black/70">
          What people are saying outside the Westminster bubble.
        </p>
      </div>
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-full bg-black/5" />
    </div>
  );
}

function MoneyCard() {
  return (
    <div className="border border-black bg-black p-6 text-white">
      <CardHeader title="Follow The Money" dark />
      <div className="mt-8 flex items-center gap-7">
        <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full bg-[conic-gradient(#d8d8d8_0deg,#d8d8d8_80deg,#777_80deg,#777_145deg,#c91517_145deg,#c91517_220deg,#f3f0e8_220deg,#f3f0e8_360deg)]">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-black text-center">
            <span className="text-xl font-black">£21.7m</span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <StatRow name="Contracts" value="£6.2m" />
          <StatRow name="Labour" value="£4.1m" />
          <StatRow name="Conservative" value="£3.1m" />
          <StatRow name="Companies" value="£6.7m" />
        </div>
      </div>
      <CardLink label="Explore financial flows" />
    </div>
  );
}

function PeopleCard() {
  return (
    <div className="border border-black bg-black p-6 text-white">
      <CardHeader title="The People Behind The Policies" dark />
      <div className="mt-6 grid grid-cols-5 gap-3">
        {people.map(([name, role], index) => (
          <div key={name}>
            <div className="aspect-square bg-white/10">
              <div
                className={`h-full w-full ${
                  index % 2 === 0 ? "bg-white/20" : "bg-white/12"
                }`}
              />
            </div>
            <p className="mt-2 text-xs font-black leading-tight">{name}</p>
            <p className="text-[12px] text-white/55">{role}</p>
          </div>
        ))}
      </div>
      <CardLink label="View all profiles" />
    </div>
  );
}

function PulseCard() {
  return (
    <div className="border border-black bg-black p-6 text-white">
      <CardHeader title="The People’s Pulse" dark />
      <div className="mt-8 flex items-start gap-5">
        <div className="text-6xl font-black text-white">-42%</div>
        <div className="pt-2 text-sm text-white/70">
          <p className="font-bold text-white">Government approval</p>
          <p>This month</p>
        </div>
      </div>
      <div className="mt-8 h-28 border-b border-l border-white/20 bg-[linear-gradient(to_top,rgba(201,21,23,0.24),transparent)]">
        <div className="h-full w-full bg-[linear-gradient(165deg,transparent_0%,transparent_15%,#fff_16%,transparent_17%,transparent_32%,#fff_33%,transparent_34%,transparent_48%,#fff_49%,transparent_50%,transparent_66%,#fff_67%,transparent_68%)] opacity-40" />
      </div>
      <CardLink label="View all polls & data" />
    </div>
  );
}

function PolicySearch() {
  return (
    <div className="border border-black/15 bg-white p-6">
      <CardHeader title="Policy Search" />
      <p className="mt-4 max-w-[320px] text-sm leading-6 text-black/70">
        Search policies, topics, departments and promises. Ask. Search. Compare.
      </p>
      <div className="mt-6 flex border border-black">
        <input
          className="min-w-0 flex-1 px-4 py-4 text-sm outline-none"
          placeholder="e.g. NHS, taxes, immigration"
        />
        <button className="bg-black px-5 text-sm font-black uppercase text-white">
          Search
        </button>
      </div>
    </div>
  );
}

function PartyCompare() {
  return (
    <div className="border border-black/15 bg-white p-6">
      <CardHeader title="Compare Party Positions On Any Issue" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {parties.map((party) => (
          <div key={party} className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full border-2 border-black bg-[#f3f0e8]" />
            <p className="text-xs font-black">{party}</p>
            <p className="mt-1 text-[12px] uppercase text-black/50">
              Read their plans
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 border-black/10 py-7 sm:border-r sm:px-6 last:border-r-0">
      <div className="h-8 w-8 shrink-0 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
      <div>
        <h3 className="text-sm font-black uppercase">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-black/65">{body}</p>
      </div>
    </div>
  );
}

function CardHeader({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3
        className={`text-sm font-black uppercase tracking-wide ${
          dark ? "text-white" : "text-[#c91517]"
        }`}
      >
        {title}
      </h3>
      <span
        className={`flex items-center gap-1 text-xs font-black uppercase ${
          dark ? "text-white/70" : "text-black/60"
        }`}
      >
        View all <ArrowRight className="h-3 w-3" />
      </span>
    </div>
  );
}

function CardLink({ label }: { label: string }) {
  return (
    <div className="mt-7 flex items-center gap-2 text-xs font-black uppercase">
      {label}
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

function StatRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex min-w-[150px] items-center justify-between gap-6">
      <span className="text-white/65">{name}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
