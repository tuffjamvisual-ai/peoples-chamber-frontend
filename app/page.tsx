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

async function getData(): Promise<{ poll: Poll | null; deptPhoto: string | null }> {
  const [water, dept] = await Promise.all([
    supabase.from('polls').select('vote_count_yes, vote_count_no').ilike('question', '%water companies%').limit(1).maybeSingle(),
    supabase.from('mps').select('photo_url').eq('member_id', 4031).maybeSingle(),
  ]);

  let poll: Poll | null = null;
  if (water.data) {
    const yes = Number(water.data.vote_count_yes) || 0;
    const no = Number(water.data.vote_count_no) || 0;
    if (yes + no > 0) poll = { yesPct: Math.round((yes / (yes + no)) * 100), total: yes + no };
  }

  return { poll, deptPhoto: dept.data?.photo_url || null };
}

function Polaroid({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ flex: '0 0 34%', background: CREAM, padding: '0.5cqw 0.5cqw 1.7cqw', transform: 'rotate(-2deg)', boxShadow: '0 3px 7px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.03)', filter: 'contrast(1.05) brightness(0.98)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }} />
    </div>
  );
}

export default async function HomePage() {
  const { poll, deptPhoto } = await getData();

  const HomeFront = (
    <>
      {/* Lead story — fills the large top content area. */}
      <a href="/bills" className="no-hover-scale" style={{ ...card, top: '24%', left: '6%', width: '88%', height: '39%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 6%' }}>
        <div style={{ ...kicker, fontSize: '1.35cqw', letterSpacing: '0.22em', opacity: 0.65, marginBottom: '2.5%' }}>From the House this week</div>
        <div style={{ fontWeight: 'bold', fontSize: '3.6cqw', lineHeight: 1.04, letterSpacing: '-0.01em', marginBottom: '3%' }}>Every bill, every vote, every law.</div>
        <div style={{ fontSize: '1.65cqw', lineHeight: 1.5, maxWidth: '34ch', opacity: 0.85 }}>Follow what Parliament is doing right now, in plain English, and see how every decision lands with the people.</div>
        <div style={{ ...kicker, fontSize: '1.45cqw', letterSpacing: '0.04em', marginTop: '3.5%' }}>Read the bills →</div>
      </a>

      {/* Expenses story (left) — featured image on top, headline under. */}
      <a href="/expenses" className="no-hover-scale" style={{ ...card, top: '72%', left: '6%', width: '27%', height: '18%', alignItems: 'flex-start' }}>
        <div style={{ width: '76%', background: CREAM, padding: '0.4cqw', transform: 'rotate(-1.5deg)', boxShadow: '0 3px 8px rgba(0,0,0,0.3)', marginBottom: '4%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mp-expenses.webp" alt="The biggest MP expenses bill" style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '1.9cqw', lineHeight: 1.08, marginBottom: '3%' }}>The biggest expenses bill</div>
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
          <div style={{ flex: '1 1 auto', fontWeight: 'bold', fontSize: '1.5cqw', lineHeight: 1.12 }}>Should water be taken into public ownership?</div>
        </div>
        <div style={blurbStyle}>{poll ? `${poll.total.toLocaleString()} people have voted. Where do you stand?` : 'Vote on the day’s biggest questions.'}</div>
        <div style={ctaStyle}>Cast your vote →</div>
      </a>

      {/* Whitehall story (right). */}
      <a href="/departments" className="no-hover-scale" style={colStyle('68%', '26%')}>
        <div style={eyebrow}>Whitehall</div>
        <div style={headlineRow}>
          {deptPhoto && <Polaroid src={deptPhoto} alt="Rachel Reeves" />}
          <div style={{ flex: '1 1 auto', fontWeight: 'bold', fontSize: '1.7cqw', lineHeight: 1.08 }}>Who runs Whitehall</div>
        </div>
        <div style={blurbStyle}>Rachel Reeves and 23 other department heads, examined: who runs what, and how they are doing.</div>
        <div style={ctaStyle}>See the departments →</div>
      </a>
    </>
  );

  return <DossierShell overlay={HomeFront} />;
}
