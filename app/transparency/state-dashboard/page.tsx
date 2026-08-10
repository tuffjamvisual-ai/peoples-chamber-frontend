import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';

export const revalidate = 3600;

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.22)';

export const metadata: Metadata = {
  title: 'The Broken State Dashboard',
  description:
    'The state of England’s public services at a glance, tracked from official primary sources: A&E, elective waiting list, Crown Court backlog, prison occupancy and more, each with the direction of travel and its source.',
  alternates: { canonical: '/transparency/state-dashboard' },
};

type Ind = {
  service: string; indicator_key: string; label: string; unit: string;
  value: number; period: string;
  baseline_value: number | null; baseline_period: string | null;
  trend: string; direction_good: string;
  source_name: string; update_method: string; definition_note: string | null;
};

const SERVICE_META: Record<string, { name: string }> = {
  general_practice: { name: 'General practice' },
  hospitals: { name: 'Hospitals' },
  adult_social_care: { name: 'Adult social care' },
  childrens_social_care: { name: 'Children’s social care' },
  homelessness: { name: 'Homelessness' },
  schools: { name: 'Schools' },
  police: { name: 'Police' },
  criminal_courts: { name: 'Criminal courts' },
  prisons: { name: 'Prisons' },
};
const SERVICE_ORDER = Object.keys(SERVICE_META);
const COUNCIL_LINKED = new Set(['homelessness', 'adult_social_care', 'childrens_social_care']);

const TREND: Record<string, { label: string; fg: string; bg: string; mark: string }> = {
  worsening: { label: 'Worsening', fg: '#7a1612', bg: 'rgba(122,22,18,0.10)', mark: '▼' },
  improving: { label: 'Improving', fg: '#2f6b3a', bg: 'rgba(47,107,58,0.12)', mark: '▲' },
  flat: { label: 'Broadly flat', fg: 'rgba(20,16,13,0.55)', bg: 'rgba(20,16,13,0.06)', mark: '▬' },
};
const rank = (t: string) => (t === 'worsening' ? 0 : t === 'flat' ? 1 : 2);

function fmt(v: number | null, unit: string): string {
  if (v == null) return 'n/a';
  if (unit === '%') return `${v}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}m`;
  return v.toLocaleString('en-GB');
}
function delta(r: Ind): string | null {
  if (r.baseline_value == null) return null;
  if (r.unit === '%') { const d = r.value - r.baseline_value; return `${d > 0 ? '+' : ''}${d.toFixed(1)} pts`; }
  const d = (r.value / r.baseline_value - 1) * 100; return `${d > 0 ? '+' : ''}${d.toFixed(0)}%`;
}

export default async function StateDashboard() {
  const { data } = await supabase.from('dashboard_indicators').select('*');
  const rows = (data || []) as Ind[];
  const byService = new Map<string, Ind[]>();
  for (const r of rows) { const a = byService.get(r.service) ?? []; a.push(r); byService.set(r.service, a); }
  const services = SERVICE_ORDER.filter((s) => byService.has(s));
  const counts = {
    worsening: rows.filter((r) => r.trend === 'worsening').length,
    improving: rows.filter((r) => r.trend === 'improving').length,
    flat: rows.filter((r) => r.trend === 'flat').length,
  };

  return (
    <OpenGovShell pageStamp="Broken State">
      <a href="/transparency" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}>
        ← Transparency Hub
      </a>

      <header style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, marginBottom: '12px', color: ACCENT }}>Dashboard</p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          The Broken State
        </h1>
        <p style={{ fontSize: '17px', lineHeight: 1.7, maxWidth: '680px', color: INK }}>
          Nine public services, tracked from official government statistics against a pre-pandemic (2019) baseline. Each figure shows where it is now and which way it is heading.
        </p>
      </header>

      {/* At-a-glance summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', border: `1px solid ${HAIRLINE}`, marginBottom: '28px' }}>
        {(['worsening', 'flat', 'improving'] as const).map((k, i) => {
          const t = TREND[k];
          return (
            <div key={k} style={{ flex: '1 1 120px', padding: '16px 20px', borderLeft: i ? `1px solid ${HAIRLINE}` : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 'bold', lineHeight: 1, color: t.fg }}>{counts[k]}</div>
              <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '6px', color: INK, opacity: 0.75 }}>{t.mark} {t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Service cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {services.map((s) => {
          const inds = byService.get(s)!.slice().sort((a, b) => rank(a.trend) - rank(b.trend));
          const cardTrend = inds.reduce((w, r) => (rank(r.trend) < rank(w) ? r.trend : w), 'improving');
          const accent = TREND[cardTrend].fg;
          return (
            <section key={s} style={{ border: `1px solid ${HAIRLINE}`, borderLeft: `4px solid ${accent}`, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', color: INK, opacity: 0.55, marginBottom: '10px' }}>{SERVICE_META[s].name}</p>
              {inds.map((r, i) => {
                const t = TREND[r.trend] || TREND.flat;
                const d = delta(r);
                return (
                  <div key={r.indicator_key} style={{ borderTop: i ? `1px solid ${HAIRLINE}` : 'none', paddingTop: i ? '14px' : 0, marginTop: i ? '14px' : 0 }}>
                    <div style={{ fontSize: '15px', color: INK, marginBottom: '6px', lineHeight: 1.3 }}>{r.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '34px', fontWeight: 'bold', color: INK, lineHeight: 1 }}>{fmt(r.value, r.unit)}</span>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: t.fg, background: t.bg, padding: '3px 9px', borderRadius: 20 }}>{t.mark} {t.label}</span>
                    </div>
                    {d && r.baseline_period && (
                      <div style={{ fontSize: '15px', color: t.fg, fontWeight: 'bold', marginTop: '8px' }}>{d} <span style={{ color: INK, opacity: 0.6, fontWeight: 'normal' }}>since {r.baseline_period}</span></div>
                    )}
                    <div style={{ fontSize: '15px', color: INK, opacity: 0.6, marginTop: '4px' }}>As of {r.period} · {r.update_method === 'auto' ? 'auto-updated' : 'reviewed quarterly'}</div>
                    {r.definition_note && <div style={{ fontSize: '15px', color: INK, opacity: 0.75, marginTop: '10px', lineHeight: 1.55 }}>{r.definition_note}</div>}
                    <div style={{ fontSize: '15px', color: INK, opacity: 0.6, marginTop: '10px' }}>
                      Source: {r.source_name}
                      {COUNCIL_LINKED.has(r.service) && <> · <a href="/councils" style={{ color: ACCENT, textDecoration: 'underline' }}>by council</a></>}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '680px', color: INK, opacity: 0.7, marginTop: '32px' }}>
        Figures are for England, except the justice indicators (police, criminal courts and prisons), which cover England and Wales. Automated indicators are parsed directly from the published data file; the rest are reviewed each quarter. Where a definition changes, the series is versioned rather than spliced.
      </p>
    </OpenGovShell>
  );
}
