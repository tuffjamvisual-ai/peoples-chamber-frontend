// /transparency/ministerial-directions — every ministerial direction GOV.UK publishes.
// Reads ministerial_directions (migration 2026-10-20a), loaded by scripts/import-ministerial-directions.js.
// Grouped by year given (publication year where the letter shows no date), newest first.

import PageSources from '@/app/components/PageSources';
import NoJsPager, { NoJsFold } from '@/app/components/NoJsPager';
import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { departments } from '@/lib/departments';
import { fetchDirections, sortKey, dateLine, ministerLine, letterLinks, departmentsAtTheTime } from '@/lib/ministerial-directions';
import AboutThisData from '../../components/AboutThisData';

export const revalidate = 86400;

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export const metadata: Metadata = {
  title: { absolute: 'Ministerial directions: ministers overruling officials' },
  description: 'Every ministerial direction published on GOV.UK since 2015: what was directed, by which minister and department, when, and the letters themselves.',
  alternates: { canonical: '/transparency/ministerial-directions' },
};

const sameName = (a: string, b: string) => a.replace(/&/g, 'and').replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/&/g, 'and').replace(/\s+/g, ' ').trim().toLowerCase();
const linkStyle = { color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' } as const;

// The department as GOV.UK named it at the time, as text, with today's department page linked alongside
// (owner's decision, 20 Oct 2026). Where the name then is today's name, the name itself is the link.
// Each department page is linked once on the page, on its first direction (T1-5x, owner 10 Nov 2026); `linked` holds the
// slugs already linked, in the page's order.
function DepartmentLine({ d, deptName, linked }: { d: Awaited<ReturnType<typeof fetchDirections>>[number]; deptName: Map<string, string>; linked: Set<string> }) {
  const then = departmentsAtTheTime(d);
  const today = d.dept_slugs.map((s) => ({ slug: s, name: deptName.get(s) ?? s }));
  const firstTime = new Set(today.filter((x) => !linked.has(x.slug)).map((x) => x.slug));
  for (const x of today) linked.add(x.slug);
  const dept = (x: { slug: string; name: string }) => (firstTime.has(x.slug) ? <Link href={`/departments/${x.slug}`} style={linkStyle}>{x.name}</Link> : x.name);
  const unchanged = then.length === today.length && then.every((t) => today.some((x) => sameName(t, x.name)));
  return (
    <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
      {unchanged ? (
        <>Department: {today.map((x, i) => <span key={x.slug}>{i > 0 && ', '}{dept(x)}</span>)}</>
      ) : (
        <>
          Department at the time: {then.join(', ')}
          {today.length > 0 && <> · Today: {today.map((x, i) => <span key={x.slug}>{i > 0 && ', '}{dept(x)}</span>)}</>}
        </>
      )}
    </p>
  );
}

export default async function MinisterialDirectionsPage() {
  const all = await fetchDirections();
  const deptName = new Map(departments.map((d) => [d.slug, d.name]));
  const byYear = new Map<string, typeof all>();
  for (const d of all) {
    const y = sortKey(d).slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(d);
  }
  const years = [...byYear.keys()].sort().reverse();
  const first = years[years.length - 1];
  const linkedDepts = new Set<string>();

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '28px' }}>
        {/* T1-DECLUT item 2 (owner, 12 Nov 2026): no eyebrow line repeating the section under the folder stamp. */}
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.15 }}>
          When ministers overrule their officials on spending
        </h1>
        <p style={{ marginTop: '14px', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>
          {all.length} directions published, {first} to {years[0]}
        </p>
      </header>

      {years.map((y, yi) => (
        <section key={y} data-main-action={yi === 0 ? '' : undefined} style={{ marginBottom: '32px' }}>
          {/* Each year folds on phones with JavaScript on as well as off (MP2f, 9 Nov 2026), its year in the fold's label; the
              heading sits inside the fold, so from 640px up (no fold) the page looks as before. */}
          <NoJsFold id={`mf-${y}`} always tablets label={`${y}: ${byYear.get(y)!.length} ${byYear.get(y)!.length === 1 ? 'direction' : 'directions'}`} open={y === years[0]}>
          <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
            {y} · {byYear.get(y)!.length}
          </h2>
          <NoJsPager id={`md-${y}`} count={(byYear.get(y)!).length} rows="> li" size={15}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {byYear.get(y)!.map((d) => (
              <li key={d.slug} style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, padding: '12px 0' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, lineHeight: 1.45 }}>{d.subject}</p>
                <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
                  {dateLine(d)} · {ministerLine(d)}
                </p>
                <DepartmentLine d={d} deptName={deptName} linked={linkedDepts} />
                <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px' }}>
                  {letterLinks(d).map((l, i) => (
                    <span key={l.url}>{i > 0 && ' · '}<a data-og-row-source="" href={l.url} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.label}</a></span>
                  ))}
                  {' · '}<a data-og-row-source="" href={d.govuk_url} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>GOV.UK page</a>
                </p>
              </li>
            ))}
          </ol>
          </NoJsPager>
          </NoJsFold>
        </section>
      ))}

      {/* T1-5x S7 (owner, 10 Nov 2026): what a direction is and how the list is read, in one closed block after the list. */}
      <AboutThisData>
        <p>Each department has an accounting officer, usually its permanent secretary, who answers to Parliament for how its money is spent. When they object that spending would break the rules or not be value for money, the minister can tell them in writing to go ahead anyway. That instruction is a ministerial direction. Both letters go to the National Audit Office and the Public Accounts Committee, and the government publishes them.</p>
        <p>Source: GOV.UK, Ministerial directions (in Sources at the end of the page). Dates given and ministers are read from the letters, with the name as signed; GOV.UK&rsquo;s tag is used only where the letter gives no name. Where the letter shows no date, the publication date is shown. GOV.UK says none were published between 2011 and 2014.</p>
      </AboutThisData>
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside, in the page's one Sources fold; each direction's letters and GOV.UK page stay on its row. */}
      <PageSources sources={[{ label: 'GOV.UK, Ministerial directions', href: 'https://www.gov.uk/government/collections/ministerial-directions' }]} />
    </OpenGovShell>
  );
}
