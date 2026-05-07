import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import SiteFooter from './components/SiteFooter'
import Link from 'next/link'

export const revalidate = 3600

const BG = '#1a1a1a'
const PANEL = '#111111'
const PANEL_DEEP = '#0a0a0a'
const BORDER = '#333333'
const RULE = '#262626'
const MUTED = '#9a9a9a'
const VOTE_YES = '#4a8a3a'
const VOTE_NO  = '#c8302e'
const VOTE_ABS = '#888888'

const FONT = 'var(--font-geist-sans), Arial, Helvetica, sans-serif'

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'undisclosed'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 'undisclosed'
  if (n >= 1_000_000_000) return '£' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'bn'
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
  if (n >= 1_000) return '£' + Math.round(n / 1_000).toLocaleString() + 'k'
  return '£' + Math.round(n).toLocaleString()
}

export default async function HomePage() {
  const [
    { data: news },
    { data: bills },
    { data: topContractRows },
    { data: topDonationRows },
    { count: contractCount },
    { count: donationCount },
    { count: revolvingCount },
    { data: topExpenseRows },
  ] = await Promise.all([
    supabase.from('press_releases').select('title, description, organisation, published_at, gov_url').order('published_at', { ascending: false }).limit(5),
    supabase.from('bill').select('id, title, vote_count_yes, vote_count_no, vote_count_abstain').order('vote_count_yes', { ascending: false }).limit(3),
    supabase.from('government_contracts').select('title, supplier, value').not('value', 'is', null).order('value', { ascending: false }).limit(1),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').not('amount', 'is', null).order('amount', { ascending: false }).limit(1),
    supabase.from('government_contracts').select('id', { count: 'exact', head: true }),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }),
    supabase.from('revolving_door').select('id', { count: 'exact', head: true }),
    supabase.from('mp_expenses_summary').select('member_id, total_spend').eq('year', '24_25').order('total_spend', { ascending: false, nullsFirst: false }).limit(10),
  ])

  const { data: coverageRows } = await supabase
    .from('uk_political_news')
    .select('id, source_url, source_outlet, source_title, published_at, commentary, related_link_href, related_link_label')
    .eq('is_published', true)
    .not('commentary', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)
  const coverageStories = coverageRows || []

  const expenseIds = (topExpenseRows || []).map((r: { member_id: number }) => r.member_id)
  const { data: expenseMps } = expenseIds.length
    ? await supabase.from('mps').select('member_id, name, display_name, constituency, current_member').in('member_id', expenseIds)
    : { data: [] as Array<{ member_id: number; name: string | null; display_name: string | null; constituency: string | null; current_member: boolean | null }> }
  const expenseMpById = new Map<number, { name: string | null; display_name: string | null; constituency: string | null; current_member: boolean | null }>(
    (expenseMps || []).map((m) => [m.member_id, m])
  )
  const topSpenders = (topExpenseRows || [])
    .map((r: { member_id: number; total_spend: number | null }) => {
      const m = expenseMpById.get(r.member_id)
      return m && m.current_member
        ? { member_id: r.member_id, total_spend: r.total_spend, name: m.display_name || m.name || '', constituency: m.constituency || '' }
        : null
    })
    .filter((x): x is { member_id: number; total_spend: number | null; name: string; constituency: string } => x !== null)
    .slice(0, 3)

  const leadStory = news?.[0]
  const otherStories = news?.slice(1, 5) || []
  const topContract = topContractRows?.[0]
  const topDonation = topDonationRows?.[0]

  const contractValue = topContract?.value ? Number(topContract.value) : 0
  const donationValue = topDonation?.amount ? Number(topDonation.amount) : 0
  const featured: { kind: 'contract' | 'donation' | null; value: number; line1: string; line2: string; sub: string; href: string } =
    contractValue >= donationValue && topContract
      ? { kind: 'contract', value: contractValue, line1: topContract.title || 'Untitled contract', line2: 'Awarded to ' + (topContract.supplier || 'undisclosed supplier'), sub: 'Largest contract on record.', href: '/transparency/contracts' }
      : topDonation
        ? { kind: 'donation', value: donationValue, line1: topDonation.donor_name || 'Anonymous donor', line2: 'Paid to ' + (topDonation.recipient_name || 'undisclosed recipient'), sub: 'Largest donation on record.', href: '/transparency/donations' }
        : { kind: null, value: 0, line1: '', line2: '', sub: '', href: '/transparency' }

  // Featured vote: bill with most engagement (proxy: most yes votes, already sorted)
  const featuredBill = (bills || []).find((b) => (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0) > 0)
  const fbYes = featuredBill?.vote_count_yes || 0
  const fbNo  = featuredBill?.vote_count_no || 0
  const fbAbs = featuredBill?.vote_count_abstain || 0
  const fbTotal = fbYes + fbNo + fbAbs
  const fbYesPct = fbTotal > 0 ? Math.round((fbYes / fbTotal) * 100) : 0
  const fbNoPct  = fbTotal > 0 ? Math.round((fbNo  / fbTotal) * 100) : 0
  const fbAbsPct = fbTotal > 0 ? Math.max(0, 100 - fbYesPct - fbNoPct) : 0

  const leadSlug = leadStory?.gov_url ? leadStory.gov_url.split('/').filter(Boolean).pop() : null

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: FONT }}>
      <Navigation />

      {/* ─────────────────── HERO ─────────────────── */}
      <section
        style={{
          width: '100%',
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.45) 100%), url('/hero-parliament.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4.5rem 1.5rem 5rem' }}>
          <div style={{ maxWidth: '760px' }}>
            <div style={{ fontSize: '11px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.25rem', opacity: 0.85, fontWeight: 700 }}>
              {leadStory ? `Top story · ${leadStory.organisation}` : "The People's Chamber · UK Public Transparency"}
            </div>
            <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', fontWeight: 700, color: '#fff', margin: '0 0 1.25rem', letterSpacing: '-0.015em', lineHeight: 1.05 }}>
              {leadStory?.title || 'UK Government. In public view.'}
            </h1>
            <p style={{ fontSize: '17px', color: '#fff', margin: '0 0 2rem', maxWidth: '640px', lineHeight: 1.55, opacity: 0.92 }}>
              {leadStory?.description ||
                "Track every bill, MP, contract and donation across UK Government. Add your vote to the public record — it doesn't unmake the law, but at least someone counted."}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {leadSlug ? (
                <Link href={`/news/${leadSlug}`} style={ctaPrimary}>Read the full story →</Link>
              ) : (
                <Link href="/transparency" style={ctaPrimary}>Explore Records</Link>
              )}
              <Link href="/bills" style={ctaSecondary}>Vote on Bills</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── NOTABLE TRANSACTION ─────────────────── */}
      {featured.kind && (
        <section style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '1.75rem', alignItems: 'center' }}>
            <div style={{ borderRight: `1px solid ${BORDER}`, paddingRight: '1.5rem' }}>
              <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85 }}>Notable Transaction</div>
              <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>{featured.sub}</div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: '4px' }}>{featured.line1}</div>
              <div style={{ fontSize: '13px', color: '#fff' }}>{featured.line2}.</div>
            </div>
            <Link href={featured.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textDecoration: 'none', borderLeft: `1px solid ${BORDER}`, paddingLeft: '1.5rem' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(featured.value)}</span>
              <span style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px', opacity: 0.7 }}>view details →</span>
            </Link>
          </div>
        </section>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

        {/* ─────────────────── FEATURED VOTE ─────────────────── */}
        {featuredBill && fbTotal > 0 && (
          <section
            style={{
              background: PANEL_DEEP,
              border: `1px solid ${BORDER}`,
              padding: 'clamp(1.5rem, 3vw, 2.5rem)',
              marginBottom: '3rem',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: 'clamp(1.5rem, 4vw, 3rem)',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85, marginBottom: '0.85rem' }}>
                Featured Vote · Public Tally
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.012em', lineHeight: 1.15, margin: '0 0 1rem' }}>
                {featuredBill.title}
              </h2>
              <p style={{ fontSize: '14px', color: MUTED, lineHeight: 1.55, margin: '0 0 1.75rem', maxWidth: '520px' }}>
                {fbTotal.toLocaleString()} members of the public have voted. Parliament&apos;s tally may differ — read the bill, then add yours.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/bills/${featuredBill.id}`} style={ctaPrimary}>Read the full story →</Link>
                <Link href={`/bills/${featuredBill.id}#votes`} style={ctaSecondary}>See how MPs voted</Link>
              </div>
            </div>

            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: `1px solid ${BORDER}` }}>
                <PctBlock pct={fbYesPct} label="Support" color={VOTE_YES} />
                <PctBlock pct={fbNoPct}  label="Oppose"  color={VOTE_NO} />
              </div>
              <div style={{ height: '8px', background: RULE, display: 'flex', marginTop: '0.85rem', borderRadius: '1px', overflow: 'hidden' }}>
                {fbYesPct > 0 && <div style={{ width: `${fbYesPct}%`, background: VOTE_YES }} />}
                {fbNoPct  > 0 && <div style={{ width: `${fbNoPct}%`,  background: VOTE_NO  }} />}
                {fbAbsPct > 0 && <div style={{ width: `${fbAbsPct}%`, background: VOTE_ABS }} />}
              </div>
              <div style={{ fontSize: '11px', color: MUTED, marginTop: '0.5rem', fontVariantNumeric: 'tabular-nums', display: 'flex', justifyContent: 'space-between' }}>
                <span>{fbYes.toLocaleString()} yes · {fbNo.toLocaleString()} no · {fbAbs.toLocaleString()} abstain</span>
                <span>{fbTotal.toLocaleString()} total</span>
              </div>
            </div>
          </section>
        )}

        {/* ─────────────────── TWO-COLUMN: SPIN + STATS ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2.5rem', marginBottom: '3rem' }}>

          {/* LEFT — Today's Spin */}
          <section>
            <SectionHead label="Today's Spin" sub="Independent press, with our take." />
            {coverageStories.length === 0 ? (
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '2rem', textAlign: 'center', color: MUTED, fontSize: '14px' }}>
                Commentary refreshes daily. Check back shortly.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {coverageStories.map((s) => {
                  const date = s.published_at ? new Date(s.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                  return (
                    <article key={s.id} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>
                        {s.source_outlet}{date ? ` · ${date}` : ''}
                      </div>
                      <Link
                        href={`/coverage/${s.id}`}
                        style={{ display: 'block', fontSize: '19px', color: '#fff', lineHeight: 1.3, fontWeight: 700, textDecoration: 'none', marginBottom: '10px' }}
                        className="hover:underline"
                      >
                        {s.source_title}
                      </Link>
                      {s.commentary && (
                        <p style={{ fontSize: '13px', color: '#fff', opacity: 0.92, lineHeight: 1.6, margin: '0 0 0.6rem', borderLeft: `3px solid ${BORDER}`, paddingLeft: '0.85rem' }}>
                          {s.commentary}
                        </p>
                      )}
                      <div style={{ fontSize: '11px', color: MUTED, display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '8px' }}>
                        {s.related_link_href && s.related_link_label && (
                          <Link href={s.related_link_href} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600 }} className="hover:underline">
                            {s.related_link_label} →
                          </Link>
                        )}
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: 'none' }} className="hover:underline">
                          Read at {(() => { try { return new URL(s.source_url).hostname.replace(/^www\./, '') } catch { return 'source' } })()} ↗
                        </a>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* RIGHT — Stat cards */}
          <aside>
            <SectionHead label="Live Numbers" sub="Pulled from the records this hour." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <StatCard
                href="/transparency/contracts"
                eyebrow="Top contract"
                value={fmtMoney(topContract?.value)}
                label={topContract?.supplier || '—'}
                glyph="£"
              />
              <StatCard
                href="/transparency/donations"
                eyebrow="Top donation"
                value={fmtMoney(topDonation?.amount)}
                label={topDonation?.donor_name || '—'}
                glyph="◎"
              />
              <StatCard
                href="/earnings"
                eyebrow="Highest earner (outside)"
                value={topSpenders[0]?.name || '—'}
                label={topSpenders[0]?.constituency || ''}
                glyph="✦"
                small
              />
              <StatCard
                href="/transparency/revolving-door"
                eyebrow="Revolving-door moves"
                value={(revolvingCount || 0).toLocaleString()}
                label="Whitehall ↔ private sector"
                glyph="⇄"
              />
            </div>
          </aside>
        </div>

        {/* ─────────────────── BIG SPENDERS ─────────────────── */}
        {topSpenders.length > 0 && (
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '1.75rem 2rem', marginBottom: '3rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1.5rem', alignItems: 'baseline', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85, marginBottom: '6px' }}>
                  The Big Spenders · 2024 / 2025
                </div>
                <h2 style={{ fontSize: 'clamp(26px, 3.4vw, 34px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.15, margin: 0 }}>
                  Who&apos;s spending your money?
                </h2>
                <p style={{ fontStyle: 'italic', fontSize: '14px', color: MUTED, marginTop: '8px', lineHeight: 1.55, maxWidth: '640px' }}>
                  The ten MPs with the biggest business-cost claims this year. Mostly the ones whose constituencies are furthest from Westminster — make of that what you will.
                </p>
              </div>
              <Link href="/expenses" style={ctaPrimary}>See top 10 →</Link>
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${BORDER}` }}>
              {topSpenders.map((s, i) => (
                <li
                  key={s.member_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px minmax(0, 1.4fr) minmax(0, 2fr) auto',
                    gap: '1.25rem',
                    alignItems: 'baseline',
                    padding: '1rem 0',
                    borderBottom: i < topSpenders.length - 1 ? `1px solid ${RULE}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '20px', color: MUTED, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <Link
                    href={`/mps/${s.member_id}`}
                    style={{ fontSize: '17px', color: '#fff', textDecoration: 'none', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {s.name}
                  </Link>
                  <span style={{ fontSize: '13px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.constituency}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtMoney(s.total_spend)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ─────────────────── NEWS GRID 4-UP ─────────────────── */}
        {otherStories.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionHead label="From the Press Offices" sub="The official line, straight from Whitehall." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {otherStories.map((story, i) => {
                const slug = story.gov_url ? story.gov_url.split('/').filter(Boolean).pop() : null
                const positions = ['center top', 'left center', 'right center', 'center bottom']
                const date = story.published_at ? new Date(story.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                return (
                  <NewsCard
                    key={i}
                    href={slug ? `/news/${slug}` : '#'}
                    organisation={story.organisation}
                    title={story.title}
                    date={date}
                    bgPosition={positions[i % positions.length]}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* ─────────────────── STATS BAND ─────────────────── */}
        <section style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: BORDER, border: `1px solid ${BORDER}` }}>
            <Counter big="3,884" label="Bills tracked" />
            <Counter big="650" label="Sitting MPs" />
            <Counter big={(contractCount || 0).toLocaleString()} label="Contracts" />
            <Counter big={(donationCount || 0).toLocaleString()} label="Donations" />
          </div>
        </section>

        {/* ─────────────────── CTA STRIP ─────────────────── */}
        <section style={{ marginTop: '3rem', background: PANEL, border: `1px solid ${BORDER}`, padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.85 }}>Take part</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Add your voice to the public record.</div>
            <div style={{ fontSize: '14px', color: MUTED, marginTop: '6px', lineHeight: 1.5 }}>Vote on bills, browse contracts, and keep an eye on who&apos;s coming and going through the Westminster door. We track it. You decide what to make of it.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/bills" style={ctaPrimary}>Vote on Bills</Link>
            <Link href="/transparency" style={ctaSecondary}>Transparency Records</Link>
          </div>
        </section>

        {/* (Recent contracts/donations dropped from the home page — they live on /transparency.
             Public Bill Votes ranked list moved to /bills.
             Revolving-door teaser is now in the right-side stat cards above.) */}
      </main>

      <SiteFooter />
    </div>
  )
}

const ctaPrimary: React.CSSProperties = {
  background: '#fff',
  color: '#000',
  padding: '12px 22px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const ctaSecondary: React.CSSProperties = {
  background: 'transparent',
  color: '#fff',
  padding: '11px 22px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: '1px solid #fff',
  whiteSpace: 'nowrap',
}

function PctBlock({ pct, label, color }: { pct: number; label: string; color: string }) {
  return (
    <div style={{ background: PANEL_DEEP, padding: '1.4rem 1rem', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 'clamp(46px, 6vw, 68px)', fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em' }}>
        {pct}<span style={{ fontSize: '0.55em', fontWeight: 700, marginLeft: '2px' }}>%</span>
      </div>
      <div style={{ fontSize: '11px', color: '#fff', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '8px', fontWeight: 700 }}>
        {label}
      </div>
    </div>
  )
}

function StatCard({
  href,
  eyebrow,
  value,
  label,
  glyph,
  small = false,
}: {
  href: string
  eyebrow: string
  value: string
  label: string
  glyph: string
  small?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        padding: '1.1rem 1.25rem',
        textDecoration: 'none',
        color: '#fff',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: MUTED, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: small ? '17px' : '24px',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.15,
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </div>
        {label && (
          <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: '24px',
          color: '#fff',
          opacity: 0.45,
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        {glyph}
      </div>
    </Link>
  )
}

function NewsCard({
  href,
  organisation,
  title,
  date,
  bgPosition,
}: {
  href: string
  organisation: string | null
  title: string
  date: string
  bgPosition: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textDecoration: 'none',
        color: '#fff',
        background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 75%), url('/hero-parliament.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: bgPosition,
        border: `1px solid ${BORDER}`,
        minHeight: '200px',
        padding: '1.25rem 1.25rem 1.1rem',
      }}
    >
      <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85 }}>
        {organisation || 'Whitehall'}
      </div>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, marginBottom: '8px' }}>{title}</div>
        {date && <div style={{ fontSize: '11px', color: MUTED }}>{date}</div>}
      </div>
    </Link>
  )
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <header style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '10px', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '11px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontStyle: 'italic', fontSize: '12px', color: MUTED, marginTop: '4px' }}>{sub}</div>}
    </header>
  )
}

function Counter({ big, label }: { big: string; label: string }) {
  return (
    <div style={{ background: BG, padding: '1.5rem 1.25rem' }}>
      <div style={{ fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em' }}>{big}</div>
      <div style={{ fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.22em', marginTop: '10px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
