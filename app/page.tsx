import type { Metadata } from 'next';
import SotnBand from './components/SotnBand';
import Link from 'next/link';
import OpenGovShell from './components/OpenGovShell';
import { editorialsBySlug } from '@/lib/editorials-source';
import { listSummary } from '@/lib/editorials/list-summary';
import { listReadingLabel } from '@/lib/reading-time';
import { govUrlToSlug } from '@/lib/govUrlSlug';
import { departments } from '@/lib/departments';
import AreaSearch from './components/AreaSearch';
import SuggestInput from './components/SuggestInput';
import HomeBalance from './components/HomeBalance';
import HomeRecord from './components/HomeRecord';
import NewsletterSignup from './components/NewsletterSignup';
import { SubFold } from './components/PhoneFolds';
import { latestExpensesYear, expensesYearShort } from '@/lib/expenses-year';
import { loadLatestWhitehall } from '@/lib/press-releases-latest';
import { pressSyncCheckedAt } from '@/lib/press-sync-checked';
import { checkedLine } from '@/lib/press-checked-line';
import { londonDay } from '@/lib/london-date';
import type { FeaturedItem } from '@/lib/home-rotation';
import { HomeFeaturedProvider, FeaturedLead, FeaturedBrief } from './components/HomeFeatured';
import './home-front.css';
import './components/search-box-desk.css';
import { phoneUpTo } from '@/lib/breakpoints';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';

// The council ranking pages linked from the homepage (owner, 18 Nov 2026, Cowork ENTRY 327), each by its plain name.
const HOME_RANKINGS: [string, string][] = [
  ['Free school meals', '/councils/free-school-meals'],
  ['Youth justice', '/councils/youth-justice'],
  ['Child poverty', '/councils/child-poverty'],
  ['Children in care', '/councils/children-in-care'],
  ['Road condition', '/councils/road-condition'],
  ...(SHOW_LEAGUE_TABLE ? [['How council areas compare', '/councils/league-table'] as [string, string]] : []),
];

function fmtGovDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


// The new "OPEN GOVERNMENT" front page: the dossier-folder template (OpenGovShell)
// with the front-page article layout. Replaces the previous pca-art newspaper.
// A16 (ENTRY 129, 140): rebuilt only when its data changes; the daily rotation of the featured reports is worked out in
// the browser (app/components/HomeFeatured.tsx), so a new day does not rebuild the page.
export const revalidate = false;
// Database reads on this page go through Next's data cache (25 Oct 2026, report 43), each under its source's tag (A16,
// 15 Nov 2026): a read is kept until the sync that writes its table refreshes the tag. A new read on this page must do
// the same.
export const fetchCache = 'default-cache';

const HOME_DESCRIPTION =
  'Track every UK MP, bill, vote and government department in one place: voting records, spending and Whitehall transparency data, free.';

