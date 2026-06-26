// Server component — renders statutory instrument metadata + Commons division
// vote breakdown. Dossier template (matches /bills/[id], /laws, /transparency).

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';

export const revalidate = 3600

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM = '#ebe5d8'
const ACCENT = '#7a1612'
const SUCCESS = '#4a8a3a'
const DANGER = '#a64030'

type VoteRow = {
  vote_type: string
  member_id: number
  is_rebellion: boolean | null
  mps: { display_name: string; party: string | null; constituency: string | null; photo_url: string | null } | null
}

export default async function SIDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const divisionId = parseInt(id, 10)
  if (!Number.isFinite(divisionId)) notFound()

  const { data: si } = await supabase
    .from('statutory_instrument')
    .select('*')
    .eq('division_id', divisionId)
    .single()
  if (!si) notFound()

  // mp_division_votes has no FK to mps, so PostgREST can't embed it (PGRST200)
  // and the embed form silently returns no rows — which zeroed the vote lists.
  // Fetch the vote rows, then look up MP metadata separately and merge in JS.
  // Orphan voters (member_id absent from mps) render without a profile link
  // instead of failing the whole query.
  const { data: voteRows } = await supabase
    .from('mp_division_votes')
    .select('vote_type, member_id, is_rebellion')
    .eq('division_id', divisionId)
    .order('vote_type')

  const memberIds = [...new Set((voteRows ?? []).map((v) => v.member_id))]
  const mpRows = memberIds.length
    ? (
        await supabase
          .from('mps')
          .select('member_id, display_name, party, constituency, photo_url')
          .in('member_id', memberIds)
      ).data
    : []
  const mpById = new Map((mpRows ?? []).map((m) => [m.member_id, m]))

  const votes: VoteRow[] = (voteRows ?? []).map((v) => ({
    vote_type: v.vote_type,
    member_id: v.member_id,
    is_rebellion: v.is_rebellion,
    mps: mpById.get(v.member_id) ?? null,
  }))
  const ayes = votes.filter((v) => v.vote_type === 'aye')
  const noes = votes.filter((v) => v.vote_type === 'no')

  const ayes_total = si.ayes ?? ayes.length
  const noes_total = si.noes ?? noes.length
  const dateLabel = new Date(si.date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <OpenGovShell>
      <BackLink
        fallbackHref="/laws"
        label="← Back to laws"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        <Tag colour={ACCENT}>Statutory Instrument</Tag>
        <Tag colour={INK_SOFT}>Division {si.division_id}</Tag>
        {si.passed === true && <Tag colour={SUCCESS}>✓ Passed</Tag>}
        {si.passed === false && <Tag colour={DANGER}>✗ Rejected</Tag>}
      </div>

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '32px', marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            marginBottom: '12px',
            opacity: 0.85,
            transform: 'rotate(-0.2deg)',
          }}
        >
          UK Parliament · Delegated Legislation · {dateLabel}
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
            lineHeight: 1.15,
          }}
        >
          {si.title}
        </h1>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        <Stat label="Ayes" value={ayes_total} accent={SUCCESS} />
        <Stat label="Noes" value={noes_total} accent={DANGER} />
        <Stat label="Margin" value={ayes_total - noes_total} accent={ACCENT} />
        <Stat label="MPs recorded" value={votes.length} accent={INK_SOFT} />
      </section>

      {si.description && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={sectionH2}>About this instrument</h2>
          <p style={{ fontSize: '17px', lineHeight: 1.7, marginTop: '12px' }}>{si.description}</p>
        </section>
      )}

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>How MPs voted</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '24px' }}>
          <VoteColumn heading={`Voted AYE (${ayes.length})`} rows={ayes} accent={SUCCESS} />
          <VoteColumn heading={`Voted NO (${noes.length})`} rows={noes} accent={DANGER} />
        </div>
      </section>
    </OpenGovShell>
  )
}

const sectionH2: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '-0.01em',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '8px',
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontWeight: 'bold',
        color: colour,
        border: `1px solid ${colour}`,
        background: 'transparent',
      }}
    >
      {children}
    </span>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ background: CREAM, padding: '16px', border: `1px solid ${INK_HAIRLINE}` }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: accent }}>{value}</div>
    </div>
  )
}

function VoteColumn({ heading, rows, accent }: { heading: string; rows: VoteRow[]; accent: string }) {
  return (
    <div>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.18em', borderBottom: `2px solid ${accent}`, paddingBottom: '6px', marginBottom: '12px', color: accent }}>
        {heading}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: 1.6, maxHeight: '600px', overflowY: 'auto' }}>
        {rows.map((v) => (
          <li key={v.member_id} style={{ padding: '6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
            <Link href={`/mps/${v.member_id}`} style={{ color: INK, textDecoration: 'none' }}>
              <strong>{v.mps?.display_name ?? `Member ${v.member_id}`}</strong>
              {v.mps?.party && (
                <span style={{ fontSize: '12px', opacity: 0.7 }}> · {v.mps.party}</span>
              )}
              {v.mps?.constituency && (
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{v.mps.constituency}</div>
              )}
              {v.is_rebellion && <span style={{ color: ACCENT, fontSize: '13px', fontWeight: 'bold' }}> · REBEL</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
