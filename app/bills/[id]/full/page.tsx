// The full bill (owner, 27 Oct 2026): the text of the bill itself, from Parliament's latest HTML version, cleaned into
// the site's style with a contents list of its clauses (lib/bill-text.ts). Where Parliament has no HTML version the page
// offers the latest bill text as a PDF. Below the text, every other document Parliament has published for the bill,
// grouped by type as before. The long title stays at the top; the rest of the summary page is not repeated.
//
// Fetched from Parliament's Bills API on the first visit and kept (publications a day, or 30 days for a settled bill;
// the cleaned text 24 hours); an empty answer is kept an hour at most and an error never (lib/bill-text.ts). The page
// itself rebuilds hourly, so an error message never stays longer than that. Large bills: up to INLINE_TEXT_BUDGET of
// the text is in the page, the rest loads a part at a time (BillTextGroups), so the page stays under 2 MB.
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import OpenGovShell from '../../../components/OpenGovShell'
import BackLink from '../../../components/BackLink';
import { withoutEmDashes } from '@/lib/no-em-dash'
import ParliamentSourceCredit from '@/app/components/ParliamentSourceCredit';
import { getBillPublications, getBillText, latestText, actLink, inlineGroupCount, type ApiPublication as TextPublication, type TocEntry } from '@/lib/bill-text';
import BillTextGroups from './BillTextGroups';

export const revalidate = 3600  // rebuilt hourly from the cached Parliament answers (lib/bill-text.ts)

// Prerender a deliberately tiny set. This page fetches live from the
// Parliament Bills API during render, so every prerendered path is a real
// API call at build time — hence 3, not 20. The list only needs to EXIST to
// enable ISR for the whole route; size buys nothing here and costs build
// time and an external dependency.
export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('bill')
    .select('id')
    .not('id', 'is', null)
    .limit(3)
  if (error) {
    throw new Error(
      `generateStaticParams(/bills/[id]/full) query failed: ${error.message}`
    )
  }
  if (!data || data.length === 0) {
    throw new Error('generateStaticParams(/bills/[id]/full): bill returned no rows')
  }
  return data.map((row) => ({ id: String(row.id) }))
}

