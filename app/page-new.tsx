// Editorial preview — pixel-targeted at the design at:
// /Users/johnnybot/Downloads/f206adcc-6842-4be8-919f-e7781a7f0f70.png (7 May 22:44).
//
// Differences from the current live editorial page:
//  - "LIVE FROM WESTMINSTER" sub-strip below the dark hero (mini-news + countdown)
//  - TOP STORIES: 70/30 split — 4-up news grid + sidebar (Public Hub donut + Transparency Desk)
//  - LATEST FROM WESTMINSTER: 70/30 split — 4-up news grid + Today's Editorial panel
//  - Footer: lion + signup on left + "Join the Chamber" callout on right
//  - Nav adds "Satire Desk" item
//
// Renders at /preview — does NOT touch the live app/page.tsx.

import { supabase } from '@/lib/supabase'
import { Playfair_Display, Inter } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from './components/NewsletterForm'

export const revalidate = 3600

const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '800', '900'], style: ['normal', 'italic'], display: 'swap', variable: '--pc-serif' })
const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--pc-sans' })

const C = {
  bg:    '#F4EFE5',
  ink:   '#181C1F',
  inkPanel: '#1F2428',
  green: '#2F4F3E',
  greenLite: '#3F6A55',
  red:   '#B02A2A',
  redBright: '#C8302A',
  gold:  '#C8A76A',
  rule:  '#E0DACE',
  muted: '#5C5C58',
  inkMuted: '#9b9586',
}

const NAV_LINKS: [string, string][] = [
  ['Bills', '/bills'],
  ['MPs', '/mps'],
  ['Departments', '/departments'],
  ['Transparency', '/transparency'],
  ['Expenses', '/expenses'],
  ['Polls', '/polls'],
  ['Satire Desk', '/coverage'],
  ['News & Analysis', '/coverage'],
]

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1_000_000_000) return '£' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'bn'
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
  if (n >= 1_000) return '£' + Math.round(n / 1_000).toLocaleString() + 'k'
  return '£' + Math.round(n).toLocaleString()
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString()
}

