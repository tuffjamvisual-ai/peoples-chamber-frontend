// Server component — renders bill metadata, summary, support/oppose
// explanations, sponsor, vote counts and the passage timeline directly in
// the initial HTML so Googlebot indexes the content. The interactive
// cross-box ballot lives in a small client island (BillVotingClient).
//
// Styled as a newspaper "bill broadsheet" to match the ballot cards on
// /bills and the People's Polls: ink-on-parchment, Special Elite labels,
// serif body, with the vote presented as an official ballot paper.

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ScrollToTopButton from '../../components/ScrollToTopButton'
import BillVotingClient from './BillVotingClient'
import DossierShell from '../../components/DossierShell'
export const revalidate = 3600

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM_DEEP = '#dcd4c0'
const ACCENT = '#7a1612'
const SUCCESS = '#4e6b34'
const DANGER = '#8a2f20'
const WARN = '#b88a30'
const SERIF = 'Georgia, "Times New Roman", serif'
const MONO = 'Special Elite, monospace'

type Stage = {
  id: number
  description: string
  house: string
  stageSittings: { date: string }[]
  sortOrder: number
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const billId = parseInt(id, 10)
  if (!Number.isFinite(billId)) notFound()

  const { data: bill } = await supabase.from('bill').select('*').eq('id', billId).single()
  if (!bill) notFound()

  // Stages are cached in bill.stages (refreshed daily by
  // /api/sync-bill-stages). No live Parliament-API call here.
  const stagesData = bill.stages as { items?: Stage[] } | null
  const stages: Stage[] = stagesData?.items || []

  const serial = bill.parliament_id != null ? String(bill.parliament_id).padStart(4, '0') : null

  const yesVotes = bill.vote_count_yes || 0
  const noVotes = bill.vote_count_no || 0
  const absVotes = bill.vote_count_abstain || 0
  const totalVotes = yesVotes + noVotes + absVotes
  const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0
  const noPercent = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0

  const totalMPVotes = (bill.commons_ayes || 0) + (bill.commons_noes || 0)
  const mpAyePercent = totalMPVotes > 0 ? Math.round(((bill.commons_ayes || 0) / totalMPVotes) * 100) : 0
  const mpNoePercent = totalMPVotes > 0 ? Math.round(((bill.commons_noes || 0) / totalMPVotes) * 100) : 0

  const democraticGap =
    totalMPVotes > 0 && totalVotes > 0 ? Math.abs(yesPercent - mpAyePercent) : null
  const outcomeMismatch =
    democraticGap !== null &&
    ((yesPercent > 50 && mpAyePercent < 50) || (yesPercent < 50 && mpAyePercent > 50))

  const keyStageNames = ['1st reading', '2nd reading', 'Committee stage', 'Report stage', '3rd reading', 'Royal Assent']
  const keyStages = stages.filter((s) => keyStageNames.includes(s.description))
  const commonsStages = keyStages.filter((s) => s.house === 'Commons')
  const lordsStages = keyStages.filter((s) => s.house === 'Lords')
  const royalAssent = stages.find((s) => s.description === 'Royal Assent')

  return (
    <DossierShell>
      <a
        href="/bills"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      >
        ← Back to all bills
      </a>

      {/* Masthead */}
      <header style={{ borderBottom: `3px double ${INK}`, paddingBottom: '22px', marginBottom: '28px' }}>
        <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '14px' }}>
          UK Parliament · Public Bill{serial ? ` · No. ${serial}` : ''}
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.01em', lineHeight: 1.06, margin: 0 }}>
          {bill.title}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
          {bill.is_act && <Tag colour={SUCCESS}>✓ Passed into law</Tag>}
          {bill.is_defeated && <Tag colour={DANGER}>✗ Defeated</Tag>}
          {bill.bill_withdrawn && <Tag colour={INK_SOFT}>Withdrawn</Tag>}
          {bill.category && <Tag colour={ACCENT}>{bill.category}</Tag>}
          {bill.originating_house && <Tag colour={INK_SOFT}>{bill.originating_house}</Tag>}
          {bill.current_stage && <Tag colour={INK_SOFT}>{bill.current_stage}</Tag>}
        </div>
      </header>

      {/* The bill in brief */}
      {bill.plain_summary && (
        <section style={{ marginBottom: '34px' }}>
          <Eyebrow>The bill in brief</Eyebrow>
          <p style={{ fontFamily: SERIF, fontSize: '17px', lineHeight: 1.75, margin: 0 }}>{bill.plain_summary}</p>
        </section>
      )}

      {/* What a vote means */}
      {(bill.support_explanation || bill.oppose_explanation) && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '38px' }}>
          {bill.support_explanation && (
            <ExplainerColumn label="An Aye vote means" colour={SUCCESS} points={explanationPoints(bill.support_explanation)} />
          )}
          {bill.oppose_explanation && (
            <ExplainerColumn label="A No vote means" colour={DANGER} points={explanationPoints(bill.oppose_explanation)} />
          )}
        </section>
      )}

      {/* The ballot — interactive cross-box vote + the running counts */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ position: 'relative', border: `3px double ${INK}`, boxShadow: '2px 3px 8px rgba(20,16,13,0.14)', padding: '26px 26px 22px' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold' }}>
              Official Ballot · The People&apos;s Chamber
            </div>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 'bold', margin: '10px 0 0', lineHeight: 1.15 }}>
              How would you vote on this bill?
            </h2>
            <div style={{ fontFamily: MONO, fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.04em', color: INK_SOFT, marginTop: '8px' }}>
              Mark one box with a cross.
            </div>
          </div>

          <BillVotingClient billId={billId} />

          {/* The count so far */}
          <div style={{ borderTop: `1px solid ${INK}`, marginTop: '24px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <VoteBar
              label="The people's count"
              totalLabel={`${totalVotes.toLocaleString()} ${totalVotes === 1 ? 'vote' : 'votes'}`}
              yesPct={yesPercent}
              noPct={noPercent}
              yesText={`${yesPercent}% Aye · ${yesVotes.toLocaleString()}`}
              noText={`${noPercent}% No · ${noVotes.toLocaleString()}`}
              empty={totalVotes === 0}
            />

            {totalMPVotes > 0 && (
              <VoteBar
                label="How Parliament voted"
                totalLabel={`${totalMPVotes.toLocaleString()} MPs`}
                yesPct={mpAyePercent}
                noPct={mpNoePercent}
                yesText={`${mpAyePercent}% Ayes · ${(bill.commons_ayes || 0).toLocaleString()}`}
                noText={`${mpNoePercent}% Noes · ${(bill.commons_noes || 0).toLocaleString()}`}
                muted
              />
            )}

            {democraticGap !== null && (
              <div style={{ borderLeft: `3px solid ${outcomeMismatch ? WARN : ACCENT}`, padding: '12px 18px', background: CREAM_DEEP }}>
                <div style={{ fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 'bold', color: outcomeMismatch ? WARN : ACCENT, marginBottom: '5px' }}>
                  The democratic gap
                </div>
                <p style={{ fontFamily: SERIF, fontSize: '16px', fontWeight: 'bold', lineHeight: 1.4, margin: 0 }}>
                  {democraticGap}% {democraticGap > 20 ? '— a wide gap' : democraticGap > 10 ? '— a moderate gap' : '— a narrow gap'}
                </p>
                {outcomeMismatch && (
                  <p style={{ fontFamily: SERIF, fontSize: '15px', marginTop: '6px', lineHeight: 1.6, color: INK_SOFT }}>
                    Outcome mismatch — the public would {yesPercent > 50 ? 'pass' : 'block'} this bill, but Parliament {mpAyePercent > 50 ? 'passed' : 'rejected'} it.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sponsor */}
      {bill.sponsor_name && (
        <section style={{ marginBottom: '34px' }}>
          <Eyebrow>Sponsored by</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: CREAM_DEEP, border: `1px solid ${INK_HAIRLINE}`, padding: '16px 18px' }}>
            {bill.sponsor_photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bill.sponsor_photo}
                alt={bill.sponsor_name}
                style={{ width: '60px', height: '60px', objectFit: 'cover', background: '#cfc6b1', border: `1px solid ${INK_HAIRLINE}`, flexShrink: 0, filter: 'contrast(1.05) sepia(0.05)' }}
              />
            ) : (
              <div style={{ width: '60px', height: '60px', background: '#cfc6b1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: '20px', fontWeight: 'bold', color: INK, flexShrink: 0, border: `1px solid ${INK_HAIRLINE}` }}>
                {bill.sponsor_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', lineHeight: 1.25 }}>{bill.sponsor_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                {bill.sponsor_party && (
                  <span style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', color: '#ebe5d8', background: bill.sponsor_party_colour ? `#${String(bill.sponsor_party_colour).replace('#', '')}` : '#7697a2' }}>
                    {bill.sponsor_party}
                  </span>
                )}
                {bill.sponsor_constituency && (
                  <span style={{ fontFamily: SERIF, fontSize: '14px', color: INK_SOFT }}>{bill.sponsor_constituency}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bill passage */}
      {stages.length > 0 && (
        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '28px', marginBottom: '38px' }}>
          <Eyebrow>Bill passage</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {commonsStages.length > 0 && <StageGroup label="Commons" colour={ACCENT} stages={commonsStages} />}
            {lordsStages.length > 0 && <StageGroup label="Lords" colour={DANGER} stages={lordsStages} />}
            {royalAssent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '14px', borderTop: `1px solid ${INK_HAIRLINE}` }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: SUCCESS, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', color: SUCCESS, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Royal Assent</span>
                  {royalAssent.stageSittings[0]?.date && (
                    <span style={{ fontFamily: SERIF, fontSize: '14px', color: INK_SOFT }}>{fmtDate(royalAssent.stageSittings[0].date)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full description */}
      {bill.description &&
       bill.description !== bill.title &&
       bill.description.trim().toLowerCase() !== 'no description available' && (
        <details style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '22px', marginBottom: '40px' }}>
          <summary style={{ cursor: 'pointer', fontFamily: MONO, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 'bold', color: INK }}>
            Full bill description{' '}
            <span style={{ textTransform: 'none', letterSpacing: 'normal', opacity: 0.7 }}>(click to expand)</span>
          </summary>
          <p style={{ fontFamily: SERIF, fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: '14px' }}>
            {bill.description}
          </p>
        </details>
      )}

      <ScrollToTopButton />
    </DossierShell>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function explanationPoints(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((p) => String(p))
  } catch {}
  return raw.split('\n').filter(Boolean)
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 'bold', color: ACCENT, marginBottom: '12px' }}>
      {children}
    </p>
  )
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.13em', color: colour, border: `1px solid ${colour}`, background: 'transparent' }}>
      {children}
    </span>
  )
}

function ExplainerColumn({ label, colour, points }: { label: string; colour: string; points: string[] }) {
  return (
    <div style={{ borderLeft: `3px solid ${colour}`, padding: '14px 18px', background: CREAM_DEEP }}>
      <p style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 'bold', color: colour, marginBottom: '12px' }}>
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {points.map((point, i) => (
          <li key={i} style={{ fontFamily: SERIF, fontSize: '14px', lineHeight: 1.65, display: 'flex', gap: '8px' }}>
            <span style={{ color: colour, flexShrink: 0, fontWeight: 'bold' }}>—</span>
            <span>{point.replace(/^[-–]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VoteBar({
  label,
  totalLabel,
  yesPct,
  noPct,
  yesText,
  noText,
  muted = false,
  empty = false,
}: {
  label: string
  totalLabel: string
  yesPct: number
  noPct: number
  yesText: string
  noText: string
  muted?: boolean
  empty?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 'bold', color: INK_SOFT }}>
        <span>{label}</span>
        <span>{totalLabel}</span>
      </div>
      {empty ? (
        <div style={{ fontFamily: MONO, fontSize: '12px', fontStyle: 'italic', color: INK_SOFT }}>No public votes yet — be the first.</div>
      ) : (
        <>
          <div style={{ height: '10px', background: CREAM_DEEP, display: 'flex', border: `1px solid ${INK_HAIRLINE}`, overflow: 'hidden' }} aria-hidden>
            {yesPct > 0 && <div style={{ width: `${yesPct}%`, background: SUCCESS, opacity: muted ? 0.7 : 1 }} />}
            {noPct > 0 && <div style={{ width: `${noPct}%`, background: DANGER, opacity: muted ? 0.7 : 1 }} />}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontFamily: SERIF, fontSize: '14px' }}>
            <span style={{ color: SUCCESS, fontWeight: 'bold' }}>{yesText}</span>
            <span style={{ color: DANGER, fontWeight: 'bold' }}>{noText}</span>
          </div>
        </>
      )}
    </div>
  )
}

function StageGroup({ label, colour, stages }: { label: string; colour: string; stages: Stage[] }) {
  return (
    <div>
      <p style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 'bold', marginBottom: '12px', color: colour }}>
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage) => (
          <li key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colour, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: SERIF, fontSize: '14px' }}>{stage.description}</span>
              {stage.stageSittings[0]?.date && (
                <span style={{ fontFamily: SERIF, fontSize: '13px', color: INK_SOFT }}>{fmtDate(stage.stageSittings[0].date)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
