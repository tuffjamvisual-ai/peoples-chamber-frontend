// /transparency/ministerial-directions — every ministerial direction GOV.UK publishes.
// Reads ministerial_directions (migration 2026-10-20a), loaded by scripts/import-ministerial-directions.js.
// Grouped by year given (publication year where the letter shows no date), newest first.

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { departments } from '@/lib/departments';
import { fetchDirections, sortKey, dateLine, ministerLine, letterLinks, departmentsAtTheTime } from '@/lib/ministerial-directions';

export const revalidate = 86400;

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export const metadata: Metadata = {
  title: 'Ministerial directions: when ministers overrule their officials on spending',
  description: 'Every ministerial direction published on GOV.UK since 2015: what was directed, by which minister and department, when, and the letters themselves.',
  alternates: { canonical: '/transparency/ministerial-directions' },
};

const sameName = (a: string, b: string) => a.replace(/&/g, 'and').replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/&/g, 'and').replace(/\s+/g, ' ').trim().toLowerCase();
const linkStyle = { color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' } as const;

// The department as GOV.UK named it at the time, as text, with today's department page linked alongside
// (owner's decision, 20 Oct 2026). Where the name then is today's name, the name itself is the link.
function DepartmentLine({ d, deptName }: { d: Awaited<ReturnType<typeof fetchDirections>>[number]; deptName: Map<string, string> }) {
  const then = departmentsAtTheTime(d);
  const today = d.dept_slugs.map((s) => ({ slug: s, name: deptName.get(s) ?? s }));
  const unchanged = then.length === today.length && then.every((t) => today.some((x) => sameName(t, x.name)));
  return (
    <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
      {unchanged ? (
        <>Department: {today.map((x, i) => <span key={x.slug}>{i > 0 && ', '}<Link href={`/departments/${x.slug}`} style={linkStyle}>{x.name}</Link></span>)}</>
      ) : (
        <>
          Department at the time: {then.join(', ')}
          {today.length > 0 && <> · Today: {today.map((x, i) => <span key={x.slug}>{i > 0 && ', '}<Link href={`/departments/${x.slug}`} style={linkStyle}>{x.name}</Link></span>)}</>}
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

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Transparency · Ministerial directions</p>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.15 }}>
          When ministers overrule their officials on spending
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch' }}>
          Each department has an accounting officer, usually its permanent secretary, who answers to Parliament for how its money is spent. When they object that spending would break the rules or not be value for money, the minister can tell them in writing to go ahead anyway. That instruction is a ministerial direction. Both letters go to the National Audit Office and the Public Accounts Committee, and the government publishes them.
        </p>
        <p style={{ marginTop: '14px', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>
          {all.length} directions published, {first} to {years[0]}
        </p>
      </header>

      {years.map((y) => (
        <section key={y} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
            {y} · {byYear.get(y)!.length}
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {byYear.get(y)!.map((d) => (
              <li key={d.slug} style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, padding: '12px 0' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, lineHeight: 1.45 }}>{d.subject}</p>
                <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
                  {dateLine(d)} · {ministerLine(d)}
                </p>
                <DepartmentLine d={d} deptName={deptName} />
                <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: '15px' }}>
                  {letterLinks(d).map((l, i) => (
                    <span key={l.url}>{i > 0 && ' · '}<a href={l.url} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.label}</a></span>
                  ))}
                  {' · '}<a href={d.govuk_url} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>GOV.UK page</a>
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
        Source: GOV.UK, <a href="https://www.gov.uk/government/collections/ministerial-directions" style={{ color: INK }}>Ministerial directions</a>. Dates given and ministers are read from the letters, with the name as signed; GOV.UK&rsquo;s tag is used only where the letter gives no name. Where the letter shows no date, the publication date is shown. GOV.UK says none were published between 2011 and 2014.
      </p>
    </OpenGovShell>
  );
}
