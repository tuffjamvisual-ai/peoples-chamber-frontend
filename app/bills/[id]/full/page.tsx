// The "full bill" page. Surfaces every publication Parliament has
// released for this bill: the bill text at each stage, Explanatory
// Notes, Impact Assessments, amendment papers, written evidence,
// committee reports, briefings, the lot. Pulled live from the
// Parliament Bills API rather than mirrored into Supabase because
// (a) the volume is heavy — big bills carry 250+ publications and
// 3,893 bills would explode the table — and (b) it's not a high-
// traffic page, so paying for an API call every 24 hours per bill
// (ISR revalidate window) is cheaper than maintaining a sync cron.
// This is the documented exception to the "no API in render" rule.
//
// PDFs themselves stay on publications.parliament.uk / the bills
// API document-download endpoint; we just link to them. Each
// publication exposes either `links[].url` (direct CDN URL) or
// `files[]` (need to build the /Documents/{fileId}/Download URL).

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DossierShell from '../../../components/DossierShell'

export const revalidate = 86400  // re-fetch from Parliament once a day

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const ACCENT = '#7a1612'
const SERIF = 'Georgia, "Times New Roman", serif'
const MONO = 'Special Elite, monospace'

// Sort order for the publication-type groupings. Anything not on
// this list sorts to the end alphabetically — keeps obscure types
// (Press notices, Will write letters etc.) below the bill text +
// Explanatory Notes block where readers actually look.
const TYPE_ORDER = [
  'Bill',
  'Explanatory Notes',
  'Impact Assessments',
  'Delegated Powers Memorandum',
  'Human rights memorandum',
  'Briefing papers',
  'Amendment Paper',
  'Bill proceedings: Commons',
  'Bill proceedings: Lords',
  'Selection of amendments: Commons',
  'Selection of amendments: Lords',
  'Written evidence',
  'Select Committee report',
  'Minutes of Reasons Committee',
  'Will write letters',
  'Press notices',
]

type ApiFile = { id: number; filename?: string; contentLength?: number }
type ApiLink = { title?: string; url?: string }
type ApiPublication = {
  id: number
  title?: string
  displayDate?: string
  house?: string
  publicationType?: { name?: string }
  links?: ApiLink[]
  files?: ApiFile[]
}
type ApiSponsor = {
  member?: {
    memberId?: number
    name?: string
    party?: string
    partyColour?: string
    memberFrom?: string
  }
  organisation?: { name?: string } | null
  sortOrder?: number
}
type ApiBill = {
  shortTitle?: string
  longTitle?: string | null
  summary?: string | null
  sponsors?: ApiSponsor[]
  originatingHouse?: string
  currentHouse?: string
  isAct?: boolean
  billWithdrawn?: string | null
  isDefeated?: boolean
  currentStage?: { description?: string; house?: string }
  lastUpdate?: string
}

