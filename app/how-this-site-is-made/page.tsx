import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const revalidate = 86400;

const INK = '#14100d';
const MONO = "'Special Elite', monospace";

export const metadata: Metadata = {
  title: 'How this site is made',
  // AI-tools mention temporarily removed pending a disclosure decision. Original:
  //   'How opengovt is written, edited and fact-checked: AI tools for research and drafting, with primary-source verification against Hansard, the Register of Members’ Financial Interests, Companies House, the Electoral Commission and government statistics.',
  description:
    'How opengovt is written, edited and fact-checked: primary-source verification against Hansard, the Register of Members’ Financial Interests, Companies House, the Electoral Commission and government statistics.',
  alternates: { canonical: '/how-this-site-is-made' },
};

export default function HowThisSiteIsMadePage() {
  return (
    <OpenGovShell pageStamp="About">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <article style={{ maxWidth: '760px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '20px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          How this site is made
        </h1>
        {/* AI-tools sentence temporarily removed pending a disclosure decision. Original:
          opengovt is written and edited by a small team using AI tools for research, drafting and data processing, alongside primary-source verification against Hansard, the Register of Members&rsquo; Financial Interests, Companies House, the Electoral Commission and government statistics. */}
        <p style={{ fontFamily: MONO, fontSize: '16px', lineHeight: 1.8, color: INK, marginBottom: '18px' }}>
          opengovt is written and edited by a small team, with primary-source verification against Hansard, the Register of Members&rsquo; Financial Interests, Companies House, the Electoral Commission and government statistics.
        </p>
        <p style={{ fontFamily: MONO, fontSize: '16px', lineHeight: 1.8, color: INK, marginBottom: '18px' }}>
          Every factual claim is checked against a named public record before publication. Mistakes happen. When they&rsquo;re found, they&rsquo;re corrected and the correction is logged.
        </p>
        <p style={{ fontFamily: MONO, fontSize: '16px', lineHeight: 1.8, color: INK, margin: 0 }}>
          Contact: <a href="mailto:contact@opengovt.uk" style={{ color: '#6b2417', textDecoration: 'underline' }}>contact@opengovt.uk</a>
        </p>
      </article>
    </OpenGovShell>
  );
}
