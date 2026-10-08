'use client'

import { useEffect, useState } from 'react'
import { formatGBP, formatCount, formatSignedPercent, formatGBPPerResident, formatPeriodEnd } from '@/lib/welfare-format'

// Renders the body of /tools/welfare/constituency/[gss] — fetches
// /api/welfare/constituency/[gss] client-side (same fetch-from-API
// pattern as WelfareSearch / WelfareSearchResults) and renders either
// the full six-benefit England & Wales view or the reduced three-benefit
// Scotland view, depending on what the API returns.
//
// SCOPE CONSTANT: 575 is the documented England & Wales constituency
// count welfare_constituency_summary is built over (see that table's own
// compute script header). It's a fixed design scope, not a live count —
// the API route doesn't currently return a live total, so this is used
// for the "ranked #N of 575" display rather than querying for it again.
const EW_CONSTITUENCY_COUNT = 575

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.65)'
const INK_HAIRLINE = 'rgba(20,16,13,0.2)'
const PARCHMENT_CREAM = '#efe6d2'
const ACCENT = '#7a1612'
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif'
const MONO = 'Special Elite, monospace'

const BENEFIT_ORDER = [
  'uc_spend_estimated_annual',
  'pip_spend_estimated_annual',
  'hb_spend_estimated_annual',
  'dla_spend_estimated_annual',
  'ca_spend_estimated_annual',
  'esa_spend_estimated_annual',
] as const

const BENEFIT_LABELS: Record<string, string> = {
  uc_spend_estimated_annual: 'Universal Credit',
  pip_spend_estimated_annual: 'Personal Independence Payment (PIP)',
  hb_spend_estimated_annual: 'Housing Benefit',
  dla_spend_estimated_annual: 'Disability Living Allowance (DLA)',
  ca_spend_estimated_annual: "Carer's Allowance",
  esa_spend_estimated_annual: 'Employment and Support Allowance (ESA)',
}

type FullPayload = {
  scope: 'full'
  constituencyName: string | null
  mp: { memberId: string; name: string } | null
  data: {
    constituency_gss_code: string
    headline_period_end: string
    total_six_benefit_spend: number
    spend_per_resident: number
    rank_total_spend: number
    rank_spend_per_resident: number
    baseline_period_end: string
    baseline_total_spend: number
    cash_change: number
    percentage_change: number | null
    population: number
    population_reference_year: number
    metadata_json: {
      benefit_breakdown: Record<string, number>
      benefit_period_ends: Record<string, string>
      baseline_benefit_breakdown: Record<string, number>
      baseline_benefit_period_ends: Record<string, string>
    }
  }
}

type PartialPayload = {
  scope: 'partial'
  constituencyName: string | null
  benefits: Record<string, { value: number; periodEnd: string; unit: string; status: string }>
  note: string
}

type Payload = FullPayload | PartialPayload

export default function WelfareConstituencyDetail({ gss }: { gss: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/welfare/constituency/${encodeURIComponent(gss)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.message || 'No welfare data found for this constituency.')
          setLoading(false)
          return
        }
        setPayload(data)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError('Lookup is unavailable right now. Please try again.')
          setLoading(false)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [gss])

  if (loading) {
    return <p style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>Loading…</p>
  }
  if (error || !payload) {
    return <p role="alert" style={{ fontFamily: SERIF, fontSize: '16px', color: ACCENT }}>{error || 'Something went wrong.'}</p>
  }

  return (
    <article
      style={{
        background: `${PARCHMENT_CREAM} url('/bill-parchment.webp') center top / 100% auto repeat-y`,
        border: '1px solid rgba(26,20,14,0.3)',
        boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
        padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
        color: '#1a140e',
        fontFamily: SERIF,
      }}
    >
      {payload.scope === 'full' ? <FullView payload={payload} /> : <PartialView payload={payload} />}
    </article>
  )
}

