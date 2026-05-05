import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

const BG = '#1a1a1a'
const INK = '#000000'
const PAPER = '#0d0d0d'
const PINK = '#ff2e93'
const YELLOW = '#ffd60a'
const CYAN = '#00b4ff'
const LIME = '#9bf00b'
const ORANGE = '#ff7a18'

const COMIC = '"Comic Sans MS", "Comic Neue", "Marker Felt", system-ui, sans-serif'
const IMPACT = '"Impact", "Bebas Neue", "Anton", "Oswald", "Arial Narrow", sans-serif'

const HALFTONE = 'radial-gradient(circle, rgba(255,255,255,0.10) 1.4px, transparent 1.6px)'
const HALFTONE_SIZE = '9px 9px'

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'undisclosed'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 'undisclosed'
  if (n >= 1_000_000_000) return '£' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'BN'
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'K'
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
    <div style={{ minHeight: '100vh', background: BG, color: '#fff' }}>
      <Navigation />

      {/* HERO — caricature billboard */}
      <section style={{
        position: 'relative',
        width: '100%',
        minHeight: '460px',
        backgroundImage: `linear-gradient(140deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.85) 100%), url('https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        borderBottom: `6px solid ${INK}`,
        overflow: 'hidden',
      }}>
        {/* halftone overlay */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: HALFTONE, backgroundSize: HALFTONE_SIZE, opacity: 0.5, pointerEvents: 'none' }} />
        {/* corner zaps */}
        <Burst label="POW!" colour={YELLOW} style={{ position: 'absolute', top: 24, left: 24, transform: 'rotate(-12deg)' }} />
        <Burst label="WHACK!" colour={PINK} style={{ position: 'absolute', bottom: 24, right: 24, transform: 'rotate(8deg)' }} />

        <div style={{ position: 'relative', maxWidth: '960px', width: '100%' }}>
          <div style={{ display: 'inline-block', background: YELLOW, color: '#000', padding: '6px 14px', fontFamily: COMIC, fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem', border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, transform: 'rotate(-2deg)' }}>
            The People&apos;s Chamber · Receipts Department
          </div>
          <h1 style={{
            fontFamily: IMPACT,
            fontSize: 'clamp(48px, 8vw, 88px)',
            fontWeight: 900,
            color: '#fff',
            margin: '0 0 1rem',
            letterSpacing: '0.01em',
            lineHeight: 0.95,
            textTransform: 'uppercase',
            textShadow: `4px 4px 0 ${INK}, -2px -2px 0 ${PINK}`,
            WebkitTextStroke: '1px #000',
          }}>
            Watching<br />Westminster<span style={{ color: YELLOW }}>!</span>
          </h1>
          <p style={{ fontFamily: COMIC, fontSize: '18px', color: '#fff', margin: '0 auto 1.75rem', maxWidth: '720px', lineHeight: 1.4, textShadow: `2px 2px 0 ${INK}` }}>
            Bills they hoped you&apos;d ignore. Cash they hoped you wouldn&apos;t see. Contracts to mates. Doors revolving fast enough to power the Grid. <strong>The receipts are inside.</strong>
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <CartoonButton href="/transparency" colour={PINK}>See the Damage →</CartoonButton>
            <CartoonButton href="/bills" colour={CYAN}>Vote Anyway!</CartoonButton>
          </div>
        </div>
      </section>

      {/* SCANDAL OF THE WEEK */}
      {scandal.kind && (
        <section style={{ background: INK, borderBottom: `6px solid ${YELLOW}`, padding: '2rem 1.5rem', backgroundImage: HALFTONE, backgroundSize: HALFTONE_SIZE }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', alignItems: 'center' }}>
            <Burst label={fmtMoney(scandal.value)} colour={YELLOW} size={170} fontSize={26} />
            <SpeechBubble tail="left" border={YELLOW} shadow={PINK}>
              <div style={{ fontFamily: COMIC, fontSize: '12px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px', fontWeight: 800 }}>
                Scandal of the Week · {scandal.kind === 'contract' ? 'Largest contract on record' : 'Largest donation on record'}
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '26px', color: '#fff', lineHeight: 1.05, marginBottom: '6px', textTransform: 'uppercase' }}>{scandal.line1}</div>
              <div style={{ fontFamily: COMIC, fontSize: '14px', color: '#fff', marginBottom: '10px' }}>{scandal.line2} — <em>and you weren&apos;t consulted.</em></div>
              <Link href={scandal.href} style={{ display: 'inline-block', background: YELLOW, color: '#000', padding: '8px 14px', fontFamily: COMIC, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, textDecoration: 'none' }}>
                See the file →
              </Link>
            </SpeechBubble>
          </div>
        </section>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

        {/* TODAY'S SPIN */}
        <ComicPanel title="Today's Spin" subtitle="Whatever the press office wants you to read." colour={CYAN} tilt={-1}>
          {leadStory && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', background: CYAN, color: '#fff', padding: '4px 10px', fontFamily: COMIC, fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, textShadow: `1px 1px 0 ${INK}` }}>
                Spin Cycle · Top of the Bin
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '32px', color: '#fff', lineHeight: 1.05, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{leadStory.title}</div>
              {leadStory.description && (
                <div style={{ fontFamily: COMIC, fontSize: '15px', color: '#fff', lineHeight: 1.55, marginBottom: '0.5rem' }}>{leadStory.description}</div>
              )}
              <div style={{ fontFamily: COMIC, fontSize: '12px', color: '#fff', opacity: 0.8 }}>
                Filed by <strong>{leadStory.organisation}</strong>
                {leadStory.published_at ? ` · ${new Date(leadStory.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
              </div>
            </div>
          )}

          {otherStories.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', borderTop: `3px dashed ${YELLOW}`, paddingTop: '1rem' }}>
              {otherStories.map((story, i) => (
                <div key={i} style={{ borderLeft: `4px solid ${YELLOW}`, paddingLeft: '0.75rem' }}>
                  <div style={{ fontFamily: COMIC, fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px', opacity: 0.8 }}>{story.organisation}</div>
                  <div style={{ fontFamily: COMIC, fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>{story.title}</div>
                </div>
              ))}
            </div>
          )}
        </ComicPanel>

        {/* THREE-PANEL COMIC STRIP — contracts / donations / revolving */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginTop: '3rem', alignItems: 'start' }}>
          <StripPanel title="Contracts to Mates" colour={ORANGE} tilt={-1.5} count={contractCount} sub="on file. Bring envelopes.">
            {contracts?.map((c, i) => (
              <Link href="/transparency/contracts" key={i} style={{ display: 'block', textDecoration: 'none', padding: '0.6rem 0', borderBottom: `2px dashed ${ORANGE}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', lineHeight: 1.25, flex: 1, fontWeight: 700 }}>{c.title}</div>
                  <div style={{ fontFamily: IMPACT, fontSize: '18px', color: YELLOW, whiteSpace: 'nowrap' }}>{fmtMoney(c.value)}</div>
                </div>
                <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', opacity: 0.75, marginTop: '2px' }}>To <strong>{c.supplier || 'undisclosed'}</strong></div>
              </Link>
            ))}
          </StripPanel>

          <StripPanel title="Who Owns Your MP" colour={PINK} tilt={1} count={donationCount} sub="payments declared. The rest, who knows.">
            {donations?.map((d, i) => (
              <Link href="/transparency/donations" key={i} style={{ display: 'block', textDecoration: 'none', padding: '0.6rem 0', borderBottom: `2px dashed ${PINK}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', lineHeight: 1.25, flex: 1, fontWeight: 700 }}>{d.donor_name}</div>
                  <div style={{ fontFamily: IMPACT, fontSize: '18px', color: YELLOW, whiteSpace: 'nowrap' }}>{fmtMoney(d.amount)}</div>
                </div>
                <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', opacity: 0.75, marginTop: '2px' }}>→ <strong>{d.recipient_name}</strong></div>
              </Link>
            ))}
          </StripPanel>

          <StripPanel title="Revolving Door of Shame" colour={LIME} tilt={-0.5} count={revolvingCount} sub="round-trips logged.">
            {revolving?.map((r, i) => (
              <Link href="/transparency/revolving-door" key={i} style={{ display: 'block', textDecoration: 'none', padding: '0.6rem 0', borderBottom: `2px dashed ${LIME}` }}>
                <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', lineHeight: 1.25, fontWeight: 700 }}>{r.person_name}</div>
                <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', opacity: 0.75, marginTop: '2px' }}>{r.previous_role}{r.organisation ? ` → ${r.organisation}` : ''}</div>
              </Link>
            ))}
          </StripPanel>
        </div>

        {/* PUBLIC vs PARLIAMENT — comic vs */}
        <ComicPanel title="Public vs Parliament" subtitle="Where they sold you out this week." colour={PINK} tilt={1.5} style={{ marginTop: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {bills?.map((bill) => {
              const yes = bill.vote_count_yes || 0
              const no = bill.vote_count_no || 0
              const abs = bill.vote_count_abstain || 0
              const total = yes + no + abs
              const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0
              const noPct = total > 0 ? Math.round((no / total) * 100) : 0
              const verdict = yesPct >= 60 ? 'PUBLIC SAYS YES!' : noPct >= 60 ? 'PUBLIC SAYS NO!' : 'PUBLIC IS SPLIT.'
              return (
                <Link href={`/bills/${bill.id}`} key={bill.id} style={{
                  display: 'block', textDecoration: 'none',
                  background: PAPER, border: `4px solid ${INK}`, padding: '1rem',
                  boxShadow: `5px 5px 0 ${PINK}`,
                }}>
                  <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', lineHeight: 1.3, marginBottom: '8px', fontWeight: 700 }}>{bill.title}</div>
                  <div style={{ height: '10px', background: '#222', display: 'flex', marginBottom: '6px', border: `2px solid ${INK}` }}>
                    {yesPct > 0 && <div style={{ height: '100%', width: `${yesPct}%`, background: LIME }}></div>}
                    {noPct > 0 && <div style={{ height: '100%', width: `${noPct}%`, background: PINK }}></div>}
                  </div>
                  <div style={{ fontFamily: IMPACT, fontSize: '15px', color: '#fff', letterSpacing: '0.05em' }}>
                    {verdict} <span style={{ fontFamily: COMIC, fontSize: '11px', opacity: 0.75 }}>· {total.toLocaleString()} votes</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </ComicPanel>

        {/* BROKEN PROMISES COUNTER — stamps */}
        <ComicPanel title="Broken Promises Counter" subtitle="Updated daily. Could be hourly." colour={YELLOW} tilt={-1} style={{ marginTop: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <Stamp big="3,884" label="Bills introduced" hint="not all read." colour={CYAN} />
            <Stamp big="650" label="MPs in the room" hint="varying attendance." colour={LIME} />
            <Stamp big={(contractCount || 0).toLocaleString()} label="Contracts on file" hint="some to friends." colour={ORANGE} />
            <Stamp big={(donationCount || 0).toLocaleString()} label="Donations logged" hint="more off the books." colour={PINK} />
          </div>
        </ComicPanel>

        {/* CTA STRIP */}
        <section style={{
          marginTop: '3rem', background: INK, padding: '1.75rem 2rem',
          border: `4px solid ${YELLOW}`, boxShadow: `8px 8px 0 ${PINK}`,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center',
          backgroundImage: HALFTONE, backgroundSize: HALFTONE_SIZE,
        }}>
          <div>
            <div style={{ fontFamily: COMIC, fontSize: '12px', color: YELLOW, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>If you don&apos;t watch them</div>
            <div style={{ fontFamily: IMPACT, fontSize: '36px', color: '#fff', letterSpacing: '0.01em', textTransform: 'uppercase', textShadow: `3px 3px 0 ${PINK}` }}>nobody else is going to.</div>
            <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', marginTop: '6px', opacity: 0.85 }}>Cast a public vote on every bill. Pin a name to every contract. Track every door that revolves.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <CartoonButton href="/bills" colour={LIME}>Vote on Bills</CartoonButton>
            <CartoonButton href="/transparency" colour={PINK}>The Receipts</CartoonButton>
          </div>
        </section>

      </main>
    </div>
  )
}

/* ---- helpers ---- */

function ComicPanel({ title, subtitle, colour, tilt = 0, style, children }: { title: string; subtitle?: string; colour: string; tilt?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <section style={{
      background: PAPER,
      border: `4px solid ${INK}`,
      boxShadow: `8px 8px 0 ${colour}`,
      transform: `rotate(${tilt}deg)`,
      padding: '1.5rem 1.75rem',
      ...style,
    }}>
      <header style={{ borderBottom: `4px solid ${colour}`, paddingBottom: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ fontFamily: IMPACT, fontSize: 'clamp(28px, 4vw, 40px)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, textShadow: `3px 3px 0 ${INK}` }}>{title}</div>
        {subtitle && <div style={{ fontFamily: COMIC, fontSize: '13px', color: '#fff', marginTop: '4px', opacity: 0.8 }}>{subtitle}</div>}
      </header>
      {children}
    </section>
  )
}

function StripPanel({ title, colour, tilt = 0, count, sub, children }: { title: string; colour: string; tilt?: number; count?: number | null; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: PAPER,
      border: `4px solid ${INK}`,
      boxShadow: `7px 7px 0 ${colour}`,
      transform: `rotate(${tilt}deg)`,
      padding: '1rem 1.25rem',
      backgroundImage: HALFTONE,
      backgroundSize: HALFTONE_SIZE,
    }}>
      <header style={{ borderBottom: `3px solid ${colour}`, paddingBottom: '0.6rem', marginBottom: '0.5rem' }}>
        <div style={{ fontFamily: IMPACT, fontSize: '22px', color: '#fff', textTransform: 'uppercase', lineHeight: 1, textShadow: `2px 2px 0 ${INK}` }}>{title}</div>
        {(count != null || sub) && (
          <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', marginTop: '4px', opacity: 0.85 }}>
            {count != null ? `${count.toLocaleString()} ` : ''}{sub}
          </div>
        )}
      </header>
      {children}
    </section>
  )
}

function SpeechBubble({ tail = 'left', border, shadow, children }: { tail?: 'left' | 'right'; border: string; shadow: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', background: PAPER, border: `4px solid ${border}`, borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: `7px 7px 0 ${shadow}` }}>
      {/* tail outer */}
      <div aria-hidden style={{
        position: 'absolute', top: '24px',
        [tail === 'left' ? 'left' : 'right']: '-22px',
        width: 0, height: 0,
        borderTop: '12px solid transparent',
        borderBottom: '12px solid transparent',
        [tail === 'left' ? 'borderRight' : 'borderLeft']: `22px solid ${border}`,
      } as React.CSSProperties} />
      {/* tail inner mask */}
      <div aria-hidden style={{
        position: 'absolute', top: '28px',
        [tail === 'left' ? 'left' : 'right']: '-13px',
        width: 0, height: 0,
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        [tail === 'left' ? 'borderRight' : 'borderLeft']: `15px solid ${PAPER}`,
      } as React.CSSProperties} />
      {children}
    </div>
  )
}

function Burst({ label, colour, size = 110, fontSize = 16, style }: { label: string; colour: string; size?: number; fontSize?: number; style?: React.CSSProperties }) {
  // 16-point starburst polygon
  const cx = 50, cy = 50, rOut = 50, rIn = 36
  const points: string[] = []
  for (let i = 0; i < 32; i++) {
    const angle = (Math.PI * 2 * i) / 32 - Math.PI / 2
    const r = i % 2 === 0 ? rOut : rIn
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return (
    <div style={{ width: size, height: size, position: 'relative', ...style }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', filter: `drop-shadow(4px 4px 0 ${INK})` }}>
        <polygon points={points.join(' ')} fill={colour} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: IMPACT, fontSize, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
        textShadow: `2px 2px 0 ${INK}`, padding: '0 12%', textAlign: 'center', lineHeight: 1,
      }}>
        {label}
      </div>
    </div>
  )
}

function Stamp({ big, label, hint, colour }: { big: string; label: string; hint?: string; colour: string }) {
  return (
    <div style={{
      background: PAPER, border: `4px solid ${INK}`, boxShadow: `5px 5px 0 ${colour}`,
      padding: '12px', textAlign: 'center',
      backgroundImage: HALFTONE, backgroundSize: HALFTONE_SIZE,
    }}>
      <div style={{ fontFamily: IMPACT, fontSize: '36px', color: '#fff', lineHeight: 1, textShadow: `3px 3px 0 ${colour}` }}>{big}</div>
      <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px', fontWeight: 800 }}>{label}</div>
      {hint && <div style={{ fontFamily: COMIC, fontSize: '11px', color: '#fff', marginTop: '3px', opacity: 0.7, fontStyle: 'italic' }}>{hint}</div>}
    </div>
  )
}

function CartoonButton({ href, colour, children }: { href: string; colour: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      background: colour, color: '#fff', padding: '12px 22px',
      fontFamily: IMPACT, fontSize: '18px', textDecoration: 'none',
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: `4px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
      display: 'inline-block', textShadow: `2px 2px 0 ${INK}`,
    }}>
      {children}
    </Link>
  )
}
