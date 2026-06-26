import type { Metadata } from 'next';
import JsonLd, { buildHomepageGraph } from '@/lib/JsonLd';
import OpenGovShell from './components/OpenGovShell';
import './home-front.css';

// The new "OPEN GOVERNMENT" front page: the dossier-folder template (OpenGovShell)
// with the front-page article layout. Replaces the previous pca-art newspaper.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK Parliament Tracker & Government Transparency | The Peoples Chamber",
  description:
    'Track every UK MP, bill, vote and government department in one place. Voting records, ministerial spending, party manifestos and Whitehall transparency data, free and unbranded.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />
      <OpenGovShell pageStamp="Front Page">
              <div className="og-lead">
            <div className="og-main">
              <section className="og-intro">
                <h2 className="og-intro-head">What This Site Does</h2>
                <p>This is an independent, nonpartisan transparency platform built to hold British government to account using facts, data and journalism. No party affiliation. No government funding. No advertising. Its purpose is accountability.</p>
                <p>The site tracks MPs&rsquo; voting records, publishes declared financial interests, expense claims and outside earnings, records every division in the House of Commons, assesses government departments on delivery and examines what councils charge against what they provide. Sources are linked. Corrections are published. Claims that cannot be verified are excluded.</p>
                <p>The editorial content is written by working journalists who publish without bylines. They are not anonymous because they have something to hide. They are anonymous because the work should be judged on accuracy, not personality. Politicians spend careers building personal brands. This site strips that away and publishes what they actually did, how they actually voted and what they actually claimed.</p>
                <p>MP profiles use caricatures rather than official photographs. Political image management is part of the problem. Official portraits project authority and seriousness regardless of whether either has been earned. The caricatures strip that back. Some MPs serve with genuine integrity and the data on this site reflects that. Others leaked confidential documents to the wrong email address, destroyed careers over three penalty points, faked their own death and fled to Australia, or claimed &pound;650 for a &pound;36 phone bill quarter after quarter. The serious and the absurd sit in the same Parliament. Satirical illustration has been part of British political commentary for 250 years, from James Gillray to Spitting Image. The facts are serious. The faces do not need to be.</p>
                <p>The site includes an open voting platform where the public can record how they would have voted on the same divisions that MPs vote on in Parliament. The purpose is simple: to show whether the people&rsquo;s representatives are representing the people. Serving MPs are among the regular visitors to this site. They read the editorials. They check the data. They see how the public votes. Whether that changes how they behave is for them to answer. But a politician who knows the public is watching, voting and keeping score is a politician with one less excuse for not listening.</p>
                <p>The site is free. The data is open. The sources are visible. The journalism can be challenged.</p>
              </section>

              <a className="og-block" href="/editorials/ten-worst-performing-councils-england">                <div className="og-head">The Ten Worst Performing Councils In England</div>
                <div className="og-standfirst">How local government failed the people it exists to serve.</div>
                <p className="og-lede">
                  Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. England&rsquo;s second city is still under government commissioners. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
                </p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>
            </div>

            <div className="og-rail">
              <a className="og-block og-brief" href="/editorials/kxlkhj1jgj">                <div className="og-head">Westminster&rsquo;s Culture of Impropriety</div>
                <p>Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons.</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-card" href="/bills">
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>From the House this week</div>
                <div className="og-head">Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English. <span className="og-cta" style={{ whiteSpace: 'nowrap' }}>Read the bills &rarr;</span></p>
              </a>

              <a className="og-block og-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
                <div className="og-head">When Did Politicians Stop Taking Responsibility? <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>Resignation once followed failure. A look at how accountability quietly drained out of British public life.</p>
              </a>

              <a className="og-block og-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="og-head">Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>From perjury to expenses fraud, the politicians whose careers collapsed in scandal, and what their falls reveal.</p>
              </a>

              <a className="og-block og-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
                <div className="og-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
                <p>The ministers and MPs who left office and cashed in, advising and lobbying the industries they once regulated.</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href="/editorials" style={{ textAlign: 'right' }}>
                <div className="og-cta">All investigations &rarr;</div>
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
      aria-label="About The People's Chamber"
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
      <h2>The People&rsquo;s Chamber is an independent record of how the United Kingdom is governed.</h2>
      <p>
        Every Member of Parliament has a profile here. Their voting record, their declared earnings, the bills they have sponsored, the hours they spend on second jobs, and a biographical note that reads as a political assessment rather than a press release. Each of the 24 ministerial departments has its own institutional performance report, marked by letter grade, against the public record of what it was set up to do. Every bill since 2010 is tracked through its stages of Parliament: which Members spoke for and against, how the division went on each reading, and whether it became law.
      </p>
      <p>
        The transparency surfaces sit alongside the formal record. Ministers&rsquo; meetings, ministers&rsquo; hospitality, the Advisory Committee on Business Appointments, the Register of Members&rsquo; Financial Interests, awarded public contracts and political donations are pulled from the public registers daily, indexed by Member and by department, searchable.
      </p>
      <p>
        The site exists because the public record is real but inaccessible. Every fact on the People&rsquo;s Chamber is drawn from the public record. None of it is invented. None of it is opinion in the sense of being made up. The interpretative judgements in the institutional reports and the political biographies are the editorial work of the project; the underlying record is not.
      </p>
      <p>If something is wrong, it can be corrected. If something is missing, it can be added.</p>
    </section>
  );
}