const INK = '#14100d'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const ACCENT = '#7a1612'
const SERIF = 'var(--font-special-elite), monospace'
const MONO = 'var(--font-special-elite), monospace'

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
function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Where a publication's title links (23 Oct 2026): its own link, else its first file through the Bills API
// download endpoint, else the bill's publications page on Parliament's website.
function publicationHref(p: ApiPublication, parliamentId: number): string {
  const link = p.links?.[0]?.url
  if (link) return link
  const file = p.files?.[0]
  if (file?.id != null) return `https://bills-api.parliament.uk/api/v1/Publications/${p.id}/Documents/${file.id}/Download`
  return `https://bills.parliament.uk/bills/${parliamentId}/publications`
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// True when Parliament has not updated the bill for 90 days (see the Bills API cache below).
function isSettled(lastUpdate: string | null): boolean {
  const t = lastUpdate ? Date.parse(lastUpdate) : NaN
  return Number.isFinite(t) && Date.now() - t > 90 * 24 * 60 * 60 * 1000
}

export default async function FullBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const billId = parseInt(id, 10)
  if (!Number.isFinite(billId)) notFound()

  const { data: bill, error: billErr } = await supabase
    .from('bill')
    .select('id, parliament_id, title, long_title, current_stage, is_act, hidden_reason, last_update')
    .eq('id', billId)
    .single()
  // A failed read throws (owner's approval, 21 Oct 2026); "no row" (PGRST116) stays a 404.
  if (billErr && billErr.code !== 'PGRST116') throw new Error(`full bill: ${billErr.message}`)
  // Hidden bills (bill.hidden_reason) return 404, as /bills/[id] does.
  if (!bill || bill.parliament_id == null || bill.hidden_reason) notFound()

  let publications: ApiPublication[] = []
  let apiError: string | null = null
  try {
    publications = (await getBillPublications(bill.parliament_id, isSettled(bill.last_update))) as ApiPublication[]
  } catch (e) {
    console.error(`[full bill] ${billId}: ${(e as Error).message}`)
    apiError = 'Parliament’s Bills API could not be reached, so the bill’s text and documents are not shown. Try again later.'
  }
  const latest = latestText(publications as TextPublication[])
  let text = null
  if (latest?.html) {
    try { text = await getBillText(latest.html.url) } catch (e) { console.error(`[full bill] ${billId} text: ${(e as Error).message}`) }
  }
  const act = actLink(publications as TextPublication[])
  const inline = text ? inlineGroupCount(text) : 0
  const lazyGroups = text ? text.groups.slice(inline).map((g, k) => {
    const index = inline + k
    const entries = text!.toc.filter((t) => t.group === index)
    const first = entries[0]
    return { index, anchors: entries.map((t) => t.id), label: first ? tocLabel(first) : `Part ${index + 1} of the text` }
  }) : []
  const clauses = text ? text.toc.filter((t) => t.kind === 'clause').length : 0
  const schedules = text ? text.toc.filter((t) => t.kind === 'schedule').length : 0

  // Other documents: every publication except the version shown above, grouped by type, newest first.
  const shownTitle = latest?.title
  const grouped = new Map<string, ApiPublication[]>()
  for (const p of publications) {
    if (shownTitle && p.publicationType?.name === 'Bill' && versionOf(p.title) === shownTitle && text) continue
    const t = p.publicationType?.name || 'Other'
    grouped.set(t, [...(grouped.get(t) ?? []), p])
  }
  for (const arr of grouped.values()) arr.sort((a, b) => (b.displayDate || '').localeCompare(a.displayDate || ''))
  const orderedTypes = Array.from(grouped.keys()).sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a)
    const bi = TYPE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const h2: React.CSSProperties = {
    fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT,
    margin: '0 0 12px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px',
  }

  return (
    <OpenGovShell pageStamp="Bills">
      <BackLink
        fallbackHref={`/bills/${billId}`}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', transform: 'rotate(-0.2deg)' }}
      />
      <style>{BILL_TEXT_CSS}</style>

      <article style={{ padding: 0, color: INK, fontFamily: MONO }}>
        <header style={{ marginBottom: '28px' }}>
          <p style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>
            <Link href={`/bills/${billId}`} style={{ color: ACCENT }}>{bill.title}</Link>
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.4vw, 40px)', fontWeight: 'bold', lineHeight: 1.15, margin: '0 0 10px' }}>The full bill</h1>
          {latest && (
            <p style={{ fontFamily: MONO, fontSize: '16px', fontWeight: 'bold', margin: '0 0 14px' }}>
              {latest.label}{latest.date ? `, ${fmtLongDate(latest.date)}` : ''}
            </p>
          )}
          {bill.long_title && (
            <p style={{ fontFamily: SERIF, fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: 0 }}>{bill.long_title}</p>
          )}
          {act && (
            <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, margin: '14px 0 0' }}>
              This bill is now an Act. The text below is the last version of the bill; the Act as passed is on{' '}
              <a href={act.url} rel="noopener" style={{ color: ACCENT }}>legislation.gov.uk</a>.
            </p>
          )}
        </header>

        {apiError && (
          <div role="status" style={{ border: `1px solid ${INK_HAIRLINE}`, borderLeft: `3px solid ${ACCENT}`, padding: '14px 18px', fontFamily: MONO, fontSize: '15px', marginBottom: '32px' }}>
            {apiError}
          </div>
        )}

        {text ? (
          <>
            <details open className="bt-contents">
              <summary style={{ ...h2, cursor: 'pointer', listStyle: 'revert' }}>
                Contents · {clauses} {clauses === 1 ? 'clause' : 'clauses'}{schedules ? `, ${schedules} ${schedules === 1 ? 'schedule' : 'schedules'}` : ''}
              </summary>
              <ol className="bt-toc">
                {text.toc.map((t) => (
                  <li key={t.id} className={`bt-toc-${t.kind}`}><a href={`#${t.id}`}>{tocLabel(t)}</a></li>
                ))}
              </ol>
              {lazyGroups.length > 0 && (
                <p style={{ fontFamily: MONO, fontSize: '15px', margin: '10px 0 0' }}>
                  This is a long bill: the first {inline === 1 ? 'part is' : `${inline} parts are`} below, and the rest of the text loads part by part as you reach it or follow a link above.
                </p>
              )}
            </details>

            <section className="bt-text" aria-label="The text of the bill">
              {text.preamble && <p className="bt-preamble">{text.preamble}</p>}
              {text.groups.slice(0, inline).map((g) => (
                <div key={g.id} className="bt-group" dangerouslySetInnerHTML={{ __html: g.html }} />
              ))}
              {lazyGroups.length > 0 && <BillTextGroups billId={billId} groups={lazyGroups} />}
            </section>
          </>
        ) : latest?.pdf ? (
          <section style={{ margin: '0 0 36px' }}>
            <a href={latest.pdf.url} rel="noopener" className="no-hover-scale" style={{ display: 'inline-block', fontFamily: MONO, fontSize: '17px', fontWeight: 'bold', color: '#fff', background: ACCENT, padding: '12px 20px', textDecoration: 'none' }}>
              Read the bill (PDF)
            </a>
            <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, margin: '10px 0 0', maxWidth: '46em' }}>
              {latest.label}{latest.date ? `, ${fmtLongDate(latest.date)}` : ''}{latest.pdf.bytes ? `, ${fmtSize(latest.pdf.bytes)}` : ''}.{' '}
              {latest.html
                ? 'Parliament’s website did not let us load this version as a web page, so it is linked as Parliament’s PDF.'
                : 'Parliament has published this version as a PDF only.'}
            </p>
          </section>
        ) : !apiError ? (
          <section style={{ margin: '0 0 36px' }}>
            <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, maxWidth: '46em' }}>
              Parliament has not published the text of this bill. That is common for Private Members’ Bills that were never printed, and for bills withdrawn before debate.
            </p>
          </section>
        ) : null}

        {orderedTypes.length > 0 && (
          <section style={{ marginTop: '40px' }}>
            <h2 style={{ ...h2, fontSize: '17px' }}>Other documents</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {orderedTypes.map((type) => {
                const items = grouped.get(type) || []
                return (
                  <section key={type}>
                    <h3 style={h2}>{type} <span style={{ fontWeight: 'normal' }}>· {items.length}</span></h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {items.map((p) => {
                        const size = fmtSize(p.files?.[0]?.contentLength)
                        return (
                          <li key={p.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 16px', borderBottom: `1px dotted ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
                            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                              <a href={publicationHref(p, bill.parliament_id)} target="_blank" rel="noopener noreferrer" className="focus-ring"
                                style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.5, color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>
                                {withoutEmDashes(p.title || '(untitled publication)')}
                                <span className="sr-only"> (opens on Parliament&rsquo;s website)</span>
                              </a>
                              {p.house && p.house !== 'Unassigned' && (
                                <span style={{ marginLeft: '10px', fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{p.house}</span>
                              )}
                            </div>
                            <div style={{ flexShrink: 0, fontFamily: MONO, fontSize: '15px', textAlign: 'right' }}>
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
          </section>
        )}

        <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${INK_HAIRLINE}`, textAlign: 'center' }}>
          <Link href={`/bills/${billId}`} style={{ color: INK, textDecoration: 'underline' }}>← back to the bill</Link>
        </p>
      </article>
      <ParliamentSourceCredit note={<a href={`https://bills.parliament.uk/bills/${bill.parliament_id}`} rel="noopener" style={{ color: ACCENT }}>This bill on bills.parliament.uk</a>} />
    </OpenGovShell>
  )
}

// "Bill 131 2026-27 (as amended in Public Bill Committee) – html" -> its version title (as in lib/bill-text.ts).
function versionOf(title?: string): string {
  return (title || '').replace(/\s*[-–]\s*(large print\s*[-–]\s*)?(pdf|html|xml)(\s+download)?\s*$/i, '').trim()
}

function fmtLongDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
}

function tocLabel(t: TocEntry): string {
  if (t.kind === 'clause') return `${t.num}  ${t.heading}`.trim()
  if (t.kind === 'schedule') return `${t.num}${t.heading ? `: ${t.heading}` : ''}`
  return [t.num, t.heading].filter(Boolean).join(': ')
}

// The bill text in the site's style: Special Elite, black ink, 15 px or more; clauses and schedules set apart,
// subsections and paragraphs indented, numbers inline.
const BILL_TEXT_CSS = `
.bt-contents { margin: 0 0 30px; }
.bt-toc { list-style: none; margin: 0; padding: 0; font-family: var(--font-special-elite), monospace; font-size: 15px; line-height: 1.6; columns: 2 320px; column-gap: 28px; }
.bt-toc li { break-inside: avoid; padding: 2px 0; }
.bt-toc a { color: #14100d; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
.bt-toc .bt-toc-part, .bt-toc .bt-toc-chapter, .bt-toc .bt-toc-crossheading, .bt-toc .bt-toc-schedule { font-weight: bold; margin-top: 8px; }
.bt-toc .bt-toc-part a, .bt-toc .bt-toc-chapter a, .bt-toc .bt-toc-crossheading a, .bt-toc .bt-toc-schedule a { color: #7a1612; }
.bt-text { font-family: var(--font-special-elite), monospace; font-size: 16px; line-height: 1.7; color: #14100d; overflow-wrap: anywhere; }
.bt-text .bt-preamble { font-style: italic; margin: 0 0 22px; }
.bt-text h2, .bt-text h3, .bt-text h4, .bt-text h5 { font-size: 16px; font-weight: normal; margin: 0; display: inline; }
.bt-text .bt-part > h2, .bt-text .bt-chapter > h2, .bt-text .bt-crossheading > h2, .bt-text .bt-schedule > h2 { display: block; font-size: 18px; font-weight: bold; color: #7a1612; text-align: center; margin: 30px 0 14px; text-transform: none; }
.bt-text .bt-clause { margin: 0 0 18px; scroll-margin-top: 16px; }
.bt-text .bt-clause > h2 { display: block; font-weight: bold; margin: 18px 0 8px; }
.bt-text .bt-clause > h2 .bt-num { margin-right: 10px; }
.bt-text .bt-schedule { scroll-margin-top: 16px; }
.bt-text .bt-sub { margin: 6px 0 6px 0; }
.bt-text .bt-para { margin: 4px 0 4px 26px; }
.bt-text .bt-sub > h2 .bt-num, .bt-text .bt-para > h3 .bt-num, .bt-text .bt-para > h4 .bt-num, .bt-text .bt-para > h5 .bt-num { margin-right: 8px; }
.bt-text .bt-block, .bt-text .bt-def { display: inline; }
.bt-text .bt-block p, .bt-text .bt-def p, .bt-text p { margin: 0; display: inline; }
.bt-text .bt-sub > .bt-block, .bt-text .bt-para > .bt-block { display: inline; }
.bt-text .bt-sub > .bt-block + *, .bt-text .bt-para + .bt-block { display: block; }
.bt-text blockquote { margin: 8px 0 8px 22px; padding-left: 12px; border-left: 2px solid rgba(20,16,13,0.35); }
.bt-text table { border-collapse: collapse; margin: 10px 0; font-size: 15px; display: block; overflow-x: auto; max-width: 100%; }
.bt-text td, .bt-text th { border: 1px solid rgba(20,16,13,0.35); padding: 4px 8px; vertical-align: top; }
@media (max-width: 640px) { .bt-text .bt-para { margin-left: 14px; } .bt-text blockquote { margin-left: 8px; } }
`
