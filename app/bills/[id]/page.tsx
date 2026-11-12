// Server component — renders bill metadata, summary, support/oppose
// explanations, sponsor, vote counts and the passage timeline directly in
// the initial HTML so Googlebot indexes the content. The interactive
// cross-box ballot lives in a small client island (BillVotingClient).
//
// Styled as a newspaper "bill broadsheet" to match the ballot cards on
// /bills and the opengovt Polls: ink-on-parchment, Special Elite labels,
// serif body, with the vote presented as an official ballot paper.

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { billStageLine, NO_SUMMARY_TEXT } from '@/lib/bill-summary'
import BillVotingClient from './BillVotingClient'
import { NoJsFold } from '@/app/components/NoJsPager'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';
import JsonLd, { buildBillLegislation, buildBreadcrumbs } from '@/lib/JsonLd';
import RelatedLinks from '@/app/components/RelatedLinks';
import LastUpdated from '@/app/components/LastUpdated';
import PageSources from '@/app/components/PageSources';
import type { Metadata } from 'next'
import FollowButton from '@/app/components/FollowButton';
import { getBillPublications, latestText } from '@/lib/bill-text';
import AboutThisData from '@/app/components/AboutThisData';
import Link from 'next/link';
import { editorialsForBill } from '@/lib/editorials-source';
import { billDivisions, divisionHref } from '@/lib/division-links';
import { billIndexable, billInCurrentSession } from '@/lib/bill-indexing';
import { billStatus, isLaw, sittingCancelled } from '@/lib/bill-status';
export const revalidate = 604800  // a week; the bill syncs refresh a bill when its data changes (lib/bill-refresh.ts)

// Prerender a small set of bill pages at build time. The list does NOT need
// to be complete — its presence is what enables ISR caching for the whole
// route. Pages not listed here render on first request and are cached from
// then on (see revalidate above, 1h).
export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('bill')
    .select('id')
    .not('id', 'is', null)
    .limit(20)
  if (error) {
    throw new Error(
      `generateStaticParams(/bills/[id]) query failed: ${error.message}`
    )
  }
  if (!data || data.length === 0) {
    throw new Error('generateStaticParams(/bills/[id]): bill returned no rows')
  }
  return data.map((row) => ({ id: String(row.id) }))
}

// Whether search engines may index this bill: the rule shared with the sitemap, in lib/bill-indexing.ts (owner, 7 Nov 2026).
// An indexable bill sends no robots tag (index, follow); any other sends noindex, follow, so its links stay crawlable.
// If a later sync adds a vote, a working stage or the Act, the page flips back to indexable on revalidation.
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const billId = parseInt(id, 10)
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!Number.isFinite(billId)) notFound()

  // Only whether one MP vote exists matters, so one indexed row is read instead of counting them all (owner's
  // approval, 21 Oct 2026; the count averaged 1.2 s during builds).
  const [{ data: bill, error: billErr1 }, { data: oneVote, error: oneVoteErr }, inCurrentSession] = await Promise.all([
    supabase.from('bill').select('current_stage, is_act, commons_division_id, hidden_reason').eq('id', billId).single(),
    supabase.from('mp_division_votes').select('id').eq('bill_id', billId).limit(1),
    billInCurrentSession(billId),
  ])
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [billErr1, oneVoteErr]) if (e && e.code !== 'PGRST116') throw new Error(`/bills/[id] (bill, mp_division_votes): ${e.message}`);
  // As the page: no bill, or a hidden one (duplicates, bad records), is a 404.
  if (!bill || bill.hidden_reason) notFound()

  // The page names itself canonical (owner, 31 Oct 2026, Search Console "duplicate without a main version"); the layout
  // sets the same, this makes it explicit on the page.
  const canonical = { alternates: { canonical: `/bills/${billId}` } }
  const indexable = billIndexable({
    currentStage: bill?.current_stage,
    isLaw: bill ? isLaw(bill) : false,
    commonsDivisionId: bill?.commons_division_id,
    hasVotes: (oneVote?.length ?? 0) > 0,
    inCurrentSession,
  })
  return indexable ? canonical : { ...canonical, robots: { index: false, follow: true } }
}

