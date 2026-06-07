import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import DossierShell from './components/DossierShell';
import JsonLd, { buildHomepageGraph } from '@/lib/JsonLd';

// The newspaper front page is the landing page. DossierShell renders the masthead + nav
// + footer with no folder; HomeFront fills the body with a lead (-> /bills) and three
// front-page stories below it: expenses (-> /expenses), the People's Verdict on the
// 15 UK parties (-> /parties) and Whitehall (-> /departments). All three bottom cards
// are static editorial slots; the previous poll-driven middle card was promoted to a
// Parties card when the dossier set landed.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The People's Chamber, UK Parliament Tracker & Government Transparency",
  description:
    'Track every UK MP, bill, vote and government department in one place. Voting records, ministerial spending, party manifestos and Whitehall transparency data, free and unbranded.',
  alternates: { canonical: '/' },
};

const INK = '#14100d';
const CREAM = '#ebe5d8';

// Anton: bold, tightly condensed tabloid-headline face (loaded via next/font in layout.tsx).
// Anton ships a single heavy weight, so use 400 (not 'bold', which would force faux-bold).
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
const eyebrow: CSSProperties = { ...kicker, fontSize: '1.05cqw', letterSpacing: '0.18em', opacity: 0.6, marginBottom: '3%' };
const ctaStyle: CSSProperties = { ...kicker, fontSize: '1.2cqw', letterSpacing: '0.03em', marginTop: 'auto' };
const blurbStyle: CSSProperties = { fontSize: '1.2cqw', lineHeight: 1.4, opacity: 0.85, marginBottom: '4%' };
const headlineRow: CSSProperties = { display: 'flex', gap: '6%', alignItems: 'flex-start', width: '100%', marginBottom: '3%' };
const colStyle = (left: string, width: string): CSSProperties => ({ ...card, top: '75%', left, width, height: '14%', alignItems: 'flex-start' });

