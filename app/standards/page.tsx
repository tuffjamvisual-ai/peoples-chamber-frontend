import type { Metadata } from 'next';
import { SubFold } from '../components/PhoneFolds';
import { ShowAll } from '../components/NoJsPager';
import { phoneUpTo } from '@/lib/breakpoints';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import PageSources from '../components/PageSources';
import {
  STANDARDS, OUTCOMES, OUTCOME_PAGE, OUTCOME_KEY, byPeriodNewestFirst, profileHref, membersWithCases,
  type StandardsCase, type StandardsOutcome,
} from '@/lib/standards-cases';

// MPs' standards cases (owner, 7 Nov 2026, T1): the decisions the Parliamentary Commissioner for Standards publishes, in the
// Commissioner's own order and terms, grouped by the period as listed, newest first. Names exactly as printed, linked to our
// profile where matched (lib/standards-cases.ts). No totals by party and no rankings. Native details folds and server side
// pages of 25, so it needs no JavaScript.

export const metadata: Metadata = {
  title: { absolute: "MPs' standards cases: Commissioner decisions" },
  description: 'Decisions published by the Parliamentary Commissioner for Standards: allegations rectified, not upheld or reported to the Committee on Standards.',
  alternates: { canonical: '/standards' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const SO_150 = 'https://api.parliament.uk/standing-orders/orders/237';
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
const tap: React.CSSProperties = { ...link, display: 'inline-flex', alignItems: 'center', minHeight: '44px' };
const h2: React.CSSProperties = { fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 'bold', margin: '36px 0 8px' };
const p: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' };

const SECTION_TITLE: Record<StandardsOutcome, string> = {
  Rectified: 'Allegations rectified',
  'Not upheld': 'Allegations not upheld',
  'Reported to the Committee on Standards': 'Allegations reported to the Committee on Standards',
};
const readLabel = (c: StandardsCase) => (c.outcome === 'Reported to the Committee on Standards' ? 'Read the report' : 'Read the decision');

// The name exactly as listed, with each matched person in it linked to their profile.
function ListedName({ c }: { c: StandardsCase }) {
  const out: React.ReactNode[] = [];
  let rest = c.nameAsListed;
  c.people.forEach((person, i) => {
    const href = profileHref(person);
    const at = rest.indexOf(person.listed);
    if (!href || at < 0) return;
    if (at > 0) out.push(rest.slice(0, at));
    out.push(<Link key={i} href={href} prefetch={false} style={link}>{person.listed}</Link>);
    rest = rest.slice(at + person.listed.length);
  });
  out.push(rest);
  return <>{out}</>;
}

// Each case once on the page, with an id the member blocks point to (c-<its place in the list>).
const caseId = (c: StandardsCase) => `c-${STANDARDS.cases.indexOf(c) + 1}`;
// The address of a case: its place on this page (every group shows all its cases; F04, ENTRY 134, T2's f04-32-routes.md 13).
function caseHref(c: StandardsCase): string {
  return `#${caseId(c)}`;
}
function SectionFold({ fold, label, children }: { fold: boolean; label: string; children: React.ReactNode }) {
  return fold ? <SubFold label={label}>{children}</SubFold> : <>{children}</>;
}

function CaseItem({ c }: { c: StandardsCase }) {
  return (
    <li id={caseId(c)}>
      <div style={{ fontWeight: 'bold' }}><ListedName c={c} /></div>
      <a data-og-row-source="" href={c.documentUrl} rel="noopener" style={tap}>{readLabel(c)}</a>
    </li>
  );
}

// Static: no address query is read (F04 batch 2). The data is the bundled lib/data/standards-cases.json, so the page is rebuilt
// only on a deploy, which is when that file changes.
export const revalidate = false;

export default function StandardsPage() {
  const members = membersWithCases();
  return (
    <OpenGovShell>
      <style>{`
        .sc-member { display: none; border: 2px solid ${INK}; padding: 12px 14px; margin: 0 0 24px; }
        .sc-member:target { display: block; }
        .sc-list { list-style: none; margin: 0; padding: 0; }
        .sc-list li { padding: 10px 0; border-bottom: 1px solid rgba(20,16,13,0.25); font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; }
        .sc-pager { display: flex; gap: 16px; flex-wrap: wrap; margin: 8px 0 12px; }
      `}</style>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', minHeight: '44px' }} />
      {/* The page's header: its title and short introduction (a <header>, so the 70ch line rule for running text, D4, leaves
          the introduction at its width and the main action still starts on the first screen at 1280 x 720, A6). */}
      <header style={{ color: INK }}>
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 16px', color: INK }}>
        MPs&rsquo; standards cases: Commissioner decisions
      </h1>
        {/* Phones (UX3b, 10 Nov 2026): in a closed native fold, so the page's main action starts on the first screen (A6). From 640px up, as before. */}
        <SubFold label="About these cases and their source">
        <p style={p}>
          These are decisions published by the Parliamentary Commissioner for Standards on allegations about Members: those rectified, those not
          upheld and those reported to the Committee on Standards. Names are as the Commissioner lists them. Each links to the decision as published.
        </p>
        <p style={p}>
          Source: Allegations and complaints against MPs, Parliamentary Commissioner for Standards, UK Parliament (in Sources at
          the end of the page). Lists collected on 7 November 2026.
        </p>
        </SubFold>
      </header>
      <div style={{ color: INK }}>

        {OUTCOMES.map((outcome, si) => {
          const groups = byPeriodNewestFirst(STANDARDS.cases.filter((c) => c.outcome === outcome));
          return (
            <section key={outcome} data-main-action={si === 0 ? '' : undefined} aria-labelledby={`sc-${OUTCOME_KEY[outcome]}`}>
              {/* UX5 (T1-6, 11 Nov 2026): on phones the sections after the first are closed folds named by their headings,
                  which are hidden there; a link to a case or a period opens its fold. From 640px up, as before. */}
              <SectionFold fold={si > 0} label={SECTION_TITLE[outcome]}>
              <h2 id={`sc-${OUTCOME_KEY[outcome]}`} className={si > 0 ? 'sc-fold-h' : undefined} style={h2}>{SECTION_TITLE[outcome]}</h2>
              {outcome === 'Rectified' && (
                // Folded on phones (step 5, 10 Nov 2026: page length).
                <SubFold label="What rectification means">
                <p style={p}>
                  The Commissioner may conclude a case by rectification. Under Standing Order No. 150 (in Sources at the end of the page),
                  paragraph (4)(a), that applies &ldquo;in any case where the Member concerned has agreed that he has failed to register or declare an
                  interest, if it is the Commissioner&apos;s opinion that the interest involved is minor, or the failure was inadvertent, and the Member
                  concerned has taken such action by way of rectification as the Commissioner may have required&rdquo;.
                </p>
                </SubFold>
              )}
              {outcome === 'Not upheld' && <p style={p}>In each case listed, the Commissioner did not uphold the allegation.</p>}
              {outcome === 'Reported to the Committee on Standards' && (
                <p style={p}>In each case listed, the Commissioner reported the case to the Committee on Standards. The Committee&apos;s report sets out its findings.</p>
              )}
              {groups.map((g, gi) => {
                const key = `${OUTCOME_KEY[outcome]}-${g.period}`;
                // Every case in the group: the largest group has 25 (lib/data/standards-cases.json, 17 Nov 2026), and on phones
                // ShowAll shortens a long group. Old ?<group>=N addresses show this same page.
                const shown = g.items;
                return (
                  <details key={g.period} id={key} className="pa-fold" open={si === 0 && gi === 0}>
                    <summary>{g.period}: {g.items.length} {g.items.length === 1 ? 'case' : 'cases'}</summary>
                    {/* UX5 (T1-6, 11 Nov 2026): on phones the first five cases, then "Show all"; from 640px up, as before. */}
                    <ShowAll id={`sc-${key.replace(/[^a-zA-Z0-9-]+/g, '-')}`} count={shown.length} rows="> li">
                    <ul className="sc-list">{shown.map((c) => <CaseItem key={caseId(c)} c={c} />)}</ul>
                    </ShowAll>
                  </details>
                );
              })}
              </SectionFold>
            </section>
          );
        })}
        <style>{`@media ${phoneUpTo(767.98)} { .sc-fold-h { display: none; } }`}</style>
        {/* One block per matched member, shown only when the address names it (/standards#nigel-farage), with or without JavaScript.
            It points to the member's cases above rather than repeating them, and sits at the end so that hiding it again moves nothing above it; a browser opens the fold a case sits in when it is
            linked to, with or without JavaScript. */}
        {members.map((m) => (
          <section key={m.slug} id={m.slug} className="sc-member" aria-label={`Cases naming ${m.listed}`}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px' }}>{m.listed}</h2>
            <ul className="sc-list">{m.cases.map((c) => <li key={caseId(c)}><a data-og-row-source="" href={caseHref(c)} style={tap}>{SECTION_TITLE[c.outcome]}, {c.period}</a></li>)}</ul>
          </section>
        ))}
      </div>
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside. The Commissioner's pages and Standing Order No. 150 are
          in this one Sources fold; each decision and report stays on its row. */}
      <PageSources sources={[
        { label: 'Allegations and complaints against MPs, Parliamentary Commissioner for Standards', href: STANDARDS.sourceUrl },
        ...OUTCOMES.map((o) => ({ label: `The Commissioner\u2019s list: ${SECTION_TITLE[o]}`, href: OUTCOME_PAGE[o] })),
        { label: 'Standing Order No. 150 (Parliamentary Commissioner for Standards)', href: SO_150 },
      ]} />
    </OpenGovShell>
  );
}
