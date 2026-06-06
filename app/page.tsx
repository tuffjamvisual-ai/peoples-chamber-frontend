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
      {/* Lead story — fills the large top content area. */}
      <a href="/bills" className="no-hover-scale" style={{ ...card, top: '24%', left: '6%', width: '88%', height: '39%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 6%' }}>
        <div style={{ ...kicker, fontSize: '1.35cqw', letterSpacing: '0.22em', opacity: 0.65, marginBottom: '2.5%' }}>From the House this week</div>
        <div style={{ ...headline, fontSize: '3.7cqw', lineHeight: 1.0, marginBottom: '3%' }}>Every bill, every vote, every law.</div>
        <div style={{ fontSize: '1.65cqw', lineHeight: 1.5, maxWidth: '34ch', opacity: 0.85 }}>Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.</div>
        <div style={{ ...kicker, fontSize: '1.45cqw', letterSpacing: '0.04em', marginTop: '3.5%' }}>Read the bills →</div>
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
      <MoneyAndPowerBanner />
      <EditorialIntro />
    </>
  );
}

// Featured "Money & Power" panel — sits below the newspaper front page
// and above the editorial intro. Surfaces the strongest cross-register
// patterns by name and number so a normal visitor sees there's a
// hidden-in-plain-sight layer before scrolling further.
function MoneyAndPowerBanner() {
  const PAPER = '#f4e8d4';
  const INK = '#14100d';
  const ACCENT = '#7a1612';
  const HAIRLINE = 'rgba(20,16,13,0.18)';
  return (
    <section
      aria-label="Money and power: hidden-in-plain-sight cross-references"
      style={{
        background: PAPER,
        color: INK,
        padding: '5% 8% 5%',
        borderTop: '1px solid rgba(20,16,13,0.18)',
        borderBottom: '1px solid rgba(20,16,13,0.18)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '13px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.6,
            margin: '0 0 14px',
          }}
        >
          Money &amp; Power · Cross-register patterns
        </p>
        <h2
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
            fontSize: 'clamp(24px, 3.2vw, 40px)',
            fontWeight: 'bold',
            lineHeight: 1.1,
            margin: '0 0 14px',
          }}
        >
          The money that moves through UK politics, side-by-side with the records nobody else joins.
        </h2>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '14px',
            lineHeight: 1.7,
            margin: '0 0 28px',
            maxWidth: '70ch',
            opacity: 0.85,
          }}
        >
          Every fact below is public. The Electoral Commission, gov.uk Contracts Finder, the Register of Members&rsquo; Financial Interests and the APPG register all publish their own slice in their own format. Reading them together is the work.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
          }}
        >
          <HomeTile
            href="/donations/double-dip"
            kicker="Double-dip"
            line="UK MPs paid both as employees AND as donors by the same entity."
            example="Sunak · Hoover Institution. Williamson · RTC Education. Hunt + Freeman · Oxford Institute. Three MPs · GB News."
          />
          <HomeTile
            href="/donations/government-contractors"
            kicker="Contractors who donate"
            line="£120M+ of UK public-sector contracts. £2.5M+ of political donations. Same companies."
            example="PwC · KPMG · Deloitte · Ernst & Young · Microsoft · SSE · Randox · Grant Thornton."
          />
          <HomeTile
            href="/donations/sponsored-visits"
            kicker="Who paid for MPs to travel"
            line="Foreign governments, think tanks and lobby groups paying for UK MP visits."
            example="Hong Kong Government · 30 trips. Qatar foreign ministry paid Starmer to meet the Emir."
          />
          <HomeTile
            href="/money"
            kicker="The full money index"
            line="Twelve cross-register surfaces over UK political money. The patterns hidden in plain sight."
            example="Donors · contracts · earnings · APPGs · foreign · leadership · bequests · constituencies."
            highlight
          />
        </div>

        <div style={{ marginTop: '28px' }}>
          <a
            href="/money"
            style={{
              fontFamily: 'Special Elite, monospace',
              fontSize: '14px',
              color: ACCENT,
              textDecoration: 'underline',
              fontWeight: 'bold',
            }}
          >
            Read the full Money &amp; Power index &rarr;
          </a>
          <span style={{ opacity: 0.4, padding: '0 10px' }}>·</span>
          <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', opacity: 0.7 }}>
            None of this is evidence of wrongdoing. All of it is on a public register. Almost none of it has been findable until now.
          </span>
        </div>
      </div>
    </section>
  );

  function HomeTile({ href, kicker, line, example, highlight }: { href: string; kicker: string; line: string; example: string; highlight?: boolean }) {
    return (
      <a
        href={href}
        className="no-hover-scale"
        style={{
          display: 'block',
          textDecoration: 'none',
          color: INK,
          padding: '16px 18px',
          border: highlight ? `2px solid ${ACCENT}` : `1px solid ${HAIRLINE}`,
          background: highlight ? 'rgba(122,22,18,0.04)' : 'transparent',
        }}
      >
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: ACCENT,
            marginBottom: '8px',
            fontWeight: 'bold',
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, serif',
            fontSize: '18px',
            fontWeight: 'bold',
            lineHeight: 1.25,
            marginBottom: '10px',
          }}
        >
          {line}
        </div>
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '12px',
            lineHeight: 1.55,
            opacity: 0.8,
          }}
        >
          {example}
        </div>
        <div
          style={{
            marginTop: '10px',
            fontFamily: 'Special Elite, monospace',
            fontSize: '12px',
            color: ACCENT,
            fontWeight: 'bold',
          }}
        >
          See the table &rarr;
        </div>
      </a>
    );
  }
}

