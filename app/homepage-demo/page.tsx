import type { Metadata } from 'next';
import './demo.css';

// Demo landing page on the new "OPEN GOVERNMENT" folder template
// (public/landing-template.webp). The painted masthead + nav come from the
// artwork; transparent hotspots make the nav clickable and the 10 homepage
// cards are laid into the blank folder body. Append ?debug to visualise the
// hotspot boxes for calibration. noindex preview alongside the live homepage.

export const metadata: Metadata = {
  title: 'OPEN GOVERNMENT — landing demo (preview)',
  robots: { index: false, follow: false },
};

// Hotspots over the painted nav row (~20% down) and the top-right tab.
// Positions are %; they are first-pass estimates — load /homepage-demo?debug
// to see the boxes and nudge them onto the artwork.
type Hotspot = { href: string; label: string; left: number; top: number; width: number; height: number };
const HOTSPOTS: Hotspot[] = [
  { href: '/', label: 'Home: OPEN GOVERNMENT masthead', left: 2.5, top: 8.5, width: 30, height: 5 },
  { href: '/login', label: 'Account / Info', left: 64, top: 10, width: 11, height: 2.3 },
  { href: '/login', label: 'Sign up / Log in', left: 76, top: 9.8, width: 14, height: 2.6 },
  // Nav row (~14.5% down, aligned to the painted labels)
  { href: '/', label: 'Home', left: 5, top: 15.6, width: 5.5, height: 2.1 },
  { href: '/bills', label: 'Bills', left: 12.8, top: 15.6, width: 5.5, height: 2.1 },
  { href: '/polls', label: 'Peoples Polls', left: 21, top: 15.6, width: 10, height: 2.1 },
  { href: '/parties', label: 'Parties', left: 34.8, top: 15.6, width: 7, height: 2.1 },
  { href: '/mps', label: 'MPs', left: 43, top: 15.6, width: 5.5, height: 2.1 },
  { href: '/departments', label: 'Departments', left: 51, top: 15.6, width: 10, height: 2.1 },
  { href: '/editorials', label: 'Editorials', left: 63.5, top: 15.6, width: 9, height: 2.1 },
  { href: '/transparency', label: 'Transparency', left: 74.5, top: 15.6, width: 11, height: 2.1 },
  { href: '/support', label: 'Support Us', left: 85.5, top: 15.6, width: 9, height: 2.1 },
];

export default async function HomepageDemo({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;

  return (
    <main className="demo-stage">
      <div
        className={`demo-shell${debug !== undefined ? ' debug' : ''}`}
        aria-label="OPEN GOVERNMENT landing page demo"
      >
        {HOTSPOTS.map((h) => (
          <a
            key={h.label}
            href={h.href}
            aria-label={h.label}
            className="demo-hotspot"
            style={{ left: `${h.left}%`, top: `${h.top}%`, width: `${h.width}%`, height: `${h.height}%` }}
          >
            {h.label}
          </a>
        ))}

        {/* Content laid into the blank folder body */}
        <div className="demo-body">
          <div className="demo-lead">
            {/* Left: councils lead + power-for-sale brief */}
            <div className="demo-main">
              <a href="/editorials/ten-worst-performing-councils-england">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/councils.webp" alt="The ten worst performing councils in England" />
                <div className="demo-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="demo-head">The Ten Worst Performing Councils In England</div>
                <div className="demo-standfirst">How local government failed the people it exists to serve.</div>
                <p className="demo-lede">
                  Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. England&rsquo;s second city is still under government commissioners. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
                </p>
                <div className="demo-cta">Read the full story &rarr;</div>
              </a>

              <a className="demo-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
                <div className="demo-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="demo-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
                <div className="demo-cta">Read the full story &rarr;</div>
              </a>
            </div>

            {/* Right rail: bills digest + briefs */}
            <div className="demo-rail">
              <a className="demo-card" href="/bills">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/votes.webp" alt="Every bill, every vote, every law" />
                <div className="demo-kicker" style={{ color: 'rgba(20,16,13,0.7)', letterSpacing: '0.16em' }}>From the House this week</div>
                <div className="demo-head">Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English. <span className="demo-cta">Read the bills &rarr;</span></p>
              </a>

              <a className="demo-brief" href="/editorials/kxlkhj1jgj">
                <div className="demo-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="demo-head">Westminster&rsquo;s Culture of Impropriety</div>
                <p>Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons.</p>
                <div className="demo-cta">Read the full story &rarr;</div>
              </a>

              <a className="demo-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
                <div className="demo-kicker">The People&rsquo;s Chamber &middot; Comment</div>
                <div className="demo-head" style={{ fontSize: '1.35cqw' }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#7a1612' }}>&rarr;</span></div>
              </a>

              <a className="demo-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="demo-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="demo-head" style={{ fontSize: '1.35cqw' }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#7a1612' }}>&rarr;</span></div>
              </a>

              <a className="demo-brief" href="/editorials" style={{ textAlign: 'right' }}>
                <div className="demo-cta">All investigations &rarr;</div>
              </a>
            </div>
          </div>

          {/* Bottom band: expenses / parties / departments */}
          <div className="demo-bottom">
            <div className="demo-col">
              <a href="/expenses">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" />
                <div className="demo-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.</p>
                <div className="demo-cta">See the full top ten &rarr;</div>
              </a>
            </div>
            <div className="demo-col">
              <a href="/parties">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/manifesto.webp" alt="Every manifesto. Every shift." />
                <div className="demo-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="demo-cta">Read the dossiers &rarr;</div>
              </a>
            </div>
            <div className="demo-col">
              <a href="/departments">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/whitehall.webp" alt="Who runs Whitehall" />
                <div className="demo-head">Who runs Whitehall</div>
                <p>All twenty four ministerial departments graded against the public record of what they were set up to do.</p>
                <div className="demo-cta">See the departments &rarr;</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
