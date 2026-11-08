import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import CommissionForm from './CommissionForm';
import EnquiryLink from './EnquiryLink';
import { COMMISSION_PRICE, COMMISSION_QUOTE } from '@/lib/commission';
import { phoneUpTo } from '@/lib/breakpoints';

// Commission research (owner's brief, 24 Oct 2026; launched the same day): in the menu, the footer, the contact page
// and the sitemap. From 3 Nov 2026 (owner) a research enquiry: the client says what they want investigated and why,
// opengovt decides how to investigate, and research starts from £295 with a fixed quote for each enquiry.

export const metadata: Metadata = {
  title: 'Commission research',
  description: 'Commission an independent, fully sourced research report from opengovt.',
  alternates: { canonical: '/commission' },
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

// One service (owner's decision, 25 Oct 2026, report 54): commissioned research. Priced from £295 with a fixed quote
// for each enquiry from 3 Nov 2026 (owner), replacing the flat fee of £295.
const SERVICE = {
  name: 'Commissioned research',
  price: COMMISSION_PRICE,
  body: 'Your enquiry investigated from the public record: spending traced, decisions documented and responsibility named. We decide how to investigate, and you get one round of amendments.',
  delivery: 'Delivery date agreed in your quote',
};

// What every commission includes (owner, 3 Nov 2026).
const INCLUDED = ['The findings', 'Every source', 'The methodology', 'The underlying data, as a spreadsheet'];

const STEPS = [
  'Tell us your enquiry using the form below.',
  'We reply within two working days with a fixed quote, a delivery date, or a reason we cannot take it on.',
  'You pay securely by card through Stripe. Work starts once payment is received.',
  'We deliver your report by email.',
];

const h2: React.CSSProperties = { fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 'bold', margin: '0 0 14px', lineHeight: 1.15 };

export default function CommissionPage() {
  return (
    <OpenGovShell pageStamp="Commission">
      {/* The one service card: centred at a readable width on wide screens, the full width on phones. */}
      <style>{`
        .cm-service { max-width: 560px; margin: 0 auto; }
        .cm-centred { max-width: 560px; margin-left: auto; margin-right: auto; text-align: center; }
        @media ${phoneUpTo(767)} {
          .cm-service { max-width: none; }
          .cm-centred { max-width: none; text-align: left; }
        }
        .cm-acts { display: flex; justify-content: center; gap: 12px; margin: 12px auto 14px; max-width: 560px; }
        .cm-act { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 44px; padding: 8px 20px; border: 2px solid ${ACCENT}; font-size: 16px; font-weight: bold; line-height: 1.25; text-align: center; text-decoration: none; }
        .cm-act-go { background: ${ACCENT}; color: #f4e8d4 !important; }
        .cm-act-see { background: transparent; color: ${ACCENT} !important; }
        @media ${phoneUpTo(639.98)} {
          .cm-acts { flex-direction: column; }
          .cm-act { width: 100%; }
        }
        #enquiry, #enquiry-heading { scroll-margin-top: 12px; }
        #enquiry-heading:focus { outline: none; }
        #enquiry-heading:focus-visible { outline: 3px solid ${ACCENT}; outline-offset: 4px; }
      `}</style>

      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Commission research
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          opengovt investigates enquiries about public money, decisions and accountability from the public record. You
          tell us what you want investigated and why; we decide how to investigate it. Every figure is sourced, every
          finding can be checked, and the conclusions are ours, not the client&rsquo;s.
        </p>
      </header>

      <section aria-label="The service" style={{ marginBottom: '5%' }}>
        <p className="cm-centred" style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: 1.6, marginTop: 0, marginBottom: '4px' }}>{COMMISSION_PRICE}, with {COMMISSION_QUOTE}, paid once. No subscriptions, no extras.</p>
        {/* The two actions beside the price (owner, 8 Nov 2026, HP1b): side by side from 640px, stacked full width on
            phones, each at least 44px tall. Both are plain links, so they work with JavaScript off. */}
        <div className="cm-acts">
          <EnquiryLink className="cm-act cm-act-go no-hover-scale" />
          <Link href="/commission/sample" className="cm-act cm-act-see no-hover-scale">View a sample report</Link>
        </div>
        <p className="cm-centred" style={{ fontSize: '16px', lineHeight: 1.6, marginTop: 0, marginBottom: '18px' }}>Your fee covers research into any public record, including data not yet published on opengovt.</p>
        <div className="cm-service" style={{ borderTop: `3px solid ${INK}`, borderBottom: `1px solid ${HAIRLINE}`, padding: '16px 0 18px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ ...h2, marginBottom: '6px' }}>{SERVICE.name}</h2>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: ACCENT, margin: '0 0 10px' }}>{SERVICE.price}</p>
          <p style={{ fontSize: '15px', lineHeight: 1.65, margin: '0 0 10px' }}>{SERVICE.body}</p>
          <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>Every commission includes:</p>
          <ul style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px', paddingLeft: '1.4em' }}>
            {INCLUDED.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 'auto 0 0' }}>{SERVICE.delivery}</p>
        </div>
        <p className="cm-centred" style={{ fontSize: '15px', lineHeight: 1.6, marginTop: '16px' }}>Prices are fixed for the scope agreed in your quote.</p>
      </section>

      <section aria-labelledby="cm-how" style={{ marginBottom: '5%' }}>
        <h2 id="cm-how" style={h2}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: '1.6em', fontSize: '16px', lineHeight: 1.7, maxWidth: '720px' }}>
          {STEPS.map((s) => <li key={s} style={{ marginBottom: '6px' }}>{s}</li>)}
        </ol>
      </section>

      {/* The form, reached by "Start an enquiry" (#enquiry). Its heading takes focus after the jump with JavaScript on. */}
      <section id="enquiry" aria-labelledby="enquiry-heading" style={{ marginBottom: '4%' }}>
        <h2 id="enquiry-heading" tabIndex={-1} style={h2}>Start an enquiry</h2>
        <CommissionForm />
      </section>

      <p style={{ fontSize: '15px', lineHeight: 1.7 }}>
        <Link href="/commission/terms" className="no-hover-scale" style={{ color: ACCENT, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Read the terms for commissioned research
        </Link>
      </p>
    </OpenGovShell>
  );
}
