import Navigation from '../components/Navigation'
import SiteFooter from '../components/SiteFooter'
import Link from 'next/link'

const BG = '#1a1a1a'
const GUTTER = '#0a0a0a'
const PANEL = '#111111'
const PANEL_DEEP = '#0a0a0a'
const BORDER = '#333333'
const RULE = '#262626'
const MUTED = '#9a9a9a'
const ACCENT = '#ffffff'
const VOTE_YES = '#4a8a3a'
const VOTE_NO = '#c8302e'

// Mocked content (no DB calls — this is a layout demo)
const MOCK_LEAD = {
  organisation: 'Ministry of Justice',
  title: 'Prison overcrowding hits record level as Whitehall promises "robust action plan"',
  description:
    'Internal Whitehall memo seen by The People&apos;s Chamber reveals capacity headroom is below 0.5% for the third consecutive month, even as ministers continue to brief journalists that the system is "well within operational parameters".',
}
const MOCK_FEATURED = {
  kind: 'contract' as const,
  value: '£842m',
  line1: 'Emergency NHS staffing framework',
  line2: 'Awarded to Concentrix UK Services Ltd',
  sub: 'Largest contract on record.',
}
const MOCK_BILL = {
  title: 'Renters (Reform) Bill, Second Reading',
  yes: 4127,
  no: 1842,
  abs: 318,
}
const MOCK_COVERAGE = [
  {
    outlet: 'Financial Times',
    date: '10 May',
    title: 'Treasury softens fiscal rules to make room for Reeves\' winter package',
    commentary:
      'The "fiscal headroom" framing is doing a lot of work here. When you have to redefine the rules to meet them, the rules stop being rules and start being suggestions.',
  },
  {
    outlet: 'The Guardian',
    date: '10 May',
    title: 'Labour MPs warn front-bench discipline cannot survive another welfare row',
    commentary:
      'Six months in and the whips\' office is already running out of carrots. That leaves only sticks, which is exactly the part of the parliamentary toolkit Starmer was hired to retire.',
  },
  {
    outlet: 'The Times',
    date: '09 May',
    title: 'Reform UK gains ground in three Red Wall by-elections',
    commentary:
      'The story is not the by-elections. The story is that no-one in Westminster currently has a credible answer to "what comes after Labour?", and that vacuum is doing more work for Reform than any Reform policy.',
  },
]
const MOCK_STATS = [
  { eyebrow: 'Top contract', value: '£842m', label: 'Concentrix UK Services Ltd', href: '/transparency/contracts' },
  { eyebrow: 'Top donation', value: '£3.2m', label: 'Anonymous (via UEPL)', href: '/transparency/donations' },
  { eyebrow: 'Highest earner (outside)', value: 'Sir Geoffrey Cox', label: 'Torridge and Tavistock', href: '/earnings' },
  { eyebrow: 'Revolving-door moves', value: '1,247', label: 'Whitehall ↔ private sector', href: '/transparency/revolving-door' },
]

const FONT = 'var(--font-geist-sans), Arial, Helvetica, sans-serif'

// =====================================================================
// Shared inline-content block — same content rendered in BOTH versions
// so the only difference between the two is the layout wrapper, not data
// =====================================================================

