import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
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
const PER_PAGE = 25;
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
// The address of a case: its page of 25 within its period when that is not the first.
function caseHref(c: StandardsCase): string {
  const inGroup = STANDARDS.cases.filter((x) => x.outcome === c.outcome && x.period === c.period);
  const page = Math.floor(inGroup.indexOf(c) / PER_PAGE) + 1;
  return page > 1 ? `/standards?${OUTCOME_KEY[c.outcome]}-${c.period}=${page}#${caseId(c)}` : `#${caseId(c)}`;
}
function CaseItem({ c }: { c: StandardsCase }) {
  return (
    <li id={caseId(c)}>
      <div style={{ fontWeight: 'bold' }}><ListedName c={c} /></div>
      <a href={c.documentUrl} rel="noopener" style={tap}>{readLabel(c)}</a>
    </li>
  );
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function StandardsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const members = membersWithCases();
  return (
    <OpenGovShell pageStamp="Standards">
      <style>{`
        .sc-member { display: none; border: 2px solid ${INK}; padding: 12px 14px; margin: 0 0 24px; }
        .sc-member:target { display: block; }
        .sc-list { list-style: none; margin: 0; padding: 0; }
        .sc-list li { padding: 10px 0; border-bottom: 1px solid rgba(20,16,13,0.25); font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; }
        .sc-pager { display: flex; gap: 16px; flex-wrap: wrap; margin: 8px 0 12px; }
      `}</style>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', minHeight: '44px' }} />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 16px', color: INK }}>
        MPs&rsquo; standards cases: Commissioner decisions
      </h1>
      <div style={{ color: INK }}>
        <p style={p}>
          These are decisions published by the Parliamentary Commissioner for Standards on allegations about Members: those rectified, those not
          upheld and those reported to the Committee on Standards. Names are as the Commissioner lists them. Each links to the decision as published.
        </p>
        <p style={p}>
          Source: <a href={STANDARDS.sourceUrl} rel="noopener" style={link}>Allegations and complaints against MPs</a>, Parliamentary Commissioner
          for Standards, UK Parliament. Lists collected on 7 November 2026.
        </p>


        {OUTCOMES.map((outcome, si) => {
          const groups = byPeriodNewestFirst(STANDARDS.cases.filter((c) => c.outcome === outcome));
          return (
            <section key={outcome} aria-labelledby={`sc-${OUTCOME_KEY[outcome]}`}>
              <h2 id={`sc-${OUTCOME_KEY[outcome]}`} style={h2}>{SECTION_TITLE[outcome]}</h2>
              {outcome === 'Rectified' && (
                <p style={p}>
                  The Commissioner may conclude a case by rectification. Under <a href={SO_150} rel="noopener" style={link}>Standing Order No. 150</a>,
                  paragraph (4)(a), that applies &ldquo;in any case where the Member concerned has agreed that he has failed to register or declare an
                  interest, if it is the Commissioner&apos;s opinion that the interest involved is minor, or the failure was inadvertent, and the Member
                  concerned has taken such action by way of rectification as the Commissioner may have required&rdquo;.
                </p>
              )}
              {outcome === 'Not upheld' && <p style={p}>In each case listed, the Commissioner did not uphold the allegation.</p>}
              {outcome === 'Reported to the Committee on Standards' && (
                <p style={p}>In each case listed, the Commissioner reported the case to the Committee on Standards. The Committee&apos;s report sets out its findings.</p>
              )}
              <p style={{ ...p, margin: '0 0 8px' }}><a href={OUTCOME_PAGE[outcome]} rel="noopener" style={tap}>The Commissioner&apos;s list</a></p>
              {groups.map((g, gi) => {
                const key = `${OUTCOME_KEY[outcome]}-${g.period}`;
                const pages = Math.max(1, Math.ceil(g.items.length / PER_PAGE));
                const raw = Number(sp[key]);
                const page = Number.isInteger(raw) && raw >= 1 && raw <= pages ? raw : 1;
                const shown = g.items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
                const pageHref = (n: number) => `/standards?${key}=${n}#${key}`;
                return (
                  <details key={g.period} id={key} className="pa-fold" open={(si === 0 && gi === 0) || page > 1}>
                    <summary>{g.period}: {g.items.length} {g.items.length === 1 ? 'case' : 'cases'}</summary>
                    <ul className="sc-list">{shown.map((c) => <CaseItem key={caseId(c)} c={c} />)}</ul>
                    {pages > 1 && (
                      <nav className="sc-pager" aria-label={`${SECTION_TITLE[outcome]}, ${g.period}, pages`}>
                        {page > 1 && <Link href={pageHref(page - 1)} prefetch={false} style={tap}>Previous</Link>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '15px' }}>Page {page} of {pages}</span>
                        {page < pages && <Link href={pageHref(page + 1)} prefetch={false} style={tap}>Next</Link>}
                      </nav>
                    )}
                  </details>
                );
              })}
            </section>
          );
        })}
        {/* One block per matched member, shown only when the address names it (/standards#nigel-farage), with or without JavaScript.
            It points to the member's cases above rather than repeating them, and sits at the end so that hiding it again moves nothing above it; a browser opens the fold a case sits in when it is
            linked to, with or without JavaScript. */}
        {members.map((m) => (
          <section key={m.slug} id={m.slug} className="sc-member" aria-label={`Cases naming ${m.listed}`}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px' }}>{m.listed}</h2>
            <ul className="sc-list">{m.cases.map((c) => <li key={caseId(c)}><a href={caseHref(c)} style={tap}>{SECTION_TITLE[c.outcome]}, {c.period}</a></li>)}</ul>
          </section>
        ))}
      </div>
    </OpenGovShell>
  );
}
