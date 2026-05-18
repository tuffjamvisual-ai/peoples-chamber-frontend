import type { Metadata } from 'next';
import Image from 'next/image';
import MagazineNav from '../components/MagazineNav';
import '../components/magazine-layout.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Unite the Kingdom: When Over 100,000 People Show Up, Somebody Should Listen',
  description: "The march Westminster doesn't want to understand.",
  alternates: { canonical: '/unite-kingdom' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const CREAM = '#ebe5d8';
const PHOTO_SRC = '/link-cards/hero_illustration_1779025435.png';

export default function UniteKingdomPage() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      {/* Hidden SVG filter defs for the wavy photo borders */}
      <svg aria-hidden style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="wavy-edge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
      </svg>

      <MagazineNav />

      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: INK,
          fontFamily: 'Special Elite, monospace',
        }}
      >
        <article style={{ maxWidth: '1000px', margin: '0 auto' }}>

          {/* Top header strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: `2px solid ${ACCENT}`,
              paddingBottom: '12px',
              marginBottom: '24px',
            }}
          >
            <span style={kicker(ACCENT)}>Special Report · 16 May 2026</span>
            <span style={kicker(INK_SOFT)}>The march Westminster doesn&rsquo;t want to understand</span>
          </div>

          {/* Masthead — spans full width, sits above the columns */}
          <header style={{ marginBottom: '36px' }}>
            <h1
              style={{
                fontSize: 'clamp(44px, 8vw, 80px)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                margin: '0 0 18px',
                transform: 'rotate(-0.3deg)',
              }}
            >
              UNITE THE<br />KINGDOM
            </h1>
            <p style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1.3, color: INK_SOFT, margin: 0 }}>
              When over 100,000 people show up, somebody should listen
            </p>
          </header>

          {/* 2-column flowing body. CSS multi-column means text reflows
            * between columns; photo cards use break-inside-avoid so they
            * stay whole. column-fill:balance keeps the bottom edges aligned. */}
          <div
            style={{
              columnCount: 2,
              columnGap: '36px',
              columnFill: 'balance',
              columnRule: `1px solid ${INK_HAIRLINE}`,
            }}
            className="article-cols"
          >
            <p style={{ ...lead() }}>
              Over 100,000 people marched through central London on Saturday. Not a few hundred angry extremists. Not a fringe group easy to dismiss. Ordinary Britons who travelled from across the country, paid their own way, took time off work, and stood in the streets to say they have had enough.
            </p>

            <p style={body()}>
              The political class spent £4.5 million on police to manage them, deployed 4,000 officers with drones and helicopters and live facial-recognition technology, and then promptly ignored what they were actually saying.
            </p>

            <p style={body()}>
              That should tell you everything about how seriously Westminster takes the concerns of people who do not speak its language, share its assumptions, or believe its promises anymore.
            </p>

            <h2 style={h2()}>What They Were Actually Saying</h2>

            <p style={body()}>
              Supporters described feeling ignored by the government and alarmed by the direction of the country. A veteran who fought for Britain said he now felt the way things were going made it a waste of time. A woman in a wheelchair pointed to NHS waiting times getting silly. Others talked about borders that are not being protected, public services collapsing, communities changing faster than anyone asked them to change, and a government that lectures about values while failing to deliver the basics.
            </p>

            <PhotoCard
              caption="Parliament Square, 16 May 2026 — thousands gather with flags and placards."
              tilt={-0.5}
            />

            <p style={body()}>
              These are not abstract culture war talking points. These are people describing their actual lives. The veteran is not wrong that something has gone badly wrong when someone who served their country feels abandoned by it. The woman in the wheelchair is not wrong that NHS waiting times are a disgrace. And the people worried about immigration are not wrong that successive governments promised control, failed to deliver it, and then called anyone who complained a bigot.
            </p>

            <p style={body()}>
              Crowds carried St George&rsquo;s Cross and Union flags, chanted about wanting their country back, and some wore red Make England Great Again hats. Christian imagery was visible throughout. Protesters carried crosses, waved crucifixes, and some dressed as Knights Templar. There was also a visible Iranian opposition presence waving pre-revolutionary flags, and supporters of Israel who saw the march as a stand for Judeo-Christian values.
            </p>

            <p style={body()}>
              The political class looks at that and sees extremism. What they should see is people reaching for the symbols of national identity because they feel that identity is under siege, not from foreigners, but from their own government which has spent decades telling them their history is shameful, their culture is outdated, and their concerns are illegitimate.
            </p>

            <h2 style={h2()}>What Westminster Refuses to Admit</h2>

            <p style={body()}>
              Mass immigration has changed Britain rapidly and profoundly. That is not a racist observation. It is a demographic fact. Between 1991 and 2021, the non-UK born population of England and Wales more than doubled from 3.8 million to 10 million. In some areas, the pace of change has been even faster. Communities that were socially cohesive thirty years ago are now deeply fragmented, not because people are inherently hostile to newcomers, but because the scale and speed of change has made integration impossible.
            </p>

            <PhotoCard
              caption="St George&rsquo;s Crosses and Union flags dominate the crowd."
              tilt={0.3}
            />

            <p style={body()}>
              Politicians promised that immigration would be controlled, that numbers would come down, that borders would be secured. Every single promise was broken. Brexit was supposed to deliver control. It has not. Illegal Channel crossings have continued. Legal immigration has surged. And the people who voted for change have watched their government fail to deliver it while spending more time prosecuting people for social media posts than actually enforcing immigration law.
            </p>

            <p style={body()}>
              Meanwhile, public services that were already under strain have been pushed to breaking point. The NHS is collapsing. Schools are overcrowded. Housing is unaffordable. Wages have stagnated. And when people connect those failures to decades of mass immigration straining infrastructure that was never expanded to match population growth, they are told they are imagining it, or worse, that they are bigots.
            </p>

            <p style={body()}>
              The political class has spent years gaslighting ordinary people about their own lived experience. They have been told that immigration is good for the economy while watching their wages stagnate. They have been told that diversity is strength while watching their communities fragment. They have been told that multiculturalism works while watching integration fail. And they have been told that anyone who questions any of this is a far-right extremist who needs to be surveilled, arrested, or silenced.
            </p>

            <h2 style={h2()}>The Real Extremism</h2>

            <p style={body()}>
              Over 100,000 people marching peacefully through London, waving flags and expressing democratic discontent, is not extremism. What is extreme is a political system that has imposed demographic transformation on a population without asking their permission, failed to provide the infrastructure to support it, lied about the consequences, and then criminalised dissent.
            </p>

            <p style={body()}>
              What is extreme is deploying 4,000 police officers, drones, helicopters and live facial-recognition technology to monitor British citizens exercising their democratic right to protest, while simultaneously allowing illegal immigration to continue unchecked and doing almost nothing to remove people who have no right to be in the country.
            </p>

            <p style={body()}>
              What is extreme is a government that blocked eleven foreign nationals from entering the country to speak at the rally, citing public order concerns, while allowing tens of thousands of illegal migrants to cross the Channel and stay indefinitely because the asylum system is too overwhelmed to process them and too dysfunctional to deport them.
            </p>

            <p style={body()}>
              What is extreme is a political establishment that looks at over 100,000 ordinary voters and sees nothing but a problem to be managed, surveilled, and dismissed, rather than citizens whose concerns deserve to be taken seriously.
            </p>

            <h2 style={h2()}>A Country Asking for Its Democracy Back</h2>

            <p style={body()}>
              Many marchers said they had voted for Britain to leave the European Union in 2016, motivated by the Brexit campaign&rsquo;s pledge to take back control. Saturday&rsquo;s march was another cry to make good on that promise. People want leadership that listens to them instead of lecturing them. They want borders that mean something. They want public services that work. They want communities that feel like home instead of places they no longer recognise.
            </p>

            <p style={body()}>
              One marcher, asked which British politician last inspired him, chose Margaret Thatcher even though her Conservative government had closed the mine where he worked. He did not like her, he said, but she had a backbone. She did cost him his job, but she was strong. She would not be bullied by Europe, and she did not want open borders.
            </p>

            <p style={body()}>
              That is the level of frustration on display. People are so desperate for leadership with courage that they will praise a prime minister who destroyed their livelihood, simply because she stood for something and did not apologise for it.
            </p>

            <p style={{ ...lead(), marginBottom: 0 }}>
              Over 100,000 people marched through London on Saturday. They were not asking for the impossible. They were asking for what they were promised: control over borders, functioning public services, and a government that represents them instead of dismissing them. If Westminster cannot deliver that, or even take the question seriously, then more people will march. And eventually, someone will offer them answers that are far uglier than anything seen on Saturday.
            </p>
          </div>
        </article>
      </div>

      {/* Tablet/phone: collapse to single column so multi-column doesn't
        * become microscopic */}
      <style>{`
        @media (max-width: 720px) {
          .article-cols { column-count: 1 !important; column-rule: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Components & helpers ──────────────────────────────────────────────────

// Two-layer wavy photo card: image + caption stay sharp, only the
// outer border ripples via the SVG filter. break-inside-avoid keeps
// the card whole when the CSS column flow would otherwise split it.
function PhotoCard({ caption, tilt }: { caption: string; tilt: number }) {
  return (
    <div
      style={{
        position: 'relative',
        margin: '24px 0',
        transform: `rotate(${tilt}deg)`,
        breakInside: 'avoid',
      }}
    >
      {/* Wavy border layer — absolute, behind, only this gets the filter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-3px',
          background: CREAM,
          border: `3px solid ${INK}`,
          boxShadow: '3px 3px 0 rgba(20,16,13,0.18)',
          filter: 'url(#wavy-edge)',
        }}
      />
      {/* Sharp content */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden' }}>
          <Image
            src={PHOTO_SRC}
            alt={caption}
            fill
            sizes="(max-width: 720px) 100vw, 480px"
            className="object-cover"
          />
        </div>
        <p
          style={{
            margin: 0,
            padding: '8px 12px',
            background: CREAM,
            fontSize: '12px',
            fontStyle: 'italic',
            lineHeight: 1.4,
            borderTop: `1px solid ${INK_HAIRLINE}`,
          }}
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      </div>
    </div>
  );
}

function kicker(color: string): React.CSSProperties {
  return {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color,
  };
}

function lead(): React.CSSProperties {
  return { fontSize: '17px', fontWeight: 500, lineHeight: 1.7, margin: '0 0 18px', color: INK };
}

function body(): React.CSSProperties {
  return { fontSize: '15px', lineHeight: 1.7, margin: '0 0 16px', color: INK };
}

function h2(): React.CSSProperties {
  return {
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    margin: '28px 0 14px',
    transform: 'rotate(-0.2deg)',
    breakInside: 'avoid',
    breakAfter: 'avoid',
  };
}
