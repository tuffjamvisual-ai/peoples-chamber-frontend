import type { Metadata } from 'next'
import Link from 'next/link'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';
import { balanceColumns, TWO_COLUMN_CSS } from '@/lib/balance-columns'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with opengovt: corrections to the record, data and press enquiries, and general questions.',
  alternates: { canonical: '/contact' },
}

const INK = '#14100d'

const EMAIL = 'contact@opengovt.uk'

// Each entry opens an email with its subject, or (with href) goes to a page on the site.
const CHANNELS: { label: string; body: string; subject: string; href?: string }[] = [
  {
    label: 'Corrections',
    body: 'Spotted something wrong in an MP record, a bill, a vote or a department page? Tell us what and where, and we will check it against the source and fix it.',
    subject: 'Correction',
  },
  {
    label: 'Data and reuse',
    body: 'Questions about where a figure comes from, or about using the data in your own research or reporting.',
    subject: 'Data enquiry',
  },
  {
    label: 'Press',
    body: 'Media enquiries, interviews and background for stories.',
    subject: 'Press enquiry',
  },
  {
    label: 'Commission research',
    body: 'Need a specific question answered from the public record? Commission a sourced research report.',
    subject: 'Commission research',
    href: '/commission',
  },
  {
    label: 'General',
    body: 'Anything else: feedback on the site, a feature you would like to see, or just to say hello.',
    subject: 'Hello',
  },
]

export default function ContactPage() {
  return (
    <OpenGovShell pageStamp="Contact">
      <style>{`
        .c-card h2 { transition: color 150ms ease; }
        .c-card:hover h2 { color: #7a1612; text-decoration: underline; text-underline-offset: 3px; }
      `}</style>

      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Get in Touch
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          opengovt is built in the open. Whether you have found an error in the record, want to use the data, or simply have a question, we want to hear from you. Write to us at the address below and we will read it.
        </p>
        <p style={{ marginTop: '18px' }}>
          <a
            href={`mailto:${EMAIL}`}
            className="no-hover-scale"
            style={{ fontSize: 'clamp(20px, 2.6vw, 30px)', fontWeight: 'bold', color: '#7a1612', textDecoration: 'none', letterSpacing: '0.01em' }}
          >
            {EMAIL}
          </a>
        </p>
      </header>

      {/* Two balanced columns, no boxes. */}
      <style>{TWO_COLUMN_CSS}</style>
      <div className="og-two">
        {balanceColumns(CHANNELS, (c) => 3 + c.body.length / 45).map((col, ci) => (
          <div key={ci}>
            {col.map((c) => (
              <a
                key={c.subject}
                href={c.href ?? `mailto:${EMAIL}?subject=${encodeURIComponent(c.subject)}`}
                className="c-card no-hover-scale"
                style={{ display: 'block', padding: '14px 0 18px', borderTop: '1px solid rgba(20,16,13,0.25)', color: INK, textDecoration: 'none' }}
              >
                <h2 style={{ fontSize: '21px', fontWeight: 'bold', marginBottom: '6px', lineHeight: 1.15 }}>
                  {c.label} <span >→</span>
                </h2>
                <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{c.body}</p>
              </a>
            ))}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '4%' }}>
        Looking for help or answers to common questions? Visit our{' '}
        <Link href="/support" className="no-hover-scale" style={{ color: '#7a1612', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Support page
        </Link>.
      </p>

      <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '5%' }}>
        We aim to reply within a few working days.
      </p>
    </OpenGovShell>
  )
}
