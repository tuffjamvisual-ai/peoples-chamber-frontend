import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import DossierShell from './components/DossierShell';

// The newspaper front page is the landing page. DossierShell renders the masthead + nav
// + footer with no folder; HomeFront fills the newspaper body with %-positioned content:
// a lead (-> /bills), an expenses story (-> /expenses, with the top spender's photo), and
// two section columns (polls, departments).
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

type TopSpender = { name: string; total: number; photo: string | null };

async function getTopSpender(): Promise<TopSpender | null> {
  const { data: e } = await supabase
    .from('mp_expenses_summary')
    .select('member_id, total_spend')
    .eq('year', '24_25')
    .order('total_spend', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!e) return null;
  const { data: m } = await supabase
    .from('mps')
    .select('display_name, name, photo_url')
    .eq('member_id', e.member_id)
    .maybeSingle();
  return {
    name: m?.display_name || m?.name || 'an MP',
    total: Math.round(Number(e.total_spend) || 0),
    photo: m?.photo_url || null,
  };
}

function HomeFront({ top }: { top: TopSpender | null }) {
  return (
    <>
      {/* Lead story — fills the large top content area. */}
      <a
        href="/bills"
        className="no-hover-scale"
        style={{ ...card, top: '24%', left: '6%', width: '88%', height: '39%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 6%' }}
      >
        <div style={{ ...kicker, fontSize: '1.35cqw', letterSpacing: '0.22em', opacity: 0.65, marginBottom: '2.5%' }}>
          From the House this week
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '3.6cqw', lineHeight: 1.04, letterSpacing: '-0.01em', marginBottom: '3%' }}>
          Every bill, every vote, every law.
        </div>
        <div style={{ fontSize: '1.65cqw', lineHeight: 1.5, maxWidth: '34ch', opacity: 0.85 }}>
          Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.
        </div>
        <div style={{ ...kicker, fontSize: '1.45cqw', letterSpacing: '0.04em', marginTop: '3.5%' }}>
          Read the bills →
        </div>
      </a>

      {/* Expenses story — left column, with the top spender's photo. */}
      <a
        href="/expenses"
        className="no-hover-scale"
        style={{ ...card, top: '75%', left: '6%', width: '27%', height: '14%', alignItems: 'flex-start' }}
      >
        <div style={{ ...kicker, fontSize: '1.05cqw', letterSpacing: '0.18em', opacity: 0.6, marginBottom: '3%' }}>
          Follow the money
        </div>
        <div style={{ display: 'flex', gap: '6%', alignItems: 'flex-start', width: '100%', marginBottom: '3%' }}>
          {top?.photo && (
            <div style={{ flex: '0 0 34%', background: '#ebe5d8', padding: '3px 3px 6px', transform: 'rotate(-2deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.25)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={top.photo} alt={top.name} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', filter: 'contrast(1.05) sepia(0.05)' }} />
            </div>
          )}
          <div style={{ flex: '1 1 auto', fontWeight: 'bold', fontSize: '1.7cqw', lineHeight: 1.08 }}>
            The biggest expenses bill
          </div>
        </div>
        <div style={{ fontSize: '1.2cqw', lineHeight: 1.4, opacity: 0.85, marginBottom: '4%' }}>
          {top
            ? `${top.name} claimed £${top.total.toLocaleString()} in business costs in 2024 to 25, the most of any MP.`
            : 'See which MPs claimed the most in business costs.'}
        </div>
        <div style={{ ...kicker, fontSize: '1.2cqw', letterSpacing: '0.03em' }}>See the full top ten →</div>
      </a>

      {/* Two section columns (polls, departments). */}
      {COLUMNS.map((c) => (
        <a
          key={c.href}
          href={c.href}
          className="no-hover-scale"
          style={{ ...card, top: '75%', left: c.left, width: c.width, height: '14%', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 1.5%' }}
        >
          <div>
            <div style={{ ...kicker, fontSize: '1.15cqw', letterSpacing: '0.18em', opacity: 0.6, marginBottom: '3%' }}>{c.eyebrow}</div>
            <div style={{ fontWeight: 'bold', fontSize: '2.1cqw', lineHeight: 1.05, marginBottom: '4%' }}>{c.head}</div>
            <div style={{ fontSize: '1.3cqw', lineHeight: 1.45, opacity: 0.85 }}>{c.body}</div>
          </div>
          <div style={{ ...kicker, fontSize: '1.25cqw', letterSpacing: '0.03em' }}>{c.cta}</div>
        </a>
      ))}
    </>
  );
}

export default async function HomePage() {
  const top = await getTopSpender();
  return <DossierShell overlay={<HomeFront top={top} />} />;
}