const INK = '#14100d'
const INK_SOFT = '#14100d'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM_DEEP = '#dcd4c0'
const ACCENT = '#7a1612'
const SUCCESS = '#4e6b34'
const DANGER = '#8a2f20'
const WARN = '#b88a30'
const SERIF = 'var(--font-special-elite), monospace'
const MONO = 'var(--font-special-elite), monospace'

type Stage = {
  id: number
  description: string
  house: string
  stageSittings: { date: string }[]
  sortOrder: number
}

// A party colour light enough that the badge's pale words fall under 4.5 to 1: dark words instead, on phones (globals.css).
function lightBadge(colour: unknown): boolean {
  const hex = colour ? String(colour).replace('#', '') : '7697a2';
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const [r, g, b] = [0, 2, 4].map((n) => { const c = parseInt(hex.slice(n, n + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.13;
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const billId = parseInt(id, 10)
  if (!Number.isFinite(billId)) notFound()
  const billPieces = await editorialsForBill(billId)

  const [{ data: bill, error: billErr }, { data: lordsDivisionRows, error: lordsDivisionRowsErr }] = await Promise.all([
    supabase.from('bill').select('*').eq('id', billId).single(),
    // House of Lords divisions linked to this bill (lords_divisions.bill_id,
    // resolved by lib/lords-votes.ts). Newest first. A failed query just
    // hides the section.
    supabase
      .from('lords_divisions')
      .select('division_id, division_date, division_number, motion_text, content_count, not_content_count, is_government_win, is_whipped, party_breakdown')
      .eq('bill_id', billId)
      .order('division_date', { ascending: false })
      .order('division_number', { ascending: false }),
  ])
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [billErr, lordsDivisionRowsErr]) if (e && e.code !== 'PGRST116') throw new Error(`/bills/[id] (bill, lords_divisions): ${e.message}`);
  // Hidden bills (bill.hidden_reason: duplicates, bad records) return 404; nothing is deleted.
  if (!bill || bill.hidden_reason) notFound()
  const lordsDivisions = (lordsDivisionRows ?? []) as LordsDivision[]

  // Which Commons division the MPs' figure comes from, so the page can name and link it
  // (audit P3). Looked up by the Commons Votes division id saved on the bill.
  let commonsDivisionHref: string | null = null
  if (bill.commons_division_id != null) {
    const { data: dv, error: dvErr } = await supabase
      .from('mp_division_votes')
      .select('division_date_only, division_number')
      .eq('division_id', bill.commons_division_id)
      .limit(1)
      .maybeSingle()
    if (dvErr && dvErr.code !== 'PGRST116') throw new Error(`/bills/[id] mp_division_votes: ${dvErr.message}`);
    if (dv?.division_date_only && dv?.division_number != null) {
      // The full address the division page serves (owner, 31 Oct 2026): the short form without "-commons" redirected.
      commonsDivisionHref = divisionHref(String(dv.division_date_only), dv.division_number)
    }
  }
  // The Commons divisions matched to this bill (mp_division_votes.bill_id), linked in the page (owner, 31 Oct 2026).
  const billVotes = await billDivisions(billId)

  // The one bill status (UX1a, lib/bill-status.ts): a bill not listed in the current session (introduced or carried into
  // it) has had its session end.
  const status = billStatus(bill, { sessionEnded: !(await billInCurrentSession(billId)) })
  const votingClosed = status.ended
  const commonsDivisionDate = bill.commons_vote_date
    ? new Date(bill.commons_vote_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null

  // The version the full bill page shows, for its link (owner, 27 Oct 2026). The same cached Bills API answer as
  // /bills/[id]/full (lib/bill-text.ts: a week under bill:<id>, refreshed when the Publications count changes); if it
  // cannot be read the link shows without a version.
  let fullBillVersion: string | null = null
  // Parliament's documents for the bill, when the Bills API answered (UX1f, 9 Nov 2026): with no text published the page
  // says so instead of linking to an empty full bill page; null when it could not be read, so the link stays.
  let publishedDocs: number | null = null
  if (bill.parliament_id != null) {
    try {
      const pubs = await getBillPublications(billId, bill.parliament_id)
      const latest = latestText(pubs)
      publishedDocs = latest ? null : pubs.length
      if (latest) {
        const d = latest.date ? new Date(`${latest.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
        fullBillVersion = `${latest.label}${d ? `, ${d}` : ''}`
      }
    } catch (e) {
      console.error(`/bills/[id] ${billId} full bill version: ${(e as Error).message}`)
    }
  }

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
    <OpenGovShell pageStamp="Bills">
      <JsonLd data={buildBillLegislation({
        billId,
        title: bill.title || bill.long_title || `Bill ${billId}`,
        legislationDate: bill.last_update || null,
        isLaw: status.kind === 'law',
        defeated: status.kind === 'defeated',
        withdrawn: status.kind === 'withdrawn',
        sponsorName:
          (bill.sponsors as { items?: { name?: string }[] } | null)?.items?.[0]?.name ||
          bill.sponsor_name ||
          null,
      })} />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Bills', path: '/bills' }, { name: bill.title || bill.long_title || `Bill ${billId}`, path: `/bills/${billId}` }])} />
      <BackLink
        fallbackHref="/bills"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', transform: 'rotate(-0.2deg)' }}
      />

      {/* T1-5x S2 (owner, 10 Nov 2026): no boxed "Source:" tag; the source is in Sources at the end. */}

      {/* The whole bill page is one continuous Victorian Bill sheet: cover,
          brief, explainers, ballot, sponsor and stages all sit on the same
          parchment, separated by ruling lines rather than boxed cards. */}
      <article
        style={{
          padding: 0,
          color: '#14100d',
          fontFamily: 'var(--font-special-elite), monospace',
        }}
      >
      <header
        style={{
          marginBottom: '32px',
          color: '#14100d',
          fontFamily: 'var(--font-special-elite), monospace',
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
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            UK Parliament · Public Bill{serial ? ` · No. ${serial}` : ''}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {bill.title}
          </h1>
        </div>

        {/* [Stage, date], as on the bill cards; nothing if both are empty */}
        {billStageLine(bill) && (
          <div data-main-action style={{ textAlign: 'center', fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.1em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '24px' }}>
            [{billStageLine(bill)}]
          </div>
        )}

        {/* At every width (UX2g phones; UX4g desktop, owner approved, 10 Nov 2026): under the stage and date, the sponsor, the
            then two jump links: the
            full timeline and the reader poll (which follows the parliamentary record). The formal summary and the full bill
            link stay below; the sponsor block lower down is left out, as this line gives it. */}
        <style>{`.bq-phone { display: block; text-align: center; margin: -14px 0 14px; } .bq-wide { display: none !important; } .bq-jump { display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 18px; } .bq-jump a { display: inline-flex; align-items: center; min-height: 44px; font-size: 15px; color: ${ACCENT}; text-decoration: underline; text-underline-offset: 3px; }`}</style>
        <div className="bq-phone">
          {presented && (
            <p style={{ fontFamily: MONO, fontStyle: 'italic', fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 2px' }}>
              Presented by {presented}{supportersLine ? `, supported by ${supportersLine}` : ''}.
            </p>
          )}
          <nav aria-label="On this page" className="bq-jump" style={{ fontFamily: MONO }}>
            {stages.length > 0 && <a href="#bill-passage">Full timeline ↓</a>}
            <a href="#vote">{votingClosed ? 'Reader poll result ↓' : 'Reader poll ↓'}</a>
          </nav>
        </div>

        {/* Follow this bill (job 74): a weekly email when it reaches a new stage or is voted on. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <FollowButton kind="bill" targetKey={String(bill.id)} label={bill.title} />
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
            description (richest) > long_title (formal preamble). The AI-written
            plain_summary is not shown (audit P9). Set in typewriter, justified. */}
        {(() => {
          const pickRaw = [bill.description, bill.long_title].find(
            (t) =>
              !!t &&
              t.trim().toLowerCase() !== 'no description available' &&
              t.trim() !== (bill.title || '').trim()
          );
          const text = (pickRaw || '').trim();
          if (!text) {
            return (
              <p style={{ fontFamily: MONO, fontSize: 'clamp(15px, 1.15vw, 15px)', lineHeight: 1.75, margin: '0 auto 26px', maxWidth: '46em', color: INK_SOFT, fontStyle: 'italic', textAlign: 'center' }}>
                {NO_SUMMARY_TEXT}
              </p>
            );
          }
          return (
            <p
              style={{
                fontFamily: MONO,
                fontSize: 'clamp(15px, 1.15vw, 15px)',
                lineHeight: 1.75,
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

        {/* See full bill: /bills/{id}/full shows the text of the bill itself
            (its latest version, named here) and every other document
            Parliament has published for it, in our own template. Linked here rather
            than out to bills.parliament.uk so the reader stays in our
            shell. Visible for every bill in the table — universal
            parliament_id coverage. */}
        {bill.parliament_id != null && publishedDocs != null && (
          <div style={{ textAlign: 'center', margin: '0 auto 26px', maxWidth: '46em' }}>
            <p style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, margin: 0 }}>
              Bill text not published
            </p>
            {publishedDocs > 0 && (
              <a href={`/bills/${billId}/full`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontFamily: MONO, fontSize: '15px', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {publishedDocs === 1 ? 'The one document Parliament has published →' : `The ${publishedDocs.toLocaleString('en-GB')} documents Parliament has published →`}
              </a>
            )}
          </div>
        )}
        {bill.parliament_id != null && publishedDocs == null && (
          <div style={{ textAlign: 'center', margin: '0 auto 26px', maxWidth: '46em' }}>
            <a
              href={`/bills/${billId}/full`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
                fontFamily: MONO,
                fontSize: 'clamp(15px, 1.05vw, 15px)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: ACCENT,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              See full bill →
            </a>
            {fullBillVersion && (
              <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0', color: INK }}>{fullBillVersion}</p>
            )}
          </div>
        )}

        {/* Presented by [Sponsor], supported by [supporters] — typewriter
            italic block, matching the printed Bill template. Supporters
            come from the live Parliament Bills API (most bills list only
            the lead sponsor — the "supported by" line appears only where
            additional sponsors are recorded). */}
        {presented && (
          <div
            className="bq-wide"
            style={{
              textAlign: 'center',
              fontFamily: MONO,
              fontStyle: 'italic',
              fontSize: 'clamp(15px, 1.1vw, 15px)',
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
        {(status.ended || bill.category || bill.originating_house || bill.current_stage) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '22px', justifyContent: 'center' }}>
            {status.kind === 'law' && <Tag colour={SUCCESS}>✓ Passed into law</Tag>}
            {status.kind === 'defeated' && <Tag colour={DANGER}>✗ Defeated</Tag>}
            {status.kind === 'withdrawn' && <Tag colour={INK_SOFT}>{status.label}</Tag>}
            {status.kind === 'fell' && <Tag colour={INK_SOFT}>{status.label}</Tag>}
            {bill.category && <Tag colour={ACCENT}>{bill.category}</Tag>}
            {bill.originating_house && <Tag colour={INK_SOFT}>{bill.originating_house}</Tag>}
            {bill.current_stage && <Tag colour={INK_SOFT}>{bill.current_stage}</Tag>}
          </div>
        )}
      </header>


      {/* How the Lords voted — formal Lords divisions on this bill. */}
      {lordsDivisions.length > 0 && <LordsVotesSection divisions={lordsDivisions} />}

      {/* Commons votes on this bill (owner, 31 Oct 2026): plain links to each matched division page. */}
      {billVotes.length > 0 && (
        <section aria-labelledby="bill-commons-votes" style={{ marginBottom: '34px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '24px' }}>
          <h2 id="bill-commons-votes" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 12px' }}>
            Parliamentary votes in the Commons
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px', lineHeight: 1.7, color: INK }}>
            {billVotes.map((d) => (
              <li key={`${d.date}-${d.number}`}>
                <Link href={divisionHref(d.date, d.number)} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{d.title}</Link>
                {' '}({new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, division {d.number})
              </li>
            ))}
          </ul>
        </section>
      )}

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
                  <span className={lightBadge(bill.sponsor_party_colour) ? 'og-ink-on-light' : undefined} style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', color: '#ebe5d8', background: bill.sponsor_party_colour ? `#${String(bill.sponsor_party_colour).replace('#', '')}` : '#7697a2' }}>
                    {bill.sponsor_party}
                  </span>
                )}
                {bill.sponsor_constituency && (
                  <span style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>{bill.sponsor_constituency}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bill passage */}
      {stages.length > 0 && (
        <section id="bill-passage" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '28px', marginBottom: '38px', scrollMarginTop: '16px' }}>
          <Eyebrow>Bill passage</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {commonsStages.length > 0 && <StageGroup label="Commons" colour={ACCENT} stages={commonsStages} cancelled={(d) => sittingCancelled(bill, d)} />}
            {lordsStages.length > 0 && <StageGroup label="Lords" colour={DANGER} stages={lordsStages} cancelled={(d) => sittingCancelled(bill, d)} />}
            {royalAssent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '14px', borderTop: `1px solid ${INK_HAIRLINE}` }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: SUCCESS, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: INK, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Royal Assent</span>
                  {royalAssent.stageSittings[0]?.date && (
                    <span style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>{fmtDate(royalAssent.stageSittings[0].date)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* The ballot (after the parliamentary record since UX4g, owner approved, 10 Nov 2026) — interactive cross-box vote + the running counts.
          Sits on the parchment, separated by a ruling line above. */}
      <section id="vote" style={{ marginBottom: '40px', borderTop: `1.5px solid ${INK}`, paddingTop: '28px', scrollMarginTop: '90px' }}>
        {/* A closed ballot (an Act, withdrawn, defeated or fallen bill) is folded on phones (step 5, 10 Nov 2026: page length). */}
        <ClosedBallotFold closed={votingClosed}>
        <div style={{ position: 'relative', padding: '0 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold' }}>
              Reader poll · opengovt
            </div>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 'bold', margin: '10px 0 0', lineHeight: 1.15 }}>
              {votingClosed ? 'Reader poll result' : 'How would you vote on this bill?'}
            </h2>
            {!votingClosed && (
              <div style={{ fontFamily: MONO, fontSize: '15px', fontStyle: 'italic', letterSpacing: '0.04em', color: INK_SOFT, marginTop: '8px' }}>
                Mark one box with a cross.
              </div>
            )}
          </div>

          {/* Closed bills (an Act, withdrawn or defeated) take no vote changes (report 53). A closed poll shows its tally first
              and the reader's own final vote after it, with no voting controls (T1-MOB, owner 11 Nov 2026). */}
          {!votingClosed && <BillVotingClient billId={billId} closed={false} />}

          {/* The count so far */}
          <div style={{ borderTop: `1px solid ${INK}`, marginTop: '24px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <VoteBar
              variant="reader"
              label={totalVotes > 0
                ? `opengovt readers: ${yesPercent}% Aye, ${noPercent}% No (${totalVotes.toLocaleString('en-GB')} ${totalVotes === 1 ? 'vote' : 'votes'})`
                : 'opengovt readers: no votes yet'}
              yesPct={yesPercent}
              noPct={noPercent}
              empty={totalVotes === 0}
            />

            {(() => {
              // For 0/0 bills the Commons Votes API holds no division record.
              // That can mean three different things and the label should say
              // which: (a) the bill is still going through Parliament and no
              // division has happened yet, (b) the bill became an Act without
              // a division — the Speaker collected the voices and the Ayes had
              // it (every uncontested Supply, Appropriation, Lords-Spiritual
              // (Women), Norwich Livestock Market, Property (Digital Assets)
              // etc. falls into this bucket), or (c) the bill was withdrawn /
              // defeated. Showing the same "not yet divided" text for all
              // three was misleading for Acts that already passed.
              const noVoteLabel =
                status.kind === 'law' ? 'Passed without division'
                : status.kind === 'withdrawn' ? 'Bill withdrawn'
                : status.kind === 'defeated' ? 'Defeated'
                : status.kind === 'fell' ? 'Fell at the end of the session'
                : 'Not yet divided'
              const noVoteHelper =
                status.kind === 'law' ? 'No division called, Third Reading carried on the voices.'
                : status.kind === 'withdrawn' ? 'Bill was withdrawn before a Commons vote.'
                : status.kind === 'defeated' ? 'Bill defeated before reaching a Commons division.'
                : status.kind === 'fell' ? 'The session ended before a Commons vote.'
                : 'MPs have not voted on this bill yet.'
              return (
                <VoteBar
                  variant="official"
                  label={totalMPVotes > 0
                    ? `MPs' official vote: Ayes ${(bill.commons_ayes || 0).toLocaleString('en-GB')}, Noes ${(bill.commons_noes || 0).toLocaleString('en-GB')}${commonsDivisionDate ? ` (${commonsDivisionDate})` : ''}`
                    : `MPs' official vote: ${noVoteLabel.toLowerCase()}`}
                  yesPct={mpAyePercent}
                  noPct={mpNoePercent}
                  empty={totalMPVotes === 0}
                  emptyText={noVoteHelper}
                />
              )
            })()}

            {bill.commons_division_title && (bill.commons_ayes || bill.commons_noes) ? (
              <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK_SOFT, margin: '-8px 0 0' }}>
                Commons division:{' '}
                {commonsDivisionHref ? (
                  <a href={commonsDivisionHref} style={{ color: INK, textDecoration: 'underline' }}>{bill.commons_division_title}</a>
                ) : (
                  <span>{bill.commons_division_title}</span>
                )}
                {commonsDivisionDate ? `, ${commonsDivisionDate}` : ''}
              </p>
            ) : null}

            {votingClosed && <BillVotingClient billId={billId} closed />}

            {/* The site's shared fold, its + marker on the right (Cowork, 11 Nov 2026). */}
            <AboutThisData id="how-reader-voting" label="How reader voting works">
              <p style={{ margin: '8px 0 0' }}>
                Reader votes are cast on this site by visitors who chose to vote, one vote for each account. They are not a poll of the public, and they have no effect in Parliament.
              </p>
              <p style={{ margin: '8px 0 0' }}>
                You can change your vote while the bill is going through Parliament. Voting closes when the bill becomes an Act, is withdrawn or is defeated.
              </p>
              <p style={{ margin: '8px 0 0' }}>
                The official figures are how MPs voted in the House of Commons division named here, from Parliament&rsquo;s own record.
              </p>
            </AboutThisData>

            {democraticGap !== null && (
              <div style={{ borderLeft: `3px solid ${outcomeMismatch ? WARN : ACCENT}`, padding: '12px 18px', background: CREAM_DEEP }}>
                <div style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 'bold', color: ACCENT, marginBottom: '5px' }}>
                  Gap between opengovt readers and MPs
                </div>
                <p style={{ fontFamily: SERIF, fontSize: '16px', fontWeight: 'bold', lineHeight: 1.4, margin: 0 }}>
                  {democraticGap} percentage points{democraticGap > 20 ? ', a wide gap' : democraticGap > 10 ? ', a moderate gap' : ', a narrow gap'}
                </p>
                {outcomeMismatch && (
                  <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '6px', lineHeight: 1.7, color: INK_SOFT }}>
                    Outcome mismatch: opengovt readers would {yesPercent > 50 ? 'pass' : 'block'} this bill, but MPs {mpAyePercent > 50 ? 'passed' : 'rejected'} it in this division.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        </ClosedBallotFold>
      </section>

      {/* Investigations about this bill (owner's approval, 29 Oct 2026): published pieces that list it in
          relatedBillIds, newest first; shown only when one matches. */}
      {(() => {
        const pieces = [...billPieces]
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        if (pieces.length === 0) return null;
        return (
          <section aria-labelledby="bill-investigations" style={{ marginBottom: '40px', borderTop: `1.5px solid ${INK}`, paddingTop: '24px' }}>
            <h2 id="bill-investigations" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
              Investigations
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {pieces.map((e) => (
                <li key={e.slug} style={{ padding: '10px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <Link href={`/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`} style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, color: INK, textDecoration: 'underline', overflowWrap: 'break-word' }}>
                    {e.headline}
                  </Link>
                  <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '6px 0 0' }}>
                    {e.summary?.trim() ? e.summary : e.standfirst}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* EL1 (owner, 10 Nov 2026): the official record at Parliament is in the page's one Sources fold, not a link above. */}
      <PageSources sources={[bill.parliament_id != null && { label: 'This bill on UK Parliament\u2019s Bills website', href: `https://bills.parliament.uk/bills/${bill.parliament_id}` }]} />

      </article>

      <RelatedLinks
        variant="bill"
        billId={billId}
        sponsorMemberId={bill.sponsor_member_id ?? null}
        sponsorName={
          (bill.sponsors as { items?: { name?: string }[] } | null)?.items?.[0]?.name ||
          bill.sponsor_name ||
          null
        }
        sponsorParty={null}
        commonsAyes={bill.commons_ayes ?? null}
        commonsNoes={bill.commons_noes ?? null}
        commonsDivisionId={bill.commons_division_id ?? null}
      />

    </OpenGovShell>
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

type LordsDivision = {
  division_id: number
  division_date: string
  division_number: number | null
  motion_text: string | null
  content_count: number
  not_content_count: number
  is_government_win: boolean | null
  is_whipped: boolean | null
  party_breakdown: { party: string; content: number; not_content: number }[] | null
}

// How many Lords divisions show before the rest fold into a <details>.
const LORDS_SHOWN_OPEN = 5

function fmtLordsDate(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`)
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// motion_text is already plain text (HTML stripped at sync). Drop the
// procedural closing "The House divided:" line, which adds nothing here.
function cleanMotion(text: string | null): string | null {
  if (!text) return null
  const t = text.replace(/\s*The House divided:?\s*$/i, '').trim()
  return t || null
}

function LordsDivisionItem({ d }: { d: LordsDivision }) {
  const total = d.content_count + d.not_content_count
  const contentPct = total > 0 ? Math.round((d.content_count / total) * 100) : 0
  const notContentPct = total > 0 ? 100 - contentPct : 0
  const motion = cleanMotion(d.motion_text)
  // Win/defeat is only meaningful when the government whipped the vote.
  const govLabel =
    d.is_whipped === true && d.is_government_win === true ? { text: 'Government won', colour: SUCCESS }
    : d.is_whipped === true && d.is_government_win === false ? { text: 'Government defeated', colour: DANGER }
    : null
  const parties = (d.party_breakdown ?? []).filter((p) => p.content + p.not_content > 0)
  return (
    <li style={{ padding: '16px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: INK }}>{fmtLordsDate(d.division_date)}</span>
        {govLabel && <Tag colour={govLabel.colour}>{govLabel.text}</Tag>}
      </div>
      {motion && (
        <p style={{ fontFamily: SERIF, fontSize: '16px', lineHeight: 1.55, color: INK, margin: '0 0 12px', whiteSpace: 'pre-line' }}>
          {motion}
        </p>
      )}
      <VoteBar
        variant="official"
        label={`Peers' official vote: Content ${d.content_count.toLocaleString('en-GB')}, Not content ${d.not_content_count.toLocaleString('en-GB')} (${fmtLordsDate(d.division_date)})`}
        yesPct={contentPct}
        noPct={notContentPct}
      />
      {parties.length > 0 && (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '10px 0 0' }}>
          {parties.map((p, i) => (
            <span key={p.party}>
              {i > 0 && ' · '}
              <strong>{p.party}</strong> {p.content.toLocaleString()} content, {p.not_content.toLocaleString()} not content
            </span>
          ))}
        </p>
      )}
    </li>
  )
}

function LordsVotesSection({ divisions }: { divisions: LordsDivision[] }) {
  const open = divisions.slice(0, LORDS_SHOWN_OPEN)
  const rest = divisions.slice(LORDS_SHOWN_OPEN)
  return (
    <section style={{ marginBottom: '38px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '24px' }}>
      <Eyebrow>Parliamentary votes in the Lords</Eyebrow>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 6px' }}>
        {divisions.length.toLocaleString()} formal {divisions.length === 1 ? 'vote' : 'votes'} in the House of Lords on this bill, newest first.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 8px' }}>
        These are the occasions when peers formally divided and every vote was recorded. Most decisions in the Lords, including on many amendments, are agreed without a recorded vote, so they do not appear here.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {open.map((d) => <LordsDivisionItem key={d.division_id} d={d} />)}
      </ul>
      {rest.length > 0 && (
        <details style={{ marginTop: '12px' }}>
          <summary style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: ACCENT, cursor: 'pointer' }}>
            Show {rest.length.toLocaleString()} earlier Lords {rest.length === 1 ? 'vote' : 'votes'}
          </summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rest.map((d) => <LordsDivisionItem key={d.division_id} d={d} />)}
          </ul>
        </details>
      )}
      {/* This bill's newest division (divisions are newest first), not the table wide time. */}
      <LastUpdated sourceKey="lords_divisions" at={divisions[0]?.division_date ?? null} />
    </section>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 'bold', color: ACCENT, marginBottom: '12px' }}>
      {children}
    </p>
  )
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.13em', color: colour === ACCENT ? ACCENT : INK, border: `1px solid ${colour}`, background: 'transparent' }}>
      {children}
    </span>
  )
}

function ExplainerColumn({ label, colour, points }: { label: string; colour: string; points: string[] }) {
  return (
    <div style={{ borderLeft: `3px solid ${colour}`, padding: '14px 18px', background: CREAM_DEEP }}>
      <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 'bold', color: colour === ACCENT ? ACCENT : INK, marginBottom: '12px' }}>
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {points.map((point, i) => (
          <li key={i} style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, display: 'flex', gap: '8px' }}>
            <span style={{ color: colour === ACCENT ? ACCENT : INK, flexShrink: 0, fontWeight: 'bold' }}>, </span>
            <span>{point.replace(/^[--]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Reader figures and Parliament's are never to be mistaken for one another (owner, 4 Nov 2026): each is labelled in
// full, readers in plain italic with a dashed rule, MPs' official vote in bold with a solid rule.
function VoteBar({
  variant,
  label,
  yesPct,
  noPct,
  empty = false,
  emptyText,
}: {
  variant: 'reader' | 'official'
  label: string
  yesPct: number
  noPct: number
  empty?: boolean
  emptyText?: string
}) {
  const official = variant === 'official'
  return (
    <div style={{ borderLeft: official ? `4px solid ${INK}` : `2px dashed ${INK_SOFT}`, paddingLeft: '12px' }}>
      <div style={{ marginBottom: '6px', fontFamily: MONO, fontSize: official ? '16px' : '15px', fontWeight: official ? 'bold' : 'normal', fontStyle: official ? 'normal' : 'italic', lineHeight: 1.4, color: INK }}>
        {label}
      </div>
      {/* Empty bar still renders so the layout is consistent between
          bills MPs haven't voted on and bills they have — keeps the
          eye anchored on the same horizontal rail down the page. */}
      <div style={{ height: '10px', background: CREAM_DEEP, display: 'flex', border: `1px solid ${INK_HAIRLINE}`, overflow: 'hidden' }} aria-hidden>
        {!empty && yesPct > 0 && <div style={{ width: `${yesPct}%`, background: SUCCESS }} />}
        {!empty && noPct > 0 && <div style={{ width: `${noPct}%`, background: DANGER }} />}
      </div>
      {empty && emptyText && (
        <div style={{ marginTop: '6px', fontFamily: MONO, fontSize: '15px', fontStyle: 'italic', color: INK_SOFT }}>
          {emptyText}
        </div>
      )}
    </div>
  )
}

// A sitting dated after the bill was withdrawn will not happen: it shows "Cancelled" (UX1a).
function StageGroup({ label, colour, stages, cancelled }: { label: string; colour: string; stages: Stage[]; cancelled?: (date: string) => boolean }) {
  return (
    <div>
      <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 'bold', marginBottom: '12px', color: colour === ACCENT ? ACCENT : INK }}>
        {label}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage) => (
          <li key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colour, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: '15px' }}>{stage.description}</span>
              {stage.stageSittings[0]?.date && (
                cancelled?.(stage.stageSittings[0].date)
                  ? <span style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>Cancelled (was {fmtDate(stage.stageSittings[0].date)})</span>
                  : <span style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>{fmtDate(stage.stageSittings[0].date)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The reader ballot folded on phones once voting has closed; open bills show it as before.
function ClosedBallotFold({ closed, children }: { closed: boolean; children: React.ReactNode }) {
  return closed ? <NoJsFold id="bill-ballot-f" always label="Reader poll: closed, see the result">{children}</NoJsFold> : <>{children}</>
}
