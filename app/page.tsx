import type { Metadata } from 'next';
import JsonLd, { buildHomepageGraph } from '@/lib/JsonLd';
import OpenGovShell from './components/OpenGovShell';
import { editorials } from '@/lib/editorials';
import { supabase } from '@/lib/supabase';
import { govUrlToSlug } from '@/lib/govUrlSlug';
import { normalizeOrg, resolveOrgHref } from '@/lib/govOrgSlug';
import { departments } from '@/lib/departments';
import CouncilSearch from './components/CouncilSearch';
import NewsletterSignup from './components/NewsletterSignup';
import { latestExpensesYear, expensesYearShort } from '@/lib/expenses-year';
import './home-front.css';

function fmtGovDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


// The new "OPEN GOVERNMENT" front page: the dossier-folder template (OpenGovShell)
// with the front-page article layout. Replaces the previous pca-art newspaper.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "opengovt | UK Parliament Tracker & Government Transparency",
  description:
    'Track every UK MP, bill, vote and government department in one place. Voting records, ministerial spending, party manifestos and Whitehall transparency data, free and unbranded.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {

  // Investigation pool: all entries where kind is absent (investigations only),
  // sorted publishedAt DESC then by registry declaration order as tiebreaker.
  // Four pieces share publishedAt '2026-08-04' — the secondary sort is what
  // keeps the selection deterministic across rebuilds.
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
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const featuredPool = investigations.slice(0, Math.min(16, investigations.length));
  const shuffled = [...featuredPool];
  let rngSeed = dayIndex;
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    rngSeed = (rngSeed * 1664525 + 1013904223) & 0x7fffffff;
    const pick = rngSeed % (idx + 1);
    [shuffled[idx], shuffled[pick]] = [shuffled[pick], shuffled[idx]];
  }
  const [slot1, slot2, slot3, slot4] = shuffled;
  // For slot 1's lede: use body[0] text if it's a plain paragraph.
  const b0 = slot1.body[0];
  const ledeText = b0 && b0.type === 'paragraph' ? b0.text : null;

  // gov_url host filter: ilike '%gov.uk%' excludes committees.parliament.uk
  // reports (which belong in their own labelled block, not under "Whitehall").
  // URL host is the reliable signal; organisation is free text and varies.
  // .not('removed_upstream', 'is', true) → SQL: removed_upstream IS NOT TRUE,
  // which correctly includes NULL rows (NULL IS NOT TRUE = true in PostgreSQL).
  // .limit(10): buffer so the block fills to 5 even if some rows have unusable slugs.
  // agency_cache fetched once in parallel with press_releases; departments are
  // resolved from the module-level DEPT_ORG_TO_SLUG constant (no DB query).
  const [
    { data: rawPressReleases },
    { data: agencyRows },
  ] = await Promise.all([
    supabase
      .from('press_releases')
      .select('title, organisation, published_at, gov_url')
      .not('removed_upstream', 'is', true)
      .ilike('gov_url', '%gov.uk%')
      .order('published_at', { ascending: false })
      .limit(10),
    supabase.from('agency_cache').select('slug, name'),
  ]);
  const expensesYear = expensesYearShort(await latestExpensesYear());
  const agencyExact = new Map<string, string>((agencyRows ?? []).map((r) => [r.name, r.slug]));
  const agencyNorm = new Map<string, string>((agencyRows ?? []).map((r) => [normalizeOrg(r.name), r.slug]));
  const whitehallItems = (rawPressReleases ?? [])
    .flatMap((row) => {
      if (!row.gov_url) return [];
      const slug = govUrlToSlug(row.gov_url);
      if (!slug) return [];
      const org = row.organisation as string | null;
      return [{ slug, title: row.title as string, organisation: org, publishedAt: row.published_at as string | null, orgHref: org ? resolveOrgHref(org, agencyExact, agencyNorm) : null }];
    })
    .slice(0, 5);

  return (
    <>
      <JsonLd data={buildHomepageGraph()} />
      <OpenGovShell pageStamp="Front Page" brandAsHeading>
              <div className="og-lead">
            <div className="og-main">
              <p className="og-intro-line" style={{ fontFamily: "'Special Elite', monospace", fontSize: 'clamp(16px, 1.9vw, 22px)', letterSpacing: '0.01em', color: '#14100d', marginBottom: '18px', lineHeight: 1.45 }}>
                Opengovt is an independent record of how power is used in Britain: search what government said, what Parliament did, and what happened next. <a href="/about" style={{ color: '#7a1612', fontSize: '0.8em', textDecoration: 'underline', textUnderlineOffset: '3px', whiteSpace: 'nowrap' }}>About us &rarr;</a>
              </p>

              <form action="/search" method="get" style={{ marginBottom: '28px' }}>
                <div style={{ position: 'relative' }}>
                  <input aria-label="Search the site"
                    type="text"
                    name="q"
                    placeholder="Search a minister, department, policy, vote or government announcement"
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 14px',
                      fontFamily: "'Special Elite', monospace",
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

              <a className="og-block" href={`/editorials/${slot1.slug}`}>
                <div className="og-head">{slot1.headline}</div>
                <div className="og-standfirst">{slot1.standfirst}</div>
                {ledeText && <p className="og-lede">{ledeText}</p>}
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href={`/editorials/${slot2.slug}`}>
                <div className="og-head">{slot2.headline} <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>{slot2.standfirst}</p>
              </a>

              <section aria-label="Find your local authority" style={{ marginTop: '28px', marginBottom: '28px' }}>
                <h2 style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 2px' }}>
                  Local authority data
                </h2>
                <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', color: '#14100d', margin: '0 0 12px', letterSpacing: '0.04em' }}>
                  Every UK council&rsquo;s spending, leadership, finances and welfare caseload on one page
                </p>
                <CouncilSearch />
              </section>

              {whitehallItems.length > 0 && (
                <section aria-label="Latest from Whitehall" style={{ marginTop: '28px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)' }}>
                  <h2 style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 2px' }}>
                    Latest from Whitehall
                  </h2>
                  <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', color: '#14100d', margin: '0 0 12px', letterSpacing: '0.04em' }}>
                    Government press releases, published as issued
                  </p>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {whitehallItems.map(({ slug, title, organisation, publishedAt, orgHref }) => (
                      <li key={slug} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0' }}>
                        <a href={`/news/${slug}`} style={{ display: 'block', fontFamily: "'Special Elite', monospace", fontSize: '15px', color: '#14100d', textDecoration: 'none', lineHeight: 1.38 }}>
                          {title}
                        </a>
                        <span style={{ display: 'block', fontFamily: "'Special Elite', monospace", fontSize: '14px', color: '#14100d', marginTop: '3px' }}>
                          {orgHref ? (
                            <a href={orgHref} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{organisation}</a>
                          ) : organisation}
                          {organisation && publishedAt ? ' · ' : ''}{fmtGovDate(publishedAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <div className="og-rail">
              {/* "If an Election Were Held Now" reader card removed 17 Oct 2026 (owner's decision): its
                  total was a launch seed of 4,106 votes plus 1 real reader vote. */}
              <a className="og-block og-card" href="/bills">
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>From the House this week</div>
                <div className="og-head">Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English, then cast your own vote on every bill. <span className="og-cta" style={{ whiteSpace: 'nowrap' }}>Vote now &rarr;</span></p>
              </a>

              <a className="og-block og-brief" href={`/editorials/${slot3.slug}`}>
                <div className="og-head">{slot3.headline} <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>{slot3.standfirst}</p>
              </a>

              <a className="og-block og-brief" href={`/editorials/${slot4.slug}`}>
                <div className="og-head">{slot4.headline}</div>
                <p>{slot4.standfirst}</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-card" href="/expenses">
                <div className="og-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills in {expensesYear}. See which MPs spent the most and on what.</p>
                <div className="og-cta">See the full top ten &rarr;</div>
              </a>

              <a className="og-block og-card" href="/parties">
                <div className="og-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="og-cta">Read the dossiers &rarr;</div>
              </a>

              <a className="og-block og-card" href="/departments">
                <div className="og-head">Who runs Whitehall</div>
                <p>All {departments.length} ministerial departments assessed against the public record of what they were set up to do.</p>
                <div className="og-cta">See the departments &rarr;</div>
              </a>

              <a className="og-block og-card" href="/this-week">
                <div className="og-head">This week in Parliament</div>
                <p>The bills before the House of Commons this week and the most recent votes MPs have held.</p>
                <div className="og-cta">See what MPs are voting on &rarr;</div>
              </a>

              <div className="og-block og-card" id="newsletter">
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>Weekly newsletter</div>
                <div className="og-head">What government announced. What the evidence shows. What happened next.</div>
                <p>Open Govt Weekly brings you the most important investigations, overlooked documents, questionable claims and public spending stories from the week.</p>
                <p style={{ marginTop: '8px' }}>No Westminster gossip. No rewritten press releases. Just the facts worth knowing.</p>
                <p style={{ marginTop: '8px', fontWeight: 700 }}>Delivered every Sunday.</p>
                <NewsletterSignup source="homepage" />
              </div>
            </div>
          </div>

      </OpenGovShell>
      <HomepageEditorialIntro />
    </>
  );
}

function HomepageEditorialIntro() {
  return (
    <section
      aria-label="About opengovt"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'normal',
        border: 0,
      }}
    >
      <h2>Opengovt is an independent record of how the United Kingdom is governed.</h2>
      <p>
        Every Member of Parliament has a profile here. Their voting record, their declared earnings, the bills they have sponsored, the hours they spend on second jobs, and a biographical note that reads as a political assessment rather than a press release. Each of the {departments.length} ministerial departments has its own institutional performance report against the public record of what it was set up to do. Every bill since 2010 is tracked through its stages of Parliament: which Members spoke for and against, how the division went on each reading, and whether it became law.
      </p>
      <p>
        The transparency surfaces sit alongside the formal record. Ministers&rsquo; meetings, ministers&rsquo; hospitality, the Advisory Committee on Business Appointments, the Register of Members&rsquo; Financial Interests, awarded public contracts and political donations are pulled from the public registers daily, indexed by Member and by department, searchable.
      </p>
      <p>
        The site exists because the public record is real but inaccessible. Every fact on opengovt is drawn from the public record. None of it is invented. None of it is opinion in the sense of being made up. The interpretative judgements in the institutional reports and the political biographies are the editorial work of the project; the underlying record is not.
      </p>
      <p>If something is wrong, it can be corrected. If something is missing, it can be added.</p>
    </section>
  );
}

