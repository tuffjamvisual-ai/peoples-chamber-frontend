import type { Metadata } from 'next';
import JsonLd, { buildHomepageGraph } from '@/lib/JsonLd';
import OpenGovShell from './components/OpenGovShell';
import { computeReaderViAggregate, READER_VI_PARTIES } from '@/lib/readerVi';
import { editorials } from '@/lib/editorials';
import './home-front.css';

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
  // The homepage election card reads the SAME reader voting-intention aggregate
  // as the /polls ballot (lib/readerVi) — live reader votes plus the shared seed
  // — so the two can never show different numbers. Percentages use the same total
  // and Math.round as the /polls card.
  const { tally, total } = await computeReaderViAggregate();
  const topParties = total > 0
    ? READER_VI_PARTIES
        .map((p) => ({ ...p, value: Math.round(((tally[p.key] || 0) / total) * 100) }))
        .sort((a, b) => b.value - a.value)
    : [];
  const max = topParties[0]?.value || 1;
  const asOfLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
  const [slot1, slot2, ...archivePool] = investigations;
  // Derive seed from UTC date — integer that changes at midnight UTC.
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  // Two coprime strides so the pair is spread across the pool and doesn't
  // carry over day-to-day. 17 is coprime with 40 (pool size), so it walks
  // without short cycles. Collision check steps j forward if it lands on i.
  const i = dayIndex % archivePool.length;
  let j = (dayIndex * 17 + 7) % archivePool.length;
  if (j === i) j = (j + 1) % archivePool.length;
  const slot3 = archivePool[i];
  const slot4 = archivePool[j];
  // For slot 1's lede: use body[0] text if it's a plain paragraph.
  const b0 = slot1.body[0];
  const ledeText = b0 && b0.type === 'paragraph' ? b0.text : null;
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />
      <OpenGovShell pageStamp="Front Page" brandAsHeading>
              <div className="og-lead">
            <div className="og-main">
              <section className="og-intro">
                <h2 className="og-intro-head">About</h2>
                <p>Opengovt tracks how power is used in Britain.</p>
                <p>We record how MPs vote, what they declare, what they earn outside Parliament and what they claim in expenses. We also compare what councils charge residents with what they provide in return.</p>
                <p>The record is drawn from named public sources: Hansard for divisions and debates, the Register of Members&rsquo; Financial Interests for declarations, House of Commons data for expenses, the Electoral Commission for donations, Companies House for directorships, and government statistics for departmental performance. Each figure links back to where it came from.</p>
                <p>MP profiles use caricatures instead of official portraits because politics already comes with enough image management. We are not here to add to it.</p>
                <p>Our journalists publish without bylines. The work should stand or fall on whether it is accurate. Every factual claim is checked against a public record before publication; when something is wrong and it is found, it is corrected and the correction is logged.</p>
                <p>Readers can also record how they would have voted on the same Commons divisions MPs faced, then compare their choices with their own MP&rsquo;s.</p>
                {/* AI-tools clause temporarily removed pending a disclosure decision. Original ending:
                    "How the site is made, including its use of AI tools alongside primary-source verification, is set out on the ... page." */}
                <p>Opengovt is independent. It is not part of Parliament, GOV.UK or any government body. It takes no government funding and carries no party label.</p>
                <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: '22px', marginBottom: '6px' }}>A note on our name</h3>
                <p>We changed our name to opengovt in 2026 as a courtesy, to avoid confusion with another organisation.</p>
                <div aria-hidden style={{ width: '50%', maxWidth: '220px', height: '3px', background: '#7a1612', marginTop: '18px', borderRadius: '1px' }} />
              </section>

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
            </div>

            <div className="og-rail">
              <a className="og-block og-card" href="/polls">
                <div className="og-kicker" style={{ letterSpacing: '0.18em' }}>
                  <span style={{ color: '#14100d' }}>If an Election Were Held Now</span>
                  {asOfLabel ? <span style={{ color: 'var(--ink-soft)' }}> · as of {asOfLabel}</span> : null}
                </div>
                {topParties.length > 0 ? (
                  <>
                    <div style={{ margin: '10px 0 12px' }}>
                      {topParties.map((p) => (
                        <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
                          <span style={{ width: '78px', fontFamily: "'Special Elite', monospace", fontSize: '15px', color: '#14100d' }}>{p.label}</span>
                          <span style={{ flex: 1, height: '11px', background: 'rgba(20,16,13,0.10)', position: 'relative', borderRadius: '1px' }}>
                            <span aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(p.value / max) * 100}%`, background: p.colour, borderRadius: '1px' }} />
                          </span>
                          <span style={{ width: '54px', textAlign: 'right', fontFamily: "'Special Elite', monospace", fontSize: '15px', fontWeight: 700, color: '#14100d', fontVariantNumeric: 'tabular-nums' }}>{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="og-head">Have your say</div>
                )}
                <div className="og-cta">Vote now &rarr;</div>
              </a>

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
                <p>The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.</p>
                <div className="og-cta">See the full top ten &rarr;</div>
              </a>

              <a className="og-block og-card" href="/parties">
                <div className="og-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="og-cta">Read the dossiers &rarr;</div>
              </a>

              <a className="og-block og-card" href="/departments">
                <div className="og-head">Who runs Whitehall</div>
                <p>All twenty four ministerial departments graded against the public record of what they were set up to do.</p>
                <div className="og-cta">See the departments &rarr;</div>
              </a>

              <a className="og-block og-card" href="/this-week">
                <div className="og-head">This week in Parliament</div>
                <p>The bills before the House of Commons this week and the most recent votes MPs have held.</p>
                <div className="og-cta">See what MPs are voting on &rarr;</div>
              </a>
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
        Every Member of Parliament has a profile here. Their voting record, their declared earnings, the bills they have sponsored, the hours they spend on second jobs, and a biographical note that reads as a political assessment rather than a press release. Each of the 24 ministerial departments has its own institutional performance report, marked by letter grade, against the public record of what it was set up to do. Every bill since 2010 is tracked through its stages of Parliament: which Members spoke for and against, how the division went on each reading, and whether it became law.
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

