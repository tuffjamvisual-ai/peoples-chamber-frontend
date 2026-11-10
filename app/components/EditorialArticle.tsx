import { Fragment } from 'react';
// Shared editorial article renderer. Used by both /editorials/[slug]
// (Investigations) and /briefings/[slug] (Briefings) — the only differences
// between the two are the page stamp and the back-link target, passed in.

import Link from 'next/link';
import OpenGovShell from './OpenGovShell';
import BackLink from './BackLink';
import RelatedLinks from './RelatedLinks';
import ReadNext from './ReadNext';
import ArticleEndSignup from './ArticleEndSignup';
import type { ReadNextLink } from '@/lib/read-next';
import ExploreNext from './ExploreNext';
import RelatedLine from './RelatedLine';
import type { RelatedLink } from '@/lib/related-links';
import type { ReactNode } from 'react';
import KeyStat from './KeyStat';
import DataBlock from './DataBlock';
import type { Block, EditorialEntry } from '@/lib/editorials/types';
import ContentBadge from './ContentBadge';
import ShareButton from './ShareButton';
import { readingLabel } from '@/lib/reading-time';
import { PHONE } from '@/lib/breakpoints';
import { standfirstRepeatsOpening } from '@/lib/editorials/standfirst';
import { phonePlan, type Chain } from '@/lib/editorials/phone-folds';
import OpenHashTarget from './OpenHashTarget';
import { NoJsFold } from './NoJsPager';
import OnThisPage from './OnThisPage';

const INK = '#14100d';
const INK_SOFT = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

