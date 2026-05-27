// Server component — renders bill metadata, summary, support/oppose
// explanations, sponsor, vote bars, and stage timeline directly in
// the initial HTML so Googlebot indexes the content. Vote buttons
// + auth flow live in a small client island (BillVotingClient).
//
// Magazine template (matches /bills, /mps/[id], /departments/[slug]).

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScrollToTopButton from '../../components/ScrollToTopButton'
import BillVotingClient from './BillVotingClient'
import DossierShell from '../../components/DossierShell'
export const revalidate = 3600

// Magazine palette.
const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM = '#ebe5d8'
const ACCENT = '#7a1612'        // deep red, used elsewhere on magazine pages
const SUCCESS = '#4a8a3a'
const DANGER = '#a64030'
const WARN = '#b88a30'

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
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
        >
          ← Back to all bills
        </a>

        {/* Status badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {bill.is_act && <Tag colour={SUCCESS}>✓ Passed into Law</Tag>}
          {bill.is_defeated && <Tag colour={DANGER}>✗ Defeated</Tag>}
          {bill.bill_withdrawn && <Tag colour={INK_SOFT}>Withdrawn</Tag>}
          {!bill.is_act && !bill.is_defeated && !bill.bill_withdrawn && bill.category && (
            <Tag colour={ACCENT}>{bill.category}</Tag>
          )}
          {bill.originating_house && <Tag colour={INK_SOFT}>{bill.originating_house}</Tag>}
          {bill.current_stage && <Tag colour={INK_SOFT}>{bill.current_stage}</Tag>}
        </div>

        {/* Title */}
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
            UK Parliament · Bill
          </p>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
              lineHeight: 1.05,
            }}
          >
            {bill.title}
          </h1>
        </header>

        {/* Plain Summary */}
        {bill.plain_summary && (
          <section
            style={{
              borderLeft: `3px solid ${ACCENT}`,
              padding: '16px 20px',
              marginBottom: '32px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: ACCENT,
              }}
            >
              Summary
            </p>
            <p style={{ fontSize: '16px', lineHeight: 1.8 }}>{bill.plain_summary}</p>
          </section>
        )}

        {/* Support / Oppose */}
        {(bill.support_explanation || bill.oppose_explanation) && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            {bill.support_explanation && (
              <ExplainerColumn
                label="A vote to support means"
                colour={SUCCESS}
                points={explanationPoints(bill.support_explanation)}
              />
            )}
            {bill.oppose_explanation && (
              <ExplainerColumn
                label="A vote to oppose means"
                colour={DANGER}
                points={explanationPoints(bill.oppose_explanation)}
              />
            )}
          </section>
        )}

        {/* Sponsor */}
        {bill.sponsor_name && (
          <section
            style={{
              background: CREAM,
              padding: '20px',
              marginBottom: '32px',
              borderLeft: `3px solid ${ACCENT}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                marginBottom: '12px',
                fontWeight: 'bold',
                color: ACCENT,
              }}
            >
              Sponsored by
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {bill.sponsor_photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={bill.sponsor_photo}
                  alt={bill.sponsor_name}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    background: '#d6cdb8',
                    border: `1px solid ${INK_HAIRLINE}`,
                    flexShrink: 0,
                    filter: 'contrast(1.05) sepia(0.05)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    background: '#d6cdb8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: INK,
                    flexShrink: 0,
                    border: `1px solid ${INK_HAIRLINE}`,
                  }}
                >
                  {bill.sponsor_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>{bill.sponsor_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {bill.sponsor_party && (
                    <span
                      style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        color: CREAM,
                        background: bill.sponsor_party_colour
                          ? `#${String(bill.sponsor_party_colour).replace('#', '')}`
                          : '#7697a2',
                      }}
                    >
                      {bill.sponsor_party}
                    </span>
                  )}
                  {bill.sponsor_constituency && (
                    <span style={{ fontSize: '14px', color: INK_SOFT }}>{bill.sponsor_constituency}</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cast Your Vote */}
        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '32px', marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 'bold',
              letterSpacing: '-0.01em',
              marginBottom: '20px',
              transform: 'rotate(-0.2deg)',
            }}
          >
            Cast Your Vote
          </h2>

          <VoteBar
            label="People's Vote"
            totalLabel={`${totalVotes.toLocaleString()} votes`}
            yesPct={yesPercent}
            noPct={noPercent}
            yesText={`${yesPercent}% Support · ${yesVotes.toLocaleString()}`}
            noText={`${noPercent}% Oppose · ${noVotes.toLocaleString()}`}
          />

          {totalMPVotes > 0 && (
            <div style={{ marginTop: '20px' }}>
              <VoteBar
                label="Parliament's Vote"
                totalLabel={`${totalMPVotes.toLocaleString()} MPs`}
                yesPct={mpAyePercent}
                noPct={mpNoePercent}
                yesText={`${mpAyePercent}% Ayes · ${(bill.commons_ayes || 0).toLocaleString()}`}
                noText={`${mpNoePercent}% Noes · ${(bill.commons_noes || 0).toLocaleString()}`}
                muted
              />
            </div>
          )}

          {democraticGap !== null && (
            <div
              style={{
                borderLeft: `3px solid ${outcomeMismatch ? WARN : ACCENT}`,
                padding: '14px 20px',
                marginTop: '24px',
                background: CREAM,
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                  color: outcomeMismatch ? WARN : ACCENT,
                }}
              >
                Democratic Gap
              </p>
              <p style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1.4 }}>
                {democraticGap}% {democraticGap > 20 ? '— Large gap' : democraticGap > 10 ? '— Moderate gap' : '— Small gap'}
              </p>
              {outcomeMismatch && (
                <p style={{ fontSize: '15px', marginTop: '6px', lineHeight: 1.7, color: INK_SOFT }}>
                  Outcome mismatch — the public would{' '}
                  {yesPercent > 50 ? 'pass' : 'block'} this bill, but Parliament{' '}
                  {mpAyePercent > 50 ? 'passed' : 'rejected'} it.
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <BillVotingClient billId={billId} />
          </div>
        </section>

        {/* Bill Passage Timeline */}
        {stages.length > 0 && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '32px', marginBottom: '40px' }}>
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                letterSpacing: '-0.01em',
                marginBottom: '20px',
                transform: 'rotate(-0.2deg)',
              }}
            >
              Bill Passage
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {commonsStages.length > 0 && <StageGroup label="Commons" colour={ACCENT} stages={commonsStages} />}
              {lordsStages.length > 0 && <StageGroup label="Lords" colour={DANGER} stages={lordsStages} />}
              {royalAssent && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${INK_HAIRLINE}`,
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: SUCCESS,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: SUCCESS, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                      Royal Assent
                    </span>
                    {royalAssent.stageSittings[0]?.date && (
                      <span style={{ fontSize: '14px', color: INK_SOFT }}>
                        {new Date(royalAssent.stageSittings[0].date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Full Description */}
        {bill.description &&
         bill.description !== bill.title &&
         bill.description.trim().toLowerCase() !== 'no description available' && (
          <details style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '24px', marginBottom: '40px' }}>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              Full Bill Description{' '}
              <span style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', opacity: 0.7 }}>
                (click to expand)
              </span>
            </summary>
            <p style={{ fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: '12px' }}>
              {bill.description}
            </p>
          </details>
        )}

      <ScrollToTopButton />
    </DossierShell>
  )
}

function explanationPoints(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((p) => String(p))
  } catch {}
  return raw.split('\n').filter(Boolean)
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

function ExplainerColumn({ label, colour, points }: { label: string; colour: string; points: string[] }) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${colour}`,
        padding: '14px 20px',
        background: CREAM,
      }}
    >
      <p
        style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          marginBottom: '12px',
          fontWeight: 'bold',
          color: colour,
        }}
      >
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {points.map((point, i) => (
          <li key={i} style={{ fontSize: '14px', lineHeight: 1.7, display: 'flex', gap: '8px' }}>
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
}: {
  label: string
  totalLabel: string
  yesPct: number
  noPct: number
  yesText: string
  noText: string
  muted?: boolean
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontWeight: 'bold',
        }}
      >
        <span>{label}</span>
        <span style={{ color: INK_SOFT }}>{totalLabel}</span>
      </div>
      <div
        style={{
          height: '10px',
          background: '#d6cdb8',
          display: 'flex',
          border: `1px solid ${INK_HAIRLINE}`,
          overflow: 'hidden',
        }}
      >
        {yesPct > 0 && (
          <div style={{ width: `${yesPct}%`, background: SUCCESS, opacity: muted ? 0.7 : 1 }} />
        )}
        {noPct > 0 && (
          <div style={{ width: `${noPct}%`, background: DANGER, opacity: muted ? 0.7 : 1 }} />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '6px',
          fontSize: '14px',
        }}
      >
        <span style={{ color: SUCCESS, fontWeight: 'bold' }}>{yesText}</span>
        <span style={{ color: DANGER, fontWeight: 'bold' }}>{noText}</span>
      </div>
    </div>
  )
}

function StageGroup({ label, colour, stages }: { label: string; colour: string; stages: Stage[] }) {
  return (
    <div>
      <p
        style={{
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: colour,
        }}
      >
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage) => (
          <li key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: colour,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '14px' }}>{stage.description}</span>
              {stage.stageSittings[0]?.date && (
                <span style={{ fontSize: '13px', color: INK_SOFT }}>
                  {new Date(stage.stageSittings[0].date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
