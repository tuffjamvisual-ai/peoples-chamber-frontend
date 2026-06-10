// Editorial article renderer. Reads from lib/editorials/index.ts and
// dispatches each block by type. Uses DossierShell to match the rest
// of the site's editorial chrome (cream paper + Special Elite body
// + EB Garamond display + accent-red).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import { editorials } from '@/lib/editorials';
import type { Block, EditorialEntry } from '@/lib/editorials/types';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = editorials[slug];
  if (!piece) return { title: 'Editorial' };
  return {
    title: `${piece.headline} | The People's Chamber`,
    description: piece.standfirst.slice(0, 200),
    alternates: { canonical: `/editorials/${slug}` },
  };
}

export default async function EditorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = editorials[slug] as EditorialEntry | undefined;
  if (!piece) notFound();

  const publishedDate = new Date(piece.publishedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <DossierShell>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      {piece.heroImage && (
        <figure style={{ position: 'relative', margin: '0 0 28px', maxWidth: '100%' }}>
          {/* Hand-drawn SVG ink border filter — shared with the rest of the site. */}
          <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
            <defs>
              <filter id="handDrawnEdgeEditorial" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="5" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={piece.heroImage}
            alt={piece.heroAlt || piece.headline}
            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: '3px solid #14100d',
              filter: 'url(#handDrawnEdgeEditorial)',
              pointerEvents: 'none',
            }}
          />
        </figure>
      )}

      <div style={{ fontFamily: '"Special Elite", monospace', width: '100%' }}>
      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
        {piece.kicker && (
          <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '14px', color: ACCENT, fontFamily: '"Special Elite", monospace', fontWeight: 'bold' }}>
            {piece.kicker}
          </p>
        )}
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '20px' }}>
          {piece.headline}
        </h1>
        <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(17px, 1.6vw, 22px)', lineHeight: 1.5, fontStyle: 'italic', color: INK_SOFT }}>
          {piece.standfirst}
        </p>
        <div style={{ marginTop: '20px', fontSize: '12px', color: INK_SOFT, fontFamily: '"Special Elite", monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          By {piece.authorByline} · {publishedDate}
        </div>
      </header>

      <article style={{ fontFamily: '"Special Elite", monospace', fontSize: '16px', lineHeight: 1.75, color: INK }}>
        {piece.body.map((block, i) => renderBlock(block, i))}
      </article>

      <footer style={{ clear: 'both', marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${HAIRLINE}`, fontSize: '12px', color: INK_SOFT, fontFamily: '"Special Elite", monospace' }}>
        Published by The People&rsquo;s Chamber on {publishedDate}.
      </footer>
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}

function renderBlock(block: Block, i: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={i} style={{ marginBottom: '20px' }}>{block.text}</p>
      );
    case 'heading': {
      if (block.level === 2) {
        return (
          <h2 key={i} style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 'bold', letterSpacing: '-0.01em', marginTop: '36px', marginBottom: '16px', borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '8px' }}>
            {block.text}
          </h2>
        );
      }
      // Level 3. When a portrait is present, float a 60%-scale polaroid
      // (260px profile photo -> 156px here) to the left so the name, bio
      // line and opening paragraphs wrap to its right and then beneath.
      const h3 = (
        <h3 key={`${i}-h`} style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 'bold', marginTop: block.photo ? '4px' : '28px', marginBottom: '12px' }}>
          {block.text}
        </h3>
      );
      if (!block.photo) return h3;
      const frameInner = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.photo} alt={block.photoAlt || block.text} width={156} height={156} style={{ display: 'block', width: '156px', height: '156px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paperclip.png" alt="" aria-hidden style={{ position: 'absolute', top: '-18px', right: '-3px', width: '39px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
        </>
      );
      const frameStyle: React.CSSProperties = {
        float: 'left', clear: 'left', margin: '4px 28px 10px 0',
        position: 'relative', background: '#ebe5d8', padding: '7px 7px 29px 7px',
        transform: 'rotate(-3deg)', boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
        filter: 'contrast(1.05) brightness(0.98)',
      };
      const photoNode = block.photoHref ? (
        <Link key={`${i}-p`} href={block.photoHref} style={{ ...frameStyle, display: 'block' }} className="no-hover-scale">{frameInner}</Link>
      ) : (
        <div key={`${i}-p`} style={frameStyle}>{frameInner}</div>
      );
      return [photoNode, h3];
    }
    case 'bioLine':
      return (
        <p key={i} style={{ fontFamily: '"Special Elite", monospace', fontSize: '13px', color: ACCENT, fontWeight: 'bold', letterSpacing: '0.02em', lineHeight: 1.5, marginTop: '-6px', marginBottom: '18px' }}>
          {block.text}
        </p>
      );
    case 'pullQuote':
      return (
        <blockquote key={i} style={{ borderLeft: `4px solid ${ACCENT}`, margin: '28px 0', padding: '8px 0 8px 22px', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(20px, 2.2vw, 26px)', fontStyle: 'italic', lineHeight: 1.45, color: INK }}>
          {block.text}
        </blockquote>
      );
    case 'councilEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px' }}>
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>
              {block.rank}
            </span>
            <h3 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.councilSlug ? (
                <Link href={`/councils/${block.councilSlug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : (
                block.name
              )}
            </h3>
          </div>
          <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '13px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>
            {block.topLine}
          </p>
          {block.paragraphs.map((para, j) => (
            <p key={j} style={{ marginBottom: '18px' }}>{para}</p>
          ))}
          <p style={{ marginTop: '18px', padding: '10px 14px', background: CREAM, borderLeft: `3px solid ${ACCENT}`, fontFamily: '"Special Elite", monospace', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    case 'mpEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>
              {block.rank}
            </span>
            <h3 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.memberId ? (
                <Link href={`/mps/${block.memberId}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : (
                block.name
              )}
            </h3>
            {block.party && (
              <span style={{ fontFamily: '"Special Elite", monospace', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, padding: '3px 8px', border: `1px solid ${HAIRLINE}` }}>{block.party}</span>
            )}
          </div>
          <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '13px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>
            {block.topLine}
          </p>
          {block.paragraphs.map((para, j) => (
            <p key={j} style={{ marginBottom: '18px' }}>{para}</p>
          ))}
          <p style={{ marginTop: '18px', padding: '10px 14px', background: CREAM, borderLeft: `3px solid ${ACCENT}`, fontFamily: '"Special Elite", monospace', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    default:
      return null;
  }
}
