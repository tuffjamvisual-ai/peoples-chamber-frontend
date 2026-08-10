import type { Metadata } from 'next';
import JsonLd, { buildHomepageGraph } from '@/lib/JsonLd';
import OpenGovShell from './components/OpenGovShell';
import { computeReaderViAggregate, READER_VI_PARTIES } from '@/lib/readerVi';
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

              <a className="og-block" href="/editorials/k9m4qxw7n2">                <div className="og-head">Ministers Want Three Asylum Camps for a Decade. They Will Not Say How Many Men Each Will Hold.</div>
                <div className="og-standfirst">Three new camps for around 3,750 men, with papers suggesting two could run for at least a decade.</div>
                <p className="og-lede">
                  The Home Office is planning three new asylum camps for around 3,750 men, and its own documents say two could run for at least ten years. It still will not say how many men would live at each.
                </p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href="/editorials/mf7k3qxw9n">
                <div className="og-head">The MoD Has a Fraud Problem. It Doesn&rsquo;t Know How Large It Is <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>The Ministry of Defence refused about &pound;400 million in supplier claims last year and estimates it may be exposed to &pound;1.5 billion of fraud a year, a figure its own officials call an &ldquo;academic construct&rdquo;.</p>
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

              <a className="og-block og-brief" href="/editorials/em7k4mxw9n">
                <div className="og-head">The Tagging System Cannot Say How Many It Is Failing to Monitor <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>A National Audit Office report finds the service does not know how many tagged people are actually being monitored. Ministers want to add up to 22,000 more a year.</p>
              </a>

              <a className="og-block og-brief" href="/editorials/rc8m4kqx7n">
                <div className="og-head">Patients Will Remain in Hospitals at Risk of Structural Failure Beyond 2030</div>
                <p>Seven hospitals built from crumble-prone reinforced concrete will stay in use past their 2030 replacement date. Keeping them safe until then will cost close to &pound;1 billion.</p>
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

