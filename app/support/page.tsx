import type { Metadata } from 'next'
import Link from 'next/link'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Open Govt, contact us, report a data issue, or suggest a feature.',
  alternates: { canonical: '/support' },
}

const INK = '#14100d'

export default function SupportPage() {
  return (
    <OpenGovShell pageStamp="Support Us">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Support Open Govt
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Get help, report a data issue, or suggest a feature. The answers below cover the questions we are asked most often.
        </p>
        <Link
          href="/donate"
          className="no-hover-scale"
          style={{ display: 'inline-block', marginTop: '18px', padding: '12px 22px', background: '#7a1612', color: '#f4e8d4', border: '2px solid #14100d', borderRadius: 6, fontWeight: 'bold', fontSize: '17px', textDecoration: 'none' }}
        >
          Support this project — make a one-off donation →
        </Link>
      </header>

      <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Contact Us</h2>
      <p className="text-[#14100d] mb-4">Email: contact@thepeopleschamber.uk</p>

      <h2 className="text-xl font-bold mt-6 mb-3 text-[#14100d]">Frequently Asked Questions</h2>

      <h3 className="font-bold mt-4 mb-2 text-[#14100d]">How does voting work?</h3>
      <p className="text-[#14100d] mb-4">
        Create an account, browse bills, and click Support, Oppose, or Abstain. Your vote is recorded and contributes to public opinion statistics.
      </p>

      <h3 className="font-bold mt-4 mb-2 text-[#14100d]">Can I change my vote?</h3>
      <p className="text-[#14100d] mb-4">
        No, votes are final once submitted to maintain data integrity.
      </p>

      <h3 className="font-bold mt-4 mb-2 text-[#14100d]">Is this official?</h3>
      <p className="text-[#14100d] mb-4">
        No, Open Govt is an independent platform for civic engagement, not affiliated with UK Parliament.
      </p>
    </OpenGovShell>
  );
}
