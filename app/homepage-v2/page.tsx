import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import './newspaper.css';

// Code-based rebuild of the homepage (preview at /homepage-v2). Reproduces
// the 10 functional cards of the current pca-art.webp overlay layout in real
// HTML/CSS grid, placed INSIDE the dossier folder (same shell as
// app/template/page.tsx) so it carries the site masthead + nav + folder
// chrome. Same cards, headlines and links as app/page.tsx; the body is now a
// responsive grid that stacks on mobile instead of an absolutely positioned
// overlay. noindex while it lives alongside the live homepage.

export const metadata: Metadata = {
  title: "The People's Chamber — Homepage v2 (preview)",
  robots: { index: false, follow: false },
};

// Code nav bar rendered inside the folder above the front page. Mirrors the
// masthead hotspots in OpenGovShell; kept local to this preview so the live
// shell is untouched. Lift to a shared module on adoption.
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
    { label: 'Sinn Féin', href: '/parties/sinn-fein/bio' },
    { label: 'Green Party', href: '/parties/green/bio' },
    { label: 'DUP', href: '/parties/dup/bio' },
    { label: 'Plaid Cymru', href: '/parties/plaid-cymru/bio' },
    { label: 'SDLP', href: '/parties/sdlp/bio' },
    { label: 'Alliance', href: '/parties/alliance/bio' },
    { label: 'UUP', href: '/parties/uup/bio' },
    { label: 'TUV', href: '/parties/tuv/bio' },
    { label: 'Restore Britain', href: '/parties/restore-britain/bio' },
    { label: 'Your Party', href: '/parties/your-party/bio' },
  ] },
  { label: 'MPs', href: '/mps', children: [
    { label: 'All MPs', href: '/mps' },
    { label: 'Top Spenders', href: '/expenses' },
    { label: 'Earnings & Pay', href: '/earnings' },
  ] },
  { label: 'Departments', href: '/departments' },
  { label: 'Transparency', href: '/transparency', children: [
    { label: 'All Datasets', href: '/transparency' },
    { label: 'Editorials', href: '/editorials' },
    { label: 'MPs’ Second Jobs', href: '/second-jobs' },
    { label: 'Ministers’ Meetings', href: '/transparency/ministers-meetings' },
    { label: 'APPGs', href: '/transparency/appgs' },
    { label: 'Ministers’ Hospitality', href: '/transparency/hospitality' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Political Donations', href: '/transparency/donations' },
    { label: 'Government Contracts', href: '/transparency/contracts' },
    { label: 'Press Releases', href: '/transparency/press-releases' },
    { label: 'Local Councils', href: '/councils' },
    { label: 'Top Council Tax', href: '/council-tax' },
  ] },
  { label: 'Contact', href: '/contact' },
  { label: 'Login/Signup', href: '/login' },
];

export default function HomepageV2() {
  return (
    <OpenGovShell pageStamp="Front Page">
      <div className="np">
        {/* ── Nav bar ── */}
        <nav aria-label="Primary">
          <ul className="np-nav">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
                {item.children && (
                  <ul className="np-sub">
                    {item.children.map((c) => (
                      <li key={c.href}><a href={c.href}>{c.label}</a></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Lead area: wide lead (left) + narrow rail (right) ── */}
        <div className="np-lead">
          {/* Left: councils lead + power-for-sale brief */}
          <div className="np-lead-main">
            <a className="np-block" href="/editorials/ten-worst-performing-councils-england">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/councils.webp" alt="The ten worst performing councils in England" />
              <div className="np-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
              <div className="np-head">The Ten Worst Performing Councils In England</div>
              <div className="np-standfirst">How local government failed the people it exists to serve.</div>
              <p className="np-lede">
                Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. A commuter-belt borough with &pound;16 million of annual revenue borrowed its way to &pound;1.2 billion of debt. England&rsquo;s second city is still under government commissioners. One in five council leaders now expects to issue a Section 114 notice within two years. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
              </p>
              <div className="np-cta">Read the full story &rarr;</div>
            </a>

            <a className="np-block np-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
              <div className="np-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
              <div className="np-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
              <div className="np-cta">Read the full story &rarr;</div>
            </a>
          </div>

          {/* Right rail: bills digest + three editorial briefs + index link */}
          <div className="np-lead-rail">
            <a className="np-block np-card" href="/bills">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/votes.webp" alt="Every bill, every vote, every law" />
              <div className="np-kicker" style={{ color: 'var(--ink-soft)', letterSpacing: '0.18em' }}>From the House this week</div>
              <div className="np-head" style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Every bill. Every vote. Every law.</div>
              <p>
                Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.{' '}
                <span className="np-cta" style={{ whiteSpace: 'nowrap' }}>Read the bills &rarr;</span>
              </p>
            </a>

            <a className="np-block np-brief" href="/editorials/kxlkhj1jgj">
              <div className="np-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
              <div className="np-head">Westminster&rsquo;s Culture of Impropriety: Why Trust Keeps Eroding</div>
              <p>
                Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons. Standards Committee findings, criminal records and contested registered interests, each entry independently fact-checked.
              </p>
              <div className="np-cta">Read the full story &rarr;</div>
            </a>

            <a className="np-block np-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
              <div className="np-kicker">The People&rsquo;s Chamber &middot; Comment</div>
              <div className="np-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>
                When Did Politicians Stop Taking Responsibility? <span style={{ color: 'var(--accent)' }}>&rarr;</span>
              </div>
            </a>

            <a className="np-block np-brief" href="/editorials/britains-most-disgraced-politicians">
              <div className="np-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
              <div className="np-head" style={{ fontSize: 'clamp(15px, 1.8vw, 19px)' }}>
                Britain&rsquo;s Most Disgraced Politicians <span style={{ color: 'var(--accent)' }}>&rarr;</span>
              </div>
            </a>

            <a className="np-block np-brief" href="/editorials" style={{ textAlign: 'right' }}>
              <div className="np-cta">All investigations &rarr;</div>
            </a>
          </div>
        </div>

        {/* ── Bottom band: expenses / parties / departments ── */}
        <div className="np-grid-3">
          <div className="np-col">
            <a className="np-block np-card" href="/expenses">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" />
              <div className="np-head">The biggest expenses bill</div>
              <p>
                Every MP claims travel, staff, office and accommodation costs against the public purse. The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.
              </p>
              <div className="np-cta">See the full top ten &rarr;</div>
            </a>
          </div>

          <div className="np-col">
            <a className="np-block np-card" href="/parties">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/manifesto.webp" alt="Every manifesto. Every shift. The gap diagnosed." />
              <div className="np-head">Every manifesto. Every shift.</div>
              <p>
                What each of the fifteen UK parties told voters at the 2024 election, what they have done in the year since, and where the gap between manifesto and record is widest.
              </p>
              <div className="np-cta">Read the dossiers &rarr;</div>
            </a>
          </div>

          <div className="np-col">
            <a className="np-block np-card" href="/departments">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/whitehall.webp" alt="Who runs Whitehall" />
              <div className="np-head">Who runs Whitehall</div>
              <p>
                All twenty four ministerial departments graded against the public record of what they were set up to do. Executive summary, core strengths, critical weaknesses, recommendation. One institutional performance report per department.
              </p>
              <div className="np-cta">See the departments &rarr;</div>
            </a>
          </div>
        </div>
      </div>
    </OpenGovShell>
  );
}
