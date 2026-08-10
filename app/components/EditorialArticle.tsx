// Shared editorial article renderer. Used by both /editorials/[slug]
// (Investigations) and /briefings/[slug] (Briefings) — the only differences
// between the two are the page stamp and the back-link target, passed in.

import Link from 'next/link';
import OpenGovShell from './OpenGovShell';
import BackLink from './BackLink';
import ScrollToTopButton from './ScrollToTopButton';
import type { Block, EditorialEntry } from '@/lib/editorials/types';

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

export default function EditorialArticle({ piece, stamp, backHref }: { piece: EditorialEntry; stamp: string; backHref: string }) {
  return (
    <OpenGovShell pageStamp={stamp}>
      <BackLink fallbackHref={backHref} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

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
            style={{ position: 'absolute', inset: 0, border: '3px solid #14100d', filter: 'url(#handDrawnEdgeEditorial)', pointerEvents: 'none' }}
          />
        </figure>
      )}

      <div style={{ fontFamily: '"Special Elite", monospace', width: '100%' }}>
        <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
          {piece.kicker && (
            <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '14px', color: ACCENT, fontFamily: '"Special Elite", monospace', fontWeight: 'bold' }}>
              {piece.kicker}
            </p>
          )}
          <h1 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(24px, 3.4vw, 40px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: '20px' }}>
            {piece.headline}
          </h1>
          <div style={{ marginTop: '20px', fontSize: '15px', color: INK_SOFT, fontFamily: '"Special Elite", monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            By {piece.authorByline}
          </div>
          {stamp === 'Briefing' && piece.publishedAt && (
            <div style={{ marginTop: '8px', fontSize: '15px', color: INK_SOFT, fontFamily: '"Special Elite", monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {new Date(piece.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
          {piece.opinion && (
            <div style={{ marginTop: '20px', borderLeft: `4px solid ${ACCENT}`, background: 'rgba(107,36,23,0.06)', padding: '10px 14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>Commentary</span>
              <span style={{ display: 'block', fontSize: '15px', color: INK, marginTop: '4px', fontStyle: 'italic', lineHeight: 1.5 }}>
                This is an opinion piece. It reflects the author&rsquo;s view and is not one of our fact-checked investigations.
              </span>
            </div>
          )}
        </header>

        <article style={{ fontFamily: '"Special Elite", monospace', fontSize: '16px', lineHeight: 1.75, color: INK }}>
          {piece.body.map((block, i) => renderBlock(block, i))}
        </article>

      </div>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}

function renderBlock(block: Block, i: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <p key={i} style={{ marginBottom: '20px' }}>{block.text}</p>;
    case 'heading': {
      if (block.level === 2) {
        return (
          <h2 key={i} style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 'bold', letterSpacing: '0.01em', marginTop: '36px', marginBottom: '16px', borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '8px' }}>
            {block.text}
          </h2>
        );
      }
      const h3 = (
        <h3 key={`${i}-h`} style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 'bold', marginTop: block.photo ? '4px' : '28px', marginBottom: '12px' }}>
          {block.text}
        </h3>
      );
      if (!block.photo) return h3;
      const frameInner = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.photo} alt={block.photoAlt || block.text} width={156} height={156} style={{ display: 'block', width: '156px', height: '156px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paperclip.webp" alt="" aria-hidden style={{ position: 'absolute', top: '-18px', right: '-3px', width: '39px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
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
        <p key={i} style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', color: ACCENT, fontWeight: 'bold', letterSpacing: '0.02em', lineHeight: 1.5, marginTop: '-6px', marginBottom: '18px' }}>
          {block.text}
        </p>
      );
    case 'pullQuote':
      return (
        <blockquote key={i} style={{ borderLeft: `4px solid ${ACCENT}`, margin: '28px 0', padding: '8px 0 8px 22px', fontFamily: '"Special Elite", monospace', fontSize: 'clamp(20px, 2.2vw, 26px)', fontStyle: 'italic', lineHeight: 1.45, color: INK }}>
          {block.text}
        </blockquote>
      );
    case 'signature':
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={i} src={block.src} alt={block.alt || 'Signature'} style={{ display: 'block', width: 'clamp(120px, 22vw, 170px)', height: 'auto', marginTop: '28px' }} />
      );
    case 'cta':
      return (
        <p key={i} style={{ margin: '36px 0 8px', paddingTop: '22px', borderTop: `1px solid ${HAIRLINE}` }}>
          <Link href={block.href} style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(15px, 1.7vw, 19px)', fontWeight: 'bold', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '4px', letterSpacing: '0.02em' }}>
            {block.text} →
          </Link>
        </p>
      );
    case 'councilEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px' }}>
            <span style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>{block.rank}</span>
            <h3 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.councilSlug ? (
                <Link href={`/councils/${block.councilSlug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : block.name}
            </h3>
          </div>
          <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>{block.topLine}</p>
          {block.paragraphs.map((para, j) => (<p key={j} style={{ marginBottom: '18px' }}>{para}</p>))}
          <p style={{ marginTop: '18px', padding: '2px 0 2px 14px', borderLeft: `3px solid ${ACCENT}`, fontFamily: '"Special Elite", monospace', fontSize: '15px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    case 'mpEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>{block.rank}</span>
            <h3 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.memberId ? (
                <Link href={`/mps/${block.memberId}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : block.name}
            </h3>
            {block.party && (
              <span style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, padding: '3px 8px', border: `1px solid ${HAIRLINE}` }}>{block.party}</span>
            )}
          </div>
          <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>{block.topLine}</p>
          {block.paragraphs.map((para, j) => (<p key={j} style={{ marginBottom: '18px' }}>{para}</p>))}
          <p style={{ marginTop: '18px', padding: '2px 0 2px 14px', borderLeft: `3px solid ${ACCENT}`, fontFamily: '"Special Elite", monospace', fontSize: '15px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    default:
      return null;
  }
}
