// /transparency/freedom-of-information: every body in the Cabinet Office's FOI statistics for the latest quarter
// (foi_statistics, lib/foi-statistics.ts). Owner's decisions, 20 Oct 2026: counts as published, the 20-day figure as
// "N of BASE (X%)" with the published percentage rounded, sortable by name, requests and answered within 20 days.
import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { DEPT_BY_FOI_BODY, foiSource, getFoiLatestQuarter, periodName } from '@/lib/foi-statistics';
import FoiTable, { type FoiTableRow } from './FoiTable';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Freedom of Information Requests by Government Department',
  description:
    'How many Freedom of Information requests each UK government department and body received in the latest quarter, how many were answered within 20 working days, and how many were granted or withheld.',
  alternates: { canonical: '/transparency/freedom-of-information' },
};

const INK = '#14100d';

export default async function FreedomOfInformationPage() {
  const latest = await getFoiLatestQuarter();
  const q = latest ? periodName(latest.period) : null;
  const rows: FoiTableRow[] = (latest?.rows ?? []).map((r) => ({
    body: r.body,
    href: DEPT_BY_FOI_BODY[r.body] ? `/departments/${DEPT_BY_FOI_BODY[r.body]}#transparency` : null,
    received: r.received,
    met: r.met_20_days,
    base: r.received_ex,
    pct: r.pct_met_20_days,
    late: r.late,
    granted: r.granted_full,
    fullyWithheld: r.fully_withheld,
    resolvable: r.resolvable,
  }));
  const total = rows.reduce((n, r) => n + (r.received ?? 0), 0);
  const source = latest && latest.rows[0] ? foiSource(latest.rows[0]) : null;

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)' }}>
          Freedom of Information
        </h1>
        {q && (
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '760px' }}>
            Requests made under the Freedom of Information Act and the Environmental Information Regulations to the{' '}
            {rows.length} central government bodies the Cabinet Office monitors, {q}: {total.toLocaleString('en-GB')} in all.
            A body should answer within 20 working days, or tell the requester it needs longer where the law allows.
          </p>
        )}
      </header>

      {rows.length > 0 ? <FoiTable rows={rows} /> : <p>The figures could not be loaded.</p>}

      <div style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '760px', marginTop: '20px' }}>
        <p style={{ marginBottom: '10px' }}>
          &ldquo;Answered within 20 working days&rdquo; is out of the requests received, leaving out any put on hold or lapsed;
          the percentage is the Cabinet Office&rsquo;s own, rounded. &ldquo;Granted in full&rdquo; and &ldquo;fully withheld&rdquo;
          are out of the resolvable requests: those not answered with advice alone or with &ldquo;information not held&rdquo;.
          Late replies missed the deadline without a permitted extension.
        </p>
        <p style={{ marginBottom: '10px' }}>
          Department names link to their pages, where the Transparency tab also has the change on a year earlier and the
          year&rsquo;s internal reviews and complaints to the Information Commissioner. More on opengovt:{' '}
          <Link href="/transparency" style={{ color: INK, textDecoration: 'underline' }}>Transparency</Link>.
        </p>
        {source && (
          <p style={{ fontSize: '15px' }}>
            Source: <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>{source.label}</a>.
            Contains public sector information licensed under the Open Government Licence v3.0.
          </p>
        )}
      </div>
    </OpenGovShell>
  );
}
