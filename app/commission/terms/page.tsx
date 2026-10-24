import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

// Terms for commissioned research (owner's brief, 24 Oct 2026). Live but UNLINKED and noindex for the owner's
// review, like /commission.

export const metadata: Metadata = {
  title: 'Terms for commissioned research',
  description: 'The terms that apply when you commission research from Open Govt.',
  robots: { index: false, follow: false },
};

const INK = '#14100d';
const ACCENT = '#7a1612';

const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK };
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.8, margin: '0 0 10px', maxWidth: '720px' };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };

export default function CommissionTermsPage() {
  return (
    <OpenGovShell pageStamp="Commission">
      <BackLink
        fallbackHref="/commission"
        label="← Commission research"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '2%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Terms for commissioned research
        </h1>
      </header>

      <h2 style={h2}>Independence</h2>
      <p style={p}>We never change our findings to suit the client.</p>
      <p style={p}>We report what the evidence shows, including findings the client may not want.</p>

      <h2 style={h2}>What we do not take on</h2>
      <p style={p}>We may decline any commission.</p>
      <p style={p}>This includes work for election campaigns, lobbying material, and questions about private individuals who hold no public role.</p>

      <h2 style={h2}>Sources</h2>
      <p style={p}>Every figure and claim is sourced to a public record or a named source.</p>
      <p style={p}>All sources are listed in the report.</p>

      <h2 style={h2}>Quotes and payment</h2>
      <p style={p}>The quote fixes the price, the scope and the delivery date.</p>
      <p style={p}>Work starts once payment is received. Payment is by card through Stripe.</p>

      <h2 style={h2}>Changes</h2>
      <p style={p}>Research reports and Investigations include one round of amendments, to fix errors or clarify wording within the agreed scope.</p>
      <p style={p}>New questions need a new quote.</p>

      <h2 style={h2}>Delivery</h2>
      <p style={p}>We deliver by email, on or before the agreed date.</p>
      <p style={p}>If we will miss the date, we tell you as soon as we know.</p>

      <h2 style={h2}>Refunds</h2>
      <p style={p}>You get a full refund if you cancel before work starts.</p>
      <p style={p}>After that, refunds are by agreement.</p>

      <h2 style={h2}>Use and publication</h2>
      <p style={p}>The report is for the client&rsquo;s own use. Publishing it needs our written agreement.</p>
      <p style={p}>If Open Govt ever publishes commissioned research, it is labelled &ldquo;Commissioned by&rdquo; with the client&rsquo;s name.</p>

      <h2 style={h2}>Confidentiality</h2>
      <p style={p}>We keep your request and your identity confidential, unless the research is published by agreement.</p>

      <h2 style={h2}>Your data</h2>
      <p style={p}>We use your details only to handle your request.</p>
      <p style={p}>
        Our <Link href="/privacy" style={link}>privacy policy</Link> explains how we look after personal information.
      </p>

      <h2 style={h2}>Prices</h2>
      <p style={p}>If Open Govt is not VAT registered, no VAT is added.</p>

      <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '36px', opacity: 0.7 }}>
        Last updated: 24 October 2026
      </p>
    </OpenGovShell>
  );
}
