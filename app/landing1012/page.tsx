import type { Metadata } from 'next';
import './landing1012.css';

// Temp preview landing page on the landing1012 OPEN GOVERNMENT template
// (public/landing1012.webp, transparent). Painted masthead + nav from the
// artwork; transparent hotspots make the nav clickable and the 10 homepage
// cards are laid into the blank folder body. Append ?debug to calibrate the
// hotspots. noindex preview alongside the live homepage.

export const metadata: Metadata = {
  title: 'OPEN GOVERNMENT — landing1012 (preview)',
  robots: { index: false, follow: false },
};

// Hotspots over the painted nav row (~19.5% down) and the top-right tab.
// First-pass estimates — load /landing1012?debug to see the boxes and nudge.
type Hotspot = { href: string; label: string; left: number; top: number; width: number; height: number };
const HOTSPOTS: Hotspot[] = [
  { href: '/', label: 'Home: OPEN GOVERNMENT masthead', left: 2.5, top: 9.8, width: 38, height: 5 },
  { href: '/login', label: 'Account / Info', left: 52, top: 6.5, width: 9, height: 2 },
  { href: '/login', label: 'Sign up / Log in', left: 61.5, top: 6.3, width: 13, height: 2.4 },
  // Nav row (~17% down, spread across the full width to match the labels)
  { href: '/', label: 'Home', left: 5, top: 17, width: 5.5, height: 2.4 },
  { href: '/bills', label: 'Bills', left: 13, top: 17, width: 5.5, height: 2.4 },
  { href: '/polls', label: 'Peoples Polls', left: 20.4, top: 17, width: 9.5, height: 2.4 },
  { href: '/parties', label: 'Parties', left: 33.2, top: 17, width: 6.5, height: 2.4 },
  { href: '/mps', label: 'MPs', left: 42.8, top: 17, width: 5, height: 2.4 },
  { href: '/departments', label: 'Departments', left: 50.4, top: 17, width: 9.5, height: 2.4 },
  { href: '/editorials', label: 'Editorials', left: 61.2, top: 17, width: 8.5, height: 2.4 },
  { href: '/transparency', label: 'Transparency', left: 71.6, top: 17, width: 10, height: 2.4 },
  { href: '/support', label: 'Support Us', left: 83.7, top: 17, width: 8.5, height: 2.4 },
];

export default async function Landing1012({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;

  return (
    <main className="l12-stage">
      <div
        className={`l12-shell${debug !== undefined ? ' debug' : ''}`}
        aria-label="OPEN GOVERNMENT landing1012 preview"
      >
        {HOTSPOTS.map((h) => (
          <a
            key={h.label}
            href={h.href}
            aria-label={h.label}
            className="l12-hotspot"
            style={{ left: `${h.left}%`, top: `${h.top}%`, width: `${h.width}%`, height: `${h.height}%` }}
          >
            {h.label}
          </a>
        ))}

        {/* Content laid into the blank folder body */}
        <div className="l12-body">
          <div className="l12-lead">
            <div className="l12-main">
              <a href="/editorials/ten-worst-performing-councils-england">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/councils.webp" alt="The ten worst performing councils in England" />
                <div className="l12-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="l12-head">The Ten Worst Performing Councils In England</div>
                <div className="l12-standfirst">How local government failed the people it exists to serve.</div>
                <p className="l12-lede">
                  Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. England&rsquo;s second city is still under government commissioners. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
                </p>
                <div className="l12-cta">Read the full story &rarr;</div>
              </a>

              <a className="l12-brief" href="/editorials/power-for-sale-20-politicians-who-cashed-in">
                <div className="l12-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="l12-head">Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
                <div className="l12-cta">Read the full story &rarr;</div>
              </a>
            </div>

            <div className="l12-rail">
              <a className="l12-card" href="/bills">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/votes.webp" alt="Every bill, every vote, every law" />
                <div className="l12-kicker" style={{ color: 'rgba(20,16,13,0.7)', letterSpacing: '0.16em' }}>From the House this week</div>
                <div className="l12-head">Every bill. Every vote. Every law.</div>
                <p>Follow what Parliament is doing right now, in plain English. <span className="l12-cta">Read the bills &rarr;</span></p>
              </a>

              <a className="l12-brief" href="/editorials/kxlkhj1jgj">
                <div className="l12-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="l12-head">Westminster&rsquo;s Culture of Impropriety</div>
                <p>Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons.</p>
                <div className="l12-cta">Read the full story &rarr;</div>
              </a>

              <a className="l12-brief" href="/editorials/when-did-politicians-stop-taking-responsibility">
                <div className="l12-kicker">The People&rsquo;s Chamber &middot; Comment</div>
                <div className="l12-head" style={{ fontSize: '1.35cqw' }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#7a1612' }}>&rarr;</span></div>
              </a>

              <a className="l12-brief" href="/editorials/britains-most-disgraced-politicians">
                <div className="l12-kicker">The People&rsquo;s Chamber &middot; Investigation</div>
                <div className="l12-head" style={{ fontSize: '1.35cqw' }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#7a1612' }}>&rarr;</span></div>
              </a>

              <a className="l12-brief" href="/editorials" style={{ textAlign: 'right' }}>
                <div className="l12-cta">All investigations &rarr;</div>
              </a>
            </div>
          </div>

          <div className="l12-bottom">
            <div className="l12-col">
              <a href="/expenses">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" />
                <div className="l12-head">The biggest expenses bill</div>
                <p>The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.</p>
                <div className="l12-cta">See the full top ten &rarr;</div>
              </a>
            </div>
            <div className="l12-col">
              <a href="/parties">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/manifesto.webp" alt="Every manifesto. Every shift." />
                <div className="l12-head">Every manifesto. Every shift.</div>
                <p>What each of the fifteen UK parties told voters in 2024, what they have done since, and where the gap is widest.</p>
                <div className="l12-cta">Read the dossiers &rarr;</div>
              </a>
            </div>
            <div className="l12-col">
              <a href="/departments">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/whitehall.webp" alt="Who runs Whitehall" />
                <div className="l12-head">Who runs Whitehall</div>
                <p>All twenty four ministerial departments graded against the public record of what they were set up to do.</p>
                <div className="l12-cta">See the departments &rarr;</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