export default function HomePage() {
  const HomeFront = (
    <>
      <JsonLd data={buildHomepageGraph()} />

      {/* Lead editorial — the dominant front-page story. Newspaper-scale
          hierarchy: photo at top with ink border, big serif headline,
          italic Garamond standfirst, short lede, accent-red CTA. overflow
          hidden as a defensive measure against the 41%-height card
          clipping at small viewports. */}
      {/* Lead editorial — stacked layout: photo at top, text underneath.
          Font sizes match the secondary bills card for consistency
          across the top row. */}
      <a href="/editorials/ten-worst-performing-councils-england" className="no-hover-scale" style={{ ...card, top: '24%', left: '6%', width: '48%', height: '42%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '1.5% 2.5% 1.5%', overflow: 'hidden' }}>
        <div style={{ width: '100%', marginBottom: '2%', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/councils.webp"
            alt="The ten worst performing councils in England"
            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: '2.5px solid #14100d',
              filter: 'url(#handDrawnEdge)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', color: '#6b2417', fontWeight: 'bold', marginBottom: '2%' }}>The People&rsquo;s Chamber &middot; Investigation</div>
        <div style={{ ...headline, fontSize: '2.6cqw', lineHeight: 0.98, marginBottom: '2%', letterSpacing: '0.01em' }}>The Ten Worst Performing Councils In England</div>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '1.4cqw', lineHeight: 1.35, opacity: 0.88, marginBottom: '2%' }}>
          How local government failed the people it exists to serve.
        </div>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.25cqw', lineHeight: 1.45, opacity: 0.92, marginBottom: '2%' }}>
          Since 2018, seven English councils have declared themselves effectively bankrupt. One was abolished entirely. Another went bankrupt three times. A borough council with an annual budget of &pound;16 million accumulated debts of &pound;1.8 billion. England&rsquo;s largest local authority is still under government commissioners two years after its collapse. Sixty three more councils are considered at risk. The ten worst failures in modern English local government expose a system where the safeguards designed to prevent catastrophe failed at every level. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.
        </div>
        <div style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', marginTop: '0.5%', color: '#6b2417', fontWeight: 'bold' }}>Read the full story &rarr;</div>
      </a>

      {/* Secondary hotspot: Parliament weekly digest. Lives to the right
          of the lead editorial, slim column. */}
      <a href="/bills" className="no-hover-scale" style={{ ...card, top: '24%', left: '56%', width: '38%', height: '42%', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', padding: '1.5% 2.5%', overflow: 'hidden' }}>
        <div style={{ width: '100%', marginBottom: '3%', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/votes.webp"
            alt="Every bill, every vote, every law"
            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: '2.5px solid #14100d',
              filter: 'url(#handDrawnEdge)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ ...kicker, fontSize: '1.0cqw', letterSpacing: '0.28em', opacity: 0.65, marginBottom: '2.5%' }}>From the House this week</div>
        <div style={{ ...headline, fontSize: '2.6cqw', lineHeight: 0.98, marginBottom: '4%' }}>Every bill. Every vote. Every law.</div>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.5cqw', lineHeight: 1.45, opacity: 0.88, marginBottom: '4%' }}>
          Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.
        </div>
        <div style={{ ...kicker, fontSize: '1.1cqw', letterSpacing: '0.12em', marginTop: '0.5%', color: '#6b2417', fontWeight: 'bold' }}>Read the bills &rarr;</div>
      </a>

      {/* Hand-drawn SVG border filter — feTurbulence displaces the border
          edges so they read as wobbly ink strokes, not a CSS rectangle.
          One <svg> shared between both photo cards on this page. */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
        <defs>
          <filter id="handDrawnEdge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Expenses story (left) — featured image on top, headline under.
          The image stays crisp; the hand-drawn ink border sits over it
          as a separate layer that gets the wobble filter. */}
      <a href="/expenses" className="no-hover-scale" style={{ ...card, top: '75%', left: '6%', width: '27%', height: '15%', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', marginBottom: '4%', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mp-expenses.webp"
            alt="The biggest MP expenses bill"
            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: '2.5px solid #14100d',
              filter: 'url(#handDrawnEdge)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ ...headline, fontSize: '2.05cqw', lineHeight: 1.04, marginBottom: '3%' }}>The biggest expenses bill</div>
        <div style={{ ...ctaStyle, marginTop: 0 }}>See the full top ten →</div>
      </a>

      {/* Parties story (centre) — same geometry as the previous poll card.
          The big "15" tile sits where the poll percentage used to sit, with
          the rotated cream block + tilted angle preserved so the visual
          rhythm of [big number] + [headline] stays the same. Eyebrow text
          "The People's verdict" reuses the brand mark that's also the
          section heading on every /parties/[slug] dossier. */}
      <a href="/parties" className="no-hover-scale" style={colStyle('37%', '27%')}>
        <div style={eyebrow}>The People’s verdict</div>
        <div style={headlineRow}>
          <div style={{ flex: '0 0 34%', background: CREAM, border: `1px solid rgba(20,16,13,0.3)`, padding: '6% 2%', textAlign: 'center', transform: 'rotate(-1.5deg)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '2.6cqw', lineHeight: 1, color: '#6b2417' }}>15</div>
            <div style={{ ...kicker, fontSize: '0.8cqw', letterSpacing: '0.1em', marginTop: '6%' }}>parties · dossiered</div>
          </div>
          <div style={{ ...headline, flex: '1 1 auto', fontSize: '1.65cqw', lineHeight: 1.05 }}>Every manifesto. Every shift. The gap diagnosed.</div>
        </div>
        <div style={blurbStyle}>What each party said in 2024. What they have done since. What they have not.</div>
        <div style={ctaStyle}>Read the dossiers →</div>
      </a>

      {/* Whitehall story (right) — same hand-drawn border treatment. */}
      <a href="/departments" className="no-hover-scale" style={{ ...card, top: '75%', left: '68%', width: '26%', height: '15%', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', marginBottom: '4%', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/whitehall.webp"
            alt="Who runs Whitehall"
            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: '2.5px solid #14100d',
              filter: 'url(#handDrawnEdge)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ ...headline, fontSize: '2.05cqw', lineHeight: 1.04, marginBottom: '3%' }}>Who runs Whitehall</div>
        <div style={{ ...ctaStyle, marginTop: 0 }}>See the departments →</div>
      </a>
    </>
  );

  return (
    <>
      <DossierShell overlay={HomeFront} />
      <HomepageEditorialIntro />
    </>
  );
}

// Server-rendered editorial introduction. Visually hidden via `sr-only`
// style (clip-path + position:absolute + 1px box) so the landing-page
// design stays clean while the indexable copy lands in the static HTML
// for SEO. Same prose Google sees on /about.
//
// Reinstated 2026-06-07 after Phase 1 SEO Check 2 found 0 matches for
// the "independent record of how the United Kingdom is governed" line
// in the deployed homepage HTML. The Phase 1 design required indexable
// editorial copy on the homepage; the visible newspaper-overlay alone
// ships ~170 words which is too thin for Google to anchor topical
// identity. This block adds ~360 words of substantive prose to the
// HTML response without changing the visible landing page.
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
        The site exists because the public record is real but inaccessible. Every fact on the People&rsquo;s Chamber is sourced from Parliament, GOV.UK, the Electoral Commission, ACOBA, Contracts Finder or the relevant departmental disclosure. None of it is invented. None of it is opinion in the sense of being made up. The interpretative judgements in the institutional reports and the political biographies are the editorial work of the project; the underlying record is not.
      </p>
      <p>If something is wrong, it can be corrected. If something is missing, it can be added.</p>
    </section>
  );
}
