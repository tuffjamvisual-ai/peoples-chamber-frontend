import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import './landing-demo2.css';

// /landing-demo2 — DEMO ONLY (noindex). The original People's Chamber landing
// page (app/page.tsx + DossierShell) with its painted "back page" (pca-art.webp)
// replaced by the newgovfolder folder, and the painted nav replaced by a REAL
// code nav bar. newgovfolder is 1024x1536 — the same aspect as pca-art (1023x1537)
// — so it drops straight into the same container and the original %-positioned
// article-card overlay sits on it unchanged. The live landing page is untouched.

export const metadata: Metadata = {
  title: 'Landing demo — newgovfolder back page (preview)',
  robots: { index: false, follow: false },
};

const INK = '#14100d';

const headline: CSSProperties = {
  fontFamily: 'var(--font-anton), Impact, "Arial Narrow", sans-serif',
  fontWeight: 400,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};
const card: CSSProperties = {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  color: INK,
  textDecoration: 'none',
  fontFamily: 'Georgia, "Times New Roman", serif',
};
const kicker: CSSProperties = { fontFamily: 'Special Elite, monospace', textTransform: 'uppercase' };
const ctaStyle: CSSProperties = { ...kicker, fontSize: '1.2cqw', letterSpacing: '0.03em', marginTop: 'auto' };

// Nav (visible, real links + CSS dropdowns) — same items/destinations as the
// painted masthead on the live page.
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
  { label: 'Transparency', href: '/transparency', children: [
    { label: 'All Datasets', href: '/transparency' },
    { label: 'Editorials', href: '/editorials' },
    { label: 'MPs’ Second Jobs', href: '/second-jobs' },
    { label: 'Ministers’ Meetings', href: '/transparency/ministers-meetings' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Political Donations', href: '/transparency/donations' },
    { label: 'Local Councils', href: '/councils' },
    { label: 'Top Council Tax', href: '/council-tax' },
  ] },
  { label: 'Contact', href: '/contact' },
];

