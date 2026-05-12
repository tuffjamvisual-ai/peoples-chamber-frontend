import Link from 'next/link'

const BG = '#0d0d0d'
const BORDER = '#262626'
const MUTED = '#9a9a9a'
const FONT = 'var(--font-geist-sans), Arial, Helvetica, sans-serif'

export default function SiteFooter() {
  return (
    <footer style={{ background: BG, borderTop: `1px solid ${BORDER}`, color: '#fff', fontFamily: FONT, marginTop: '4rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            paddingBottom: '2.5rem',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div>
            <FootHead>The People&apos;s Chamber</FootHead>
            <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6, margin: '0' }}>
              UK political transparency. Built from official sources — Parliament, IPSA, Companies House, Electoral Commission, Cabinet Office. Updated daily.
            </p>
          </div>

          <div>
            <FootHead>Records</FootHead>
            <FootCol>
              <FootLink href="/bills">Bills</FootLink>
              <FootLink href="/mps">MPs</FootLink>
              <FootLink href="/departments">Departments</FootLink>
              <FootLink href="/transparency">Transparency</FootLink>
              <FootLink href="/expenses">Expenses</FootLink>
              <FootLink href="/earnings">Earnings</FootLink>
            </FootCol>
          </div>

          <div>
            <FootHead>Legal</FootHead>
            <FootCol>
              <FootLink href="/about">About &amp; Methodology</FootLink>
              <FootLink href="/about#sources">Sources</FootLink>
              <FootLink href="/about#privacy">Privacy</FootLink>
              <FootLink href="/about#terms">Terms</FootLink>
            </FootCol>
          </div>

          <div>
            <FootHead>Connect</FootHead>
            <FootCol>
              <a
                href="https://github.com/tuffjamvisual-ai/peoples-chamber-frontend"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                GitHub ↗
              </a>
              <Link href="/about#contact" style={linkStyle}>Contact</Link>
            </FootCol>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.5rem',
            fontSize: '11px',
            color: MUTED,
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>© {new Date().getFullYear()} The People&apos;s Chamber. Public-record reporting.</div>
          <div style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>peopleschamber.uk</div>
        </div>
      </div>
    </footer>
  )
}

function FootHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '11px',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.22em',
        fontWeight: 700,
        marginBottom: '1rem',
      }}
    >
      {children}
    </div>
  )
}

function FootCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>{children}</div>
}

const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#fff',
  textDecoration: 'none',
  opacity: 0.85,
}

function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={linkStyle}>
      {children}
    </Link>
  )
}
