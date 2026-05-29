import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import DossierShell from './components/DossierShell';

// The newspaper front page is the landing page. DossierShell renders the masthead + nav
// + footer with no folder; HomeFront fills the body with a lead (-> /bills) and three
// front-page stories below it: expenses (-> /expenses), a People's Poll result (-> /polls)
// and Whitehall (-> /departments). The expenses + poll figures are fetched live.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The People's Chamber",
  description:
    'UK government in public view: every MP, bill, law and department, with the public’s verdict, on one front page.',
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

type Poll = { yesPct: number; total: number };

async function getData(): Promise<{ poll: Poll | null }> {
  const { data: water } = await supabase
    .from('polls')
    .select('vote_count_yes, vote_count_no')
    .ilike('question', '%water companies%')
    .limit(1)
    .maybeSingle();

  let poll: Poll | null = null;
  if (water) {
    const yes = Number(water.vote_count_yes) || 0;
    const no = Number(water.vote_count_no) || 0;
    if (yes + no > 0) poll = { yesPct: Math.round((yes / (yes + no)) * 100), total: yes + no };
  }

  return { poll };
}

export default async function HomePage() {
  const { poll } = await getData();

  const HomeFront = (
    <>
      {/* Lead story — fills the large top content area. */}
      <a href="/bills" className="no-hover-scale" style={{ ...card, top: '24%', left: '6%', width: '88%', height: '39%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 6%' }}>
        <div style={{ ...kicker, fontSize: '1.35cqw', letterSpacing: '0.22em', opacity: 0.65, marginBottom: '2.5%' }}>From the House this week</div>
        <div style={{ ...headline, fontSize: '3.7cqw', lineHeight: 1.0, textTransform: 'uppercase', marginBottom: '3%' }}>Every bill, every vote, every law.</div>
        <div style={{ fontSize: '1.65cqw', lineHeight: 1.5, maxWidth: '34ch', opacity: 0.85 }}>Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.</div>
        <div style={{ ...kicker, fontSize: '1.45cqw', letterSpacing: '0.04em', marginTop: '3.5%' }}>Read the bills →</div>
      </a>

      {/* Expenses story (left) — featured image on top, headline under. */}
      <a href="/expenses" className="no-hover-scale" style={{ ...card, top: '75%', left: '6%', width: '27%', height: '15%', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', border: '1px solid #14100d', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', marginBottom: '4%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
        </div>
        <div style={{ ...headline, fontSize: '2.05cqw', lineHeight: 1.04, marginBottom: '3%' }}>The biggest expenses bill</div>
        <div style={{ ...ctaStyle, marginTop: 0 }}>See the full top ten →</div>
      </a>

      {/* People's Poll story (centre) — the result is the picture. */}
      <a href="/polls" className="no-hover-scale" style={colStyle('37%', '27%')}>
        <div style={eyebrow}>The People’s verdict</div>
        <div style={headlineRow}>
          <div style={{ flex: '0 0 34%', background: CREAM, border: `1px solid rgba(20,16,13,0.3)`, padding: '6% 2%', textAlign: 'center', transform: 'rotate(-1.5deg)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '2.6cqw', lineHeight: 1, color: '#6b2417' }}>{poll ? `${poll.yesPct}%` : '—'}</div>
            <div style={{ ...kicker, fontSize: '0.8cqw', letterSpacing: '0.1em', marginTop: '6%' }}>say yes</div>
          </div>
          <div style={{ ...headline, flex: '1 1 auto', fontSize: '1.65cqw', lineHeight: 1.05 }}>Should water be taken into public ownership?</div>
        </div>
        <div style={blurbStyle}>{poll ? `${poll.total.toLocaleString()} people have voted. Where do you stand?` : 'Vote on the day’s biggest questions.'}</div>
        <div style={ctaStyle}>Cast your vote →</div>
      </a>

      {/* Whitehall story (right) — featured image on top, headline under. */}
      <a href="/departments" className="no-hover-scale" style={{ ...card, top: '75%', left: '68%', width: '26%', height: '15%', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', border: '1px solid #14100d', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', marginBottom: '4%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/whitehall.webp" alt="Who runs Whitehall" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
        </div>
        <div style={{ ...headline, fontSize: '2.05cqw', lineHeight: 1.04, marginBottom: '3%' }}>Who runs Whitehall</div>
        <div style={{ ...ctaStyle, marginTop: 0 }}>See the departments →</div>
      </a>
    </>
  );

  return <DossierShell overlay={HomeFront} />;
}
