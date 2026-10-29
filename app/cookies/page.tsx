import type { Metadata } from 'next'
import Link from 'next/link'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import CookieSettingsForm from './CookieSettingsForm'

// /cookies (owner's approval, 29 Oct 2026), modelled on gov.uk/help/cookies: plain English and the cookie settings.
// Every cookie's name, purpose and lifetime is on /cookies/details, as on gov.uk/help/cookie-details.
export const metadata: Metadata = {
  title: 'Cookies',
  description: 'How Open Govt uses cookies, and your cookie settings.',
  alternates: { canonical: '/cookies' },
}

const INK = '#14100d'
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK }
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px', maxWidth: '46em' }

export default function CookiesPage() {
  return (
    <OpenGovShell pageStamp="Cookies">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', color: INK }}>
          Cookies
        </h1>
      </header>

      <section style={{ color: INK }}>
        <p style={p}>
          Cookies are small files saved on your phone, tablet or computer when you visit a website. We use cookies to make Open Govt work and, if you agree, to understand how you use it so we can improve it.
        </p>

        <h2 style={h2}>Essential cookies</h2>
        <p style={p}>
          These cookies make the site work, for example by keeping you signed in and remembering your cookie settings. They always need to be on.
        </p>

        <h2 style={h2}>Cookies that measure website use</h2>
        <p style={p}>
          With your permission, we use PostHog to see which pages you visit and in what order, so we can improve the site. The data is stored in the EU, kept for one year and never used for advertising.
        </p>

        <p style={p}>
          <Link href="/cookies/details" style={{ color: INK, textDecoration: 'underline' }}>Details about cookies on Open Govt</Link>
        </p>

        <h2 style={h2}>Change your cookie settings</h2>
        <CookieSettingsForm />
      </section>
    </OpenGovShell>
  )
}
