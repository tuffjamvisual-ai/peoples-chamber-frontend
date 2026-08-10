import type { Metadata } from 'next';
import ScrollToTopButton from '../components/ScrollToTopButton';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About opengovt, methodology, sources and editorial principles for our UK political transparency project.',
  alternates: { canonical: '/about' },
};

// Aligned 2026-07-11 to the clean, longer About text on the homepage (the old
// version carried self-referential tells the reporting-texture rule bans).
const paragraphs = [
  `Opengovt tracks how power is used in Britain.`,
  `We record how MPs vote, what they declare, what they earn outside Parliament and what they claim in expenses. We also compare what councils charge residents with what they provide in return.`,
  `The record is drawn from named public sources: Hansard for divisions and debates, the Register of Members' Financial Interests for declarations, House of Commons data for expenses, the Electoral Commission for donations, Companies House for directorships, and government statistics for departmental performance. Each figure links back to where it came from.`,
  `MP profiles use caricatures instead of official portraits because politics already comes with enough image management. We are not here to add to it.`,
  `Our journalists publish without bylines. The work should stand or fall on whether it is accurate. Every factual claim is checked against a public record before publication; when something is wrong and it is found, it is corrected and the correction is logged.`,
  `Readers can also record how they would have voted on the same Commons divisions MPs faced, then compare their choices with their own MP's.`,
  `Opengovt is independent. It is not part of Parliament, GOV.UK or any government body. It takes no government funding and carries no party label.`,
];

export default function AboutPage() {
  return (
    <OpenGovShell pageStamp="About">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          opengovt
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          About
        </h1>
      </header>

      <article style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ fontSize: '17px', lineHeight: 1.85, letterSpacing: '0.01em' }}>
          {paragraphs.map((para, idx) => {
            const tilt = idx % 4;
            const rot = tilt === 0 ? '0.08deg' : tilt === 1 ? '-0.12deg' : tilt === 2 ? '0.1deg' : '-0.08deg';
            return (
              <p key={idx} style={{ marginBottom: '20px', transform: `rotate(${rot})` }}>
                {para}
              </p>
            );
          })}
        </div>
      </article>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
