import type { Metadata } from 'next';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { fmtMillions } from '@/lib/department-civil-service';

export const metadata: Metadata = {
  title: 'UK Department Budgets — Total DEL by Department',
  description:
    "Total Departmental Expenditure Limits for every UK government department, ranked.",
  alternates: { canonical: '/spending' },
};

export const revalidate = 21600;

const ink = '#14100d';
const ACCENT = '#7a1612';

type Row = {
  department_slug: string;
  financial_year: string;
  resource_del_millions: number | null;
  capital_del_millions: number | null;
  total_del_millions: number | null;
  change_from_previous_percent: number | null;
  caveat_note: string | null;
  source_release_date: string | null;
};

export default async function SpendingPage() {
  const { data: rows } = await supabase
    .from('department_budgets')
    .select('department_slug,financial_year,resource_del_millions,capital_del_millions,total_del_millions,change_from_previous_percent,caveat_note,source_release_date')
    .eq('source', 'hmt_main_estimates')
    .order('financial_year', { ascending: false });

  const byDept = new Map<string, Row>();
  ((rows || []) as Row[]).forEach((r) => {
    if (!byDept.has(r.department_slug)) byDept.set(r.department_slug, r);
  });

  const merged = departments.map((d) => ({
    slug: d.slug,
    name: d.name,
    row: byDept.get(d.slug) ?? null,
  }));

  const reported = merged
    .filter((m) => m.row && m.row.total_del_millions != null)
    .sort((a, b) => (b.row!.total_del_millions || 0) - (a.row!.total_del_millions || 0));
  const notReported = merged.filter((m) => !m.row || m.row.total_del_millions == null);

  const fy = reported[0]?.row?.financial_year || 'latest';
  const totalReported = reported.reduce((s, r) => s + (r.row!.total_del_millions || 0), 0);
  const top = reported[0];
  const topShare = top && totalReported > 0 ? Math.round(((top.row!.total_del_millions || 0) / totalReported) * 100) : 0;
  const maxTotal = reported[0]?.row?.total_del_millions || 1;

  return (
    <OpenGovShell pageStamp="Spending">
      <BackLink
        fallbackHref="/transparency"
        label="← Back"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3%', marginBottom: '12px', color: ink, textDecoration: 'none', fontSize: 'clamp(9px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      />
      <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 38px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        Departmental spending, by total DEL
      </h1>
      <div style={{ zoom: 1.18, fontFamily: 'Special Elite, monospace' }}>
        <p style={{ fontSize: '16px', lineHeight: 1.7, marginBottom: '8px', maxWidth: '720px' }}>
          {fmtMillions(totalReported)} in Total Departmental Expenditure Limits across {reported.length} of the
          24 ministerial departments, FY {fy} plans. {top ? `${top.name} alone is ${topShare}% of it.` : ''}
        </p>
<ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {reported.map((m, i) => {
            const total = m.row!.total_del_millions || 0;
            const pct = (total / maxTotal) * 100;
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
                      <strong>{fmtMillions(total)}</strong>
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
              Not in Mains DEL
            </h2>
            <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', opacity: 0.8 }}>
              These departments are either bundled into a Mains aggregate
              (&ldquo;Law Officers&apos; Departments&rdquo;, &ldquo;Small and Independent Bodies&rdquo;) or
              fall outside the HM Treasury Estimates altogether (the two House
              of Parliament leaderships).
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notReported.map((m) => (
                <li key={m.slug} style={{ marginBottom: '10px', fontSize: '15px' }}>
                  <Link href={`/departments/${m.slug}`} style={{ color: ink, textDecoration: 'none' }}>
                    {m.name}
                  </Link>
                  {m.row?.caveat_note && (
                    <span style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>
                      {m.row.caveat_note}.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <ScrollToTopButton />
    </OpenGovShell>
  );
}
