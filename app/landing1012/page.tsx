import type { Metadata } from 'next';
import './landing1012.css';

// /landing1012 — landing page on the newbackground blank folder template
// (real transparent PNG, sliced into top/mid/bottom for a clean frame at any
// height). Masthead + nav are REAL code text (legible, clickable, responsive,
// CSS dropdowns); the 10 homepage cards sit in a responsive grid inside the
// folder. noindex.

export const metadata: Metadata = {
  title: 'OPEN GOVERNMENT — landing1012 (preview)',
  robots: { index: false, follow: false },
};

type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };
const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Bills', href: '/bills', children: [
    { label: 'All Bills', href: '/bills' },
    { label: 'Acts of Parliament', href: '/laws' },
  ] },
  { label: 'Peoples Polls', href: '/polls', children: [
    { label: 'All Polls', href: '/polls' },
    { label: 'Your Tax Pound', href: '/your-tax-pound' },
    { label: 'Budget Trade-Offs', href: '/budget-trade-offs' },
  ] },
  { label: 'Parties', href: '/parties', children: [
    { label: 'Manifesto Comparisons', href: '/parties' },
    { label: 'Labour', href: '/parties/labour/bio' },
    { label: 'Conservative', href: '/parties/conservative/bio' },
    { label: 'Liberal Democrats', href: '/parties/liberal-democrats/bio' },
    { label: 'SNP', href: '/parties/snp/bio' },
    { label: 'Reform UK', href: '/parties/reform-uk/bio' },
    { label: 'Green Party', href: '/parties/green/bio' },
    { label: 'Restore Britain', href: '/parties/restore-britain/bio' },
    { label: 'Your Party', href: '/parties/your-party/bio' },
  ] },
  { label: 'MPs', href: '/mps', children: [
    { label: 'All MPs', href: '/mps' },
    { label: 'Top Spenders', href: '/expenses' },
    { label: 'Earnings & Pay', href: '/earnings' },
  ] },
  { label: 'Departments', href: '/departments' },
  { label: 'Editorials', href: '/editorials' },
  { label: 'Transparency', href: '/transparency', children: [
    { label: 'All Datasets', href: '/transparency' },
    { label: 'MPs’ Second Jobs', href: '/second-jobs' },
    { label: 'Ministers’ Meetings', href: '/transparency/ministers-meetings' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Political Donations', href: '/transparency/donations' },
    { label: 'Local Councils', href: '/councils' },
    { label: 'Top Council Tax', href: '/council-tax' },
  ] },
  { label: 'Support Us', href: '/support' },
];