const HOME_TITLE = 'opengovt | UK Parliament Tracker & Government Transparency';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  // The home page's own openGraph and twitter (owner's approval, 24 Oct 2026), so its share text matches its search
  // description. They repeat the root layout's values with this description: a page's openGraph or twitter replaces the
  // layout's whole block. SITE_DESCRIPTION in app/layout.tsx is left as it is: other pages use it as their description.
  // The share title is the page's own title (report 63), as on every other page.
  openGraph: {
    type: 'website',
    siteName: 'opengovt',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: 'https://www.opengovt.uk',
    locale: 'en_GB',
    images: [{ url: 'https://www.opengovt.uk/og-image.png', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['https://www.opengovt.uk/og-image.png'],
  },
};

// The report held as the homepage lead, whatever the daily rotation would put there. Empty: the lead rotates with the rest.
const HOMEPAGE_LEAD_SLUG: string = 'q1yfr4lome';


export default async function HomePage() {

  // Investigation pool: all entries where kind is absent (investigations only),
  // sorted publishedAt DESC then by registry declaration order as tiebreaker.
  // Four pieces share publishedAt '2026-08-04' — the secondary sort is what
  // keeps the selection deterministic across rebuilds.
  const editorials = await editorialsBySlug();
  const registryKeys = Object.keys(editorials);
  const investigations = registryKeys
    .map((slug, registryIndex) => ({ ...editorials[slug], registryIndex }))
    .filter((e) => e.kind === undefined);
  investigations.sort((a, b) => {
    const cmp = b.publishedAt.localeCompare(a.publishedAt);
    return cmp !== 0 ? cmp : a.registryIndex - b.registryIndex;
  });
  // The four featured reports rotate daily through the 16 most recent (lib/home-rotation.ts). ENTRY 140: the browser
  // picks today's (app/components/HomeFeatured.tsx); the server sends only these candidates and renders its own day.
  const asItem = (e: (typeof investigations)[number]): FeaturedItem => ({ slug: e.slug, headline: e.headline, label: listReadingLabel(e), summary: listSummary(e), lede: e.lede ?? null });
  const featuredPool = investigations.slice(0, Math.min(16, investigations.length)).map(asItem);
  const heldLead = featuredPool.some((e) => e.slug === HOMEPAGE_LEAD_SLUG) ? null : (() => { const l = investigations.find((e) => e.slug === HOMEPAGE_LEAD_SLUG); return l ? asItem(l) : null; })();
  const renderedOn = londonDay();

  // Each item links only to its press release (owner, 30 Oct 2026), so the department or agency name is plain text and
  // agency_cache is no longer read here. The read is tagged 'press-releases-latest' (lib/press-releases-latest.ts), which
  // the press release sync refreshes whenever it stores a new release.
  const [rawPressReleases, pressCheckedAt] = await Promise.all([loadLatestWhitehall(), pressSyncCheckedAt()]);
  const expensesYear = expensesYearShort(await latestExpensesYear());
  const whitehallItems = (rawPressReleases ?? [])
    .flatMap((row) => {
      if (!row.gov_url) return [];
      const slug = govUrlToSlug(row.gov_url);
      if (!slug) return [];
      const org = row.organisation as string | null;
      return [{ slug, title: row.title as string, organisation: org, publishedAt: row.published_at as string | null }];
    })
    .slice(0, 5);

  return (
    <>
      <OpenGovShell pageStamp="Front Page" brandAsHeading>
      <HomeFeaturedProvider pool={featuredPool} lead={heldLead} leadSlug={HOMEPAGE_LEAD_SLUG} renderedOn={renderedOn}>
              {/* Phones and tablets, up to 1,023.98px (ENTRY 233 MOB-HOME, owner approved 17 Nov 2026): the two finders, the
                  lead story, the State of the nation strip, This week in Parliament, the archive ("The record, going back
                  decades"), the other reports, From Whitehall, then the rest of the rail. This is the order of the HTML
                  itself: no CSS order, so a screen reader and the Tab key meet everything in the order it is shown, with
                  JavaScript off too. The parts whose place differs from desktop are rendered in both places, each hidden
                  (display: none, so out of the reading order) at the other's widths: .og-desk from 1,024px up only, .og-mob
                  up to 1,023.98px only (app/home-front.css). Desktop is unchanged. Under 768px: */}
              <style>{`@media ${phoneUpTo(767.98)} {
                .og-lead-story .og-lede { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
                /* Homepage length on phones (19 Nov 2026: the daily reports took / to 2,509px at 375, limit 2,500): the lead
                   story's summary to 3 lines, and 'This week in Parliament' shows its heading and link only, as the rail's
                   other cards already do on phones. */
                .og-lead-story .og-standfirst { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
                a.og-card[href="/this-week"] > :not(.og-head):not(.og-cta) { display: none !important; }
                .og-finders { margin-bottom: 12px !important; }
                .og-rail > #newsletter:not(:target) { display: none !important; }
                .og-rail > .og-news-line { display: block !important; }
              }`}</style>
              {/* Tablets too, up to 1,023px (owner approved 15 Nov 2026, ENTRY 135 M2: the homepage was 3,672px at 768, limit
                  3,000): the other reports and the promotion cards show their headlines only, which are the links, and the two
                  folds below fold here as well. The phone layout itself (one column, the order above) stays phones only. */}
              {/* Small phones, under 480px (ENTRY 135 M2: the homepage was 2,623px at 320, limit 2,500): the lead story keeps its
                  headline and summary without the opening extract, and the "This week in Parliament" card's text is two lines. */}
              <style>{`@media ${phoneUpTo(479)} { .og-lead-story .og-lede { display: none !important; } a.og-card[href="/this-week"] > :not(.og-head) { display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; } }`}</style>
              <style>{`@media ${phoneUpTo(1023.98)} { .og-brief > :not(.og-head) { display: none !important; } .og-rail > a.og-card > :not(.og-head) { display: none !important; } }`}</style>
              {/* Phones only (owner, 10 Nov 2026, S5-home; the page was 4,689px at 375px): folded, nothing cut. The other
                  reports show their headlines only, which are the links, and so do the four promotion cards (Bills tracker, expenses,
                  manifestos, departments; UX5, T1-6, 11 Nov 2026); the research promotion is in a closed native
                  fold (the SubFold after the rail opens); the newsletter block is one line linking to the sign-up page
                  (/newsletter), and a link to #newsletter still shows the block. From 640px up the page is unchanged. */}
              {/* The two finders side by side (UX1b, 9 Nov 2026; the audit found the postcode box below the fold and unlabelled
                  as the way to find an MP): the main search, then "Find your local council" (councils only, owner, 11 Nov 2026, T1-MP). They run across
                  the full width above the lead story and the rail, so on a 1280 x 720 screen both are in the first screen
                  above the research promotion (UX1c). Each column is at least 280px, so they stack on phones. Aligned to the top
                  (T1-MPb, 11 Nov 2026), so suggestions under the council box grow below it and the search box never moves. */}
              <style>{`.og-finders { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px 20px; align-items: start; margin-bottom: 28px; } .og-finders > form, .og-finders > section { margin: 0 !important; }`}</style>
              <div className="og-finders">
              <form action="/search" method="get" style={{ marginBottom: '28px' }}>
                <label htmlFor="home-search-q" className="og-kicker og-search-label">Search opengovt</label>
                {/* Suggestions as you type (SEARCH-ALL batch 1, Cowork ENTRY 326); Enter with none picked opens /search as before. */}
                <div className="og-sbox-row" style={{ position: 'relative' }}>
                  <SuggestInput suggestPath="/api/suggest/site" inputProps={{ 'data-main-action': true }} ariaLabel="Search opengovt"
                    id="home-search-q"
                    name="q"
                    placeholder="MPs, bills, votes, debates"
                    className="og-search-input og-sbox-input"
                    listLabel="Suggested pages"
                    style={{
                      width: '100%',
                      padding: '12px 36px 12px 14px',
                      fontFamily: "var(--font-special-elite), monospace",
                      fontSize: '15px',
                      color: '#14100d',
                      background: '#f4e8d4',
                      border: '1px solid rgba(20,16,13,0.18)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    className="og-search-go og-sbox-btn"
                    aria-label="Search"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7a1612',
                      fontSize: '18px',
                      lineHeight: 1,
                      padding: '4px',
                    }}
                  >
                    <span className="og-sbox-arrow">→</span><span className="og-sbox-word">Search</span>
                  </button>
                </div>
              </form>

              <AreaSearch label="Find your local council" placeholder="Postcode, town or council" />
              </div>
              {/* PMQs search (owner, 18 Nov 2026, Cowork ENTRY 320): directly under the two main searches, in the same look as
                  the main search. A plain form to /pmqs?q= (rewritten to /pmqs/search), so it works with no script. As you type
                  suggestions come with the shared search piece (SEARCH-ALL, ENTRY 318). */}
              {/* As wide as one of the two finders above it once they sit side by side (each at least 280px with a 20px gap). */}
              {/* Phones (homepage length, 2,611px at 375 with this block, limit 2,500): smaller gaps under the PMQs box and the links. */}
              <style>{`@media (min-width: 640px) { .og-pmqs-search { max-width: calc(50% - 10px); } } @media ${phoneUpTo(639.98)} { .og-pmqs-search { margin-bottom: 12px !important; } .og-quicklinks { margin: 0 0 12px !important; } } @media ${phoneUpTo(767.98)} { .og-rail > a.og-pmqs-card { display: none !important; } }`}</style>
              <form action="/pmqs" method="get" className="og-pmqs-search" style={{ margin: '0 0 28px' }}>
                <label htmlFor="home-pmqs-q" className="og-kicker og-search-label">Search Prime Minister&rsquo;s Questions</label>
                <div className="og-sbox-row" style={{ position: 'relative' }}>
                  {/* Suggestions as you type (SEARCH-ALL batch 1): Prime Ministers and sessions by date (lib/search/pmqs-index.ts);
                      Enter with none picked runs the full search of the questions, /pmqs?q=. */}
                  <SuggestInput suggestPath="/api/suggest/pmqs"
                    id="home-pmqs-q"
                    name="q"
                    placeholder="Words, an MP or a date"
                    className="og-search-input og-sbox-input"
                    listLabel="Suggested sessions"
                    style={{
                      width: '100%',
                      padding: '12px 36px 12px 14px',
                      fontFamily: "var(--font-special-elite), monospace",
                      fontSize: '15px',
                      color: '#14100d',
                      background: '#f4e8d4',
                      border: '1px solid rgba(20,16,13,0.18)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    className="og-search-go og-sbox-btn"
                    aria-label="Search Prime Minister's Questions"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7a1612',
                      fontSize: '18px',
                      lineHeight: 1,
                      padding: '4px',
                    }}
                  >
                    <span className="og-sbox-arrow">→</span><span className="og-sbox-word">Search</span>
                  </button>
                </div>
              </form>
              {/* Homepage links (owner, 18 Nov 2026, Cowork ENTRY 327): under the searches and the PMQs box, the council
                  ranking pages and every report, as plain links that wrap (not a data list, so no fold). Each link is a 44px
                  tap target on phones (og-tap). The league table only while its switch is on. Push check A17 keeps them. */}
              <nav aria-label="Council rankings and reports" className="og-quicklinks" style={{ margin: '-14px 0 24px', fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', lineHeight: 1.6, color: '#14100d' }}>
                <p style={{ margin: '0 0 4px' }}>
                  <span className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em', marginRight: '10px' }}>How councils compare</span>
                  {HOME_RANKINGS.map(([label, href], i) => (
                    <span key={href}>{i > 0 && ' · '}<Link href={href} prefetch={false} className="og-tap" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{label}</Link></span>
                  ))}
                  {' · '}<Link href="/reports" prefetch={false} className="og-tap" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>All reports &rarr;</Link>
                </p>
              </nav>
              {/* State of the nation (T1-SOTN, layout change approved by the owner 15 Nov 2026, ENTRY 105): on desktop four
                  headline official figures under the finders, linking to /state-of-the-nation; on phones and tablets the
                  compact strip after the lead story (ENTRY 233). */}
              <SotnBand variant="band" />
              <div className="og-lead">
            <div className="og-main">


              <HomeRecord only="desk" />

              {/* The lead story (UX1g, 9 Nov 2026): the headline is the link, and the summary and opening are plain text
                  after it, so a screen reader hears the headline as the link's name rather than the whole block. On
                  phones the opening is cut to four lines (the CSS above). */}
              <style>{`.og-lead-head { display: block; text-decoration: none; color: inherit; } .og-lead-head:hover, .og-lead-head:focus-visible { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; } .og-lead-head:focus-visible { outline: 3px solid #7a1612; outline-offset: 3px; }`}</style>
              <FeaturedLead />

              {/* Phones and tablets only (ENTRY 233): the figures strip, This week in Parliament and the archive straight
                  after the lead story, and the second and third reports before From Whitehall (on desktop they are in the rail). */}
              <SotnBand variant="strip" />
              <a className="og-block og-card og-mob" href="/this-week">
                <div className="og-head">This week in Parliament</div>
                <p>The bills due in the House of Commons over the next seven days, and the votes MPs have held.</p>
                <div className="og-cta">See the business in Parliament &rarr;</div>
              </a>
              <HomeRecord only="mob" />

              <FeaturedBrief n={1} plainLink />
              {/* Desktop too since ENTRY 331 (owner decision 18 Nov 2026): the left column ended about 1,180px above the rail at
                  1280, so the second and third reports show here at every width; their copies in the rail stay in the HTML and
                  are hidden by CSS (app/home-front.css), so no report shows twice. Phones and tablets unchanged. */}
              <FeaturedBrief n={2} />
              <FeaturedBrief n={3} />


              {/* Phones (owner, 10 Nov 2026, S5-home2): a closed native fold labelled with the heading and item count, opened
                  in full; from 640px up as before. The wrapper carries the phone order. */}
              {whitehallItems.length > 0 && (
                <div className="og-whitehall-f">
                <SubFold tablets label={`From Whitehall (${whitehallItems.length})`}>
                <section aria-label="From Whitehall" style={{ marginTop: '28px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)' }}>
                  <h2 style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 2px' }}>
                    From Whitehall
                  </h2>
                  <p style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', margin: '0 0 12px', letterSpacing: '0.04em' }}>
                    Government press releases, published as issued
                  </p>
                  {pressCheckedAt && (
                    <p data-press-checked="" style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', margin: '-8px 0 12px', letterSpacing: '0.04em' }}>
                      {checkedLine(pressCheckedAt)}
                    </p>
                  )}
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {whitehallItems.map(({ slug, title, organisation, publishedAt }) => (
                      <li key={slug} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0' }}>
                        {/* One link per item, to its press release (owner, 30 Oct 2026): headline, name and date are one tap target. */}
                        <a href={`/news/${slug}`} className="focus-ring" style={{ display: 'block', fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', textDecoration: 'none' }}>
                          <span style={{ display: 'block', lineHeight: 1.38 }}>{title}</span>
                          <span style={{ display: 'block', fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', marginTop: '3px' }}>
                            {organisation}
                            {organisation && publishedAt ? ' · ' : ''}{fmtGovDate(publishedAt)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
                </SubFold>
                </div>
              )}
            </div>

            <div className="og-rail">
              {/* Commission research (owner's request, 25 Oct 2026, reports 50 and 69): one promotion, at the top of the
                  right rail, directly above "From the House this week", so the lead story and the second report run on
                  together in the main column. On phones the rail follows the main column, so it comes after the reports
                  and Latest from Whitehall. Labelled as a service so it reads apart from the journalism. Plain
                  server-rendered markup: no image and no script. */}
              <SubFold tablets label="Commission research from opengovt">
              <section className="og-promo" aria-labelledby="og-promo-head">
                <div className="og-kicker">opengovt service</div>
                <h2 id="og-promo-head" className="og-promo-head">Want something investigated from the public record?</h2>
                <p>Commission an independent, fully sourced research report. Every figure cited; the findings are ours, not the client&rsquo;s.</p>
                <p className="og-promo-price">From £295, with a fixed quote for each enquiry, including data not yet on opengovt</p>
                <Link href="/commission" className="og-promo-btn">Commission research</Link>
              </section>
              </SubFold>

              {/* "If an Election Were Held Now" reader card removed 17 Oct 2026 (owner's decision): its
                  total was a launch seed of 4,106 votes plus 1 real reader vote. */}
              <Link className="og-block og-card" href="/bills">
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>Bills tracker</div>
                <div className="og-head">Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing, in plain English, then cast your own vote on every bill. <span className="og-cta" style={{ whiteSpace: 'nowrap' }}>Browse bills and reader polls &rarr;</span></p>
              </Link>

              <FeaturedBrief n={2} only="desk" />

              <FeaturedBrief n={3} only="desk" />

              <Link className="og-block og-card" href="/expenses">
                <div className="og-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills in {expensesYear}. See which MPs spent the most and on what.</p>
                <div className="og-cta">See the full top ten &rarr;</div>
              </Link>

              <Link className="og-block og-card" href="/parties/manifestos">
                <div className="og-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="og-cta">Read the dossiers &rarr;</div>
              </Link>

              {/* Phones (under 768px) hide this tile with CSS, keeping it in the HTML (owner decision 18 Nov 2026, Cowork
                  ENTRY 328: the homepage was over the phone length limit; the PMQs search box near the top stays at every width).
                  The PMQs tile (owner approved 13 Nov 2026 with the four feature tiles; that design was parked and never reached this
                  page, so the tile was not on the live homepage; restored here, ENTRY 320). Static text: no database read. */}
              <Link className="og-block og-card og-pmqs-card" href="/pmqs">
                <div className="og-head">Prime Minister&rsquo;s Questions</div>
                <p>Every PMQs since October 1961, and questions to the Prime Minister from 1945, searchable by word, MP or date.</p>
                <div className="og-cta">See every PMQs &rarr;</div>
              </Link>

              <Link className="og-block og-card" href="/departments">
                <div className="og-head">Who runs Whitehall</div>
                <p>All {departments.length} ministerial departments assessed against the public record of what they were set up to do.</p>
                <div className="og-cta">See the departments &rarr;</div>
              </Link>

              <a className="og-block og-card og-desk" href="/this-week">
                <div className="og-head">This week in Parliament</div>
                <p>The bills due in the House of Commons over the next seven days, and the votes MPs have held.</p>
                <div className="og-cta">See the business in Parliament &rarr;</div>
              </a>

              <Link className="og-news-line" href="/newsletter" style={{ display: 'none' }}>Sign up for opengovt Weekly, the weekly newsletter &rarr;</Link>
              <div className="og-block og-card" id="newsletter">
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>Weekly newsletter</div>
                <div className="og-head">What government announced. What the evidence shows. What happened next.</div>
                <p>opengovt Weekly brings you the most important investigations, overlooked documents, questionable claims and public spending stories from the week.</p>
                <p style={{ marginTop: '8px' }}>No Westminster gossip. No rewritten press releases. Just the facts worth knowing.</p>
                <p style={{ marginTop: '8px', fontWeight: 700 }}>A weekly email. Sign up for the first issue.</p>
                <NewsletterSignup source="homepage" />
              </div>
            </div>
          </div>

        {/* Columns always balance on desktop (owner standing rule, Cowork ENTRY 332): places the movable blocks after layout. */}
        <HomeBalance />
      </HomeFeaturedProvider>
      </OpenGovShell>
    </>
  );
}

