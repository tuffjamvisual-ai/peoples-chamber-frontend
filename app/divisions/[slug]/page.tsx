import { billSummary as officialBillSummary } from '@/lib/bill-summary';
import { metaDescription } from '@/lib/meta-description';
// Server-rendered division detail page. Slug matches the ParlParse identifier
// format we already use to identify divisions: pw-YYYY-MM-DD-N-commons.
//
// All data comes from our own DB (mp_division_votes + mps). No upstream
// runtime fetches. The page is the canonical destination for an external
// link from the MP voting record — replaces the previously broken
// commonsvotes.parliament.uk redirect.
//
// Layout follows the dossier conventions: cream/ink palette, Special Elite
// for body, EB Garamond for the title only, vote columns grouped by party,
// tellers flagged inline, 'both' votes in a small footnote section.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { normaliseParty } from '@/lib/party-helpers';
import RelatedLinks from '../../components/RelatedLinks';
import { displayMpName } from '@/lib/mp-name';
import { divisionHref, divisionNeighbours, yearHref } from '@/lib/division-links';
import { fetchDivisionVotes, divisionTally, type Vote as DivisionVote } from '@/lib/division-votes';

export const revalidate = 86400;  // divisions don't change after the vote happens

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const SUCCESS = '#4a8a3a';
const DANGER = '#a64030';

// Slug forms accepted:
//   pw-2026-04-28-515-commons   (TWFY / ParlParse canonical)
//   pw-2026-04-28-515            (chamber omitted — defaults to commons)
const SLUG_RE = /^pw-(\d{4}-\d{2}-\d{2})-(\d+)(?:-commons)?$/;
// One address per division (28 Oct 2026, Search Console): the -commons form every link uses. The short form is
// redirected to it permanently and every canonical names it.
const fullSlug = (date: string, num: number | string) => `pw-${date}-${num}-commons`;

// Procedural-motion explainers. For divisions whose titles are
// parliamentary shorthand (King's Speech, programme motion, business of
// the House, etc.) we render a one-paragraph contextual explainer rather
// than leave the page bare. Patterns are case-insensitive substring
// matches against division_title; first match wins.
const PROCEDURAL_PATTERNS: Array<[RegExp, string]> = [
  [/king'?s speech.*motion for an address|king'?s speech \(motion for an address\)/i,
   "The Motion for an Address is the formal Commons reply to the King's Speech, the government's legislative programme read at the start of each parliamentary session. The vote is on whether the Commons accepts the speech as the basis for the session's work. Amendments to it test specific government commitments."],
  [/queen'?s speech.*motion for an address|queen'?s speech \(motion for an address\)/i,
   "The Motion for an Address is the formal Commons reply to the Queen's Speech, the government's legislative programme read at the start of each parliamentary session. The vote is on whether the Commons accepts the speech as the basis for the session's work."],
  [/programme motion/i,
   "A programme motion sets the parliamentary timetable for a bill: how long each stage takes, when amendments must be tabled, and when the Commons must conclude consideration. The government uses it to control debate length; opposition parties use objections to it as a way to register process complaints."],
  [/business of the house/i,
   "A Business of the House motion governs how the Commons orders its time, including which days are given over to which sorts of debate. The government tables most of these; they pass routinely but are sometimes used to short-circuit opposition procedural objections."],
  [/carry-?over motion/i,
   "A motion to carry over lets a bill that has not finished its passage in one parliamentary session continue in the next, rather than restarting from scratch. Without one, an incomplete bill falls."],
  [/closure(\s|$)|closure of the question/i,
   "A closure motion forces an immediate vote on the question before the Commons, cutting off further debate. The Speaker must judge that the matter has been adequately discussed. Used by both government and opposition to shut down obstruction."],
  [/adjournment/i,
   "An adjournment motion ends the sitting day. Substantive votes on adjournment motions are rare; they appear most often as 'tabled but not pressed' procedural devices that let MPs raise topics on the record."],
  [/business motion/i,
   "A business motion is a procedural vote on how the Commons will use a sitting, typically tabled by the Leader of the House to extend sitting hours or arrange the order of business."],
  [/private members' business/i,
   "A vote on the procedure governing private members' bills, the route by which backbench MPs put forward legislation. These motions affect which bills are heard and how much time they get."],
  [/^opposition day|opposition day debate|^supply and appropriation/i,
   "On an Opposition Day the largest opposition party chooses the topic of debate. The vote is symbolic, it doesn't change the law, but it forces the government to publicly take a position on the opposition's choice of question."],
  [/^unpublished divisions/i,
   "An Unpublished Division is a vote held in a Public Bill Committee (the small group drawn from across the parties that scrutinises a bill clause by clause) whose result was not formally published in the main Commons division list. The vote still counts and shapes the bill, but it sits outside the headline numbered sequence."],
  [/^budget resolution/i,
   "Budget Resolutions are the individual propositions on tax and spending voted on the floor of the Commons in the week after the Budget. Each Resolution authorises a specific tax change (rates, thresholds, new duties) and together they form the basis of the Finance Bill."],
  [/^privilege$|breach of privilege/i,
   "A privilege motion arises when the conduct of a Member, or interference with the work of the Commons or its committees, is alleged to have breached the rights of Parliament. The vote authorises a referral, sanction or further investigation."],
  [/draft (.+) regulations? \d{4}/i,
   "A Draft Statutory Instrument, secondary legislation made under powers granted by an existing Act. The Commons vote determines whether the Regulations come into force as written. SIs are how the working detail of UK law is set without primary legislation."],
  [/draft (.+) order \d{4}/i,
   "A Draft Statutory Instrument, secondary legislation made under powers granted by an existing Act. The Commons vote determines whether the Order comes into force as written. SIs are how the working detail of UK law is set without primary legislation."],
];

