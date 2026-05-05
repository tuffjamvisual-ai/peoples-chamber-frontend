import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

const BG = '#1a1a1a'
const PANEL = '#111111'
const BORDER = '#333333'
const RULE = '#262626'
const MUTED = '#9a9a9a'

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
    { data: contracts },
    { data: donations },
    { data: revolving },
    { data: topContractRows },
    { data: topDonationRows },
    { count: contractCount },
    { count: donationCount },
    { count: revolvingCount },
    { data: topExpenseRows },
  ] = await Promise.all([
    supabase.from('press_releases').select('title, description, organisation, published_at, gov_url').order('published_at', { ascending: false }).limit(5),
    supabase.from('bill').select('id, title, vote_count_yes, vote_count_no, vote_count_abstain').order('vote_count_yes', { ascending: false }).limit(3),
    supabase.from('government_contracts').select('title, supplier, value').order('id', { ascending: false }).limit(3),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').order('id', { ascending: false }).limit(3),
    supabase.from('revolving_door').select('person_name, previous_role, organisation').order('id', { ascending: false }).limit(3),
    supabase.from('government_contracts').select('title, supplier, value').not('value', 'is', null).order('value', { ascending: false }).limit(1),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').not('amount', 'is', null).order('amount', { ascending: false }).limit(1),
    supabase.from('government_contracts').select('id', { count: 'exact', head: true }),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }),
    supabase.from('revolving_door').select('id', { count: 'exact', head: true }),
    supabase.from('mp_expenses_summary').select('member_id, total_spend').eq('year', '24_25').order('total_spend', { ascending: false, nullsFirst: false }).limit(10),
  ])

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

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: FONT }}>
      <Navigation />

      {/* HERO */}
      <section style={{
        width: '100%',
        minHeight: '380px',
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.88) 100%), url('https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: '880px', width: '100%' }}>
          <div style={{ fontSize: '11px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.25rem', opacity: 0.85 }}>
            The People&apos;s Chamber · Public Transparency
          </div>
          <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 60px)', fontWeight: 700, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.015em', lineHeight: 1.05 }}>
            UK Government.<br />In public view.
          </h1>
          <p style={{ fontSize: '17px', color: '#fff', margin: '0 auto 1.75rem', maxWidth: '680px', lineHeight: 1.55, opacity: 0.92 }}>
            Track every bill, MP, contract and donation across UK Government. Add your vote to the public record — it doesn&apos;t unmake the law, but at least someone counted.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/transparency" style={{ background: '#fff', color: '#000', padding: '11px 22px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Explore Records
            </Link>
            <Link href="/bills" style={{ background: 'transparent', color: '#fff', padding: '11px 22px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid #fff' }}>
              Vote on Bills
            </Link>
          </div>
        </div>
      </section>

      {/* NOTABLE TRANSACTION */}
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

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

        {/* BIG SPENDERS — top-3 teaser linking to /expenses */}
        {topSpenders.length > 0 && (
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1.5rem', alignItems: 'baseline', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85, marginBottom: '6px' }}>
                  The Big Spenders · 2024 / 2025
                </div>
                <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.15, margin: 0 }}>
                  Who&apos;s spending your money?
                </h2>
                <p style={{ fontStyle: 'italic', fontSize: '14px', color: MUTED, marginTop: '6px', lineHeight: 1.55, maxWidth: '640px' }}>
                  The ten MPs with the biggest business-cost claims this year. Mostly the ones whose constituencies are furthest from Westminster — make of that what you will.
                </p>
              </div>
              <Link href="/expenses" style={{ background: '#fff', color: '#000', padding: '11px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                See top 10 →
              </Link>
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${BORDER}` }}>
              {topSpenders.map((s, i) => (
                <li
                  key={s.member_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px minmax(0, 1.4fr) minmax(0, 2fr) auto',
                    gap: '1.25rem',
                    alignItems: 'baseline',
                    padding: '0.85rem 0',
                    borderBottom: i < topSpenders.length - 1 ? `1px solid ${RULE}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '14px', color: MUTED, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <Link
                    href={`/mps/${s.member_id}`}
                    style={{ fontSize: '15px', color: '#fff', textDecoration: 'none', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {s.name}
                  </Link>
                  <span style={{ fontSize: '13px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.constituency}</span>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtMoney(s.total_spend)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* PRESS RELEASES */}
            <section>
              <SectionHead label="Latest Press Releases" sub="This week's official line, straight from the press offices." />
              {leadStory && (
                <article style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#fff', lineHeight: 1.15, margin: '0 0 0.6rem', letterSpacing: '-0.01em' }}>{leadStory.title}</h2>
                  {leadStory.description && (
                    <p style={{ fontSize: '14px', color: '#fff', lineHeight: 1.6, margin: '0 0 0.6rem', opacity: 0.92 }}>{leadStory.description}</p>
                  )}
                  <div style={{ fontSize: '11px', color: MUTED, letterSpacing: '0.05em' }}>
                    <span style={{ color: '#fff' }}>{leadStory.organisation}</span>
                    {leadStory.published_at ? ` · ${new Date(leadStory.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </div>
                </article>
              )}
              {otherStories.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', borderTop: `1px solid ${RULE}`, paddingTop: '1.25rem' }}>
                  {otherStories.map((story, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>{story.organisation}</div>
                      <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.35 }}>{story.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CONTRACTS */}
            <section>
              <SectionHead
                label="Recent Government Contracts"
                sub={contractCount ? `${contractCount.toLocaleString()} on file. And counting.` : 'And counting.'}
              />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {contracts?.map((c, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/contracts" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', textDecoration: 'none', padding: '0.85rem 0', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>Awarded to <span style={{ color: '#fff' }}>{c.supplier || 'undisclosed'}</span></div>
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(c.value)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* DONATIONS */}
            <section>
              <SectionHead
                label="Recent Political Donations"
                sub={donationCount ? `${donationCount.toLocaleString()} declared. So far.` : 'So far.'}
              />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {donations?.map((d, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/donations" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', textDecoration: 'none', padding: '0.85rem 0', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{d.donor_name}</div>
                        <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>To <span style={{ color: '#fff' }}>{d.recipient_name}</span></div>
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(d.amount)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* RIGHT */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* PUBLIC BILL VOTES */}
            <section>
              <SectionHead label="Public Bill Votes" sub="Live tally of public votes. Parliament's may differ." compact />
              {bills?.map((bill) => {
                const yes = bill.vote_count_yes || 0
                const no = bill.vote_count_no || 0
                const abs = bill.vote_count_abstain || 0
                const total = yes + no + abs
                const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0
                const noPct = total > 0 ? Math.round((no / total) * 100) : 0
                return (
                  <Link href={`/bills/${bill.id}`} key={bill.id} style={{ display: 'block', marginBottom: '1.1rem', textDecoration: 'none' }}>
                    <div style={{ fontSize: '14px', color: '#fff', lineHeight: 1.3, marginBottom: '6px' }}>{bill.title}</div>
                    <div style={{ height: '3px', background: RULE, display: 'flex', marginBottom: '5px' }}>
                      {yesPct > 0 && <div style={{ height: '100%', width: `${yesPct}%`, background: '#fff' }} />}
                      {noPct > 0 && <div style={{ height: '100%', width: `${noPct}%`, background: '#666' }} />}
                    </div>
                    <div style={{ fontSize: '11px', color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                      {yesPct}% support · {total.toLocaleString()} votes
                    </div>
                  </Link>
                )
              })}
            </section>

            {/* REVOLVING DOOR */}
            <section>
              <SectionHead label="Revolving Door" sub={revolvingCount ? `${revolvingCount.toLocaleString()} moves between Whitehall and the private sector. Some quicker than others.` : 'Some quicker than others.'} compact />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {revolving?.map((r, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/revolving-door" style={{ display: 'block', textDecoration: 'none', padding: '0.7rem 0' }}>
                      <div style={{ fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>{r.person_name}</div>
                      <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>{r.previous_role}{r.organisation ? ` → ${r.organisation}` : ''}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* DATABASE TOTALS */}
            <section>
              <SectionHead label="Database Totals" sub="Refreshed daily. Growing weekly." compact />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: BORDER, border: `1px solid ${BORDER}` }}>
                <Counter big="3,884" label="Bills tracked" />
                <Counter big="650" label="Sitting MPs" />
                <Counter big={(contractCount || 0).toLocaleString()} label="Contracts" />
                <Counter big={(donationCount || 0).toLocaleString()} label="Donations" />
              </div>
            </section>
          </aside>
        </div>

        {/* CTA STRIP */}
        <section style={{ marginTop: '3rem', background: PANEL, border: `1px solid ${BORDER}`, padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.85 }}>Take part</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Add your voice to the public record.</div>
            <div style={{ fontSize: '14px', color: MUTED, marginTop: '6px', lineHeight: 1.5 }}>Vote on bills, browse contracts, and keep an eye on who&apos;s coming and going through the Westminster door. We track it. You decide what to make of it.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/bills" style={{ background: '#fff', color: '#000', padding: '11px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none' }}>Vote on Bills</Link>
            <Link href="/transparency" style={{ background: 'transparent', color: '#fff', padding: '11px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid #fff' }}>Transparency Records</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHead({ label, sub, compact = false }: { label: string; sub?: string; compact?: boolean }) {
  return (
    <header style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: compact ? '8px' : '10px', marginBottom: compact ? '0.85rem' : '1.1rem' }}>
      <div style={{ fontSize: compact ? '10px' : '11px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontStyle: 'italic', fontSize: '12px', color: MUTED, marginTop: '4px' }}>{sub}</div>}
    </header>
  )
}

function Counter({ big, label }: { big: string; label: string }) {
  return (
    <div style={{ background: BG, padding: '14px 16px' }}>
      <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{big}</div>
      <div style={{ fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '6px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