export default function Landing1012() {
  return (
    <div className="og-stage">
      <div className="og-page">
        <div className="og-folder" aria-hidden>
          <div className="og-folder-top" />
          <div className="og-folder-mid" />
          <div className="og-folder-bottom" />
        </div>
        <div className="og-content">
          {/* ── Masthead + nav (on the folder) ── */}
          <header className="og-masthead">
            <h1 className="og-title">Open Government</h1>
            <div className="og-tab">
              <a href="/login">Account / Info</a>
              <a className="og-signup" href="/login">Sign up / Log in</a>
            </div>
          </header>

          <nav aria-label="Primary">
            <ul className="og-nav">
              {NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                  {item.children && (
                    <ul className="og-sub">
                      {item.children.map((c) => (
                        <li key={c.href}><a href={c.href}>{c.label}</a></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Paper sheet inside the folder: the articles sit on it ── */}
          <div className="og-paper">
            <div className="og-paper-bg" aria-hidden>
              <div className="og-paper-top" />
              <div className="og-paper-mid" />
              <div className="og-paper-bottom" />
            </div>
            <div className="og-paper-in">

              {/* ── Lead ── */}
              <div className="og-lead">
            <div className="og-main">
              <section className="og-intro">
                <h2 className="og-intro-head">What This Site Does</h2>
                <p>This is an independent, nonpartisan transparency platform built to hold British government to account using facts, data and journalism.</p>
                <p>Every MP&rsquo;s voting record is tracked. Every division in the House of Commons is recorded. Every declared financial interest, expense claim and outside earning is published. Every government department is assessed on delivery, not promises. Every council is measured on what residents pay and what they receive.</p>
                <p>The editorial content on this site is written by working journalists who publish without bylines. They are not anonymous because they have something to hide. They are anonymous because the work should be judged on accuracy, not personality. Every article is independently fact checked against primary sources: Hansard, parliamentary records, government statistics, court documents and official reports. No article is published without verification. No claim is made without evidence. If we get something wrong, we correct it publicly.</p>
                <p>MP profiles on this site use caricatures rather than official photographs. Westminster spends considerable effort making politicians look serious. The voting records, expense claims and financial interests on these pages often suggest they should not be taken quite as seriously as they would like. The caricatures reflect that. They are also a long and proud tradition of British political commentary, from James Gillray skewering Georgian politicians to Spitting Image dismantling Thatcher&rsquo;s Cabinet. If satirical illustration was good enough for 250 years of British democracy, it is good enough for this site. The facts are serious. The faces do not need to be.</p>
                <p>This site is not affiliated with any political party, campaign group, think tank or media organisation. It receives no government funding. It carries no advertising. It exists because the public has a right to know what is being done in its name, with its money, by the people it elected.</p>
                <p>We also operate an open voting platform where the public can record how they would have voted on the same divisions that MPs vote on in Parliament. The purpose is simple: to show whether the people&rsquo;s representatives are representing the people.</p>
                <p>The site is free. The data is open. The journalism is accountable. The only agenda is transparency.</p>
              </section>

              <a className="og-block" href="/editorials/ten-worst-performing-councils-england">                <div className="og-head">The Ten Worst Performing Councils In England</div>
                <div className="og-standfirst">How local government failed the people it exists to serve.</div>
                <p className="og-lede">
                  Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. England&rsquo;s second city is still under government commissioners. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
                </p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
                <div className="og-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
                <p>The ministers and MPs who left office and cashed in, advising and lobbying the industries they once regulated.</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>
            </div>

            <div className="og-rail">
              <a className="og-block og-brief" href="/editorials/kxlkhj1jgj">                <div className="og-head">Westminster&rsquo;s Culture of Impropriety</div>
                <p>Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons.</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-card" href="/bills">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/votes.webp" alt="Every bill, every vote, every law" />
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>From the House this week</div>
                <div className="og-head" style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English. <span className="og-cta" style={{ whiteSpace: 'nowrap' }}>Read the bills &rarr;</span></p>
              </a>

              <a className="og-block og-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#7a1612' }}>&rarr;</span></div>
                <p>Resignation once followed failure. A look at how accountability quietly drained out of British public life.</p>
              </a>

              <a className="og-block og-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#7a1612' }}>&rarr;</span></div>
                <p>From perjury to expenses fraud, the politicians whose careers collapsed in scandal, and what their falls reveal.</p>
              </a>

              <a className="og-block og-brief" href="/editorials" style={{ textAlign: 'right' }}>
                <div className="og-cta">All investigations &rarr;</div>
              </a>
            </div>
          </div>

          {/* ── Bottom band ── */}
          <div className="og-bottom">
            <div className="og-col">
              <a className="og-block og-card" href="/expenses">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" />
                <div className="og-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.</p>
                <div className="og-cta">See the full top ten &rarr;</div>
              </a>
            </div>
            <div className="og-col">
              <a className="og-block og-card" href="/parties">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/manifesto.webp" alt="Every manifesto. Every shift." />
                <div className="og-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="og-cta">Read the dossiers &rarr;</div>
              </a>
            </div>
            <div className="og-col">
              <a className="og-block og-card" href="/departments">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/whitehall.webp" alt="Who runs Whitehall" />
                <div className="og-head">Who runs Whitehall</div>
                <p>All twenty four ministerial departments graded against the public record of what they were set up to do.</p>
                <div className="og-cta">See the departments &rarr;</div>
              </a>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