function proceduralContext(title: string | null | undefined): string | null {
  if (!title) return null;
  for (const [pat, text] of PROCEDURAL_PATTERNS) {
    if (pat.test(title)) return text;
  }
  return null;
}

// Strip trailing procedural/stage markers from a division title so the SEO
// title can lead with the actual subject (the bill or motion topic) rather
// than the parliamentary stage. Conservative: only removes recognised
// stage/amendment suffixes, leaves "(Amendment)" inside bill/SI names alone,
// and never blanks the title.
function stripProceduralSuffix(title: string): string {
  const t = title
    .replace(/\s*[:–-]?\s*\b(Report Stage|Committee Stage|Third Reading|Second Reading|First Reading|Remaining Stages?|Legislative Grand Committee|Programme Motion|Money Resolution|Ways and Means|Consideration of Lords (?:Amendments?|Message)|Motion to (?:disagree|agree|insist))\b.*$/i, '')
    .replace(/\s+Committee:\s.*$/i, '')
    .replace(/:\s*(?:New Clause|New Schedule|Amendments?|Lords Amendments?)\b.*$/i, '')
    .replace(/[\s:,–-]+$/, '')
    .trim();
  return t.length >= 3 ? t : title;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

type Vote = DivisionVote;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const m = SLUG_RE.exec(slug);
  if (!m) return { title: 'Division' };
  const dateOnly = m[1];
  const divisionNumber = parseInt(m[2], 10);

  const { data: row, error: rowErr } = await supabase
    .from('mp_division_votes')
    .select('division_title, division_date, bill_id, division_id')
    .eq('division_date_only', dateOnly)
    .eq('division_number', divisionNumber)
    .order('bill_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (rowErr && rowErr.code !== 'PGRST116') throw new Error(`/divisions/[slug] mp_division_votes: ${rowErr.message}`);
  if (!row) return { title: 'Division' };

  const dateLabel = new Date(row.division_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Search title and description (owner's approval, 23 Oct 2026), built from the division's own data only.
  // Title: the motion title, then the bill's name when the motion title does not already contain it, then the date.
  const motion = (row.division_title ?? '').replace(/\s+/g, ' ').trim() || `Commons Division ${divisionNumber}`;
  let billName: string | null = null;
  if (row.bill_id != null) {
    const { data: bill, error: billErr2 } = await supabase.from('bill').select('title').eq('id', row.bill_id).is('hidden_reason', null).maybeSingle();
    if (billErr2 && billErr2.code !== 'PGRST116') throw new Error(`/divisions/[slug] bill: ${billErr2.message}`);
    billName = (bill?.title as string | undefined)?.replace(/\s+/g, ' ').trim() || null;
  }
  // "X Act 2022" was "X Bill" when the vote was held, so compare on the name without Bill, Act and the year.
  const billCore = billName ? billName.replace(/\s*(\[[^\]]*\]|\bBill\b|\bAct\b(\s+\d{4})?)\s*/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : '';
  const showBill = !!billName && !!billCore && !motion.toLowerCase().includes(billCore);
  const title = `How every MP voted on ${motion}${showBill ? `, ${billName}` : ''}, ${dateLabel}`;

  // Description: the official totals (tellers not counted) from Parliament, or the named votes when there are
  // none, and the result they give. A tie is left without a result: the data does not record the casting vote.
  let ayes: number | null = null, noes: number | null = null;
  if (row.division_id != null) {
    const { data: t, error: tErr } = await supabase.from('commons_division_totals').select('aye_count, no_count').eq('division_id', row.division_id).maybeSingle();
    if (tErr && tErr.code !== 'PGRST116') throw new Error(`/divisions/[slug] commons_division_totals: ${tErr.message}`);
    if (t) { ayes = t.aye_count as number; noes = t.no_count as number; }
  }
  if (ayes == null || noes == null) {
    const count = (voteType: string) => supabase.from('mp_division_votes').select('member_id', { count: 'exact', head: true })
      .eq('division_date_only', dateOnly).eq('division_number', divisionNumber).eq('vote_type', voteType).not('is_teller', 'is', true);
    const [a, n] = await Promise.all([count('aye'), count('no')]);
    if (a.error) throw new Error(`/divisions/[slug] aye count: ${a.error.message}`);
    if (n.error) throw new Error(`/divisions/[slug] no count: ${n.error.message}`);
    ayes = a.count ?? 0; noes = n.count ?? 0;
  }
  // The motion's short title: for a bill stage ("X Bill Report Stage: New Clause 5"), what was voted on, then the bill.
  const colon = motion.lastIndexOf(': ');
  const shortMotion = colon > 0 && /\bBill\b/i.test(motion.slice(0, colon))
    ? `${motion.slice(colon + 2)} to the ${stripProceduralSuffix(motion.slice(0, colon))}`
    : motion;
  const result = ayes > noes ? 'passed' : ayes < noes ? 'rejected' : null;
  // Over 160 characters: first drop " [Lords]" from the bill name (description only, never the title), then the
  // call to action.
  const describe = (motionText: string, cta: boolean) =>
    `Ayes ${ayes}, Noes ${noes}: ${result ? `MPs ${result} ${motionText}` : motionText} on ${dateLabel}.${cta ? ' See how every MP voted.' : ''}`;
  let description = describe(shortMotion, true);
  if (description.length > 160) description = describe(shortMotion.replace(/\s*\[Lords\]/g, ''), true);
  if (description.length > 160) description = metaDescription(describe(shortMotion.replace(/\s*\[Lords\]/g, ''), false));
  return {
    title: title.length > 200 ? title.slice(0, 197).trimEnd() + '…' : title,
    description,
    alternates: { canonical: `/divisions/${fullSlug(m[1], parseInt(m[2], 10))}` },
  };
}

// Prerender a small set of division pages at build time. The list does NOT
// need to be complete — its presence is what enables ISR caching for the
// whole route. Pages not listed here render on first request and are cached
// from then on (see revalidate above, 24h). commons_divisions_fts is the
// same source the /divisions index uses: one row per division (a materialized
// copy of commons_divisions_titled, fast enough for the anon role's 3-second
// timeout), so no dedupe is needed against the per-MP rows in mp_division_votes.
export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('commons_divisions_fts')
    .select('division_date_only, division_number')
    .not('division_date_only', 'is', null)
    .not('division_number', 'is', null)
    .limit(20);
  if (error) {
    throw new Error(
      `generateStaticParams(/divisions/[slug]) query failed: ${error.message}`
    );
  }
  if (!data || data.length === 0) {
    throw new Error(
      'generateStaticParams(/divisions/[slug]): commons_divisions_fts returned no rows'
    );
  }
  const seen = new Set<string>();
  for (const row of data) {
    const date = String(row.division_date_only).slice(0, 10);
    const num = row.division_number;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (num === null || num === undefined) continue;
    seen.add(`pw-${date}-${num}-commons`);
  }
  if (seen.size === 0) {
    throw new Error(
      'generateStaticParams(/divisions/[slug]): no usable slugs derived'
    );
  }
  return Array.from(seen).map((slug) => ({ slug }));
}

export default async function DivisionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const m = SLUG_RE.exec(slug);
  if (!m) notFound();
  if (slug !== fullSlug(m[1], parseInt(m[2], 10))) permanentRedirect(`/divisions/${fullSlug(m[1], parseInt(m[2], 10))}`);
  const dateOnly = m[1];
  const divisionNumber = parseInt(m[2], 10);
  // The votes around this one, for the "More votes" links (owner, 31 Oct 2026); read alongside the rest.
  const neighboursP = divisionNeighbours(dateOnly, divisionNumber);
  neighboursP.catch(() => {}); // a 404 below leaves it unawaited; when awaited, its error still throws

  // All vote rows for this division, Parliament's totals and the MPs who voted (lib/division-votes.ts, shared with the
  // debate pages so both show the same figures).
  const loaded = await fetchDivisionVotes(dateOnly, divisionNumber, `/divisions/${slug}`);
  if (!loaded) notFound();
  const { voteRows, votes, totals } = loaded;

  // Headline metadata comes from the first row — all rows share these fields.
  const head = voteRows[0];
  const title = head.division_title || `Commons Division ${divisionNumber}`;
  const dateLabel = new Date(head.division_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Bill backlink: if any vote row has bill_id, link to that bill (not a hidden one: bill.hidden_reason, a 404).
  let billId = voteRows.find((v) => v.bill_id != null)?.bill_id ?? null;
  let billTitle: string | null = null;
  let billSummary: string | null = null;
  if (billId != null) {
    const { data: bill, error: billErr } = await supabase
      .from('bill')
      .select('title, description, long_title')
      .eq('id', billId)
      .is('hidden_reason', null)
      .maybeSingle();
    if (billErr && billErr.code !== 'PGRST116') throw new Error(`/divisions/[slug] bill: ${billErr.message}`);
    if (!bill) billId = null;
    billTitle = bill?.title ?? null;
    billSummary = bill ? officialBillSummary(bill) || null : null;
  }

  // SI description fallback: if this is a statutory instrument division
  // (matched by CVA division_id), pull the explanatory note we already
  // hold from legislation.gov.uk.
  const cvaId = voteRows.find((v) => v.division_id != null)?.division_id ?? null;
  let siDescription: string | null = null;
  if (!billSummary && cvaId != null) {
    const { data: si, error: siErr } = await supabase
      .from('statutory_instrument')
      .select('description')
      .eq('division_id', cvaId)
      .maybeSingle();
    if (siErr && siErr.code !== 'PGRST116') throw new Error(`/divisions/[slug] statutory_instrument: ${siErr.message}`);
    siDescription = si?.description ?? null;
  }

  // Procedural-motion context: short explainer for common parliamentary
  // routines whose titles tell you nothing useful on their own. Pattern
  // match on the lowercased division title.
  const description = billSummary || siDescription || proceduralContext(head.division_title);

  const { boths, tellers, ayeTotal, noTotal, ayeNamed, noNamed, ayeGroups, noeGroups } = divisionTally(votes, totals);

  return (
    <OpenGovShell pageStamp="Division">
      <BackLink
        fallbackHref={billId != null ? `/bills/${billId}` : '/mps'}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <p style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: ACCENT, margin: '0 0 10px', display: 'inline-block', border: `1px solid ${ACCENT}`, padding: '2px 7px 1px' }}>
        Source: Commons divisions
      </p>

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '32px', marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '15px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            marginBottom: '12px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          UK Parliament · Commons Division {divisionNumber} · {dateLabel}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-special-elite), monospace',
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {billId != null && billTitle && (
          <p style={{ fontSize: '15px', marginTop: '12px' }}>
            Vote on{' '}
            <Link href={`/bills/${billId}`} style={{ color: ACCENT, textDecoration: 'underline' }}>
              {billTitle}
            </Link>
          </p>
        )}
      </header>

      {/* Single typewriter line — sits naturally in the dossier paper layout
          where boxy stat cells would feel out of place. Margin sign reflects
          the result (positive = ayes won). */}
      <p
        style={{
          fontFamily: 'var(--font-special-elite), monospace',
          fontSize: 'clamp(15px, 1.7vw, 18px)',
          marginBottom: '32px',
          lineHeight: 1.6,
          transform: 'rotate(-0.15deg)',
        }}
      >
        <span style={{ color: INK, fontWeight: 'bold' }}>{ayeTotal} Aye</span>
        {'  /  '}
        <span style={{ color: INK, fontWeight: 'bold' }}>{noTotal} No</span>
        {'  ·  '}
        <span style={{ color: ACCENT }}>
          {ayeTotal > noTotal ? 'majority ' : ayeTotal < noTotal ? 'lost by ' : 'tied · margin '}
          {Math.abs(ayeTotal - noTotal)}
        </span>
        {tellers.length > 0 && <>{'  ·  '}{tellers.length} tellers (not counted)</>}
        {boths.length > 0 && <>{'  ·  '}{boths.length} both</>}
      </p>

      {description && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={sectionH2}>What this vote was about</h2>
          <p
            style={{
              fontFamily: 'var(--font-special-elite), monospace',
              fontSize: '16px',
              lineHeight: 1.7,
              marginTop: '12px',
            }}
          >
            {description}
          </p>
        </section>
      )}

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>How MPs voted</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '24px' }}>
          <VoteColumn heading={`Voted AYE (${ayeTotal})`} groups={ayeGroups} accent={SUCCESS} />
          <VoteColumn heading={`Voted NO (${noTotal})`} groups={noeGroups} accent={DANGER} />
        </div>
        {totals && (ayeNamed !== ayeTotal || noNamed !== noTotal) && (
          <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', lineHeight: 1.6, marginTop: '16px' }}>
            Totals are Parliament&rsquo;s official count, which does not include the tellers. Parliament&rsquo;s published list names {ayeNamed} of the {ayeTotal} Aye voters and {noNamed} of the {noTotal} No voters; tellers are listed and marked but not counted.
          </p>
        )}
      </section>

      {boths.length > 0 && (
        <section style={{ marginTop: '32px', padding: '24px', background: CREAM, border: `1px solid ${INK_HAIRLINE}` }}>
          <h2 style={{ ...sectionH2, marginBottom: '12px' }}>Voted in both lobbies</h2>
          <p style={{ fontSize: '15px', marginBottom: '12px' }}>
            Walking through both the Aye and No lobbies is a recorded form of deliberate abstention.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
            {boths.map((v) => (
              <li key={v.member_id} style={{ padding: '4px 0' }}>
                <MpVoteLink vote={v}>
                  {displayMpName(v.mp?.display_name ?? v.mp?.name) ?? `Member ${v.member_id}`}
                  {v.mp?.party && <span > · {normaliseParty(v.mp.party) || v.mp.party}</span>}
                </MpVoteLink>
              </li>
            ))}
          </ul>
        </section>
      )}


      {/* More votes (owner, 31 Oct 2026): plain links to the votes before and after this one, others that day, its year,
          its bill and the full list, so a crawler that reaches one division can reach them all. */}
      {await (async () => {
        const nb = await neighboursP;
        const year = Number(dateOnly.slice(0, 4));
        const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
        return (
          <nav aria-label="More votes" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginTop: '36px', paddingTop: '20px', fontSize: '15px', lineHeight: 1.7, color: INK }}>
            <h2 style={{ fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>More votes</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {nb.previous && <li>Previous vote: <Link href={divisionHref(nb.previous.date, nb.previous.number)} style={link}>{nb.previous.title}</Link> ({nb.previous.date === dateOnly ? `division ${nb.previous.number}` : nb.previous.date})</li>}
              {nb.next && <li>Next vote: <Link href={divisionHref(nb.next.date, nb.next.number)} style={link}>{nb.next.title}</Link> ({nb.next.date === dateOnly ? `division ${nb.next.number}` : nb.next.date})</li>}
              {billId != null && billTitle && <li>The bill: <Link href={`/bills/${billId}`} style={link}>{billTitle}</Link></li>}
              <li><Link href={yearHref(year)} style={link}>Every Commons vote in {year}</Link> · <Link href="/divisions" style={link}>All divisions</Link></li>
            </ul>
            {nb.sameDay.length > 0 && (
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '14px 0 6px' }}>Other votes that day</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {nb.sameDay.map((d) => (
                    <li key={d.number}>Division {d.number}: <Link href={divisionHref(d.date, d.number)} style={link}>{d.title}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        );
      })()}

      {/* B4 — bill + department related links via exact normalized title match */}
      <RelatedLinks variant="division" divisionTitle={title} />
    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '-0.01em',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '8px',
};

// Link to an MP only when they have a live profile (present in the mps table —
// i.e. v.mp is populated). Former MPs have no /mps/<id> page, so their name
// renders as plain text rather than a 404 link. (SEO audit fix.)
function MpVoteLink({ vote, children }: { vote: Vote; children: React.ReactNode }) {
  const style: React.CSSProperties = { color: INK, textDecoration: 'none' };
  return vote.mp ? (
    <Link href={`/mps/${vote.member_id}`} style={style}>{children}</Link>
  ) : (
    <span style={style}>{children}</span>
  );
}

function VoteColumn({
  heading,
  groups,
  accent,
}: {
  heading: string;
  groups: Array<{ party: string; partyColour: string; rows: Vote[] }>;
  accent: string;
}) {
  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', borderBottom: `2px solid ${accent}`, paddingBottom: '6px', marginBottom: '12px', color: '#14100d' }}>
        {heading}
      </h3>
      {groups.map((g) => (
        <div key={g.party} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: g.partyColour }} />
            <strong>{g.party}</strong>
            <span >({g.rows.length})</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px', lineHeight: 1.55 }}>
            {g.rows.map((v) => (
              <li key={v.member_id} style={{ padding: '4px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <MpVoteLink vote={v}>
                  {displayMpName(v.mp?.display_name ?? v.mp?.name) ?? `Member ${v.member_id}`}
                  {v.is_teller && (
                    <span style={{ marginLeft: '6px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', color: INK_SOFT, border: `1px solid ${INK_HAIRLINE}`, padding: '1px 5px' }}>
                      Teller
                    </span>
                  )}
                  {v.is_rebellion && <span style={{ color: ACCENT, fontSize: '15px', fontWeight: 'bold' }}> · REBEL</span>}
                </MpVoteLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
