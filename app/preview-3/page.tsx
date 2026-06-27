import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
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
} from 'lucide-react'

// Heavy page with 7+ parallel Supabase queries — skip build-time
// prerender so it doesn't saturate the connection pool during Vercel's
// 3-worker build and crash the deploy. Renders on first request and
// caches at the edge thanks to the stale-while-revalidate header in
// vercel.json.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

const ACCENT = '#c91517'

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return ''
  if (n >= 1_000_000_000) return '£' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'bn'
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
  if (n >= 1_000) return '£' + Math.round(n / 1_000).toLocaleString() + 'k'
  return '£' + Math.round(n).toLocaleString()
}

function fmtRelative(d: string | null | undefined): string {
  if (!d) return ''
  const then = new Date(d).getTime()
  const now = Date.now()
  const mins = Math.max(1, Math.round((now - then) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default async function HomePage() {
  const [
    { data: news },
    { data: bills },
    { data: topContractRows },
    { data: topDonationRows },
    { count: contractCount },
    { count: donationCount },
    { data: topExpenseRows },
  ] = await Promise.all([
    supabase
      .from('press_releases')
      .select('title, description, organisation, published_at, gov_url')
      .order('published_at', { ascending: false })
      .limit(6),
    supabase
      .from('bill')
      .select('id, title, vote_count_yes, vote_count_no, vote_count_abstain, current_stage')
      .order('vote_count_yes', { ascending: false })
      .limit(5),
    supabase
      .from('government_contracts')
      .select('title, supplier, value')
      .not('value', 'is', null)
      .order('value', { ascending: false })
      .limit(1),
    supabase
      .from('political_donations')
      .select('donor_name, recipient_name, amount')
      .not('amount', 'is', null)
      .order('amount', { ascending: false })
      .limit(1),
    supabase.from('government_contracts').select('id', { count: 'exact', head: true }),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }),
    supabase
      .from('mp_expenses_summary')
      .select('member_id, total_spend')
      .eq('year', '24_25')
      .order('total_spend', { ascending: false, nullsFirst: false })
      .limit(10),
  ])

  const { data: coverageRows } = await supabase
    .from('uk_political_news')
    .select('id, source_outlet, source_title, published_at, commentary')
    .eq('is_published', true)
    .not('commentary', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(1)

  const topCoverage = coverageRows?.[0] || null

  const expenseIds = (topExpenseRows || []).map((r: { member_id: number }) => r.member_id)
  const { data: expenseMps } = expenseIds.length
    ? await supabase
        .from('mps')
        .select('member_id, name, display_name, constituency, current_member, photo_url')
        .in('member_id', expenseIds)
    : {
        data: [] as Array<{
          member_id: number
          name: string | null
          display_name: string | null
          constituency: string | null
          current_member: boolean | null
          photo_url: string | null
        }>,
      }
  const expenseMpById = new Map(
    (expenseMps || []).map((m) => [m.member_id, m])
  )
  const topPeople = (topExpenseRows || [])
    .map((r: { member_id: number; total_spend: number | null }) => {
      const m = expenseMpById.get(r.member_id)
      return m && m.current_member
        ? {
            member_id: r.member_id,
            total_spend: r.total_spend,
            name: m.display_name || m.name || '',
            constituency: m.constituency || '',
            photo_url: m.photo_url || '',
          }
        : null
    })
    .filter(
      (
        x
      ): x is {
        member_id: number
        total_spend: number | null
        name: string
        constituency: string
        photo_url: string
      } => x !== null
    )
    .slice(0, 5)

  const leadStory = news?.[0]
  const leadSlug = leadStory?.gov_url
    ? leadStory.gov_url.split('/').filter(Boolean).pop()
    : null
  const liveTicker = (news || []).slice(1, 5).map((s) => ({
    title: s.title || 'Untitled',
    organisation: s.organisation || 'Whitehall',
    relative: fmtRelative(s.published_at),
  }))

  const topContract = topContractRows?.[0]
  const topDonation = topDonationRows?.[0]

  const featuredBill = (bills || []).find(
    (b) => (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0) > 0
  )
  const fbYes = featuredBill?.vote_count_yes || 0
  const fbNo = featuredBill?.vote_count_no || 0
  const fbAbs = featuredBill?.vote_count_abstain || 0
  const fbTotal = fbYes + fbNo + fbAbs
  const fbYesPct = fbTotal > 0 ? Math.round((fbYes / fbTotal) * 100) : 0
  const fbNoPct = fbTotal > 0 ? Math.round((fbNo / fbTotal) * 100) : 0

  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#101010]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[245px] shrink-0 border-r border-black/15 bg-[#070707] text-white lg:flex lg:flex-col">
          <div className="p-7">
            <Link href="/" className="mb-8 block no-underline text-white">
              <div className="flex items-center gap-3">
                <Landmark className="h-9 w-9" />
                <div className="font-black uppercase leading-[0.9] tracking-tight text-3xl">
                  The
                  <br />
                  People&rsquo;s
                  <br />
                  Chamber
                </div>
              </div>
              <p className="mt-4 max-w-[150px] text-xs font-bold uppercase tracking-wide text-[#f3f0e8]">
                UK Government. In Public View.
              </p>
              <div className="mt-4 h-1 w-10 bg-[#c91517]" />
            </Link>

            <nav className="space-y-1 text-sm font-bold uppercase tracking-wide">
              <SidebarLink href="/" icon={<Home />} label="Home" active />
              <SidebarLink href="/departments" icon={<Landmark />} label="Parliament" />
              <SidebarLink href="/bills" icon={<FileText />} label="Bills" />
              <SidebarLink href="/transparency" icon={<Banknote />} label="Money" />
              <SidebarLink href="/polls" icon={<Vote />} label="Votes" />
              <SidebarLink href="/mps" icon={<Users />} label="People" />
              <SidebarLink href="/search" icon={<Search />} label="Policy Search" />
              <SidebarLink href="/support" icon={<Eye />} label="About" />
            </nav>
          </div>

          <div className="mt-auto p-7">
            <div className="mb-5 rotate-[-2deg] border border-white/15 bg-[#f3f0e8] p-4 text-black shadow-xl">
              <p className="text-sm font-black uppercase leading-tight">
                Democracy works best when everyone can see the receipts.
              </p>
            </div>

            <Link
              href="/support"
              className="mb-4 flex w-full items-center justify-between border border-[#c91517] px-4 py-3 text-sm font-black uppercase text-[#ff4b4b] no-underline transition hover:bg-[#c91517] hover:text-white"
            >
              Support Us
              <Heart className="h-4 w-4" />
            </Link>

            <Link
              href="/search"
              className="flex items-center gap-2 border border-white/20 px-3 py-3 text-sm text-white/60 no-underline"
            >
              <span className="w-full">Search the site</span>
              <Search className="h-4 w-4 text-white/70" />
            </Link>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f3f0e8]/90 px-5 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 no-underline text-black">
                <Landmark className="h-8 w-8" />
                <div>
                  <div className="text-xl font-black uppercase leading-none">
                    Open Govt
                  </div>
                  <div className="text-[12px] font-bold uppercase text-[#c91517]">
                    UK Government. In Public View.
                  </div>
                </div>
              </Link>
              <Link href="/search" className="text-black">
                <Search className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1420px]">
            <section className="grid min-h-[640px] border-b border-black/15 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14">
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-xs font-black uppercase tracking-[0.25em]">
                    {leadStory ? `Top story · ${leadStory.organisation || 'Whitehall'}` : 'Cover Story'}
                  </span>
                  <div className="h-px flex-1 bg-black/25" />
                </div>

                <h1 className="max-w-[650px] font-serif text-[3.6rem] font-black leading-[0.95] tracking-[-0.04em] sm:text-[4.6rem] lg:text-[5.4rem]">
                  {leadStory?.title || (
                    <>
                      Power
                      <br />
                      isn&rsquo;t hidden.
                      <br />
                      It&rsquo;s{' '}
                      <span className="italic decoration-[#c91517] decoration-4 underline-offset-8 underline">
                        published.
                      </span>
                    </>
                  )}
                </h1>

                <p className="mt-8 max-w-[560px] text-lg leading-8 text-black/80">
                  {leadStory?.description ||
                    'We dig through the spin, follow the money, and fact-check the official line. Because democracy works better when the truth is in the open.'}
                </p>

                <div className="mt-9 flex flex-wrap gap-4">
                  {leadSlug ? (
                    <Link
                      href={`/news/${leadSlug}`}
                      className="group flex items-center gap-3 bg-black px-6 py-4 text-sm font-black uppercase text-white no-underline transition hover:bg-[#c91517]"
                    >
                      Read the full story
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link
                      href="/bills"
                      className="group flex items-center gap-3 bg-black px-6 py-4 text-sm font-black uppercase text-white no-underline transition hover:bg-[#c91517]"
                    >
                      Explore Parliament
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  )}
                  <Link
                    href="/transparency"
                    className="group flex items-center gap-3 border border-black px-6 py-4 text-sm font-black uppercase no-underline text-black transition hover:bg-black hover:text-white"
                  >
                    Follow The Money
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
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

            {liveTicker.length > 0 && (
              <section className="border-b border-black/15 px-6 py-5 sm:px-10 lg:px-14">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-bold uppercase">
                  <span className="flex items-center gap-2 text-[#c91517]">
                    <span className="h-2 w-2 rounded-full bg-[#c91517]" />
                    Live Updates
                  </span>
                  {liveTicker.map((t, i) => (
                    <span key={i} className="text-black/80">
                      <span className="text-black/50">{t.relative}:</span> {t.title}
                    </span>
                  ))}
                </div>
              </section>
            )}

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
                <ArticleCard
                  href={leadSlug ? `/news/${leadSlug}` : '/bills'}
                  organisation={leadStory?.organisation || 'Top Story'}
                  title={leadStory?.title || 'The latest from Whitehall'}
                  description={
                    leadStory?.description ||
                    'Track every bill, MP, contract and donation across UK Government.'
                  }
                />
                <BillsCard bills={bills || []} />
                <StreetCard
                  quote={topCoverage?.commentary || '“Another week, another scandal.”'}
                  source={topCoverage?.source_outlet || '@Londoner'}
                  href={topCoverage ? `/coverage/${topCoverage.id}` : '/news/whitehall'}
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <MoneyCard
                  topContract={topContract}
                  topDonation={topDonation}
                  contractCount={contractCount || 0}
                  donationCount={donationCount || 0}
                />
                <PeopleCard people={topPeople} />
                <PulseCard
                  featuredBill={featuredBill}
                  yesPct={fbYesPct}
                  noPct={fbNoPct}
                  total={fbTotal}
                />
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
                <Link href="/" className="flex items-center gap-3 no-underline text-white">
                  <Landmark className="h-8 w-8" />
                  <div>
                    <div className="text-xl font-black uppercase">Open Govt</div>
                    <div className="text-xs font-bold uppercase text-[#ff4b4b]">
                      UK Government. In Public View.
                    </div>
                  </div>
                </Link>

                <div className="flex flex-wrap gap-6 text-xs font-bold uppercase text-white/70">
                  <Link href="/support" className="text-white/70 no-underline hover:text-white">
                    About Us
                  </Link>
                  <Link href="/transparency" className="text-white/70 no-underline hover:text-white">
                    Methodology
                  </Link>
                  <Link href="/transparency" className="text-white/70 no-underline hover:text-white">
                    Data Sources
                  </Link>
                  <Link href="/support" className="text-white/70 no-underline hover:text-white">
                    FAQs
                  </Link>
                  <Link href="/support" className="text-white/70 no-underline hover:text-white">
                    Contact
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  )
}

function SidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 border border-white/0 px-3 py-3 no-underline ${
        active ? 'bg-white text-black' : 'text-white/80 hover:border-white/15 hover:text-white'
      }`}
    >
      <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function ArticleCard({
  href,
  organisation,
  title,
  description,
}: {
  href: string
  organisation: string | null
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group overflow-hidden border border-black/15 bg-white no-underline text-white"
    >
      <div className="relative min-h-[290px] bg-[#141414]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.2),rgba(0,0,0,0.92)),radial-gradient(circle_at_70%_35%,#9a9a9a,transparent_30%)]" />
        <div className="absolute left-5 top-5 bg-[#c91517] px-3 py-2 text-xs font-black uppercase text-white">
          {organisation || 'Top Story'}
        </div>
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h3 className="text-3xl font-black leading-tight line-clamp-3">{title}</h3>
          <p className="mt-4 max-w-[400px] text-sm leading-6 text-white/80 line-clamp-3">
            {description}
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase">
            Read the story <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function BillsCard({
  bills,
}: {
  bills: Array<{
    id: number
    title: string | null
    current_stage: string | null
  }>
}) {
  return (
    <div className="border border-black/15 bg-white p-6">
      <CardHeader title="Bills to Watch" href="/bills" />
      <div className="mt-5 space-y-3">
        {bills.slice(0, 5).map((bill) => (
          <Link
            key={bill.id}
            href={`/bills/${bill.id}`}
            className="flex items-center justify-between gap-4 border-b border-black/10 pb-3 no-underline text-black last:border-0 hover:bg-black/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center border border-black/15">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold line-clamp-2">{bill.title || 'Untitled bill'}</p>
            </div>
            {bill.current_stage && (
              <span className="whitespace-nowrap border border-black/20 px-2 py-1 text-[12px] font-black uppercase">
                {bill.current_stage}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function StreetCard({
  quote,
  source,
  href,
}: {
  quote: string
  source: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="relative overflow-hidden border border-black/15 bg-[#f7f4eb] p-6 no-underline text-black"
    >
      <CardHeader title="Today's Spin" />
      <div className="mt-8">
        <p className="text-3xl font-black leading-[1.05] tracking-tight line-clamp-5">{quote}</p>
        <p className="mt-4 text-sm font-black uppercase text-[#c91517]">{source}</p>
        <p className="mt-8 max-w-[280px] text-sm leading-6 text-black/70">
          Independent press, with our take.
        </p>
      </div>
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-full bg-black/5" />
    </Link>
  )
}

function MoneyCard({
  topContract,
  topDonation,
  contractCount,
  donationCount,
}: {
  topContract: { title: string | null; supplier: string | null; value: number | string | null } | undefined
  topDonation: { donor_name: string | null; recipient_name: string | null; amount: number | string | null } | undefined
  contractCount: number
  donationCount: number
}) {
  const contractTotal = topContract?.value ? Number(topContract.value) : 0
  const donationTotal = topDonation?.amount ? Number(topDonation.amount) : 0
  return (
    <Link href="/transparency" className="border border-black bg-black p-6 text-white no-underline block">
      <CardHeader title="Follow The Money" dark />
      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Top contract</div>
          <div className="mt-2 text-3xl font-black">{fmtMoney(contractTotal)}</div>
          <div className="mt-1 text-xs text-white/65 line-clamp-2">{topContract?.supplier || ''}</div>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Top donation</div>
          <div className="mt-2 text-3xl font-black">{fmtMoney(donationTotal)}</div>
          <div className="mt-1 text-xs text-white/65 line-clamp-2">{topDonation?.donor_name || ''}</div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-6 border-t border-white/15 pt-4 text-sm">
        <StatRow name="Contracts tracked" value={contractCount.toLocaleString()} />
        <StatRow name="Donations tracked" value={donationCount.toLocaleString()} />
      </div>
      <CardLink label="Explore financial flows" />
    </Link>
  )
}

function PeopleCard({
  people,
}: {
  people: Array<{ member_id: number; name: string; constituency: string; photo_url: string }>
}) {
  return (
    <div className="border border-black bg-black p-6 text-white">
      <CardHeader title="The People Behind The Policies" dark href="/mps" />
      <div className="mt-6 grid grid-cols-5 gap-3">
        {people.map((p) => (
          <Link
            key={p.member_id}
            href={`/mps/${p.member_id}`}
            className="block no-underline text-white"
          >
            <div className="aspect-square overflow-hidden bg-white/10">
              {p.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-white/20" />
              )}
            </div>
            <p className="mt-2 text-xs font-black leading-tight line-clamp-2">{p.name}</p>
            <p className="text-[12px] text-white/55 line-clamp-1">{p.constituency}</p>
          </Link>
        ))}
      </div>
      <CardLink label="View all profiles" />
    </div>
  )
}

function PulseCard({
  featuredBill,
  yesPct,
  noPct,
  total,
}: {
  featuredBill: { id: number; title: string | null } | undefined
  yesPct: number
  noPct: number
  total: number
}) {
  if (!featuredBill || total === 0) {
    return (
      <div className="border border-black bg-black p-6 text-white">
        <CardHeader title="The People's Pulse" dark href="/polls" />
        <div className="mt-8 text-sm text-white/65">
          Public voting on bills opens shortly. Add yours when it does.
        </div>
        <CardLink label="View all polls" />
      </div>
    )
  }
  return (
    <Link
      href={`/bills/${featuredBill.id}`}
      className="border border-black bg-black p-6 text-white no-underline block"
    >
      <CardHeader title="The People's Pulse" dark />
      <div className="mt-6">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ff4b4b]">
          Featured Vote
        </div>
        <div className="mt-2 text-xl font-black leading-tight line-clamp-2">
          {featuredBill.title}
        </div>
      </div>
      <div className="mt-6 flex items-end gap-6">
        <div>
          <div className="text-5xl font-black tabular-nums">{yesPct}%</div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Support</div>
        </div>
        <div>
          <div className="text-5xl font-black tabular-nums text-[#ff4b4b]">{noPct}%</div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Oppose</div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden bg-white/15">
        <div className="flex h-full">
          {yesPct > 0 && <div style={{ width: `${yesPct}%`, background: '#4a8a3a' }} />}
          {noPct > 0 && <div style={{ width: `${noPct}%`, background: ACCENT }} />}
        </div>
      </div>
      <div className="mt-2 text-xs text-white/55 tabular-nums">
        {total.toLocaleString()} public votes
      </div>
      <CardLink label="See how MPs voted" />
    </Link>
  )
}

function PolicySearch() {
  return (
    <form action="/search" method="get" className="border border-black/15 bg-white p-6">
      <CardHeader title="Policy Search" />
      <p className="mt-4 max-w-[320px] text-sm leading-6 text-black/70">
        Search policies, topics, departments and promises. Ask. Search. Compare.
      </p>
      <div className="mt-6 flex border border-black">
        <input
          name="q"
          className="min-w-0 flex-1 px-4 py-4 text-sm outline-none"
          placeholder="e.g. NHS, taxes, immigration"
        />
        <button type="submit" className="bg-black px-5 text-sm font-black uppercase text-white">
          Search
        </button>
      </div>
    </form>
  )
}

const PARTY_LINKS: Array<{ name: string; href: string; color: string }> = [
  { name: 'Labour', href: '/mps?party=Labour', color: '#c91517' },
  { name: 'Conservative', href: '/mps?party=Conservative', color: '#0087dc' },
  { name: 'Liberal Democrats', href: '/mps?party=Liberal+Democrat', color: '#faa61a' },
  { name: 'Green Party', href: '/mps?party=Green+Party', color: '#6ab023' },
  { name: 'Reform UK', href: '/mps?party=Reform+UK', color: '#12b6cf' },
]

function PartyCompare() {
  return (
    <div className="border border-black/15 bg-white p-6">
      <CardHeader title="Compare Party Positions On Any Issue" href="/departments" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {PARTY_LINKS.map((p) => (
          <Link key={p.name} href={p.href} className="text-center no-underline text-black">
            <div
              className="mx-auto mb-3 h-14 w-14 rounded-full border-2 border-black"
              style={{ background: p.color }}
            />
            <p className="text-xs font-black">{p.name}</p>
            <p className="mt-1 text-[12px] uppercase text-black/50">Read their plans</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TrustItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-4 border-black/10 py-7 sm:border-r sm:px-6 last:border-r-0">
      <div className="h-8 w-8 shrink-0 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
      <div>
        <h3 className="text-sm font-black uppercase">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-black/65">{body}</p>
      </div>
    </div>
  )
}

function CardHeader({
  title,
  dark = false,
  href,
}: {
  title: string
  dark?: boolean
  href?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3
        className={`text-sm font-black uppercase tracking-wide ${
          dark ? 'text-white' : 'text-[#c91517]'
        }`}
      >
        {title}
      </h3>
      {href && (
        <Link
          href={href}
          className={`flex items-center gap-1 text-xs font-black uppercase no-underline ${
            dark ? 'text-white/70 hover:text-white' : 'text-black/60 hover:text-black'
          }`}
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

function CardLink({ label }: { label: string }) {
  return (
    <div className="mt-7 flex items-center gap-2 text-xs font-black uppercase">
      {label}
      <ArrowRight className="h-4 w-4" />
    </div>
  )
}

function StatRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/60 text-xs">{name}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  )
}
