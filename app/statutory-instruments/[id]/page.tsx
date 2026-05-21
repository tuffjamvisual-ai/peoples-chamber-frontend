// Server component — renders statutory instrument metadata + Commons division
// vote breakdown. Matches the magazine template used on /bills/[id].

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import '../../components/magazine-layout.css'
import MagazineNav from '../../components/MagazineNav'

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

  const { data: voteRows } = await supabase
    .from('mp_division_votes')
    .select('vote_type, member_id, is_rebellion, mps(display_name, party, constituency, photo_url)')
    .eq('division_id', divisionId)
    .order('vote_type')

  const votes = (voteRows ?? []) as unknown as VoteRow[]
  const ayes = votes.filter((v) => v.vote_type === 'aye')
  const noes = votes.filter((v) => v.vote_type === 'no')

  const ayes_total = si.ayes ?? ayes.length
  const noes_total = si.noes ?? noes.length
  const dateLabel = new Date(si.date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <MagazineNav />
      <div
        className="magazine-content-spacing"
        style={{ position: 'relative', zIndex: 2, color: INK, fontFamily: 'Special Elite, monospace' }}
      >
        <Link
          href="/mps"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: INK,
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to MPs
        </Link>

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
              fontSize: '36px',
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
          <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '8px', marginBottom: '24px' }}>
            Source: Commons Votes API · division {si.division_id}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            <VoteColumn heading={`Voted AYE (${ayes.length})`} rows={ayes} accent={SUCCESS} />
            <VoteColumn heading={`Voted NO (${noes.length})`} rows={noes} accent={DANGER} />
          </div>
        </section>
      </div>
    </div>
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
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
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
              {v.is_rebellion && <span style={{ color: ACCENT, fontSize: '11px', fontWeight: 'bold' }}> · REBEL</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
