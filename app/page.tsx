import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from './components/OpenGovShell';
import { editorialsBySlug } from '@/lib/editorials-source';
import { listSummary } from '@/lib/editorials/list-summary';
import { listReadingLabel } from '@/lib/reading-time';
import ContinueToArticle from './components/ContinueToArticle';
import { govUrlToSlug } from '@/lib/govUrlSlug';
import { departments } from '@/lib/departments';
import AreaSearch from './components/AreaSearch';
import HomeRecord from './components/HomeRecord';
import NewsletterSignup from './components/NewsletterSignup';
import { SubFold } from './components/PhoneFolds';
import { latestExpensesYear, expensesYearShort } from '@/lib/expenses-year';
import { loadLatestWhitehall } from '@/lib/press-releases-latest';
import { setPageReadTimer } from '@/lib/page-reads';
import './home-front.css';
import { phoneUpTo } from '@/lib/breakpoints';

function fmtGovDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


// The new "OPEN GOVERNMENT" front page: the dossier-folder template (OpenGovShell)
// with the front-page article layout. Replaces the previous pca-art newspaper.
export const revalidate = 3600;
// Database reads on this page go through Next's data cache (25 Oct 2026, report 43). Every deploy empties the page
// cache, so the first visit after each deploy rendered the page from scratch; Supabase reads were never cached (754,130
// reads in 48 h, none from the cache). That cache survives deploys, so those renders read from it instead of the
// database. Corrected 30 Oct 2026: this line alone keeps a read with no timer of its own FOR EVER (Next sets
// INFINITE_CACHE), not for the page's revalidate period, so the hourly rebuild showed old rows. Every read here now
// has its own timer: setPageReadTimer(revalidate) below makes pageDb() reads (lib/page-reads.ts) last the page's
// period, under a tag where a sync refreshes one; other reads are tagged unstable_cache reads with their own timers.
// A stale entry is read again before the page is stored. Keep it that way: a new read on this page must use pageDb()
// or have its own timer, or it will never change.
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

// Days since 1 Jan 1970 (UTC): the homepage's featured pieces rotate on it. A function outside the component, so the
// render reads the clock through one named call (react-hooks/purity).
function todayIndex(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
}

