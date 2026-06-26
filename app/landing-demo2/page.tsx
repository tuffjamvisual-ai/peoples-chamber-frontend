import type { Metadata } from 'next';
import './landing-demo2.css';

// /landing-demo2 — DEMO (noindex). Folders-pile backdrop; the newb back folder
// carries the OPEN GOVERNMENT red-stamp masthead + nav; the dossier folder is an
// expanding content sheet holding the landing-page articles.

export const metadata: Metadata = {
  title: 'OPEN GOVERNMENT — landing demo (preview)',
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

export default function LandingDemo2() {
  return (
    <div
      className="ng-page"
      style={{ minHeight: '100vh', margin: 0, backgroundColor: '#140d07', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3vh 0 8vh' }}
    >
      <div aria-hidden style={{ position: 'fixed', inset: 0, backgroundColor: '#140d07', backgroundImage: 'url(/folders.webp)', backgroundSize: '135%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: 'min(96vw, 1240px)' }}>
        {/* Header: newb back folder with masthead + nav */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1086 / 1448', containerType: 'inline-size' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/newb.webp" alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', transform: 'rotate(-2.5deg)', filter: 'saturate(0.84) drop-shadow(0 18px 38px rgba(0,0,0,0.55))' }} />

          {/* Account / sign-up, top-right of the folder. */}
          <div className="ng-tab" style={{ transform: 'rotate(-2.5deg)' }}>
            <a href="/login">Account / Info</a>
            <a href="/login">Sign up / Log in</a>
          </div>

          <div style={{ position: 'absolute', top: '5%', left: '5%', width: '90%', textAlign: 'left', zIndex: 5, pointerEvents: 'none', transform: 'rotate(-2.5deg)' }}>
            <span style={{ display: 'inline-block', opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.14em 0.32em 0.06em', fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(24px, 4.6vw, 64px)' }}>Open Government</span>
          </div>

          <nav aria-label="Primary" style={{ position: 'absolute', top: '10.6%', left: '2%', width: '96%', zIndex: 5, transform: 'rotate(-2.5deg)' }}>
            <ul className="ng-nav" style={{ justifyContent: 'center', flexWrap: 'nowrap', letterSpacing: '0.06em', fontSize: 'clamp(11px, 1.5cqw, 18px)' }}>
              {NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                  {item.children && (
                    <ul className="ng-sub">
                      {item.children.map((c) => (<li key={c.href}><a href={c.href}>{c.label}</a></li>))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Dossier folder as an expanding content sheet, overlapping up into the header */}
        <div className="og-page" style={{ position: 'relative', width: '90%', margin: '-116% 5% 0', containerType: 'inline-size' }}>
          <div className="dossier-frame" aria-hidden>
            <div className="d-top" />
            <div className="d-mid" />
            <div className="d-bottom" />
          </div>
          <div className="dossier-content">
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
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#14100d' }}>&rarr;</span></div>
                <p>Resignation once followed failure. A look at how accountability quietly drained out of British public life.</p>
              </a>

              <a className="og-block og-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#14100d' }}>&rarr;</span></div>
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
                <div className="og-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.</p>
                <div className="og-cta">See the full top ten &rarr;</div>
              </a>
            </div>
            <div className="og-col">
              <a className="og-block og-card" href="/parties">
                <div className="og-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="og-cta">Read the dossiers &rarr;</div>
              </a>
            </div>
            <div className="og-col">
              <a className="og-block og-card" href="/departments">
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
  );
}