function pickUrl(p: ApiPublication): string | null {
  const link = p.links?.find((l) => !!l.url)
  if (link?.url) return link.url
  const file = p.files?.find((f) => !!f.id)
  if (file?.id) {
    return `https://bills-api.parliament.uk/api/v1/Publications/${p.id}/Documents/${file.id}/Download`
  }
  return null
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function FullBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const billId = parseInt(id, 10)
  if (!Number.isFinite(billId)) notFound()

  const { data: bill } = await supabase
    .from('bill')
    .select('id, parliament_id, title, current_stage, is_act')
    .eq('id', billId)
    .single()
  if (!bill || bill.parliament_id == null) notFound()

  // Two parallel live API calls, cached for 24 h. We need BOTH:
  //   - /Bills/{id}         -> longTitle (the rich "A Bill to..." formal
  //                            description), sponsor list, current stage.
  //                            Populated for almost every active bill.
  //   - /Bills/{id}/Publications -> bill text PDFs, Explanatory Notes,
  //                            amendment papers, impact assessments.
  //                            EMPTY for ~46% of bills (old PMBs, money
  //                            bills, withdrawn bills) so we can't rely
  //                            on this alone to fill the page.
  let publications: ApiPublication[] = []
  let billMeta: ApiBill | null = null
  let apiError: string | null = null
  const headers = { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } }
  try {
    const [metaRes, pubRes] = await Promise.all([
      fetch(`https://bills-api.parliament.uk/api/v1/Bills/${bill.parliament_id}`, headers),
      fetch(`https://bills-api.parliament.uk/api/v1/Bills/${bill.parliament_id}/Publications`, headers),
    ])
    if (metaRes.ok) billMeta = (await metaRes.json()) as ApiBill
    if (pubRes.ok) {
      const json = (await pubRes.json()) as { publications?: ApiPublication[] }
      publications = json.publications || []
    } else if (!metaRes.ok) {
      apiError = `Parliament API returned HTTP ${pubRes.status}.`
    }
  } catch (e) {
    apiError = `Could not reach the Parliament Bills API: ${(e as Error).message}.`
  }

  // Group by publication type, sort each group by date desc.
  const grouped = new Map<string, ApiPublication[]>()
  for (const p of publications) {
    const t = p.publicationType?.name || 'Other'
    const arr = grouped.get(t) || []
    arr.push(p)
    grouped.set(t, arr)
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => (b.displayDate || '').localeCompare(a.displayDate || ''))
  }

  // Order groups: TYPE_ORDER first, then anything else alphabetically.
  const orderedTypes = Array.from(grouped.keys()).sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a)
    const bi = TYPE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <DossierShell>
      <a
        href={`/bills/${billId}`}
        className="no-hover-scale"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '-6%', marginBottom: '14px', color: INK,
          textDecoration: 'none', fontFamily: MONO, fontSize: '13px',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
      >
        ← Back to bill summary
      </a>

      {/* Wrap the body in the same parchment <article> the bill summary
          page uses so the full-bill page reads as a continuation of the
          bill broadsheet, not as a separate folder. The bill-parchment
          webp tile + warm cream background are identical to /bills/[id]. */}
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

      <header style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: MONO, fontSize: '12px', letterSpacing: '0.3em',
          textTransform: 'uppercase', color: ACCENT, marginBottom: '10px',
        }}>
          The full bill · Parliament publications
        </p>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 3.4vw, 40px)',
          fontWeight: 'bold', lineHeight: 1.15, marginBottom: '14px',
        }}>
          {bill.title}
        </h1>
        <p style={{
          fontFamily: MONO, fontSize: '13px', lineHeight: 1.7,
          color: INK_SOFT, maxWidth: '46em',
        }}>
          Every document Parliament has published for this bill — the bill
          text at each stage, Explanatory Notes, Impact Assessments,
          amendment papers, written evidence, committee reports. Pulled
          live from the Parliament Bills API. PDFs open in a new tab.
        </p>
      </header>

      {apiError && (
        <div style={{
          border: `1px solid ${INK_HAIRLINE}`, borderLeft: `3px solid ${ACCENT}`,
          padding: '14px 18px', fontFamily: MONO, fontSize: '13px',
          color: INK_SOFT, marginBottom: '32px',
        }}>
          {apiError} Try again in a minute, or check{' '}
          <a
            href={`https://bills.parliament.uk/bills/${bill.parliament_id}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: ACCENT, textDecoration: 'underline' }}
          >
            bills.parliament.uk
          </a>{' '}
          directly.
        </div>
      )}

      {/* Formal "A Bill to..." preamble from /Bills/{id}.longTitle —
          this IS the bill's official description. Rich for almost
          every active bill (171-720 chars), null for some very old
          PMBs. When present, it sits above the publications list. */}
      {billMeta?.longTitle && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT,
            marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`,
            paddingBottom: '8px',
          }}>
            Long title · Parliament’s official description
          </h2>
          <p style={{
            fontFamily: SERIF, fontSize: 'clamp(15px, 1.2vw, 17px)',
            lineHeight: 1.7, color: INK, maxWidth: '46em',
          }}>
            {billMeta.longTitle}
          </p>
        </section>
      )}

      {/* Sponsor list from /Bills/{id}.sponsors. Lots of bills carry a
          single MP sponsor; PMBs sometimes have several. */}
      {billMeta?.sponsors && billMeta.sponsors.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT,
            marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`,
            paddingBottom: '8px',
          }}>
            Sponsors <span style={{ color: INK_SOFT, fontWeight: 'normal' }}>· {billMeta.sponsors.length}</span>
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {billMeta.sponsors.map((s, i) => {
              const name = s.member?.name || s.organisation?.name || '(unnamed)'
              const party = s.member?.party
              const from = s.member?.memberFrom
              const colour = s.member?.partyColour ? `#${s.member.partyColour.replace('#', '')}` : null
              return (
                <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: SERIF, fontSize: '15px', fontWeight: 'bold', color: INK }}>{name}</span>
                  {party && (
                    <span style={{ fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '1px 7px', color: '#ebe5d8', background: colour || '#7697a2' }}>
                      {party}
                    </span>
                  )}
                  {from && <span style={{ fontFamily: SERIF, fontSize: '13px', color: INK_SOFT }}>{from}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!apiError && publications.length === 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT,
            marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`,
            paddingBottom: '8px',
          }}>
            Publications
          </h2>
          <p style={{
            fontFamily: SERIF, fontSize: '15px', lineHeight: 1.6,
            color: INK_SOFT, maxWidth: '46em',
          }}>
            Parliament has not published documents for this bill. That’s common for older
            Private Members’ Bills that never reached committee, money bills, and bills
            withdrawn before debate. Try{' '}
            <a
              href={`https://bills.parliament.uk/bills/${bill.parliament_id}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: ACCENT, textDecoration: 'underline' }}
            >
              bills.parliament.uk
            </a>{' '}
            for the bill’s public record.
          </p>
        </section>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {orderedTypes.map((type) => {
          const items = grouped.get(type) || []
          return (
            <section key={type}>
              <h2 style={{
                fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT,
                marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`,
                paddingBottom: '8px',
              }}>
                {type} <span style={{ color: INK_SOFT, fontWeight: 'normal' }}>· {items.length}</span>
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((p) => {
                  const url = pickUrl(p)
                  const size = fmtSize(p.files?.[0]?.contentLength)
                  return (
                    <li key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      gap: '16px', borderBottom: `1px dotted ${INK_HAIRLINE}`, paddingBottom: '8px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: SERIF, fontSize: '15px', lineHeight: 1.45,
                              color: INK, textDecoration: 'underline', textUnderlineOffset: '3px',
                            }}
                          >
                            {p.title || '(untitled publication)'}
                          </a>
                        ) : (
                          <span style={{ fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>
                            {p.title || '(untitled publication)'} <em style={{ fontSize: '12px' }}>(no file)</em>
                          </span>
                        )}
                        {p.house && (
                          <span style={{ marginLeft: '10px', fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_SOFT }}>
                            {p.house}
                          </span>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, fontFamily: MONO, fontSize: '12px', color: INK_SOFT, textAlign: 'right' }}>
                        {fmtDate(p.displayDate)}
                        {size && <span style={{ marginLeft: '10px' }}>· {size}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <p style={{
        fontFamily: MONO, fontSize: '11px', color: INK_SOFT,
        marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${INK_HAIRLINE}`,
        textAlign: 'center',
      }}>
        Source: Parliament Bills API · cached for 24 hours · <Link href={`/bills/${billId}`} style={{ color: INK_SOFT, textDecoration: 'underline' }}>back to summary</Link>
      </p>
      </article>
    </DossierShell>
  )
}
