import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

const ACCENT = '#ffffff'
const BG = '#1a1a1a'
const PANEL = '#111111'
const BORDER = '#333333'
const MUTED = '#cccccc'

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'undisclosed'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 'undisclosed'
  if (n >= 1_000_000_000) return '£' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'bn'
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'k'
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
    supabase.from('government_contracts').select('title, supplier, value').order('id', { ascending: false }).limit(4),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').order('id', { ascending: false }).limit(4),
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
    <div style={{ minHeight: '100vh', background: BG, color: '#ffffff' }}>
      <Navigation />

      {/* HERO */}
      <section style={{
        width: '100%',
        minHeight: '420px',
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.92) 100%), url('https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: '960px', width: '100%' }}>
          <div style={{ display: 'inline-block', background: ACCENT, color: '#000', padding: '4px 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            The People&apos;s Chamber · Receipts Department
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 900, color: '#ffffff', margin: '0 0 1rem', letterSpacing: '-0.02em', lineHeight: 1.02, textTransform: 'uppercase' }}>
            Watching Westminster.<br />So you don&apos;t have to.
          </h1>
          <p style={{ fontSize: '17px', color: '#ffffff', margin: '0 auto 1.75rem', maxWidth: '720px', lineHeight: 1.5 }}>
            Bills they hoped you&apos;d ignore. Cash they hoped you wouldn&apos;t see. Contracts handed to mates. Doors revolving fast enough to power the National Grid. <strong style={{ color: '#ffffff' }}>Receipts inside.</strong>
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/transparency" style={{ background: ACCENT, color: '#000', padding: '12px 24px', fontSize: '12px', fontWeight: 800, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              See the Damage →
            </Link>
            <Link href="/bills" style={{ background: 'transparent', color: '#ffffff', padding: '12px 24px', fontSize: '12px', fontWeight: 800, textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: `1px solid ${ACCENT}` }}>
              Vote Anyway
            </Link>
          </div>
        </div>
      </section>

      {/* SCANDAL OF THE WEEK */}
      {scandal.kind && (
        <section style={{ background: PANEL, color: '#ffffff', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', borderRight: `1px solid ${BORDER}`, paddingRight: '1.5rem', color: '#ffffff' }}>
              Scandal<br />of the<br />Week
            </div>
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ffffff', opacity: 0.85, marginBottom: '4px' }}>
                {scandal.kind === 'contract' ? 'Largest contract on record' : 'Largest donation on record'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2, marginBottom: '2px', color: '#ffffff' }}>{scandal.line1}</div>
              <div style={{ fontSize: '13px', color: '#ffffff' }}>{scandal.line2} · <em>but you weren&apos;t consulted.</em></div>
            </div>
            <Link href={scandal.href} style={{ background: BG, color: '#ffffff', padding: '10px 16px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1, border: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '24px' }}>{fmtMoney(scandal.value)}</span>
              <span style={{ color: '#ffffff', opacity: 0.7, fontSize: '10px', marginTop: '2px' }}>see file →</span>
            </Link>
          </div>
        </section>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1px', background: BORDER }}>

          {/* LEFT */}
          <div style={{ background: BG, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* TODAY'S SPIN */}
            <div>
              <SectionHead label="Today's Spin" sub="Whatever the press office wants you to read." />
              {leadStory && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'inline-block', background: ACCENT, color: '#000', padding: '2px 8px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Spin Cycle · Top of the bin</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, marginBottom: '0.5rem' }}>{leadStory.title}</div>
                  {leadStory.description && (
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.6, marginBottom: '0.5rem' }}>{leadStory.description}</div>
                  )}
                  <div style={{ fontSize: '11px', color: MUTED }}>
                    Filed by <strong style={{ color: '#ffffff' }}>{leadStory.organisation}</strong>
                    {leadStory.published_at ? ` · ${new Date(leadStory.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    {' · '}<em>read it here so they can&apos;t pretend they didn&apos;t say it.</em>
                  </div>
                </div>
              )}

              {otherStories.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {otherStories.map((story, i) => (
                    <div key={i} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: '0.75rem' }}>
                      <div style={{ fontSize: '9px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>{story.organisation}</div>
                      <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3 }}>{story.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CONTRACTS — handed out (to their mates) */}
            <div>
              <SectionHead label="Contracts handed out (to their mates)" sub={contractCount ? `${contractCount.toLocaleString()} on file. Bring your own envelope.` : 'Bring your own envelope.'} />
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {contracts?.map((c, i) => (
                  <Link href="/transparency/contracts" key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', textDecoration: 'none', padding: '0.75rem 1rem', background: PANEL, borderLeft: `3px solid ${BORDER}`, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3, fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>To <strong style={{ color: '#ffffff' }}>{c.supplier || 'undisclosed'}</strong></div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtMoney(c.value)}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* DONATIONS — Who Owns Your MP */}
            <div>
              <SectionHead label="Who owns your MP" sub={donationCount ? `${donationCount.toLocaleString()} payments declared. The rest, who knows.` : 'The rest, who knows.'} />
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {donations?.map((d, i) => (
                  <Link href="/transparency/donations" key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', textDecoration: 'none', padding: '0.75rem 1rem', background: PANEL, borderLeft: `3px solid ${BORDER}`, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3, fontWeight: 600 }}>{d.donor_name}</div>
                      <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>→ <strong style={{ color: '#ffffff' }}>{d.recipient_name}</strong></div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtMoney(d.amount)}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ background: PANEL, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* PUBLIC vs PARLIAMENT */}
            <div>
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
                  <Link href={`/bills/${bill.id}`} key={bill.id} style={{ display: 'block', marginBottom: '1rem', textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3, marginBottom: '4px', fontWeight: 600 }}>{bill.title}</div>
                    <div style={{ height: '4px', background: BORDER, display: 'flex', marginBottom: '4px' }}>
                      {yesPct > 0 && <div style={{ height: '100%', width: `${yesPct}%`, background: '#ffffff' }}></div>}
                      {noPct > 0 && <div style={{ height: '100%', width: `${noPct}%`, background: '#666666' }}></div>}
                    </div>
                    <div style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{verdict} <span style={{ color: MUTED, fontWeight: 400 }}>· {total.toLocaleString()} votes</span></div>
                  </Link>
                )
              })}
            </div>

            {/* REVOLVING DOOR OF SHAME */}
            <div>
              <SectionHead label="The Revolving Door of Shame" sub={revolvingCount ? `${revolvingCount.toLocaleString()} round-trips logged.` : 'Spinning since forever.'} compact />
              {revolving?.map((r, i) => (
                <Link href="/transparency/revolving-door" key={i} style={{ display: 'block', marginBottom: '0.75rem', textDecoration: 'none', borderLeft: `2px solid ${BORDER}`, paddingLeft: '0.75rem' }}>
                  <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3, fontWeight: 600 }}>{r.person_name}</div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>{r.previous_role}{r.organisation ? ` → ${r.organisation}` : ''}</div>
                </Link>
              ))}
            </div>

            {/* BROKEN PROMISES COUNTER */}
            <div style={{ marginTop: 'auto' }}>
              <SectionHead label="Broken Promises Counter" sub="Updated daily. Could be hourly." compact />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <Counter big="3,884" label="Bills introduced" hint="not all read." />
                <Counter big="650" label="MPs in the room" hint="varying attendance." />
                <Counter big={(contractCount || 0).toLocaleString()} label="Contracts on file" hint="some to friends." />
                <Counter big={(donationCount || 0).toLocaleString()} label="Donations logged" hint="more off the books." />
              </div>
            </div>

          </div>
        </div>

        {/* CALL TO ACTION FOOTER STRIP */}
        <section style={{ marginTop: '2rem', background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${BORDER}`, padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#ffffff', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '6px' }}>If you don&apos;t watch them</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>nobody else is going to.</div>
            <div style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>Cast a public vote on every bill. Pin a name to every contract. Track every door that revolves.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/bills" style={{ background: ACCENT, color: '#000', padding: '10px 18px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none' }}>Vote on Bills</Link>
            <Link href="/transparency" style={{ background: 'transparent', color: '#ffffff', padding: '10px 18px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', border: `1px solid ${ACCENT}` }}>The Receipts</Link>
          </div>
        </section>

      </main>
    </div>
  )
}

function SectionHead({ label, sub, compact = false }: { label: string; sub?: string; compact?: boolean }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: compact ? '6px' : '8px', marginBottom: compact ? '0.75rem' : '1rem' }}>
      <div style={{ fontSize: compact ? '10px' : '11px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px', fontStyle: 'italic' }}>{sub}</div>}
    </div>
  )
}

function Counter({ big, label, hint }: { big: string; label: string; hint?: string }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, padding: '10px', background: BG }}>
      <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: '9px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px', fontWeight: 700 }}>{label}</div>
      {hint && <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px', fontStyle: 'italic' }}>{hint}</div>}
    </div>
  )
}
