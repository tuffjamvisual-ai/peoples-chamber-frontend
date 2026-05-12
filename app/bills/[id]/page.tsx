// Server component — renders bill metadata, summary, support/oppose
// explanations, sponsor, vote bars, and stage timeline directly in
// the initial HTML so Googlebot indexes the content. Vote buttons
// + auth flow live in a small client island (BillVotingClient).

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import BillVotingClient from './BillVotingClient'

export const revalidate = 3600

const ACCENT = '#ffffff'
const SUCCESS = '#4a8a3a'
const DANGER = '#8a3a3a'
const WARN = '#c9c9c9'

type Stage = {
  id: number
  description: string
  house: string
  stageSittings: { date: string }[]
  sortOrder: number
}

async function fetchStages(parliamentId: number | null): Promise<Stage[]> {
  if (!parliamentId) return []
  try {
    const res = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}/Stages`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || []) as Stage[]
  } catch {
    return []
  }
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const billId = parseInt(id, 10)
  if (!Number.isFinite(billId)) notFound()

  const { data: bill } = await supabase.from('bill').select('*').eq('id', billId).single()
  if (!bill) notFound()

  const stages: Stage[] = await fetchStages(bill.parliament_id)

  const yesVotes = bill.vote_count_yes || 0
  const noVotes  = bill.vote_count_no  || 0
  const absVotes = bill.vote_count_abstain || 0
  const totalVotes = yesVotes + noVotes + absVotes
  const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0
  const noPercent  = totalVotes > 0 ? Math.round((noVotes  / totalVotes) * 100) : 0

  const totalMPVotes = (bill.commons_ayes || 0) + (bill.commons_noes || 0)
  const mpAyePercent = totalMPVotes > 0 ? Math.round(((bill.commons_ayes || 0) / totalMPVotes) * 100) : 0
  const mpNoePercent = totalMPVotes > 0 ? Math.round(((bill.commons_noes || 0) / totalMPVotes) * 100) : 0

  const democraticGap = totalMPVotes > 0 && totalVotes > 0 ? Math.abs(yesPercent - mpAyePercent) : null
  const outcomeMismatch = democraticGap !== null && ((yesPercent > 50 && mpAyePercent < 50) || (yesPercent < 50 && mpAyePercent > 50))

  const keyStageNames = ['1st reading', '2nd reading', 'Committee stage', 'Report stage', '3rd reading', 'Royal Assent']
  const keyStages = stages.filter((s) => keyStageNames.includes(s.description))
  const commonsStages = keyStages.filter((s) => s.house === 'Commons')
  const lordsStages = keyStages.filter((s) => s.house === 'Lords')
  const royalAssent = stages.find((s) => s.description === 'Royal Assent')

  return (
    <div className="min-h-screen bg-[#606060] text-white">
      <Navigation />

      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {bill.is_act && <Tag colour={SUCCESS}>✓ Passed into Law</Tag>}
          {bill.is_defeated && <Tag colour={DANGER}>✗ Defeated</Tag>}
          {bill.bill_withdrawn && <Tag colour="#7697a2">Withdrawn</Tag>}
          {!bill.is_act && !bill.is_defeated && !bill.bill_withdrawn && <Tag colour={ACCENT}>{bill.category}</Tag>}
          {bill.originating_house && <Tag colour="#7697a2">{bill.originating_house}</Tag>}
          {bill.current_stage && <Tag colour="#7697a2">{bill.current_stage}</Tag>}
        </div>

        {/* Title */}
        <header className="border-b border-[#5a5a5a] pb-8 mb-8">
          <p className="text-[13px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: ACCENT }}>
            UK Parliament · Bill
          </p>
          <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight text-white">{bill.title}</h1>
        </header>

        {/* Plain Summary */}
        {bill.plain_summary && (
          <section className="border-l-2 p-5 mb-8" style={{ borderLeftColor: ACCENT }}>
            <p className="text-[13px] uppercase tracking-[0.25em] mb-2 font-semibold" style={{ color: ACCENT }}>Summary</p>
            <p className="text-white text-[14px] leading-[1.7]">{bill.plain_summary}</p>
          </section>
        )}

        {/* Support / Oppose */}
        {(bill.support_explanation || bill.oppose_explanation) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-px border border-[#5a5a5a] mb-8">
            {bill.support_explanation && (
              <div className="p-5 border-l-2" style={{ borderLeftColor: SUCCESS }}>
                <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: SUCCESS }}>
                  A vote to support means
                </p>
                <ul className="space-y-2">
                  {explanationPoints(bill.support_explanation).map((point, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-white leading-[1.7]">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: SUCCESS }}>—</span>
                      <span>{point.replace(/^[-–]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {bill.oppose_explanation && (
              <div className="p-5 border-l-2" style={{ borderLeftColor: DANGER }}>
                <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: DANGER }}>
                  A vote to oppose means
                </p>
                <ul className="space-y-2">
                  {explanationPoints(bill.oppose_explanation).map((point, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-white leading-[1.7]">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: DANGER }}>—</span>
                      <span>{point.replace(/^[-–]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Sponsor */}
        {bill.sponsor_name && (
          <section className="border border-[#5a5a5a] border-l-2 border-l-[#ffffff] p-5 mb-8">
            <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>Sponsored by</p>
            <div className="flex items-center gap-4">
              {bill.sponsor_photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={bill.sponsor_photo} alt={bill.sponsor_name} className="w-16 h-16 rounded-full bg-[#505050]" style={{ border: `1px solid ${ACCENT}` }} />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#505050] flex items-center justify-center text-[13px] uppercase tracking-wider text-white" style={{ border: `1px solid ${ACCENT}` }}>
                  {bill.sponsor_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="text-white font-bold text-[14px] leading-snug">{bill.sponsor_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {bill.sponsor_party && (
                    <span
                      className="text-[13px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-sm text-white"
                      style={{ backgroundColor: `#${bill.sponsor_party_colour}` || '#7697a2' }}
                    >
                      {bill.sponsor_party}
                    </span>
                  )}
                  {bill.sponsor_constituency && (
                    <span className="text-[14px] text-white font-mono">{bill.sponsor_constituency}</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cast Your Vote */}
        <section className="border border-[#5a5a5a] p-6 mb-8">
          <h2 className="text-2xl font-black tracking-tight text-white mb-6">Cast Your Vote</h2>

          <div className="mb-4">
            <div className="flex justify-between text-[13px] uppercase tracking-[0.2em] text-white mb-1.5 font-mono">
              <span>People&apos;s Vote</span>
              <span>{totalVotes.toLocaleString()} votes</span>
            </div>
            <div className="h-2 bg-[#404040] flex">
              {yesPercent > 0 && <div className="h-full" style={{ width: `${yesPercent}%`, backgroundColor: SUCCESS }} />}
              {noPercent > 0 && <div className="h-full" style={{ width: `${noPercent}%`, backgroundColor: DANGER }} />}
            </div>
            <div className="flex justify-between text-[14px] mt-1.5 font-mono">
              <span style={{ color: SUCCESS }}>{yesPercent}% Support · {yesVotes.toLocaleString()}</span>
              <span style={{ color: DANGER }}>{noPercent}% Oppose · {noVotes.toLocaleString()}</span>
            </div>
          </div>

          {totalMPVotes > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-[13px] uppercase tracking-[0.2em] text-white mb-1.5 font-mono">
                <span>Parliament&apos;s Vote</span>
                <span>{totalMPVotes.toLocaleString()} MPs</span>
              </div>
              <div className="h-2 bg-[#404040] flex">
                {mpAyePercent > 0 && <div className="h-full" style={{ width: `${mpAyePercent}%`, backgroundColor: SUCCESS, opacity: 0.7 }} />}
                {mpNoePercent > 0 && <div className="h-full" style={{ width: `${mpNoePercent}%`, backgroundColor: DANGER, opacity: 0.7 }} />}
              </div>
              <div className="flex justify-between text-[14px] mt-1.5 font-mono">
                <span style={{ color: SUCCESS }}>{mpAyePercent}% Ayes · {bill.commons_ayes?.toLocaleString()}</span>
                <span style={{ color: DANGER }}>{mpNoePercent}% Noes · {bill.commons_noes?.toLocaleString()}</span>
              </div>
            </div>
          )}

          {democraticGap !== null && (
            <div
              className="border-l-2 px-4 py-3 mb-6 bg-[#505050]"
              style={{ borderLeftColor: outcomeMismatch ? WARN : ACCENT }}
            >
              <p className="text-[13px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: outcomeMismatch ? WARN : ACCENT }}>
                Democratic Gap
              </p>
              <p className="text-white text-[13px] font-semibold leading-snug">
                {democraticGap}% {democraticGap > 20 ? '— Large gap' : democraticGap > 10 ? '— Moderate gap' : '— Small gap'}
              </p>
              {outcomeMismatch && (
                <p className="text-[15px] mt-1 leading-[1.7]" style={{ color: WARN }}>
                  Outcome mismatch — the public would {yesPercent > 50 ? 'pass' : 'block'} this bill, but Parliament {mpAyePercent > 50 ? 'passed' : 'rejected'} it
                </p>
              )}
            </div>
          )}

          <BillVotingClient billId={billId} />
        </section>

        {/* Bill Passage Timeline */}
        {stages.length > 0 && (
          <section className="border border-[#5a5a5a] p-6 mb-8">
            <h2 className="text-2xl font-black tracking-tight text-white mb-6">Bill Passage</h2>
            <div className="space-y-6">
              {commonsStages.length > 0 && <StageGroup label="Commons" colour={ACCENT} stages={commonsStages} />}
              {lordsStages.length > 0 && <StageGroup label="Lords" colour={DANGER} stages={lordsStages} />}
              {royalAssent && (
                <div className="flex items-center gap-3 pt-4 border-t border-[#5a5a5a]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SUCCESS }} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] font-bold" style={{ color: SUCCESS }}>Royal Assent</span>
                    {royalAssent.stageSittings[0]?.date && (
                      <span className="text-[14px] text-white font-mono uppercase tracking-[0.15em]">
                        {new Date(royalAssent.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Full Description */}
        {bill.description && bill.description !== bill.title && (
          <details className="border border-[#5a5a5a]">
            <summary className="px-6 py-4 cursor-pointer hover:bg-[#505050] transition-colors text-[15px] uppercase tracking-[0.2em] font-semibold text-white">
              Full Bill Description
              <span className="text-white text-[14px] ml-2 normal-case tracking-normal">(click to expand)</span>
            </summary>
            <div className="px-6 pb-6">
              <p className="text-white text-[13px] leading-[1.7] whitespace-pre-wrap">{bill.description}</p>
            </div>
          </details>
        )}

        <div className="mt-10 text-[13px] uppercase tracking-[0.2em]">
          <Link href="/bills" className="text-white opacity-70 hover:opacity-100">← Back to all bills</Link>
        </div>
      </main>
    </div>
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
      className="inline-block px-2 py-1 text-[13px] uppercase tracking-[0.15em] font-semibold rounded-sm"
      style={{ color: colour, backgroundColor: colour + '22', border: `1px solid ${colour}55` }}
    >
      {children}
    </span>
  )
}

function StageGroup({ label, colour, stages }: { label: string; colour: string; stages: Stage[] }) {
  return (
    <div>
      <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: colour }}>{label}</p>
      <ul className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[13px] text-white">{stage.description}</span>
              {stage.stageSittings[0]?.date && (
                <span className="text-[14px] text-white font-mono uppercase tracking-[0.15em]">
                  {new Date(stage.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
