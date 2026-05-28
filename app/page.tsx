import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import DossierShell from './components/DossierShell';

// The newspaper front page is the landing page. DossierShell renders the masthead + nav
// + footer with no folder; HomeFront fills the (otherwise blank) newspaper body with
// %-positioned section cards that sit over the painted feature areas. Temporary copy —
// to be repopulated with live content later.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The People's Chamber",
  description:
    'UK government in public view: every MP, bill, law and department, with the public’s verdict, on one front page.',
  alternates: { canonical: '/' },
};

const INK = '#14100d';

const card: CSSProperties = {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  color: INK,
  textDecoration: 'none',
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const kicker: CSSProperties = {
  fontFamily: 'Special Elite, monospace',
  textTransform: 'uppercase',
};

const COLUMNS = [
  {
    href: '/mps',
    eyebrow: 'The members',
    head: 'Your MPs',
    body: 'Every MP’s voting record, expenses and interests, with the public’s verdict alongside.',
    cta: 'Browse MPs →',
    left: '6%',
    width: '27%',
  },
  {
    href: '/polls',
    eyebrow: 'Have your say',
    head: 'People’s Polls',
    body: 'Vote on the issues of the day and compare your view with how Westminster actually voted.',
    cta: 'Cast your vote →',
    left: '37%',
    width: '27%',
  },
  {
    href: '/departments',
    eyebrow: 'Whitehall',
    head: 'The Departments',
    body: 'Who runs each department, what they spend, and an honest read on how they are doing.',
    cta: 'See departments →',
    left: '68%',
    width: '26%',
  },
];

function HomeFront() {
  return (
    <>
      {/* Lead story — fills the large top content area. */}
      <a
        href="/bills"
        className="no-hover-scale"
        style={{
          ...card,
          top: '24%',
          left: '6%',
          width: '88%',
          height: '39%',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 6%',
        }}
      >
        <div style={{ ...kicker, fontSize: 'clamp(9px, 1.25vw, 17px)', letterSpacing: '0.22em', opacity: 0.65, marginBottom: '2.5%' }}>
          From the House this week
        </div>
        <div style={{ fontWeight: 'bold', fontSize: 'clamp(22px, 3.4vw, 50px)', lineHeight: 1.04, letterSpacing: '-0.01em', marginBottom: '3%' }}>
          Every bill, every vote, every law.
        </div>
        <div style={{ fontSize: 'clamp(11px, 1.55vw, 22px)', lineHeight: 1.5, maxWidth: '34ch', opacity: 0.85 }}>
          Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.
        </div>
        <div style={{ ...kicker, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.04em', marginTop: '3.5%' }}>
          Read the bills →
        </div>
      </a>

      {/* Three lower columns. */}
      {COLUMNS.map((c) => (
        <a
          key={c.href}
          href={c.href}
          className="no-hover-scale"
          style={{ ...card, top: '67%', left: c.left, width: c.width, height: '23%', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 1.5%' }}
        >
          <div>
            <div style={{ ...kicker, fontSize: 'clamp(8px, 1.05vw, 14px)', letterSpacing: '0.18em', opacity: 0.6, marginBottom: '3%' }}>
              {c.eyebrow}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 'clamp(14px, 1.95vw, 27px)', lineHeight: 1.05, marginBottom: '4%' }}>
              {c.head}
            </div>
            <div style={{ fontSize: 'clamp(9px, 1.2vw, 16px)', lineHeight: 1.45, opacity: 0.85 }}>{c.body}</div>
          </div>
          <div style={{ ...kicker, fontSize: 'clamp(9px, 1.15vw, 15px)', letterSpacing: '0.03em' }}>{c.cta}</div>
        </a>
      ))}
    </>
  );
}

export default function HomePage() {
  return <DossierShell overlay={<HomeFront />} />;
}
