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
          {/* ── Masthead ── */}
          <header className="og-masthead">
            <h1 className="og-title">Open Government</h1>
            <div className="og-tab">
              <a href="/login">Account / Info</a>
              <a className="og-signup" href="/login">Sign up / Log in</a>
            </div>
          </header>

          {/* ── Nav (real text) ── */}
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

          {/* ── Lead ── */}
          <div className="og-lead">
            <div className="og-main">
              <a className="og-block" href="/editorials/ten-worst-performing-councils-england">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/councils.webp" alt="The ten worst performing councils in England" />
                <div className="og-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="og-head">The Ten Worst Performing Councils In England</div>
                <div className="og-standfirst">How local government failed the people it exists to serve.</div>
                <p className="og-lede">
                  Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. England&rsquo;s second city is still under government commissioners. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
                </p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
                <div className="og-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="og-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>
            </div>

            <div className="og-rail">
              <a className="og-block og-card" href="/bills">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/votes.webp" alt="Every bill, every vote, every law" />
                <div className="og-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>From the House this week</div>
                <div className="og-head" style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English. <span className="og-cta" style={{ whiteSpace: 'nowrap' }}>Read the bills &rarr;</span></p>
              </a>

              <a className="og-block og-brief" href="/editorials/kxlkhj1jgj">
                <div className="og-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="og-head">Westminster&rsquo;s Culture of Impropriety</div>
                <p>Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons.</p>
                <div className="og-cta">Read the full story &rarr;</div>
              </a>

              <a className="og-block og-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
                <div className="og-kicker">The People&rsquo;s Chamber &middot; Comment</div>
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#7a1612' }}>&rarr;</span></div>
              </a>

              <a className="og-block og-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="og-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="og-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#7a1612' }}>&rarr;</span></div>
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
  );
}