export default async function HomePage() {
  setPageReadTimer(revalidate);

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
  // All 4 slots rotate daily through the 16 most recent editorials so newer
  // stories cycle through every position rather than locking into place.
  const dayIndex = todayIndex();
  const featuredPool = investigations.slice(0, Math.min(16, investigations.length));
  const shuffled = [...featuredPool];
  let rngSeed = dayIndex;
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    rngSeed = (rngSeed * 1664525 + 1013904223) & 0x7fffffff;
    const pick = rngSeed % (idx + 1);
    [shuffled[idx], shuffled[pick]] = [shuffled[pick], shuffled[idx]];
  }
  // A chosen report can hold the lead (owner, 5 Nov 2026): it swaps places with whichever report the rotation put first, so
  // every other position stays as the rotation set it. Clear HOMEPAGE_LEAD_SLUG to go back to rotating the lead too.
  const leadAt = shuffled.findIndex((e) => e.slug === HOMEPAGE_LEAD_SLUG);
  if (leadAt > 0) [shuffled[0], shuffled[leadAt]] = [shuffled[leadAt], shuffled[0]];
  else if (leadAt < 0) {
    const lead = investigations.find((e) => e.slug === HOMEPAGE_LEAD_SLUG);
    if (lead) shuffled[0] = lead;
  }
  const [slot1, slot2, slot3, slot4] = shuffled;
  // For slot 1's lede: body[0] text if it's a plain paragraph (stored in the editorials index as lede).
  const ledeText = slot1.lede ?? null;

  // Each item links only to its press release (owner, 30 Oct 2026), so the department or agency name is plain text and
  // agency_cache is no longer read here. The read is tagged 'press-releases-latest' (lib/press-releases-latest.ts), which
  // the press release sync refreshes whenever it stores a new release.
  const rawPressReleases = await loadLatestWhitehall();
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
              {/* Under 640px (owner, 4 Nov 2026; current coverage first, 8 Nov 2026, HP1b): the two searches, the first
                  investigation, This week in Parliament, then the first sentence of the introduction with the archive
                  ("The record, going back decades"), the other reports, Latest from Whitehall and the rest of the rail in
                  their order (the Bills tracker card where it was). CSS order only, so it is the same with JavaScript off.
                  From 640px up, as before. */}
              <style>{`@media ${phoneUpTo(639.98)} {
                .og-lead { display: flex !important; flex-direction: column; }
                .og-main, .og-rail { display: contents !important; }
                .og-main > * { order: 5; }
                .og-main > .og-lead-story { order: 2; }
                .og-lead-story .og-lede { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
                .og-rail > a.og-card[href="/this-week"] { order: 3; }
                .og-main > .og-intro-line { order: 4; padding-top: 0 !important; }
                .og-main > .og-record-f { order: 4; }
                .og-finders { margin-bottom: 12px !important; }
                .og-rail > * { order: 8; }
                .og-rail > .og-brief { order: 6; }
                .og-main > .og-whitehall-f { order: 7; }
                .og-intro-line .og-intro-s ~ .og-intro-s, .og-intro-line .og-intro-br { display: none !important; }
                .og-brief > :not(.og-head) { display: none !important; }
                .og-rail > #newsletter:not(:target) { display: none !important; }
                .og-rail > .og-news-line { display: block !important; }
              }`}</style>
              {/* Phones only (owner, 10 Nov 2026, S5-home; the page was 4,689px at 375px): folded, nothing cut. The other
                  reports show their headlines only, which are the links; the research promotion is in a closed native
                  fold (the SubFold after the rail opens); the newsletter block is one line linking to the sign-up page
                  (/newsletter), and a link to #newsletter still shows the block. From 640px up the page is unchanged. */}
              {/* The two finders side by side (UX1b, 9 Nov 2026; the audit found the postcode box below the fold and unlabelled
                  as the way to find an MP): the main search, then "Find your MP or council (postcode)". They run across
                  the full width above the lead story and the rail, so on a 1280 x 720 screen both are in the first screen
                  above the research promotion (UX1c). Each column is at least 280px, so they stack on phones. */}
              <style>{`.og-finders { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px 20px; align-items: end; margin-bottom: 28px; } .og-finders > form, .og-finders > section { margin: 0 !important; }`}</style>
              <div className="og-finders">
              <form action="/search" method="get" style={{ marginBottom: '28px' }}>
                <label htmlFor="home-search-q" className="og-kicker og-search-label">Search opengovt</label>
                <div style={{ position: 'relative' }}>
                  <input data-main-action aria-label="Search opengovt"
                    id="home-search-q"
                    type="text"
                    name="q"
                    placeholder="MPs, bills, votes, debates"
                    className="og-search-input"
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
                    className="og-search-go"
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
                    →
                  </button>
                </div>
              </form>

              <AreaSearch label="Find your MP or council (postcode)" placeholder="Postcode, town or council" />
              </div>
              <div className="og-lead">
            <div className="og-main">
              <p className="og-intro-line" style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: 'clamp(16px, 1.9vw, 22px)', letterSpacing: '0.01em', color: '#14100d', marginBottom: '18px', lineHeight: 1.45 }}>
                <span className="og-intro-s">opengovt is an independent record of how power is exercised across Britain, from Westminster to local councils.</span><br className="og-intro-br" />
                <span className="og-intro-s">Search what governments and politicians promised, what decisions were made, how public money was spent and what happened next.</span><br className="og-intro-br" />
                <span className="og-intro-s">Follow the evidence. Examine the record.</span>
              </p>


              <HomeRecord />

              {/* The lead story (UX1g, 9 Nov 2026): the headline is the link, and the summary and opening are plain text
                  after it, so a screen reader hears the headline as the link's name rather than the whole block. On
                  phones the opening is cut to four lines (the CSS above). */}
              <style>{`.og-lead-head { display: block; text-decoration: none; color: inherit; } .og-lead-head:hover, .og-lead-head:focus-visible { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; } .og-lead-head:focus-visible { outline: 3px solid #7a1612; outline-offset: 3px; }`}</style>
              <article className="og-block og-lead-story">
                <a className="og-head og-lead-head" href={`/editorials/${slot1.slug}`}>{slot1.headline}</a>
                <div style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', letterSpacing: '0.04em', margin: '0 0 6px' }}>{listReadingLabel(slot1)}</div>
                <div className="og-standfirst">{listSummary(slot1)}</div>
                {ledeText && <p className="og-lede">{ledeText}</p>}
              </article>

              <a className="og-block og-brief" href={`/editorials/${slot2.slug}`}>
                <div className="og-head">{slot2.headline}</div>
                <div style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', letterSpacing: '0.04em', margin: '0 0 6px' }}>{listReadingLabel(slot2)}</div>
                <p>{listSummary(slot2)}</p>
                <ContinueToArticle />
              </a>


              {/* Phones (owner, 10 Nov 2026, S5-home2): a closed native fold labelled with the heading and item count, opened
                  in full; from 640px up as before. The wrapper carries the phone order. */}
              {whitehallItems.length > 0 && (
                <div className="og-whitehall-f">
                <SubFold label={`Latest from Whitehall (${whitehallItems.length})`}>
                <section aria-label="Latest from Whitehall" style={{ marginTop: '28px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)' }}>
                  <h2 style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 2px' }}>
                    Latest from Whitehall
                  </h2>
                  <p style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', margin: '0 0 12px', letterSpacing: '0.04em' }}>
                    Government press releases, published as issued
                  </p>
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
              <SubFold label="Commission research from opengovt">
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

              <Link className="og-block og-brief" href={`/editorials/${slot3.slug}`}>
                <div className="og-head">{slot3.headline}</div>
                <div style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', letterSpacing: '0.04em', margin: '0 0 6px' }}>{listReadingLabel(slot3)}</div>
                <p>{listSummary(slot3)}</p>
                <ContinueToArticle />
              </Link>

              <Link className="og-block og-brief" href={`/editorials/${slot4.slug}`}>
                <div className="og-head">{slot4.headline}</div>
                <div style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', letterSpacing: '0.04em', margin: '0 0 6px' }}>{listReadingLabel(slot4)}</div>
                <p>{listSummary(slot4)}</p>
                <ContinueToArticle />
              </Link>

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

              <Link className="og-block og-card" href="/departments">
                <div className="og-head">Who runs Whitehall</div>
                <p>All {departments.length} ministerial departments assessed against the public record of what they were set up to do.</p>
                <div className="og-cta">See the departments &rarr;</div>
              </Link>

              <a className="og-block og-card" href="/this-week">
                <div className="og-head">This week in Parliament</div>
                <p>The bills before the House of Commons this week and the most recent votes MPs have held.</p>
                <div className="og-cta">See this week&apos;s parliamentary business &rarr;</div>
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

      </OpenGovShell>
    </>
  );
}