export default function EditorialArticle({ piece, stamp, backHref, basePath, readNext = [], related, banner, sourcesHref }: { banner?: ReactNode; sourcesHref?: string; related?: RelatedLink[]; piece: EditorialEntry; stamp: string; backHref: string; basePath: '/editorials' | '/briefings'; readNext?: ReadNextLink[] }) {
  const sources = piece.evidence?.recordsReviewed ?? [];
  return (
    <OpenGovShell pageStamp={stamp}>
      {banner}
      <BackLink fallbackHref={backHref} label="← Reports" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

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

      <div {...(basePath === '/editorials' ? { 'data-report-page': '' } : {})} style={{ fontFamily: 'var(--font-special-elite), monospace', width: '100%' }}>
        {/* Phones (UX2n, owner approved through Cowork, 10 Nov 2026): "View sources" straight under the headline, above the
            standfirst, which is unchanged. CSS order, the same with JavaScript off; from 640px up, as before. */}
        <style>{`@media ${PHONE} { .art-head { display: flex; flex-direction: column; } .art-head > .art-sf { order: 2; } .art-head > .art-after { order: 3; } .art-head > .art-actions { order: 1; margin-top: 0; } }`}</style>
        <header className="art-head" style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
          <ContentBadge kind={piece.kind} opinion={piece.opinion} />
          {piece.kicker && (
            <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '14px', color: ACCENT, fontFamily: 'var(--font-special-elite), monospace', fontWeight: 'bold' }}>
              {piece.kicker}
            </p>
          )}
          <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(24px, 3.4vw, 40px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: '20px' }}>
            {piece.headline}
          </h1>
          {/* The stored standfirst, at every width, unless it repeats the opening paragraph (owner, 5 Nov 2026). */}
          {piece.standfirst?.trim() && !standfirstRepeatsOpening(piece.standfirst, piece.body) && (
            <p className="art-sf" style={{ fontSize: '18px', lineHeight: 1.5, margin: '12px 0 0', color: INK }}>{piece.standfirst}</p>
          )}
          {/* The share control and, beside it, a link to the sources page (owner, 8 Nov 2026, SRC1), so a reader near the top
              can reach the sources without scrolling to the "Sources (N)" line further down, which stays. The link shows at
              every width and with JavaScript off; the share button keeps its own rule (phones, JavaScript on). */}
          {basePath === '/editorials' && (
            <div className="art-actions">
              <ShareButton title={piece.headline} />
              {sources.length > 0 && (
                <Link href={sourcesHref ?? `${basePath}/${piece.slug}/sources`} className="art-sources">View sources ({sources.length})</Link>
              )}
            </div>
          )}
          <div className="art-after" style={{ marginTop: '20px', fontSize: '15px', color: INK_SOFT, fontFamily: 'var(--font-special-elite), monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            By {piece.authorByline}
          </div>
          {piece.publishedAt && (
            <div className="art-after" style={{ marginTop: '8px', fontSize: '15px', color: INK_SOFT, fontFamily: 'var(--font-special-elite), monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {new Date(piece.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {readingLabel(piece)}
            </div>
          )}
          {piece.opinion && (
            <div className="art-after" style={{ marginTop: '20px', borderLeft: `4px solid ${ACCENT}`, background: 'rgba(107,36,23,0.06)', padding: '10px 14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>Commentary</span>
              <span style={{ display: 'block', fontSize: '15px', color: INK, marginTop: '4px', fontStyle: 'italic', lineHeight: 1.5 }}>
                This is an opinion piece. It reflects the author&rsquo;s view and is not one of our investigations, which are checked against the facts.
              </span>
            </div>
          )}
        </header>

        {/* Long articles on phones (owner, 9 Nov 2026; step 5, 10 Nov 2026): the article text stays whole and what is around it
            folds, with this list of the page's parts at the top. Under 640px only. */}
        <OnThisPage items={[
          { href: '#article-text', label: `The ${basePath === '/editorials' ? 'report' : 'briefing'}` },
          ...(sources.length > 0 ? [{ href: '#article-sources', label: `Sources (${sources.length})` }] : []),
          { href: '#art-more', label: 'Explore the data and more reports' },
        ]} />

        {/* data-article-body: the article text, never folded; the phone length check leaves it out (QA2d, owner, 9 Nov 2026). */}
        <article id="article-text" data-own-folds="" data-article-body="" style={{ scrollMarginTop: '24px',  fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', lineHeight: 1.75, color: INK }}>
          <ReportBody body={piece.body} />
          {/* Updates to a published piece, newest first, after the text and before the evidence (owner's approval, 29 Oct 2026). */}
          {piece.updateNote && piece.updateNote.length > 0 && (
            <section aria-labelledby="article-updates" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px' }}>
              <h2 id="article-updates" style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>Updates</h2>
              {piece.updateNote.map((u) => (
                <p key={u.date + u.text.slice(0, 20)} style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 10px', overflowWrap: 'break-word' }}>
                  Updated {new Date(u.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}: {u.text}
                </p>
              ))}
            </section>
          )}
          {/* One "Sources (N)" link to the article's sources page, never the full list (owner's standing instruction,
              2 Nov 2026, as eda0b417 did on 23 Oct). The "How this piece was checked" panel is on that page only. */}
          {sources.length > 0 && (
            <p id="article-sources" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px', fontSize: '15px' }}>
              <Link href={sourcesHref ?? `${basePath}/${piece.slug}/sources`} className="og-tap" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Sources ({sources.length})</Link>
            </p>
          )}
          {/* Newsletter sign-up after the sources, for readers who are not signed in (report 80). */}
          <ArticleEndSignup source={`article-end-${basePath.slice(1)}`} />
          {/* Read next once, after the sign up and before the evidence (owner's request, 25 Oct 2026; order 30 Oct 2026).
              Reports pass `related` instead (owner's brief, 3 Nov 2026): the compact one line Related block takes the
              Read next box's place, merged into it rather than added (app/components/RelatedLine.tsx). */}
          {related ? <RelatedLine links={related} /> : <ReadNext links={readNext} />}
        </article>

      </div>


      {/* What follows the article, folded on phones (step 5, 10 Nov 2026). */}
      <NoJsFold id="art-more" always label="Explore the data and more reports">
      {/* Reports with the compact Related line (owner's brief, 3 Nov 2026) do not repeat its MPs in a second "Related"
          section: one related block per page. Briefings keep this section. */}
      {!related && (
        <RelatedLinks
          variant="editorial"
          relatedDeptSlugs={piece.relatedDeptSlugs}
          relatedMemberIds={piece.relatedMemberIds}
          relatedBillIds={piece.relatedBillIds}
          relatedProgrammeSlugs={piece.relatedProgrammeSlugs}
        />
      )}

      <ExploreNext piece={piece} />
      </NoJsFold>

    </OpenGovShell>
  );
}

// Inline links in editorial text, written as [words](/internal/path). Only paths on this
// site (starting with "/") become links; anything else is left as plain text.
const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
function withLinks(text: string): React.ReactNode {
  if (!text.includes('](/')) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <Link key={at} href={m[2]} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: ACCENT }}>
        {m[1]}
      </Link>
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// The body as it reads from 640px up, with folds that only show under 640px on a long report (lib/editorials/phone-folds.ts).
function ReportBody({ body }: { body: Block[] }) {
  const plan = phonePlan(body);
  if (!plan) return <>{body.map((block, i) => <Fragment key={`b${i}`}>{renderBlock(block, i)}</Fragment>)}</>;
  let at = 0; // keeps each block's index as it is in the body
  const run = (blocks: Block[]) => blocks.map((block) => { const i = at++; return <Fragment key={`b${i}`}>{renderBlock(block, i)}</Fragment>; });
  const rest = (c: Chain): ReactNode => (
    <>
      {run(c.blocks)}
      {c.next && (
        <>
          <details className="rf-d rf-more"><summary>Continue reading</summary></details>
          <div className="rf-b">{rest(c.next)}</div>
        </>
      )}
    </>
  );
  return (
    <>
      <OpenHashTarget />
      {rest(plan.lead)}
      {plan.sections.map((s) => {
        const i = at++;
        return (
          <Fragment key={`s${i}`}>
            <div className="rf-h">{renderBlock(s.heading, i)}</div>
            <details className="rf-d" open={s.open}><summary>{s.heading.type === 'heading' ? s.heading.text : ''}</summary></details>
            <div className="rf-b">{rest(s.chain)}</div>
          </Fragment>
        );
      })}
    </>
  );
}

function renderBlock(block: Block, i: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <p key={i} style={{ marginBottom: '20px' }}>{withLinks(block.text)}</p>;
    case 'statBlock':
      return <KeyStat key={i} stat={block.stat} label={block.label} context={block.context} />;
    case 'dataBlock':
      return <DataBlock key={i} headlineFigure={block.headlineFigure} context={block.context} source={block.source} sourceDate={block.sourceDate} historicalComparison={block.historicalComparison} />;
    case 'heading': {
      if (block.level === 2) {
        return (
          <h2 key={i} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 'bold', letterSpacing: '0.01em', marginTop: '36px', marginBottom: '16px', borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '8px' }}>
            {block.text}
          </h2>
        );
      }
      const h3 = (
        <h3 key={`${i}-h`} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 'bold', marginTop: block.photo ? '4px' : '28px', marginBottom: '12px' }}>
          {block.text}
        </h3>
      );
      if (!block.photo) return h3;
      const frameInner = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.photo} alt={block.photoAlt || block.text} width={156} height={156} loading="lazy" decoding="async" style={{ display: 'block', width: '156px', height: '156px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }} />
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
        <p key={i} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: ACCENT, fontWeight: 'bold', letterSpacing: '0.02em', lineHeight: 1.5, marginTop: '-6px', marginBottom: '18px' }}>
          {block.text}
        </p>
      );
    case 'pullQuote':
      return (
        <blockquote key={i} style={{ borderLeft: `4px solid ${ACCENT}`, margin: '28px 0', padding: '8px 0 8px 22px', fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(20px, 2.2vw, 26px)', fontStyle: 'italic', lineHeight: 1.45, color: INK }}>
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
          <Link href={block.href} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(15px, 1.7vw, 19px)', fontWeight: 'bold', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '4px', letterSpacing: '0.02em' }}>
            {block.text}
          </Link>
        </p>
      );
    case 'councilEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>{block.rank}</span>
            <h3 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.councilSlug ? (
                <Link href={`/councils/${block.councilSlug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : block.name}
            </h3>
          </div>
          <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>{block.topLine}</p>
          {block.paragraphs.map((para, j) => (<p key={j} style={{ marginBottom: '18px' }}>{withLinks(para)}</p>))}
          <p style={{ marginTop: '18px', padding: '2px 0 2px 14px', borderLeft: `3px solid ${ACCENT}`, fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    case 'mpEntry':
      return (
        <section key={i} style={{ marginTop: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 'bold', color: ACCENT, lineHeight: 1 }}>{block.rank}</span>
            <h3 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
              {block.memberId ? (
                <Link href={`/mps/${block.memberId}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '4px' }}>{block.name}</Link>
              ) : block.name}
            </h3>
            {block.party && (
              <span style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, padding: '3px 8px', border: `1px solid ${HAIRLINE}` }}>{block.party}</span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: ACCENT, marginBottom: '18px', letterSpacing: '0.02em', fontWeight: 'bold' }}>{block.topLine}</p>
          {block.paragraphs.map((para, j) => (<p key={j} style={{ marginBottom: '18px' }}>{withLinks(para)}</p>))}
          <p style={{ marginTop: '18px', padding: '2px 0 2px 14px', borderLeft: `3px solid ${ACCENT}`, fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 'bold' }}>
            <span style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>Verdict:</span>
            {block.verdict}
          </p>
        </section>
      );
    default:
      return null;
  }
}
