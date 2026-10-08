import type { Metadata } from 'next'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink'
import WelfareSearch from '../../components/WelfareSearch'

export const metadata: Metadata = {
  title: 'Welfare Spending Explorer',
  description: "Enter your postcode, or search by constituency, council or county, to see Universal Credit, Housing Benefit, PIP, DLA, Carer’s Allowance and ESA spending and caseloads in your area.",
  alternates: { canonical: '/tools/welfare' },
}

const INK = '#14100d'

export default function WelfareExplorerPage() {
  return (
    <OpenGovShell pageStamp="Welfare Explorer">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Welfare Spending Explorer
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '640px', color: INK }}>
          See Universal Credit, Housing Benefit, Personal Independence Payment, Disability
          Living Allowance, Carer&rsquo;s Allowance and Employment and Support Allowance spending
          and caseloads for your constituency or local authority &mdash; ranked against every
          other area in England, Wales and Scotland, with the two-year change in spend.
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.7, maxWidth: '640px', color: 'rgba(20,16,13,0.65)', marginTop: '10px' }}>
          PIP, DLA and Carer&rsquo;s Allowance are devolved in Scotland, so Scottish results show
          the three benefits still administered by DWP (Universal Credit, Housing Benefit and
          ESA) rather than the full six-benefit comparison available for England and Wales.
        </p>
      </header>

      <div style={{ maxWidth: '620px' }}>
        <WelfareSearch />
      </div>
    </OpenGovShell>
  )
}