function FullView({ payload }: { payload: FullPayload }) {
  const d = payload.data
  const m = d.metadata_json

  return (
    <>
      <Header
        kind="Constituency"
        name={payload.constituencyName || d.constituency_gss_code}
        sub={payload.mp ? `MP: ${payload.mp.name}` : undefined}
        gssCode={d.constituency_gss_code}
      />

      <Section title="Headline figures">
        <DataRow label="Total six-benefit spend" value={formatGBP(d.total_six_benefit_spend)} sub={`Period ending ${formatPeriodEnd(d.headline_period_end)}`} />
        <DataRow label="Spend per resident" value={formatGBPPerResident(d.spend_per_resident)} />
        <DataRow label="Rank by total spend" value={`#${formatCount(d.rank_total_spend)} of ${EW_CONSTITUENCY_COUNT}`} sub="Rank 1 = highest total spend among England & Wales constituencies" />
        <DataRow label="Rank by spend per resident" value={`#${formatCount(d.rank_spend_per_resident)} of ${EW_CONSTITUENCY_COUNT}`} />
        <DataRow label="Population" value={`${formatCount(d.population)} (${d.population_reference_year})`} />
      </Section>

      <Section title="Two-year change">
        <DataRow
          label={`${formatPeriodEnd(d.baseline_period_end)} → ${formatPeriodEnd(d.headline_period_end)}`}
          value={`${formatGBP(d.baseline_total_spend)} → ${formatGBP(d.total_six_benefit_spend)}`}
        />
        <DataRow
          label="Change"
          value={`${d.cash_change >= 0 ? '+' : ''}${formatGBP(d.cash_change)}`}
          sub={formatSignedPercent(d.percentage_change)}
          valueColour={d.cash_change >= 0 ? ACCENT : undefined}
        />
      </Section>

      <Section title="Per-benefit breakdown">
        {BENEFIT_ORDER.map((key) => (
          <DataRow
            key={key}
            label={BENEFIT_LABELS[key]}
            value={formatGBP(m.benefit_breakdown[key])}
            sub={`Period ending ${formatPeriodEnd(m.benefit_period_ends[key])} · baseline ${formatGBP(m.baseline_benefit_breakdown[key])} (${formatPeriodEnd(m.baseline_benefit_period_ends[key])})`}
          />
        ))}
      </Section>
    </>
  )
}

function PartialView({ payload }: { payload: PartialPayload }) {
  const reservedOrder = ['uc_spend_estimated_annual', 'hb_spend_estimated_annual', 'esa_spend_estimated_annual']
  return (
    <>
      <Header
        kind="Constituency"
        name={payload.constituencyName || 'Scotland'}
        partial
      />

      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: 0 }}>{payload.note}</p>
      </section>

      <Section title="Reserved benefits (UK-wide, DWP-administered)">
        {reservedOrder.map((key) => {
          const b = payload.benefits[key]
          if (!b) return null
          return (
            <DataRow
              key={key}
              label={BENEFIT_LABELS[key]}
              value={formatGBP(b.value)}
              sub={`Period ending ${formatPeriodEnd(b.periodEnd)}`}
            />
          )
        })}
      </Section>
    </>
  )
}

function Header({ kind, name, sub, gssCode, partial }: { kind: string; name: string; sub?: string; gssCode?: string; partial?: boolean }) {
  return (
    <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
        {kind}
        {partial && <span style={{ color: ACCENT, marginLeft: '8px', fontVariant: 'normal', letterSpacing: '0.08em' }}>· PARTIAL DATA (SCOTLAND)</span>}
      </div>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
        {name}
      </h1>
      {sub && (
        <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, marginTop: '6px' }}>{sub}</div>
      )}
      {gssCode && (
        <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '8px' }}>
          ONS code {gssCode}
        </div>
      )}
    </header>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        {title}
      </h2>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) 1fr', gap: '0', borderTop: `1px solid ${INK_HAIRLINE}` }}>
        {children}
      </dl>
    </section>
  )
}

function DataRow({ label, value, sub, valueColour }: { label: string; value: React.ReactNode | null; sub?: string | null; valueColour?: string }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.04em', padding: '12px 16px 12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>
        {label}
      </dt>
      <dd style={{ padding: '12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: valueColour || INK }}>
        {value}
        {sub && <span style={{ display: 'block', fontSize: '13px', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>}
      </dd>
    </div>
  )
}