function DemoPageBody() {
  const total = MOCK_BILL.yes + MOCK_BILL.no + MOCK_BILL.abs
  const yesPct = Math.round((MOCK_BILL.yes / total) * 100)
  const noPct = Math.round((MOCK_BILL.no / total) * 100)
  const absPct = Math.max(0, 100 - yesPct - noPct)

  return (
    <>
      {/* HERO */}
      <section
        style={{
          width: '100%',
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.45) 100%), url('/hero-parliament.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ padding: '4.5rem 1.5rem 5rem' }}>
          <div style={{ maxWidth: '760px' }}>
            <div style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.25rem', opacity: 0.85, fontWeight: 700 }}>
              Top story · {MOCK_LEAD.organisation}
            </div>
            <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', fontWeight: 700, color: '#fff', margin: '0 0 1.25rem', letterSpacing: '-0.015em', lineHeight: 1.05 }}>
              {MOCK_LEAD.title}
            </h1>
            <p
              style={{ fontSize: '17px', color: '#fff', margin: '0 0 2rem', maxWidth: '640px', lineHeight: 1.55, opacity: 0.92 }}
              dangerouslySetInnerHTML={{ __html: MOCK_LEAD.description }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="#" style={ctaPrimary}>Read the full story →</Link>
              <Link href="#" style={ctaSecondary}>Vote on Bills</Link>
            </div>
          </div>
        </div>
      </section>

      {/* NOTABLE TRANSACTION STRIP */}
      <section style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '1.75rem', alignItems: 'center' }}>
          <div style={{ borderRight: `1px solid ${BORDER}`, paddingRight: '1.5rem' }}>
            <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85 }}>Notable Transaction</div>
            <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>{MOCK_FEATURED.sub}</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: '4px' }}>{MOCK_FEATURED.line1}</div>
            <div style={{ fontSize: '13px', color: '#fff' }}>{MOCK_FEATURED.line2}.</div>
          </div>
          <Link href="#" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textDecoration: 'none', borderLeft: `1px solid ${BORDER}`, paddingLeft: '1.5rem' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{MOCK_FEATURED.value}</span>
            <span style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px', opacity: 0.7 }}>view details →</span>
          </Link>
        </div>
      </section>

      <main style={{ padding: '3rem 1.5rem 4rem' }}>
        {/* FEATURED VOTE */}
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
            <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85, marginBottom: '0.85rem' }}>
              Featured Vote · Public Tally
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.012em', lineHeight: 1.15, margin: '0 0 1rem' }}>
              {MOCK_BILL.title}
            </h2>
            <p style={{ fontSize: '14px', color: MUTED, lineHeight: 1.55, margin: '0 0 1.75rem', maxWidth: '520px' }}>
              {total.toLocaleString()} members of the public have voted. Parliament&apos;s tally may differ, read the bill, then add yours.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="#" style={ctaPrimary}>Read the full story →</Link>
              <Link href="#" style={ctaSecondary}>See how MPs voted</Link>
            </div>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: `1px solid ${BORDER}` }}>
              <PctBlock pct={yesPct} label="Support" color={VOTE_YES} />
              <PctBlock pct={noPct} label="Oppose" color={VOTE_NO} />
            </div>
            <div style={{ height: '8px', background: RULE, display: 'flex', marginTop: '0.85rem', borderRadius: '1px', overflow: 'hidden' }}>
              {yesPct > 0 && <div style={{ width: `${yesPct}%`, background: VOTE_YES }} />}
              {noPct > 0 && <div style={{ width: `${noPct}%`, background: VOTE_NO }} />}
              {absPct > 0 && <div style={{ width: `${absPct}%`, background: '#888888' }} />}
            </div>
            <div style={{ fontSize: '13px', color: MUTED, marginTop: '0.5rem', fontVariantNumeric: 'tabular-nums', display: 'flex', justifyContent: 'space-between' }}>
              <span>{MOCK_BILL.yes.toLocaleString()} yes · {MOCK_BILL.no.toLocaleString()} no · {MOCK_BILL.abs.toLocaleString()} abstain</span>
              <span>{total.toLocaleString()} total</span>
            </div>
          </div>
        </section>

        {/* TWO COLUMN: TODAY'S SPIN + LIVE NUMBERS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2.5rem', marginBottom: '3rem' }}>
          <section>
            <SectionHead label="Today's Spin" sub="Independent press, with our take." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {MOCK_COVERAGE.map((s) => (
                <article key={s.title} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontSize: '12px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>
                    {s.outlet} · {s.date}
                  </div>
                  <Link href="#" style={{ display: 'block', fontSize: '19px', color: '#fff', lineHeight: 1.3, fontWeight: 700, textDecoration: 'none', marginBottom: '10px' }}>
                    {s.title}
                  </Link>
                  <p style={{ fontSize: '13px', color: '#fff', opacity: 0.92, lineHeight: 1.6, margin: '0 0 0.6rem', borderLeft: `3px solid ${BORDER}`, paddingLeft: '0.85rem' }}>
                    {s.commentary}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside>
            <SectionHead label="Live Numbers" sub="Pulled from the records this hour." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {MOCK_STATS.map((s) => (
                <Link
                  key={s.eyebrow}
                  href={s.href}
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    padding: '1.25rem 1.5rem',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.25em', textTransform: 'uppercase', opacity: 0.85, marginBottom: '8px' }}>{s.eyebrow}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: MUTED }}>{s.label}</div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* BIG SPENDERS */}
        <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Big Spenders 2024 to 25</h3>
            <Link href="#" style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', opacity: 0.7 }}>See all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {['Rt Hon Stuart Andrew', 'Rt Hon Sir Geoffrey Cox', 'Rt Hon Alistair Carmichael'].map((name, i) => (
              <div key={name} style={{ background: PANEL_DEEP, padding: '1rem 1.25rem', borderLeft: `3px solid ${ACCENT}` }}>
                <div style={{ fontSize: '12px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '6px' }}>#{i + 1}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '12px', color: MUTED, marginBottom: '6px' }}>{['Daventry', 'Torridge and Tavistock', 'Orkney and Shetland'][i]}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>£{['367,659', '298,442', '241,180'][i]}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

// =====================================================================
// Helpers
// =====================================================================

const ctaPrimary: React.CSSProperties = {
  background: '#fff', color: '#000', padding: '12px 22px', fontSize: '12px',
  letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none',
}
const ctaSecondary: React.CSSProperties = {
  background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '12px 22px',
  fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none',
}

function PctBlock({ pct, label, color }: { pct: number; label: string; color: string }) {
  return (
    <div style={{ background: PANEL, padding: '1.4rem 1rem', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: '32px', fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
      <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px', opacity: 0.7 }}>{label}</div>
    </div>
  )
}

function SectionHead({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ marginBottom: '1.25rem', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.75rem' }}>
      <div style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>{sub}</div>
    </div>
  )
}

// =====================================================================
// The demo page
// =====================================================================

export default function NewspaperDemo() {
  return (
    <div style={{ background: GUTTER, minHeight: '100vh', color: '#fff', fontFamily: FONT }}>
      {/* Demo header (sits on gutter) */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 1rem' }}>
        <div style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.6, marginBottom: '0.5rem' }}>
          Layout comparison, scroll to compare
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>
          /newspaper-demo
        </h1>
        <p style={{ fontSize: '13px', color: MUTED, marginTop: '0.5rem', maxWidth: '720px' }}>
          Same homepage content rendered two ways. First: current full-width design. Second: proposed
          newspaper-on-table design with constrained content, darker gutter background, subtle border and shadow.
        </p>
      </div>

      {/* =================================================================
          VERSION 1, CURRENT FULL-WIDTH DESIGN
          ================================================================= */}
      <div style={{ background: BG, color: '#fff', borderTop: `2px solid #ffffff15`, borderBottom: `2px solid #ffffff15`, marginTop: '1rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>
            ↓ Current design, full-width background
          </div>
        </div>
        <Navigation />
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <DemoPageBody />
        </div>
        <SiteFooter />
      </div>

      {/* =================================================================
          VERSION 2, PROPOSED NEWSPAPER-ON-TABLE DESIGN
          ================================================================= */}
      <div style={{ background: GUTTER, padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto 1rem' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>
            ↓ Proposed design, newspaper on table
          </div>
        </div>
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            background: '#242424',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 25px 80px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <Navigation />
          <DemoPageBody />
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
