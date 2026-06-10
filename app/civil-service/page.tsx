import type { Metadata } from 'next';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { fmtHeadcount } from '@/lib/department-civil-service';

export const metadata: Metadata = {
  title: 'UK Civil Service Headcount by Department',
  description:
    'Headcount and FTE for every UK government department, ranked.',
  alternates: { canonical: '/civil-service' },
};

export const dynamic = 'force-dynamic';
export const revalidate = 21600;     // 6h — sync is weekly, page is cheap

const ink = '#14100d';
const ACCENT = '#7a1612';

type Row = {
  department_slug: string;
  period: string;
  period_end_date: string;
  headcount: number | null;
  fte: number | null;
  change_from_previous_percent: number | null;
  is_proxy: boolean;
  proxy_note: string | null;
};

export default async function CivilServicePage() {
  // Most-recent staffing row per department. ONS publishes one quarter
  // at a time so the latest period_end_date is shared across all rows
  // in any given sync — we still order by it defensively in case a sync
  // partially completes.
  const { data: rows } = await supabase
    .from('department_staffing')
    .select('department_slug,period,period_end_date,headcount,fte,change_from_previous_percent,is_proxy,proxy_note')
    .order('period_end_date', { ascending: false });

  const byDept = new Map<string, Row>();
  ((rows || []) as Row[]).forEach((r) => {
    if (!byDept.has(r.department_slug)) byDept.set(r.department_slug, r);
  });

  const merged = departments.map((d) => ({
    slug: d.slug,
    name: d.name,
    row: byDept.get(d.slug) ?? null,
  }));

  // Split reported vs not-reported, then sort reported by headcount desc
  const reported = merged
    .filter((m) => m.row && m.row.headcount != null)
    .sort((a, b) => (b.row!.headcount || 0) - (a.row!.headcount || 0));
  const notReported = merged.filter((m) => !m.row || m.row.headcount == null);

  const topPeriod = reported[0]?.row?.period || 'latest published quarter';
  const totalReported = reported.reduce((s, r) => s + (r.row!.headcount || 0), 0);
  const topFive = reported.slice(0, 5).reduce((s, r) => s + (r.row!.headcount || 0), 0);
  const topFiveShare = totalReported > 0 ? Math.round((topFive / totalReported) * 100) : 0;
  // Largest headcount sets bar scale
  const maxHc = reported[0]?.row?.headcount || 1;

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/transparency"
        label="← Back to transparency"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3%', marginBottom: '12px', color: ink, textDecoration: 'none', fontSize: 'clamp(9px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      />
      <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 38px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        The civil service, by department
      </h1>
      <div style={{ zoom: 1.18, fontFamily: 'Special Elite, monospace' }}>
        <p style={{ fontSize: '16px', lineHeight: 1.7, marginBottom: '8px', maxWidth: '720px' }}>
          {fmtHeadcount(totalReported)} civil servants across {reported.length} of the 24 ministerial
          departments, as at {topPeriod}. The five largest employers account for {topFiveShare}% of them.
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', opacity: 0.8, maxWidth: '720px' }}>
          Figures are rounded to the nearest five. They count civil servants only. They do
          not include armed forces personnel (in MoD), NHS staff (in DHSC) or police officers
          (in the Home Office).
        </p>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {reported.map((m, i) => {
            const hc = m.row!.headcount || 0;
            const pct = (hc / maxHc) * 100;
            const change = m.row!.change_from_previous_percent;
            return (
              <li key={m.slug} style={{ marginBottom: '14px' }}>
                <Link href={`/departments/${m.slug}`} style={{ display: 'block', color: ink, textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px' }}>
                      <span style={{ opacity: 0.5, marginRight: 8 }}>{(i + 1).toString().padStart(2, '0')}</span>
                      {m.name}
                    </span>
                    <span style={{ fontSize: '15px', whiteSpace: 'nowrap' }}>
                      <strong>{fmtHeadcount(hc)}</strong>
                      {change != null && (
                        <span style={{ marginLeft: 8, color: change >= 0 ? '#0a6f2a' : ACCENT, fontWeight: 600, fontSize: '13px' }}>
                          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ background: '#e8e0cc', height: '8px', borderRadius: '0' }}>
                    <div style={{ background: ACCENT, height: '8px', width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        {notReported.length > 0 && (
          <section style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.25em', color: ACCENT, marginBottom: '12px', fontWeight: 600 }}>
              Not separately reported
            </h2>
            <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', opacity: 0.8 }}>
              The following ministerial departments either roll up into a larger ONS
              aggregate (e.g. the Attorney General&apos;s family) or sit inside the
              Cabinet Office cluster and are not separately broken out in Table 8.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notReported.map((m) => (
                <li key={m.slug} style={{ marginBottom: '8px', fontSize: '15px' }}>
                  <Link href={`/departments/${m.slug}`} style={{ color: ink, textDecoration: 'none' }}>
                    {m.name}
                  </Link>
                  {m.row?.proxy_note && (
                    <span style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>
                      {m.row.proxy_note}.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <ScrollToTopButton />
    </DossierShell>
  );
}
