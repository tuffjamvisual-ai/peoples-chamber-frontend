import type { Metadata } from 'next'
import Link from 'next/link'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import CookieSettingsForm from './CookieSettingsForm'

// /cookies (owner's approval, 29 Oct 2026), modelled on GOV.UK's cookies page: what each cookie does and how long it
// lasts, and the setting for additional cookies. The PostHog cookie name and lifetime are the ones posthog-js 1.442.1
// sets with this site's settings (app/components/PostHogLoader.tsx): one cookie, ph_<project key>_posthog, for 365 days.
export const metadata: Metadata = {
  title: 'Cookies',
  description: 'The cookies Open Govt uses, what each one does and how long it lasts, and your cookie settings.',
  alternates: { canonical: '/cookies' },
}

const INK = '#14100d'
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK }
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px', maxWidth: '46em' }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px 8px 0', borderBottom: `1.5px solid ${INK}`, fontWeight: 'bold', verticalAlign: 'bottom' }
const td: React.CSSProperties = { padding: '8px 12px 8px 0', borderBottom: '1px solid rgba(20,16,13,0.25)', verticalAlign: 'top' }
const name: React.CSSProperties = { ...td, overflowWrap: 'anywhere', wordBreak: 'break-word' }

const POSTHOG_COOKIE = `ph_${process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '<project key>'}_posthog`

function CookieTable({ caption, rows }: { caption: string; rows: [string, string, string][] }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 18px' }}>
      <caption style={{ textAlign: 'left', fontSize: '16px', fontWeight: 'bold', padding: '0 0 8px' }}>{caption}</caption>
      <colgroup>
        <col style={{ width: '34%' }} />
        <col />
        <col style={{ width: '22%' }} />
      </colgroup>
      <thead>
        <tr><th scope="col" style={th}>Name</th><th scope="col" style={th}>Purpose</th><th scope="col" style={th}>Expires</th></tr>
      </thead>
      <tbody>
        {rows.map(([n, purpose, expires]) => (
          <tr key={n}><td style={name}><code>{n}</code></td><td style={td}>{purpose}</td><td style={td}>{expires}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

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
          Cookies are small files saved on your phone, tablet or computer when you visit a website. We use essential cookies to make Open Govt work, and, only if you agree, additional cookies to understand how you use the site, so we can improve it.
        </p>

        <h2 style={h2}>Essential cookies</h2>
        <p style={p}>These cookies are needed for the site to work, so they are always on.</p>
        <CookieTable
          caption="Essential cookies we use"
          rows={[
            ['og_session', 'Keeps you signed in. It is set only when you sign in, and the page itself cannot read it.', '30 days'],
            ['og_signed_in', 'Tells the site you are signed in, so pages can show it. It holds nothing but the number 1.', '30 days'],
            ['og_cookies_policy', 'Saves your cookie settings, so we do not ask again.', '1 year'],
          ]}
        />

        <h2 style={h2}>Cookies that measure website use</h2>
        <p style={p}>
          If you accept these cookies, we use PostHog to see which pages you visit, and in what order, so we can make the site better. PostHog stores this data in the European Union (Frankfurt) and we keep it for one year. It is never used for advertising, and we do not send PostHog your name, your email address or what you search for.
        </p>
        <CookieTable
          caption="Additional cookies, set only if you accept them"
          rows={[
            [POSTHOG_COOKIE, 'Set by PostHog. Recognises your browser so the pages you view can be counted as one visit and put in order.', '1 year'],
          ]}
        />
        <p style={p}>
          PostHog also keeps the same information in your browser&rsquo;s own storage. If you turn these cookies off, the cookie and that storage are deleted.
        </p>
        <p style={p}>
          We also count page views with Vercel Web Analytics and measure page speed with Vercel Speed Insights. These set no cookies; see the <Link href="/privacy" style={{ color: INK }}>privacy policy</Link>.
        </p>

        <h2 style={h2}>Change your cookie settings</h2>
        <CookieSettingsForm />
      </section>
    </OpenGovShell>
  )
}