export default function LandingDemo2() {
  return (
    <div
      className="ng-page"
      style={{
        minHeight: '100vh',
        margin: 0,
        backgroundColor: '#140d07',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3vh 0 8vh',
      }}
    >
      {/* Folders-pile backdrop, pinned to the viewport (same as the live page). */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#140d07',
          backgroundImage: 'url(/folders.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: 'min(94vw, 1144px)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1024 / 1536', containerType: 'inline-size' }}>
          {/* Back page: the blank newlandin folder in place of pca-art.webp
              (stretched to the 1023/1537-style container so the original
              %-positioned overlay stays aligned). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/newlandin.webp"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.55))',
            }}
          />

          {/* Masthead in code — newlandin is a blank folder. */}
          <div style={{ position: 'absolute', top: '6.5%', left: '6%', width: '62%', zIndex: 5, pointerEvents: 'none' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, "Arial Narrow", sans-serif', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 0.95, fontSize: '5.2cqw', color: '#14100d' }}>Open Government</h1>
            <div style={{ borderBottom: '0.22cqw solid #14100d', marginTop: '1.4%' }} />
          </div>

          {/* Account / sign-up in the folder's top-right tab. */}
          <div className="ng-tab">
            <a href="/login">Account / Info</a>
            <a href="/login">Sign up / Log in</a>
          </div>

          {/* Real nav bar (replaces the painted nav). */}
          <nav className="ng-navwrap" aria-label="Primary">
            <ul className="ng-nav">
              {NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                  {item.children && (
                    <ul className="ng-sub">
                      {item.children.map((c) => (
                        <li key={c.href}><a href={c.href}>{c.label}</a></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Original front-page article overlay (verbatim from the live page) ── */}

          {/* Lead editorial */}
          <a href="/editorials/ten-worst-performing-councils-england" className="no-hover-scale" style={{ ...card, top: '24%', left: '6%', width: '48%', height: '38%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '1.5% 2.5% 1.5%', overflow: 'hidden' }}>
            <div style={{ width: '100%', marginBottom: '2%', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/councils.webp" alt="The ten worst performing councils in England" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            </div>
            <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', color: '#6b2417', fontWeight: 'bold', marginBottom: '2%' }}>The People&rsquo;s Chamber &middot; Investigation</div>
            <div style={{ ...headline, fontSize: '2.6cqw', lineHeight: 0.98, marginBottom: '2%', letterSpacing: '0.01em' }}>The Ten Worst Performing Councils In England</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '1.4cqw', lineHeight: 1.35, opacity: 0.88, marginBottom: '2%' }}>
              How local government failed the people it exists to serve.
            </div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.25cqw', lineHeight: 1.45, opacity: 0.92, marginBottom: '2%', textAlign: 'justify' }}>
              Eight English councils have declared themselves effectively bankrupt since 2018, accumulating more than &pound;5 billion in debt and deficit between them. One was abolished. Another went bankrupt three times. A commuter-belt borough with &pound;16 million of annual revenue borrowed its way to &pound;1.2 billion of debt. England&rsquo;s second city is still under government commissioners. One in five council leaders now expects to issue a Section 114 notice within two years. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
            </div>
            <div style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', marginTop: '0.5%', color: '#6b2417', fontWeight: 'bold' }}>Read the full story &rarr;</div>
          </a>

          {/* Revolving-door brief */}
          <a href="/editorials/power-for-sale-20-politicians-who-cashed-in" className="no-hover-scale" style={{ ...card, top: '62.5%', left: '6%', width: '48%', height: '9%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '1.5% 2.5%', overflow: 'hidden', borderTop: '1.5px solid #14100d' }}>
            <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', color: '#6b2417', fontWeight: 'bold', marginBottom: '2%' }}>The People&rsquo;s Chamber &middot; Investigation</div>
            <div style={{ ...headline, fontSize: '1.95cqw', lineHeight: 1.0, marginBottom: '2%' }}>Power For Sale? The 20 Politicians Who Cashed In After Leaving Office</div>
            <div style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', color: '#6b2417', fontWeight: 'bold' }}>Read the full story &rarr;</div>
          </a>

          {/* Parliament weekly digest */}
          <a href="/bills" className="no-hover-scale" style={{ ...card, top: '24%', left: '56%', width: '38%', height: '25%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '1.5% 2.5%', overflow: 'hidden' }}>
            <div style={{ width: '100%', marginBottom: '3%', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/votes.webp" alt="Every bill, every vote, every law" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            </div>
            <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', opacity: 0.65, marginBottom: '2.5%' }}>From the House this week</div>
            <div style={{ ...headline, fontSize: '2.6cqw', lineHeight: 0.98, marginBottom: '4%' }}>Every bill. Every vote. Every law.</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.5cqw', lineHeight: 1.45, opacity: 0.88, marginBottom: '0', textAlign: 'left' }}>
              Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.{' '}
              <span style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', color: '#6b2417', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Read the bills &rarr;</span>
            </div>
          </a>

          {/* Westminster scandals brief */}
          <a href="/editorials/kxlkhj1jgj" className="no-hover-scale" style={{ ...card, top: '49.5%', left: '56%', width: '38%', height: '12%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '0 2.5%', overflow: 'hidden' }}>
            <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', color: '#6b2417', fontWeight: 'bold', borderTop: '1.5px solid #14100d', paddingTop: '3.5%', marginBottom: '2.5%', width: '100%' }}>The People&rsquo;s Chamber &middot; Investigation</div>
            <div style={{ ...headline, fontSize: '2.0cqw', lineHeight: 1.0, marginBottom: '3%' }}>Westminster&rsquo;s Culture of Impropriety: Why Trust Keeps Eroding</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.25cqw', lineHeight: 1.4, opacity: 0.9, marginBottom: '3%', textAlign: 'justify' }}>
              Ten serving MPs who broke the rules, the law or the trust of their constituents and remain in the Commons. Standards Committee findings, criminal records and contested registered interests, each entry independently fact-checked.
            </div>
            <div style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', color: '#6b2417', fontWeight: 'bold' }}>Read the full story &rarr;</div>
          </a>

          {/* Accountability comment strip */}
          <a href="/editorials/when-did-politicians-stop-taking-responsibility" className="no-hover-scale" style={{ ...card, top: '62%', left: '56%', width: '38%', height: '5.5%', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', padding: '0 2.5%', overflow: 'hidden', borderTop: '1.5px solid #14100d' }}>
            <div style={{ ...kicker, fontSize: '0.85cqw', letterSpacing: '0.24em', color: '#6b2417', fontWeight: 'bold', marginBottom: '1.5%' }}>The People&rsquo;s Chamber &middot; Comment</div>
            <div style={{ ...headline, fontSize: '1.3cqw', lineHeight: 1.0 }}>When Did Politicians Stop Taking Responsibility? <span style={{ color: '#6b2417' }}>&rarr;</span></div>
          </a>

          {/* Disgraced-politicians strip */}
          <a href="/editorials/britains-most-disgraced-politicians" className="no-hover-scale" style={{ ...card, top: '67.7%', left: '56%', width: '38%', height: '3.4%', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', padding: '0 2.5%', overflow: 'hidden', borderTop: '1.5px solid #14100d' }}>
            <div style={{ ...kicker, fontSize: '0.85cqw', letterSpacing: '0.24em', color: '#6b2417', fontWeight: 'bold', marginBottom: '1.5%' }}>The People&rsquo;s Chamber &middot; Investigation</div>
            <div style={{ ...headline, fontSize: '1.3cqw', lineHeight: 1.0 }}>Britain&rsquo;s Most Disgraced Politicians <span style={{ color: '#6b2417' }}>&rarr;</span></div>
          </a>

          {/* All investigations */}
          <a href="/editorials" className="no-hover-scale" style={{ ...card, top: '71.5%', left: '56%', width: '38%', height: '1.8%', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'right', padding: '0 2.5%', overflow: 'hidden' }}>
            <div style={{ ...kicker, fontSize: '0.95cqw', letterSpacing: '0.12em', color: '#6b2417', fontWeight: 'bold' }}>All investigations &rarr;</div>
          </a>

          {/* Expenses story (left) */}
          <a href="/expenses" className="no-hover-scale" style={{ ...card, top: '73.5%', left: '6%', width: '27%', height: '21%', alignItems: 'flex-start', overflow: 'hidden' }}>
            <div style={{ width: '100%', marginBottom: '3%', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            </div>
            <div style={{ ...headline, fontSize: '1.95cqw', lineHeight: 1.04, marginBottom: '2.5%' }}>The biggest expenses bill</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.4cqw', lineHeight: 1.35, opacity: 0.88, marginBottom: '2.5%', textAlign: 'justify' }}>
              Every MP claims travel, staff, office and accommodation costs against the public purse. The ten biggest claimants ran up the largest bills last financial year. See which MPs spent the most and on what.
            </div>
            <div style={{ ...ctaStyle, marginTop: 0 }}>See the full top ten &rarr;</div>
          </a>

          {/* Parties story (centre) */}
          <a href="/parties" className="no-hover-scale" style={{ ...card, top: '73.5%', left: '37%', width: '27%', height: '21%', alignItems: 'flex-start', overflow: 'hidden' }}>
            <div style={{ width: '100%', marginBottom: '3%', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/manifesto.webp" alt="Every manifesto. Every shift. The gap diagnosed." style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            </div>
            <div style={{ ...headline, fontSize: '1.95cqw', lineHeight: 1.04, marginBottom: '2.5%' }}>Every manifesto. Every shift.</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.4cqw', lineHeight: 1.35, opacity: 0.88, marginBottom: '2.5%', textAlign: 'justify' }}>
              What each of the fifteen UK parties told voters at the 2024 election, what they have done in the year since, and where the gap between manifesto and record is widest.
            </div>
            <div style={{ ...ctaStyle, marginTop: 0 }}>Read the dossiers &rarr;</div>
          </a>

          {/* Whitehall story (right) */}
          <a href="/departments" className="no-hover-scale" style={{ ...card, top: '73.5%', left: '68%', width: '26%', height: '21%', alignItems: 'flex-start', overflow: 'hidden' }}>
            <div style={{ width: '100%', marginBottom: '3%', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/whitehall.webp" alt="Who runs Whitehall" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            </div>
            <div style={{ ...headline, fontSize: '1.95cqw', lineHeight: 1.04, marginBottom: '2.5%' }}>Who runs Whitehall</div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.4cqw', lineHeight: 1.35, opacity: 0.88, marginBottom: '2.5%', textAlign: 'justify' }}>
              All twenty four ministerial departments graded against the public record of what they were set up to do. Executive summary, core strengths, critical weaknesses, recommendation. One institutional performance report per department.
            </div>
            <div style={{ ...ctaStyle, marginTop: 0 }}>See the departments &rarr;</div>
          </a>
        </div>
      </div>
    </div>
  );
}
