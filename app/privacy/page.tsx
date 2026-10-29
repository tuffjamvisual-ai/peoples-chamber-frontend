import type { Metadata } from 'next'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import Link from 'next/link'

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
          When you create an account, we collect your name, your email address and a password. Your email address is used to confirm your account, to sign you in, and, if you opt in, to send you the newsletter. When an account is created we send ourselves a short email with the name and email address, so we know a new account exists.
        </p>
        <p style={p}>
          If you sign up for the newsletter without an account, we store only your email address, when you signed up, and whether you have confirmed or unsubscribed. It is used only to send Open Govt Weekly. You are added only after you click the confirmation link we email you, and every newsletter includes a link that unsubscribes you in a single click.
        </p>
        <p style={p}>
          If you choose to provide it, we also collect your postcode, used solely to identify your parliamentary constituency and connect you with your local MP through the Find Your MP feature.
        </p>
        <p style={p}>
          When you vote on polls or bills, your vote is recorded against your account, with the time, to prevent duplicate voting, but only aggregated results are ever published or shared. No individual voting record is made public.
        </p>
        <p style={p}>
          We do not collect your home address, phone number or card details. Card payments are taken by Stripe on its own page (see below). We do not share your email or postcode with anyone except the services listed below, which process it only to run this site for us, and we will never send you marketing from other organisations.
        </p>

        <h2 style={h2}>Commission research requests</h2>
        <p style={p}>
          If you ask us for commissioned research, the form sends us your name, email address, organisation (if you give one), your question, any deadline, and whether you intend to publish the results. We use these only to reply with a quote and, if you go ahead, to do the work. The request is not stored in our database: it is sent by email to our inbox, where only we read it, and kept there as part of our correspondence with you.
        </p>

        <h2 style={h2}>Following and saved searches</h2>
        <p style={p}>
          If you follow MPs, donors, bills or organisations, or save searches, we keep that list so we can send you a weekly email of what changed. Because what you follow could show your political views, we only keep it with your clear agreement, which you give when you first follow something. You can stop the emails from any email, remove any item, or delete your account, and it is all deleted. We keep a record of the alert emails we send for up to 12 months, to keep within our sending limits. We do not share this with anyone, and we do not use it for advertising.
        </p>

        <h2 style={h2}>Cookies</h2>
        <p style={p}>
          The site uses essential cookies required for the site to function: a session cookie that keeps you signed in for up to 30 days, and a small marker that tells the site you are signed in. We do not use advertising cookies. Only if you accept additional cookies, we use PostHog cookies to see which pages you visit, in order, so we can improve the site; the data is stored in the European Union (Frankfurt), kept for one year and never used for advertising, and you can change your choice at any time at <Link href="/cookies" style={{ color: INK }}>/cookies</Link>. We do not use Google Analytics.
        </p>
        <p style={p}>
          The site also keeps a few things in your browser&rsquo;s own storage, which are never sent to us: your account name and email address while you are signed in, so pages can show that you are signed in, and, for the sign up note on search, how many searches you have made in this visit and whether you closed the note (remembered for 30 days).
        </p>

        <h2 style={h2}>Analytics</h2>
        <p style={p}>
          We use Vercel Web Analytics to count page views and Vercel Speed Insights to measure how fast pages load. For each page view, Web Analytics records the page address, the page you came from, the time, your approximate location (country, region and city), and your browser, operating system and type of device. Speed Insights records the page, your network speed, browser, device, operating system and country, and the page&rsquo;s speed measurements, for one in five visits. They do not use third party cookies: Vercel tells visits apart with a code made from the request, which it deletes after 24 hours, and we only see totals that are not tied to any person or IP address. We also count how many visitors accept or reject additional cookies, as totals only.
        </p>

        <h2 style={h2}>Services that process data for us</h2>
        <p style={p}>
          Supabase stores our database, in Amazon Web Services&rsquo; Ireland region (eu-west-1). Vercel hosts the site and runs the analytics above. PostHog, only if you accept additional cookies, records which pages you visit, in its EU Cloud in Frankfurt. Resend sends our emails: account confirmation, password reset, the newsletter, alert emails and commission requests. Stripe takes card payments for donations and commissioned research on its own secure page; we receive confirmation of the payment, not your card details.
        </p>

        <h2 style={h2}>Data storage</h2>
        <p style={p}>
          Your data is stored securely using Supabase, a cloud database service hosted in the European Union (Ireland). Passwords are hashed and never stored in plain text. We do not have access to your password.
        </p>

        <h2 style={h2}>Your rights</h2>
        <p style={p}>
          You can request a copy of all data we hold about you. You can request deletion of your account and all associated data. You can withdraw consent for any optional data processing at any time. To exercise any of these rights, email contact@opengovt.uk.
        </p>

        <h2 style={h2}>Data sharing</h2>
        <p style={p}>
          We do not sell, rent, share or trade your personal data with any third party. The services listed above process it only to run this site for us. We do not share data with advertisers. We do not share data with political parties, campaigns or government bodies.
        </p>

        <h2 style={h2}>Changes to this policy</h2>
        <p style={p}>
          If this policy changes we will update it on this page. We will not reduce your rights under this policy without notifying registered users by email.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          For any questions about this policy or your data, email contact@opengovt.uk.
        </p>

        <p style={{ ...p, marginTop: '30px', fontSize: '15px' }}>Last updated: 25 October 2026</p>
      </div>
    </OpenGovShell>
  )
}
