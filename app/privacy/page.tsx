import type { Metadata } from 'next'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data opengovt collects, why it is collected, how it is used, and your rights.',
  alternates: { canonical: '/privacy' },
}

const INK = '#14100d'
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK }
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px' }

export default function PrivacyPage() {
  return (
    <OpenGovShell pageStamp="Privacy">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Privacy Policy
        </h1>
      </header>

      <div style={{ maxWidth: '720px' }}>
        <p style={p}>
          This privacy policy explains what data opengovt collects, why it is collected, and how it is used. The site is operated independently and is not affiliated with GOV.UK, the UK Government, Parliament, any government department, local authority, public body, official public service, political party or commercial organisation.
        </p>

        <h2 style={h2}>What we collect and how we use it</h2>
        <p style={p}>
          When you create an account, we collect your email address, which is required for verification and, if you opt in, to send you updates about the site.
        </p>
        <p style={p}>
          If you choose to provide it, we also collect your postcode, used solely to identify your parliamentary constituency and connect you with your local MP through the Find Your MP feature.
        </p>
        <p style={p}>
          When you vote on polls or parliamentary divisions, your vote is recorded against your account to prevent duplicate voting, but only aggregated results are ever published or shared. No individual voting record is made public.
        </p>
        <p style={p}>
          We do not collect your name, address, phone number, payment details or any other personal information. We do not share your email or postcode with any third party, and we will never send you marketing from other organisations.
        </p>

        <h2 style={h2}>Cookies</h2>
        <p style={p}>
          The site uses essential cookies required for the site to function, including session cookies for login and a cookie to record whether you have dismissed the registration prompt. We do not use advertising cookies. We do not use tracking cookies. We do not use Google Analytics or any third party analytics service.
        </p>

        <h2 style={h2}>Data storage</h2>
        <p style={p}>
          Your data is stored securely using Supabase, a cloud database service hosted in the European Union. Passwords are hashed and never stored in plain text. We do not have access to your password.
        </p>

        <h2 style={h2}>Your rights</h2>
        <p style={p}>
          You can request a copy of all data we hold about you. You can request deletion of your account and all associated data. You can withdraw consent for any optional data processing at any time. To exercise any of these rights, email contact@opengovt.uk.
        </p>

        <h2 style={h2}>Data sharing</h2>
        <p style={p}>
          We do not sell, rent, share or trade your personal data with any third party. We do not share data with advertisers. We do not share data with political parties, campaigns or government bodies.
        </p>

        <h2 style={h2}>Changes to this policy</h2>
        <p style={p}>
          If this policy changes we will update it on this page. We will not reduce your rights under this policy without notifying registered users by email.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          For any questions about this policy or your data, email contact@opengovt.uk.
        </p>
      </div>
    </OpenGovShell>
  )
}
