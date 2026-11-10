import type { Metadata } from 'next'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink'
import WelfareSearch from '../../components/WelfareSearch'
import { phoneUpTo } from '@/lib/breakpoints';

export const metadata: Metadata = {
  title: 'Welfare Spending Explorer',
  description: "Enter your postcode, or search by constituency, council or county, to see Universal Credit, Housing Benefit, PIP, DLA, Carer’s Allowance and ESA spending and caseloads in your area.",
  alternates: { canonical: '/tools/welfare' },
}

const INK = '#14100d'

export default function WelfareExplorerPage() {
  return (
    <OpenGovShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      {/* Under 640px (owner, 4 Nov 2026): the title, the searches, then the introduction. */}
      <style>{`@media ${phoneUpTo(639.98)} {
        .wf-page { display: flex; flex-direction: column; }
        .wf-head { display: contents; }
        .wf-title { order: 1; }
        .wf-search { order: 2; margin-bottom: 16px; }
        .wf-intro { order: 3; }
        .wf-scotland { order: 4; }
      }`}</style>
      <div className="wf-page">
      <header className="wf-head" style={{ marginBottom: '5%' }}>
        <h1 className="wf-title" style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Welfare Spending Explorer
        </h1>
        <p className="wf-intro" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '640px', color: INK }}>
          See Universal Credit, Housing Benefit, Personal Independence Payment, Disability
          Living Allowance, Carer&rsquo;s Allowance and Employment and Support Allowance spending
          and caseloads for your constituency or local authority, ranked against every
          other area in England, Wales and Scotland, with the change in spend over two years.
        </p>
        <p className="wf-scotland" style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '640px', color: '#14100d', marginTop: '10px' }}>
          PIP, DLA and Carer&rsquo;s Allowance are devolved in Scotland, so Scottish results show
          the three benefits still administered by DWP (Universal Credit, Housing Benefit and
          ESA) rather than the full comparison of six benefits available for England and Wales.
        </p>
      </header>

      <div className="wf-search" style={{ maxWidth: '620px' }}>
        <WelfareSearch />
      </div>
      </div>
    </OpenGovShell>
  )
}