export default async function HomePageNew() {
  const [
    { data: news },
    { data: bills },
    { data: topContractRows },
    { data: topDonationRows },
    { count: contractCount },
    { count: donationCount },
    { count: revolvingCount },
    { data: topExpenseRows },
    { data: latestRevolving },
  ] = await Promise.all([
    supabase.from('press_releases').select('title, description, organisation, published_at, gov_url').order('published_at', { ascending: false }).limit(8),
    supabase.from('bill').select('id, title, vote_count_yes, vote_count_no, vote_count_abstain').order('vote_count_yes', { ascending: false }).limit(4),
    supabase.from('government_contracts').select('title, supplier, value').not('value', 'is', null).order('value', { ascending: false }).limit(1),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').not('amount', 'is', null).order('amount', { ascending: false }).limit(1),
    supabase.from('government_contracts').select('id', { count: 'exact', head: true }),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }),
    supabase.from('revolving_door').select('id', { count: 'exact', head: true }),
    supabase.from('mp_expenses_summary').select('member_id, total_spend').eq('year', '24_25').order('total_spend', { ascending: false, nullsFirst: false }).limit(2),
    supabase.from('revolving_door').select('person_name, previous_role, organisation').order('id', { ascending: false }).limit(1),
  ])

  const { data: coverageRows } = await supabase
    .from('uk_political_news')
    .select('id, source_url, source_outlet, source_title, published_at, commentary, related_link_href, related_link_label')
    .eq('is_published', true)
    .not('commentary', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(8)
  const stories = coverageRows || []

  const expenseIds = (topExpenseRows || []).map((r: { member_id: number }) => r.member_id)
  const { data: expenseMps } = expenseIds.length
    ? await supabase.from('mps').select('member_id, name, display_name, constituency').in('member_id', expenseIds)
    : { data: [] as Array<{ member_id: number; name: string | null; display_name: string | null; constituency: string | null }> }
  const mpById = new Map((expenseMps || []).map((m) => [m.member_id, m]))
  const topSpender = (() => {
    const r = topExpenseRows?.[0]
    if (!r) return null
    const m = mpById.get(r.member_id)
    return m ? { name: m.display_name || m.name || '', total: r.total_spend, constituency: m.constituency || '' } : null
  })()

  const lead = news?.[0]
  const leadSlug = lead?.gov_url ? lead.gov_url.split('/').filter(Boolean).pop() : null

  const featuredBill = (bills || []).find((b) => (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0) > 0)
  const fbYes = featuredBill?.vote_count_yes || 0
  const fbNo  = featuredBill?.vote_count_no || 0
  const fbAbs = featuredBill?.vote_count_abstain || 0
  const fbTotal = fbYes + fbNo + fbAbs
  const fbYesPct = fbTotal > 0 ? Math.round((fbYes / fbTotal) * 100) : 0
  const fbNoPct  = fbTotal > 0 ? Math.round((fbNo  / fbTotal) * 100) : 0

  const topContract = topContractRows?.[0]
  const topDonation = topDonationRows?.[0]
  const recentRevolving = latestRevolving?.[0]

  const editorialPick = stories[0]
  const topStories = stories.slice(0, 4)
  const laterStories = stories.slice(4, 8)
  const pressForGrid = (news?.slice(0, 4) || [])

  // Sub-strip headlines below the hero
  const liveStripItems: string[] = []
  if (featuredBill) liveStripItems.push(`${featuredBill.title} progressing`)
  if (lead) liveStripItems.push(`${lead.organisation}: ${lead.title.slice(0, 60)}…`)
  if (recentRevolving) liveStripItems.push(`Revolving door: ${recentRevolving.person_name}`)

  // Ticker
  const tickerSegments: string[] = []
  if (featuredBill && fbTotal > 0) tickerSegments.push(`${featuredBill.title}: Public opposition at ${fbNoPct}%`)
  if (lead) tickerSegments.push(`${lead.organisation}: ${lead.title}`)
  if (topContract) tickerSegments.push(`Top contract — ${fmtMoney(topContract.value)} to ${topContract.supplier || 'undisclosed'}`)
  if (topDonation) tickerSegments.push(`Top donation — ${fmtMoney(topDonation.amount)} from ${topDonation.donor_name}`)
  if (topSpender) tickerSegments.push(`Top expense claim — ${topSpender.name} (${fmtMoney(topSpender.total)})`)
  const tickerText = tickerSegments.length ? tickerSegments.join('     ◆     ') : 'Updating from the public record…'

  const cardSkins = [
    { category: 'Politics',      tint: 'rgba(176, 42, 42, 0.55)' },
    { category: 'Bills',         tint: 'rgba(47, 79, 62, 0.65)'  },
    { category: 'Investigation', tint: 'rgba(24, 28, 31, 0.78)'  },
    { category: 'Housing',       tint: 'rgba(200, 167, 106, 0.55)' },
  ]

  return (
    <div
      className={`${serif.variable} ${sans.variable}`}
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: 'var(--pc-sans), Inter, ui-sans-serif, system-ui, sans-serif',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @keyframes pcTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .pc-ticker-track { display: inline-flex; gap: 4rem; white-space: nowrap; animation: pcTicker 90s linear infinite; }
        .pc-serif { font-family: var(--pc-serif), 'Playfair Display', Georgia, serif; }
        .pc-italic { font-family: var(--pc-serif), Georgia, serif; font-style: italic; }
        @media (prefers-reduced-motion: reduce) { .pc-ticker-track { animation: none; } }
        .pc-link { color: inherit; text-decoration: none; }
        .pc-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .pc-mast        { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; }
        .pc-hero        { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 5fr); gap: 0; min-height: 480px; }
        .pc-hero-img    { min-height: 480px; }
        .pc-hero-stats  { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
        .pc-2col        { display: grid; grid-template-columns: minmax(0, 2.3fr) minmax(0, 1fr); gap: clamp(1.75rem, 3vw, 3rem); }
        .pc-news-grid   { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
        .pc-stats-grid  { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.85rem; }
        .pc-foot-main   { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: clamp(2rem, 4vw, 4rem); }
        .pc-nav-desktop { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 1.5rem; max-width: 1280px; margin: 0 auto; }
        .pc-nav-mobile  { display: none; }

        @media (max-width: 1024px) {
          .pc-2col       { grid-template-columns: 1fr; }
          .pc-news-grid  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pc-stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .pc-mast       { grid-template-columns: 1fr; gap: 0.5rem; text-align: center; }
          .pc-mast > *:nth-child(1), .pc-mast > *:nth-child(3) { display: none; }
          .pc-hero       { grid-template-columns: 1fr; min-height: auto; }
          .pc-hero-img   { min-height: 240px !important; aspect-ratio: 16 / 9; }
          .pc-hero-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pc-news-grid  { grid-template-columns: 1fr; }
          .pc-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pc-foot-main  { grid-template-columns: 1fr; }
          .pc-nav-desktop { display: none; }
          .pc-nav-mobile  { display: block; padding: 0.5rem 1rem; }
        }
        .pc-nav-mobile summary { list-style: none; cursor: pointer; padding: 0.65rem 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: ${C.ink}; }
        .pc-nav-mobile summary::-webkit-details-marker { display: none; }
        .pc-nav-mobile[open] summary .pc-burger-bars span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .pc-nav-mobile[open] summary .pc-burger-bars span:nth-child(2) { opacity: 0; }
        .pc-nav-mobile[open] summary .pc-burger-bars span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
        .pc-burger-bars { display: inline-flex; flex-direction: column; gap: 4px; width: 22px; }
        .pc-burger-bars span { display: block; height: 2px; background: ${C.ink}; transition: transform 0.18s, opacity 0.18s; }
        .pc-nav-mobile-list { display: flex; flex-direction: column; gap: 0; padding: 0.5rem 0 1rem; border-top: 1px solid ${C.rule}; }
        .pc-nav-mobile-list a { display: block; padding: 0.85rem 0.75rem; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; color: ${C.ink}; text-decoration: none; border-bottom: 1px solid ${C.rule}; }
      `}</style>

      {/* ─── RED TICKER ─── */}
      <div style={{ background: C.red, color: '#fff', fontSize: '12px', borderBottom: `1px solid ${C.gold}` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <div style={{ overflow: 'hidden', flex: 1, padding: '7px 1.5rem' }}>
            <div className="pc-ticker-track">
              <span>{tickerText}</span>
              <span aria-hidden="true">{tickerText}</span>
            </div>
          </div>
          <div style={{ padding: '7px 1.5rem', borderLeft: '1px solid rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0, fontWeight: 600 }}>
            Westminster · 14°C
          </div>
        </div>
      </div>

      {/* ─── MASTHEAD ─── */}
      <header style={{ borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem 1.5rem' }}>
          <div className="pc-mast">
            <div className="pc-italic" style={{ fontSize: '13px', color: C.muted, fontStyle: 'italic' }}>
              The government speaks.<br />The public replies.
            </div>
            <h1
              className="pc-serif"
              style={{
                fontFamily: 'var(--pc-serif), Georgia, serif',
                fontWeight: 800,
                fontSize: 'clamp(36px, 5vw, 68px)',
                lineHeight: 0.95,
                letterSpacing: '-0.015em',
                margin: 0,
                color: C.ink,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              The People&apos;s Chamber
            </h1>
            <div className="pc-italic" style={{ fontSize: '13px', color: C.muted, fontStyle: 'italic', textAlign: 'right' }}>
              A modern public chamber<br />for a modern democracy
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.85rem', fontSize: '11px', letterSpacing: '0.32em', textTransform: 'uppercase', color: C.green, fontWeight: 600 }}>
            ◆ Holding Power to Account ◆
          </div>
        </div>

        {/* NAV */}
        <nav style={{ borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}`, background: C.bg }}>
          <div className="pc-nav-desktop">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flexWrap: 'wrap' }}>
              {NAV_LINKS.map(([label, href]) => (
                <Link key={label} href={href} className="pc-link" style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.ink, fontWeight: 600 }}>
                  {label}
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Link href="/search" aria-label="Search" style={{ color: C.ink, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                <SearchGlyph />
              </Link>
              <Link
                href="/about#join"
                style={{ background: C.green, color: '#fff', padding: '9px 16px', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}
              >
                Join the Chamber
              </Link>
            </div>
          </div>
          <details className="pc-nav-mobile">
            <summary>
              <span>Menu</span>
              <span className="pc-burger-bars" aria-hidden="true"><span /><span /><span /></span>
            </summary>
            <div className="pc-nav-mobile-list">
              {NAV_LINKS.map(([label, href]) => (<Link key={label} href={href}>{label}</Link>))}
              <Link href="/search">Search</Link>
              <Link href="/about#join" style={{ background: C.green, color: '#fff', textAlign: 'center', marginTop: '0.5rem', borderBottom: 'none' }}>Join the Chamber →</Link>
            </div>
          </details>
        </nav>
      </header>

      {/* ─── DARK HERO ─── */}
      <section style={{ background: C.ink, color: '#fff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="pc-hero">
            <div
              className="pc-hero-img"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0) 70%, rgba(24,28,31,1) 100%), url('/hero-parliament.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-label="The Palace of Westminster"
            />
            <div style={{ padding: 'clamp(2rem, 4vw, 3.5rem) clamp(2rem, 4vw, 3rem) 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.75rem' }}>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.32em', textTransform: 'uppercase', color: C.redBright, fontWeight: 700, marginBottom: '1.25rem' }}>
                  ● Top Story
                </div>
                <h2
                  className="pc-serif"
                  style={{
                    fontFamily: 'var(--pc-serif), Georgia, serif',
                    fontWeight: 700,
                    fontSize: 'clamp(34px, 4.4vw, 56px)',
                    lineHeight: 1.04,
                    letterSpacing: '-0.018em',
                    margin: '0 0 1.25rem',
                    color: '#fff',
                  }}
                >
                  {featuredBill?.title || lead?.title || 'The week in plain view.'}
                </h2>
                <p className="pc-italic" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.55, color: '#cfc8b8', maxWidth: '560px', margin: 0 }}>
                  {lead?.description?.slice(0, 220) || 'Track every bill, MP, contract and donation across UK Government — and add your verdict to the public record.'}
                </p>
              </div>

              {featuredBill && fbTotal > 0 ? (
                <div className="pc-hero-stats">
                  <HeroStat value={`${fbNoPct}%`} label="Oppose" sub="↑ since last week" tint={C.redBright} />
                  <HeroStat value={`${fbYesPct}%`} label="Support" sub="↓ since last week" tint={C.greenLite} />
                  <HeroStat value={fmtCompact(fbTotal)} label="Public votes" tint="#fff" />
                  <HeroStat value={fbAbs.toLocaleString()} label="Abstain" tint="#fff" />
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  href={featuredBill ? `/bills/${featuredBill.id}` : (leadSlug ? `/news/${leadSlug}` : '/transparency')}
                  style={{ background: C.redBright, color: '#fff', padding: '14px 24px', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}
                >
                  Read the full story
                </Link>
                <Link
                  href={featuredBill ? `/bills/${featuredBill.id}#votes` : '/bills'}
                  style={{ background: 'transparent', color: '#fff', padding: '13px 24px', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none', border: '1px solid #fff' }}
                >
                  See how MPs voted
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE FROM WESTMINSTER sub-strip ─── */}
      <div style={{ background: C.inkPanel, color: C.inkMuted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', borderBottom: `1px solid #2a2f33`, fontWeight: 600 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: C.redBright, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '7px', height: '7px', background: C.redBright, borderRadius: '50%' }} />
            Live from Westminster
          </span>
          {liveStripItems.slice(0, 3).map((s, i) => (
            <span key={i} style={{ color: '#fff', textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
              {s}
            </span>
          ))}
          <span style={{ marginLeft: 'auto' }}>PMQs in 1h 22m</span>
          <Link href="/coverage" style={{ color: '#fff', textDecoration: 'none' }}>View all →</Link>
        </div>
      </div>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem 0' }}>

        {/* ─── TOP STORIES + sidebar ─── */}
        <section style={{ paddingBottom: '3rem', borderBottom: `1px solid ${C.rule}` }}>
          <SectionHead label="Top Stories" right={<Link href="/coverage" className="pc-link" style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.green, fontWeight: 700, borderBottom: `2px solid ${C.gold}`, paddingBottom: '2px' }}>View all →</Link>} />
          <div className="pc-2col">
            <div className="pc-news-grid">
              {topStories.length === 0 && pressForGrid.slice(0, 4).map((p, i) => {
                const skin = cardSkins[i % cardSkins.length]
                const date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                const slug = p.gov_url ? p.gov_url.split('/').filter(Boolean).pop() : null
                return (
                  <NewsCard key={`p-${i}`} href={slug ? `/news/${slug}` : '#'} category={skin.category} headline={p.title} excerpt={p.description || ''} date={date} tint={skin.tint} bgPos={['center top', 'left center', 'right center', 'center bottom'][i % 4]} />
                )
              })}
              {topStories.map((s, i) => {
                const skin = cardSkins[i % cardSkins.length]
                const date = s.published_at ? new Date(s.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                return (
                  <NewsCard key={`s-${i}`} href={`/coverage/${s.id}`} category={skin.category} headline={s.source_title} excerpt={s.commentary || ''} date={date} tint={skin.tint} bgPos={['center top', 'left center', 'right center', 'center bottom'][i % 4]} />
                )
              })}
            </div>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* PUBLIC HUB */}
              <div style={{ background: '#fff', border: `1px solid ${C.rule}`, padding: '1.5rem' }}>
                <ColKicker color={C.green}>The Public Hub</ColKicker>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem' }}>
                  <Donut pct={23} color={C.green} />
                  <div>
                    <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, marginBottom: '4px' }}>
                      Government approval
                    </div>
                    <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '13px', color: C.ink, lineHeight: 1.45, fontStyle: 'italic' }}>
                      Lowest in 18 months. The remaining 77% are tired and waiting.
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem', height: '40px', position: 'relative' }}>
                  <Sparkline color={C.red} />
                </div>
              </div>

              {/* TRANSPARENCY DESK */}
              <div style={{ background: '#fff', border: `1px solid ${C.rule}`, padding: '1.5rem' }}>
                <ColKicker color={C.gold}>Transparency Desk</ColKicker>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>
                    Top expense claim · 24/25
                  </div>
                  <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: 'clamp(28px, 3vw, 36px)', fontWeight: 800, lineHeight: 1, color: C.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {topSpender ? fmtMoney(topSpender.total) : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: C.green, marginTop: '6px', fontWeight: 700 }}>
                    {topSpender?.name || ''}
                  </div>
                </div>
                <DeskLine label="Largest contract" value={fmtMoney(topContract?.value)} sub={topContract?.supplier || ''} href="/transparency/contracts" />
                <DeskLine label="Largest donation" value={fmtMoney(topDonation?.amount)} sub={`${topDonation?.donor_name || '—'} → ${topDonation?.recipient_name || ''}`} href="/transparency/donations" />
                <Link href="/expenses" className="pc-link" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold, fontWeight: 700, borderBottom: `2px solid ${C.gold}`, paddingBottom: '2px' }}>
                  View all expenses →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* ─── AT A GLANCE ─── */}
        <section style={{ padding: '3rem 0', borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.green, fontWeight: 700 }}>
              ◆ At a Glance
            </div>
          </div>
          <div className="pc-stats-grid">
            <CircleStat icon={<TrendUp />} value={`${fbYesPct}%`} label="Today's polls" tint={C.green} />
            <CircleStat icon={<DocIcon />} value={'3,884'} label="Bills tracked" tint={C.ink} />
            <CircleStat icon={<HouseIcon />} value={(contractCount || 0).toLocaleString()} label="Contracts logged" tint={C.gold} />
            <CircleStat icon={<DoorIcon />} value={(revolvingCount || 0).toLocaleString()} label="Revolving moves" tint={C.red} />
            <ExploreCard />
          </div>
        </section>

        {/* ─── LATEST FROM WESTMINSTER + Today's Editorial ─── */}
        <section style={{ padding: '3rem 0' }}>
          <SectionHead label="Latest from Westminster" right={<Link href="/coverage" className="pc-link" style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.green, fontWeight: 700, borderBottom: `2px solid ${C.gold}`, paddingBottom: '2px' }}>View all →</Link>} />
          <div className="pc-2col">
            <div className="pc-news-grid">
              {(laterStories.length ? laterStories : pressForGrid).slice(0, 4).map((item, i) => {
                const skin = cardSkins[i % cardSkins.length]
                if ('commentary' in item) {
                  const date = item.published_at ? new Date(item.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                  return <NewsCard key={`l-s-${i}`} href={`/coverage/${item.id}`} category={skin.category} headline={item.source_title} excerpt={item.commentary || ''} date={date} tint={skin.tint} bgPos={['center top', 'left center', 'right center', 'center bottom'][i % 4]} />
                }
                const slug = item.gov_url ? item.gov_url.split('/').filter(Boolean).pop() : null
                const date = item.published_at ? new Date(item.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                return <NewsCard key={`l-p-${i}`} href={slug ? `/news/${slug}` : '#'} category={skin.category} headline={item.title} excerpt={item.description || ''} date={date} tint={skin.tint} bgPos={['center top', 'left center', 'right center', 'center bottom'][i % 4]} />
              })}
            </div>

            <aside>
              <article>
                <ColKicker color={C.green}>Today&apos;s Editorial</ColKicker>
                <h3
                  className="pc-serif"
                  style={{
                    fontFamily: 'var(--pc-serif), Georgia, serif',
                    fontSize: 'clamp(24px, 2.4vw, 32px)',
                    fontWeight: 700,
                    lineHeight: 1.15,
                    letterSpacing: '-0.012em',
                    margin: '0.75rem 0 1.25rem',
                    color: C.ink,
                  }}
                >
                  {editorialPick?.source_title || 'A nation of experts in everything and accountable for nothing.'}
                </h3>
                <p className="pc-italic" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontStyle: 'italic', fontSize: '14px', lineHeight: 1.65, color: C.ink, margin: '0 0 1.25rem' }}>
                  {editorialPick?.commentary?.slice(0, 240) || 'Another day, another announcement, another “in due course”, another promise waiting quietly for its funeral.'}
                </p>
                <div style={{ background: '#EAE3D2', border: `1px solid ${C.rule}`, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px', marginBottom: '1rem' }}>
                  <CabinetIllustration />
                </div>
                <Link href={editorialPick ? `/coverage/${editorialPick.id}` : '/coverage'} className="pc-link" style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.green, fontWeight: 700, borderBottom: `2px solid ${C.gold}`, paddingBottom: '2px' }}>
                  Read editorial →
                </Link>
              </article>
            </aside>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: C.ink, color: '#fff', borderTop: `4px solid ${C.gold}`, marginTop: '2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <div className="pc-foot-main" style={{ marginBottom: '3rem' }}>

            {/* LEFT — lion + signup */}
            <div>
              <LionEngraving />
              <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.012em', marginTop: '1rem', color: '#fff' }}>
                The People&apos;s Chamber
              </div>
              <p style={{ fontSize: '13px', color: C.inkMuted, lineHeight: 1.6, margin: '0.5rem 0 1.5rem' }}>
                A modern public chamber for a modern democracy. Built from official sources. Edited with raised eyebrows.
              </p>
              <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Stay informed. Stay powerful.
              </div>
              <p style={{ fontSize: '12px', color: C.inkMuted, lineHeight: 1.5, margin: '0 0 1rem' }}>
                Saturday mornings: the week&apos;s biggest contracts, donations, and revolving-door moves.
              </p>
              <NewsletterForm />
            </div>

            {/* RIGHT — Join the Chamber callout */}
            <div style={{ background: C.inkPanel, border: `1px solid ${C.gold}66`, padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, fontWeight: 700, marginBottom: '0.85rem' }}>
                  ◆ Join the Chamber
                </div>
                <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '22px', fontWeight: 800, lineHeight: 1.15, color: '#fff', marginBottom: '1rem' }}>
                  Be part of the public&apos;s response to power.
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <BulletItem>Vote on every UK Parliament bill</BulletItem>
                  <BulletItem>Track contracts, donations & revolving doors</BulletItem>
                  <BulletItem>Join the public record</BulletItem>
                </ul>
              </div>
              <Link
                href="/about#join"
                style={{ background: C.green, color: '#fff', textAlign: 'center', padding: '12px 22px', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none', marginTop: '1.5rem', display: 'inline-block' }}
              >
                Sign up — free →
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: `1px solid #2a2f33`, fontSize: '11px', color: C.inkMuted, flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>© {new Date().getFullYear()} The People&apos;s Chamber · Public-record reporting</div>
            <div style={{ letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600 }}>peopleschamber.uk</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ───────── HELPERS ───────── */

function HeroStat({ value, label, sub, tint }: { value: string; label: string; sub?: string; tint: string }) {
  return (
    <div style={{ borderTop: `2px solid ${tint}`, paddingTop: '0.85rem' }}>
      <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: 'clamp(28px, 3.4vw, 42px)', fontWeight: 800, color: tint, lineHeight: 0.95, letterSpacing: '-0.022em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.inkMuted, marginTop: '6px', fontWeight: 600 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '10px', color: C.inkMuted, marginTop: '3px', fontStyle: 'italic' }}>{sub}</div>}
    </div>
  )
}

function ColKicker({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color, fontWeight: 700, marginBottom: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span aria-hidden="true" style={{ width: '20px', height: '2px', background: color, display: 'inline-block' }} />
      {children}
    </div>
  )
}

function SectionHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ width: '32px', height: '3px', background: C.red, display: 'inline-block' }} />
        <span style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.ink, fontWeight: 700 }}>
          {label}
        </span>
      </div>
      {right}
    </div>
  )
}

