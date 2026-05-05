import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

const BG = '#1a1a1a'
const PANEL = '#111111'
const BORDER = '#333333'
const RULE = '#262626'
const MUTED = '#9a9a9a'

const SERIF = '"Georgia", "Charter", "Times New Roman", serif'
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif'

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
  ])

  const leadStory = news?.[0]
  const otherStories = news?.slice(1, 5) || []
  const topContract = topContractRows?.[0]
  const topDonation = topDonationRows?.[0]

  const contractValue = topContract?.value ? Number(topContract.value) : 0
  const donationValue = topDonation?.amount ? Number(topDonation.amount) : 0
  const scandal: { kind: 'contract' | 'donation' | null; value: number; line1: string; line2: string; href: string } =
    contractValue >= donationValue && topContract
      ? { kind: 'contract', value: contractValue, line1: topContract.title || 'Untitled contract', line2: 'Awarded to ' + (topContract.supplier || 'undisclosed supplier'), href: '/transparency/contracts' }
      : topDonation
        ? { kind: 'donation', value: donationValue, line1: topDonation.donor_name || 'Anonymous donor', line2: 'Paid to ' + (topDonation.recipient_name || 'undisclosed recipient'), href: '/transparency/donations' }
        : { kind: null, value: 0, line1: '', line2: '', href: '/transparency' }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: SANS }}>
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
            The People&apos;s Chamber · Receipts Department
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(38px, 5.5vw, 60px)', fontWeight: 700, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.015em', lineHeight: 1.05 }}>
            Watching Westminster.<br />So you don&apos;t have to.
          </h1>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', color: '#fff', margin: '0 auto 1.75rem', maxWidth: '680px', lineHeight: 1.5, opacity: 0.92 }}>
            Bills they hoped you&apos;d ignore. Cash they hoped you wouldn&apos;t see. Contracts to mates. Doors revolving fast enough to power the Grid. The receipts are inside.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/transparency" style={{ background: '#fff', color: '#000', padding: '11px 22px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              See the Damage
            </Link>
            <Link href="/bills" style={{ background: 'transparent', color: '#fff', padding: '11px 22px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid #fff' }}>
              Vote Anyway
            </Link>
          </div>
        </div>
      </section>

      {/* SCANDAL OF THE WEEK */}
      {scandal.kind && (
        <section style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '1.75rem', alignItems: 'center' }}>
            <div style={{ borderRight: `1px solid ${BORDER}`, paddingRight: '1.5rem' }}>
              <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85 }}>Scandal of the Week</div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '12px', color: MUTED, marginTop: '4px' }}>
                {scandal.kind === 'contract' ? 'Largest contract on record.' : 'Largest donation on record.'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: '4px' }}>{scandal.line1}</div>
              <div style={{ fontSize: '13px', color: '#fff' }}>{scandal.line2}. <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: MUTED }}>You weren&apos;t consulted.</span></div>
            </div>
            <Link href={scandal.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textDecoration: 'none', borderLeft: `1px solid ${BORDER}`, paddingLeft: '1.5rem' }}>
              <span style={{ fontFamily: SERIF, fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(scandal.value)}</span>
              <span style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px', opacity: 0.7 }}>read the file →</span>
            </Link>
          </div>
        </section>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* TODAY'S SPIN */}
            <section>
              <SectionHead label="Today's Spin" sub="Whatever the press office wants you to read." />
              {leadStory && (
                <article style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 700, color: '#fff', lineHeight: 1.15, margin: '0 0 0.6rem', letterSpacing: '-0.01em' }}>{leadStory.title}</h2>
                  {leadStory.description && (
                    <p style={{ fontSize: '14px', color: '#fff', lineHeight: 1.6, margin: '0 0 0.6rem', opacity: 0.92 }}>{leadStory.description}</p>
                  )}
                  <div style={{ fontSize: '11px', color: MUTED, letterSpacing: '0.05em' }}>
                    Filed by <span style={{ color: '#fff' }}>{leadStory.organisation}</span>
                    {leadStory.published_at ? ` · ${new Date(leadStory.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    <span style={{ fontFamily: SERIF, fontStyle: 'italic' }}> — read it here so they can&apos;t pretend they didn&apos;t say it.</span>
                  </div>
                </article>
              )}
              {otherStories.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', borderTop: `1px solid ${RULE}`, paddingTop: '1.25rem' }}>
                  {otherStories.map((story, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>{story.organisation}</div>
                      <div style={{ fontFamily: SERIF, fontSize: '15px', color: '#fff', lineHeight: 1.35 }}>{story.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CONTRACTS */}
            <section>
              <SectionHead
                label="Contracts handed out (to their mates)"
                sub={contractCount ? `${contractCount.toLocaleString()} on file. Bring your own envelope.` : 'Bring your own envelope.'}
              />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {contracts?.map((c, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/contracts" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', textDecoration: 'none', padding: '0.85rem 0', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontFamily: SERIF, fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>To <span style={{ color: '#fff' }}>{c.supplier || 'undisclosed'}</span></div>
                      </div>
                      <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(c.value)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* DONATIONS */}
            <section>
              <SectionHead
                label="Who owns your MP"
                sub={donationCount ? `${donationCount.toLocaleString()} payments declared. The rest, who knows.` : 'The rest, who knows.'}
              />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {donations?.map((d, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/donations" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', textDecoration: 'none', padding: '0.85rem 0', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontFamily: SERIF, fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{d.donor_name}</div>
                        <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>→ <span style={{ color: '#fff' }}>{d.recipient_name}</span></div>
                      </div>
                      <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(d.amount)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* RIGHT */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* PUBLIC vs PARLIAMENT */}
            <section>
              <SectionHead label="Public vs Parliament" sub="Where they sold you out this week." compact />
              {bills?.map((bill) => {
                const yes = bill.vote_count_yes || 0
                const no = bill.vote_count_no || 0
                const abs = bill.vote_count_abstain || 0
                const total = yes + no + abs
                const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0
                const noPct = total > 0 ? Math.round((no / total) * 100) : 0
                const verdict = yesPct >= 60 ? 'Public says yes.' : noPct >= 60 ? 'Public says no.' : 'Public is split. As per usual.'
                return (
                  <Link href={`/bills/${bill.id}`} key={bill.id} style={{ display: 'block', marginBottom: '1.1rem', textDecoration: 'none' }}>
                    <div style={{ fontFamily: SERIF, fontSize: '14px', color: '#fff', lineHeight: 1.3, marginBottom: '6px' }}>{bill.title}</div>
                    <div style={{ height: '3px', background: RULE, display: 'flex', marginBottom: '5px' }}>
                      {yesPct > 0 && <div style={{ height: '100%', width: `${yesPct}%`, background: '#fff' }} />}
                      {noPct > 0 && <div style={{ height: '100%', width: `${noPct}%`, background: '#666' }} />}
                    </div>
                    <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                      {verdict} <span style={{ color: MUTED, fontWeight: 400, textTransform: 'none', fontFamily: SERIF, fontStyle: 'italic' }}>· {total.toLocaleString()} votes</span>
                    </div>
                  </Link>
                )
              })}
            </section>

            {/* REVOLVING DOOR */}
            <section>
              <SectionHead label="The Revolving Door of Shame" sub={revolvingCount ? `${revolvingCount.toLocaleString()} round-trips logged.` : 'Spinning since forever.'} compact />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {revolving?.map((r, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
                    <Link href="/transparency/revolving-door" style={{ display: 'block', textDecoration: 'none', padding: '0.7rem 0' }}>
                      <div style={{ fontFamily: SERIF, fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>{r.person_name}</div>
                      <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>{r.previous_role}{r.organisation ? ` → ${r.organisation}` : ''}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* BROKEN PROMISES COUNTER */}
            <section>
              <SectionHead label="Broken Promises Counter" sub="Updated daily. Could be hourly." compact />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: BORDER, border: `1px solid ${BORDER}` }}>
                <Counter big="3,884" label="Bills introduced" hint="Not all read." />
                <Counter big="650" label="MPs in the room" hint="Varying attendance." />
                <Counter big={(contractCount || 0).toLocaleString()} label="Contracts on file" hint="Some to friends." />
                <Counter big={(donationCount || 0).toLocaleString()} label="Donations logged" hint="More off the books." />
              </div>
            </section>
          </aside>
        </div>

        {/* CTA STRIP */}
        <section style={{ marginTop: '3rem', background: PANEL, border: `1px solid ${BORDER}`, padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.85 }}>If you don&apos;t watch them</div>
            <div style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>nobody else is going to.</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: MUTED, marginTop: '6px' }}>Cast a public vote on every bill. Pin a name to every contract. Track every door that revolves.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/bills" style={{ background: '#fff', color: '#000', padding: '11px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none' }}>Vote on Bills</Link>
            <Link href="/transparency" style={{ background: 'transparent', color: '#fff', padding: '11px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid #fff' }}>The Receipts</Link>
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
      {sub && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '12px', color: MUTED, marginTop: '4px' }}>{sub}</div>}
    </header>
  )
}

function Counter({ big, label, hint }: { big: string; label: string; hint?: string }) {
  return (
    <div style={{ background: BG, padding: '14px 16px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{big}</div>
      <div style={{ fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '6px', fontWeight: 600 }}>{label}</div>
      {hint && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '11px', color: MUTED, marginTop: '3px' }}>{hint}</div>}
    </div>
  )
}