// Server-rendered editorial introduction. 264-word statement of what the
// site is, the surfaces it covers, and the provenance of the underlying
// record. Added 2026-06-05 to give the homepage substantive indexable
// content (the newspaper-overlay frame ships ~170 words in static HTML
// otherwise — too thin for Google to anchor the site's topical identity).
// Sits below the masthead, padded inwards from the page edges, paper +
// ink palette consistent with the rest of the site. The eyebrow uses
// Special Elite to match the other dossier intros; the body uses
// Georgia for a more newspaper-editorial register.
function EditorialIntro() {
  const PAPER = '#f4e8d4';
  const INK = '#14100d';
  return (
    <section
      aria-label="About The People's Chamber"
      style={{
        background: PAPER,
        color: INK,
        padding: '6% 8% 7%',
        borderTop: '1px solid rgba(20,16,13,0.18)',
      }}
    >
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '13px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.6,
            margin: '0 0 18px',
          }}
        >
          About this project
        </p>
        <h2
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 'bold',
            lineHeight: 1.15,
            margin: '0 0 24px',
          }}
        >
          The People&rsquo;s Chamber is an independent record of how the
          United Kingdom is governed.
        </h2>
        {/* Body in Special Elite per the site-wide typewriter rule
            (memory feedback_typewriter_for_body_prose). The H2 above
            stays in EB Garamond as a display heading. */}
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            lineHeight: 1.85,
            color: INK,
          }}
        >
          <p style={{ margin: '0 0 16px' }}>
            Every Member of Parliament has a profile here. Their voting
            record, their declared earnings, the bills they have sponsored,
            the hours they spend on second jobs, and a biographical note that
            reads as a political assessment rather than a press release. Each
            of the 24 ministerial departments has its own institutional
            performance report, marked by letter grade, against the public
            record of what it was set up to do. Every bill since 2010 is
            tracked through its stages of Parliament: which Members spoke for
            and against, how the division went on each reading, and whether it
            became law.
          </p>
          <p style={{ margin: '0 0 16px' }}>
            The transparency surfaces sit alongside the formal record.
            Ministers&rsquo; meetings, ministers&rsquo; hospitality, the
            Advisory Committee on Business Appointments, the Register of
            Members&rsquo; Financial Interests, awarded public contracts and
            political donations are pulled from the public registers daily,
            indexed by Member and by department, searchable.
          </p>
          <p style={{ margin: '0 0 16px' }}>
            The site exists because the public record is real but inaccessible.
            Every fact on the People&rsquo;s Chamber is sourced from
            Parliament, GOV.UK, the Electoral Commission, ACOBA, Contracts
            Finder or the relevant departmental disclosure. None of it is
            invented. None of it is opinion in the sense of being made up. The
            interpretative judgements in the institutional reports and the
            political biographies are the editorial work of the project; the
            underlying record is not.
          </p>
          <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.85 }}>
            If something is wrong, it can be corrected. If something is
            missing, it can be added.
          </p>
        </div>
      </div>
    </section>
  );
}