function DeskLine({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="pc-link" style={{ display: 'block', borderTop: `1px solid ${C.rule}`, paddingTop: '0.85rem', marginTop: '0.85rem' }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, marginBottom: '4px' }}>
        {label}
      </div>
      <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '18px', fontWeight: 700, lineHeight: 1.15, color: C.ink, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sub}
      </div>
    </Link>
  )
}

function CircleStat({ icon, value, label, tint }: { icon: React.ReactNode; value: string; label: string; tint: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.rule}`, padding: '1.25rem 1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(29, 34, 38, 0.04)' }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: tint + '14', color: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', border: `1px solid ${tint}33` }} aria-hidden="true">
        {icon}
      </div>
      <div className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: 'clamp(22px, 2.4vw, 28px)', fontWeight: 800, color: C.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, marginTop: '0.6rem' }}>
        {label}
      </div>
    </div>
  )
}

function ExploreCard() {
  return (
    <Link href="/transparency" className="pc-link" style={{ background: C.ink, color: '#fff', padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}>
      <div style={{ height: '32px', position: 'relative', marginBottom: '0.5rem' }}>
        <Sparkline color={C.gold} />
      </div>
      <div style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1.3 }}>
        Explore the full dashboard
      </div>
      <div style={{ fontSize: '11px', color: C.gold, marginTop: '0.5rem' }}>→</div>
    </Link>
  )
}

function NewsCard({ href, category, headline, excerpt, date, tint, bgPos }: { href: string; category: string; headline: string; excerpt: string; date: string; tint: string; bgPos: string }) {
  return (
    <Link href={href} className="pc-link" style={{ display: 'block', background: '#fff', border: `1px solid ${C.rule}` }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '5 / 3',
          backgroundImage: `linear-gradient(${tint}, ${tint}), url('/hero-parliament.jpg')`,
          backgroundBlendMode: 'multiply',
          backgroundSize: 'cover',
          backgroundPosition: bgPos,
        }}
        aria-hidden="true"
      />
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.red, fontWeight: 700, marginBottom: '0.6rem' }}>
          {category}{date && ` · ${date}`}
        </div>
        <h4 className="pc-serif" style={{ fontFamily: 'var(--pc-serif), Georgia, serif', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.012em', lineHeight: 1.25, margin: '0 0 0.6rem', color: C.ink }}>
          {headline}
        </h4>
        {excerpt && (
          <p style={{ fontSize: '13px', lineHeight: 1.55, color: C.muted, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  )
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: '13px', color: '#cfc8b8', lineHeight: 1.55, paddingLeft: '1.25rem', position: 'relative' }}>
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '8px', width: '7px', height: '7px', background: C.gold, display: 'inline-block' }} />
      {children}
    </li>
  )
}

/* ───────── SVG GLYPHS ───────── */

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="8" r="5" /><path d="m12 12 4 4" strokeLinecap="round" />
    </svg>
  )
}
function TrendUp() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,15 8,9 12,13 18,5" /><polyline points="14,5 18,5 18,9" /></svg>) }
function DocIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 2h7l3 3v13H5z" /><path d="M12 2v3h3" /><path d="M7 10h6M7 13h6M7 7h3" /></svg>) }
function HouseIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9 10 3l7 6v8H3z" /><path d="M8 17v-5h4v5" /></svg>) }
function DoorIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8v14H6z" /><path d="M11 10h.01" /><path d="M2 17h16" /></svg>) }

function Donut({ pct, color }: { pct: number; color: string }) {
  const r = 32
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg viewBox="0 0 80 80" width="84" height="84" aria-label={`${pct}% government approval`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke={C.rule} strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" fontFamily="var(--pc-serif), Georgia, serif" fontWeight="800" fontSize="20" fill={C.ink}>
        {pct}%
      </text>
    </svg>
  )
}

function Sparkline({ color }: { color: string }) {
  // Stylized falling line — placeholder for real time-series later.
  const points = '0,28 14,22 28,24 42,18 56,20 70,12 84,15 98,8 112,10 126,5 140,7 154,2'
  return (
    <svg viewBox="0 0 154 32" width="100%" height="100%" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="154" cy="2" r="2.5" fill={color} />
    </svg>
  )
}

function CabinetIllustration() {
  return (
    <svg viewBox="0 0 320 180" width="100%" style={{ maxWidth: '300px', display: 'block' }} role="img" aria-label="Editorial illustration of a cabinet meeting">
      <g fill="#1F2428" stroke="#1F2428" strokeWidth="1">
        <g opacity="0.18">
          <rect x="20" y="40" width="14" height="60" />
          <rect x="34" y="50" width="40" height="50" />
          <rect x="74" y="35" width="10" height="65" />
          <rect x="84" y="55" width="50" height="45" />
          <rect x="220" y="45" width="14" height="55" />
          <rect x="234" y="55" width="60" height="45" />
          <line x1="20" y1="100" x2="300" y2="100" stroke="#1F2428" />
        </g>
      </g>
      <ellipse cx="160" cy="135" rx="110" ry="22" fill="#5C5C58" opacity="0.25" />
      <ellipse cx="160" cy="130" rx="110" ry="20" fill="#3F3A30" />
      {[40, 80, 120, 160, 200, 240, 280].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={i % 2 === 0 ? 95 : 100} r="9" fill="#1F2428" />
          <path d={`M${x-14},${i % 2 === 0 ? 130 : 135} q14,-22 28,0 z`} fill="#1F2428" />
          <path d={`M${x-1},${i % 2 === 0 ? 110 : 115} l2,15 l-2,5 l-2,-5 z`} fill={i % 3 === 0 ? '#B02A2A' : '#C8A76A'} />
        </g>
      ))}
      <g>
        <path d="M178 28 q0 -16 18 -16 h60 q18 0 18 16 v18 q0 16 -18 16 h-32 l-12 14 v-14 h-16 q-18 0 -18 -16 z" fill="#fff" stroke="#1F2428" strokeWidth="1.4" />
        <text x="186" y="40" fontFamily="Georgia, serif" fontStyle="italic" fontSize="13" fill="#1F2428">Order!</text>
        <text x="186" y="55" fontFamily="Georgia, serif" fontStyle="italic" fontSize="13" fill="#1F2428">Order!</text>
      </g>
    </svg>
  )
}

function LionEngraving() {
  return (
    <svg viewBox="0 0 220 130" width="160" height="auto" role="img" aria-label="Heraldic lion engraving">
      <g fill="none" stroke={C.gold} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 96 q0 -12 14 -16 q-2 -10 6 -16 q-4 -10 4 -14 q6 -2 10 4 q4 -8 14 -8 q12 0 16 10 q12 -2 18 6 q22 4 30 18 q14 4 18 16 q4 10 -2 18 q-6 6 -16 6 q-2 6 -10 6 q-6 0 -10 -4 q-12 6 -28 6 q-14 0 -22 -4 q-6 4 -16 4 q-12 0 -18 -8 q-8 -2 -8 -14 z" />
        <path d="M44 80 q4 -4 8 0 m-2 -8 q4 -4 8 0 m-4 -8 q4 -4 8 0 m-2 -10 q4 -4 8 0 m4 -6 q4 -4 8 0" opacity="0.7" />
        <circle cx="74" cy="62" r="1.4" fill={C.gold} stroke="none" />
        <path d="M82 70 q3 -2 6 0" />
        <path d="M192 92 q14 -4 18 -16 q4 -10 -2 -16" />
        <line x1="20" y1="110" x2="200" y2="110" />
        <circle cx="100" cy="38" r="1.6" fill={C.gold} stroke="none" />
        <circle cx="110" cy="32" r="1.6" fill={C.gold} stroke="none" />
        <circle cx="120" cy="38" r="1.6" fill={C.gold} stroke="none" />
      </g>
    </svg>
  )
}
