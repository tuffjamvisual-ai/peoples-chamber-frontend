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

  // Sponsors come from bill.sponsors (refreshed weekly by
  // /api/sync-bill-sponsors). No live Parliament-API call here.
  type StoredSponsor = { name: string; party?: string | null; sortOrder?: number; isMember?: boolean }
  const sponsorsData = bill.sponsors as { items?: StoredSponsor[] } | null
  const storedSponsors: StoredSponsor[] = (sponsorsData?.items || []).slice().sort(
    (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
  )
  const presented = storedSponsors[0]?.name || bill.sponsor_name || ''
  const supporters = storedSponsors.slice(1).map((s) => s.name)
  const supportersLine =
    supporters.length === 0
      ? ''
      : supporters.length === 1
      ? supporters[0]
      : supporters.slice(0, -1).join(', ') + ' and ' + supporters[supporters.length - 1]

  const yesVotes = bill.vote_count_yes || 0
  const noVotes = bill.vote_count_no || 0
  // Abstain has been retired from the ballot; exclude historical abstain
  // counts from displayed totals so percentages reflect the live binary.
  const totalVotes = yesVotes + noVotes
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

      {/* The whole bill page is one continuous Victorian Bill sheet: cover,
          brief, explainers, ballot, sponsor and stages all sit on the same
          parchment, separated by ruling lines rather than boxed cards. */}
      <article
        style={{
          background: "#efe6d2 url('/bill-parchment.webp') center top / 100% auto repeat-y",
          border: '1px solid rgba(26,20,14,0.3)',
          boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
          padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
          color: '#1a140e',
          fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
        }}
      >
      <header
        style={{
          marginBottom: '32px',
          color: '#1a140e',
          fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
        }}
      >
        {/* Ruled title bar */}
        <div
          style={{
            borderTop: `1.5px solid ${INK}`,
            borderBottom: `1.5px solid ${INK}`,
            padding: '14px 12px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '12px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            UK Parliament · Public Bill{serial ? ` · No. ${serial}` : ''}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {bill.title}
          </h1>
        </div>

        {/* [AS INTRODUCED] */}
        <div style={{ textAlign: 'center', fontFamily: SERIF, fontSize: '14px', letterSpacing: '0.1em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '24px' }}>
          [As Introduced]
        </div>

        {/* "A / BILL / TO" centrepiece */}
        <div style={{ textAlign: 'center', margin: '6px 0 22px' }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(16px, 1.8vw, 20px)', color: INK, marginBottom: '4px' }}>A</div>
          <div style={{ fontFamily: SERIF, fontSize: 'clamp(58px, 8vw, 96px)', fontWeight: 500, letterSpacing: '0.42em', lineHeight: 1, color: INK, marginLeft: '0.42em' }}>
            BILL
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(16px, 1.8vw, 20px)', color: INK, marginTop: '8px' }}>
            to
          </div>
        </div>

        {/* Bill body — the full description sits INSIDE the cover sheet
            so the page doesn't extend below the template. Priority:
            description (richest) > long_title (formal preamble) >
            plain_summary (last resort). Set in typewriter, justified. */}
        {(() => {
          const pickRaw = [bill.description, bill.long_title, bill.plain_summary].find(
            (t) =>
              !!t &&
              t.trim().toLowerCase() !== 'no description available' &&
              t.trim() !== (bill.title || '').trim()
          );
          const text = (pickRaw || '').trim();
          if (!text) return null;
          return (
            <p
              style={{
                fontFamily: MONO,
                fontSize: 'clamp(13px, 1.15vw, 14px)',
                lineHeight: 1.75,
                textAlign: 'justify',
                margin: '0 auto 26px',
                maxWidth: '46em',
                color: INK,
                whiteSpace: 'pre-wrap',
              }}
            >
              {text}
            </p>
          );
        })()}

        {/* Presented by [Sponsor], supported by [supporters] — typewriter
            italic block, matching the printed Bill template. Supporters
            come from the live Parliament Bills API (most bills list only
            the lead sponsor — the "supported by" line appears only where
            additional sponsors are recorded). */}
        {presented && (
          <div
            style={{
              textAlign: 'center',
              fontFamily: MONO,
              fontStyle: 'italic',
              fontSize: 'clamp(13px, 1.1vw, 14px)',
              color: INK,
              marginBottom: '26px',
              lineHeight: 1.7,
              maxWidth: '36em',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Presented by {presented}
            {supportersLine && (
              <>
                <br />
                supported by {supportersLine}
              </>
            )}
            .
          </div>
        )}

        {/* Status tags — preserved underneath as small chips so the cover stays clean */}
        {(bill.is_act || bill.is_defeated || bill.bill_withdrawn || bill.category || bill.originating_house || bill.current_stage) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '22px', justifyContent: 'center' }}>
            {bill.is_act && <Tag colour={SUCCESS}>✓ Passed into law</Tag>}
            {bill.is_defeated && <Tag colour={DANGER}>✗ Defeated</Tag>}
            {bill.bill_withdrawn && <Tag colour={INK_SOFT}>Withdrawn</Tag>}
            {bill.category && <Tag colour={ACCENT}>{bill.category}</Tag>}
            {bill.originating_house && <Tag colour={INK_SOFT}>{bill.originating_house}</Tag>}
            {bill.current_stage && <Tag colour={INK_SOFT}>{bill.current_stage}</Tag>}
          </div>
        )}
      </header>


      {/* The ballot — interactive cross-box vote + the running counts.
          Sits on the parchment, separated by a ruling line above. */}
      <section style={{ marginBottom: '40px', borderTop: `1.5px solid ${INK}`, paddingTop: '28px' }}>
        <div style={{ position: 'relative', padding: '0 4px' }}>
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
        <section style={{ marginBottom: '34px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '24px' }}>
          <Eyebrow>Sponsored by</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '4px 0' }}>
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

      </article>

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
