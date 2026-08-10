import type { Metadata } from 'next'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'The terms and conditions for using opengovt.',
  alternates: { canonical: '/terms' },
}

const INK = '#14100d'
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK }
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px' }

export default function TermsPage() {
  return (
    <OpenGovShell pageStamp="Terms">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Terms and Conditions
        </h1>
      </header>

      <div style={{ maxWidth: '720px' }}>
        <p style={p}>By using this site you agree to the following terms.</p>

        <h2 style={h2}>The site</h2>
        <p style={p}>
          Opengovt is an independent, nonpartisan transparency platform. It is not affiliated with GOV.UK, the UK Government, Parliament, any government department, local authority, public body, official public service, political party, campaign group, think tank or media organisation. The content is produced by independent journalists and is fact checked against primary sources.
        </p>

        <h2 style={h2}>Accounts</h2>
        <p style={p}>
          You must provide a valid email address to create an account. You must not create multiple accounts. You must not use a disposable or temporary email address. Accounts created for the purpose of manipulating poll results, spamming or disrupting the site will be removed without notice.
        </p>

        <h2 style={h2}>Voting</h2>
        <p style={p}>
          Each account may cast one vote per poll and one vote per parliamentary division. Votes cannot be changed once cast. Aggregated results are displayed publicly. Individual votes are never published.
        </p>

        <h2 style={h2}>Content</h2>
        <p style={p}>
          All editorial content on this site is original work. It may not be reproduced in full without permission. Short quotations with attribution and a link to the original are permitted.
        </p>

        <h2 style={h2}>User conduct</h2>
        <p style={p}>
          You must not use the site to harass, abuse or threaten any individual. You must not attempt to manipulate voting results. You must not attempt to access other users’ accounts or data. You must not use automated tools to scrape, copy or reproduce the site’s content or data at scale.
        </p>

        <h2 style={h2}>Accuracy</h2>
        <p style={p}>
          We take accuracy seriously. Every article is fact checked against primary sources. If you believe any content on this site contains an error, email contact@opengovt.uk and we will review it. Corrections are published where necessary.
        </p>

        <h2 style={h2}>Liability</h2>
        <p style={p}>
          The content on this site is provided for information purposes. It does not constitute legal, financial or professional advice. While we take every reasonable step to ensure accuracy, we do not guarantee that all information is complete or current. We are not liable for any decisions made based on the content of this site.
        </p>

        <h2 style={h2}>Changes</h2>
        <p style={p}>
          These terms may be updated. Continued use of the site after changes are published constitutes acceptance of the updated terms.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          For any questions about these terms, email contact@opengovt.uk.
        </p>
      </div>
    </OpenGovShell>
  )
}
