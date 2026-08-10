import { supabase } from '@/lib/supabase';

// Compact embed of Broken State Dashboard headline indicators, for department and
// topic pages. Reads dashboard_indicators for the services mapped to that page and
// links through to the full dashboard. Styled to match the transparency pages:
// hairline card, inherited fonts, muted secondary text.

const DEPT_SERVICES: Record<string, string[]> = {
  health: ['general_practice', 'hospitals', 'adult_social_care'],
  justice: ['criminal_courts', 'prisons'],
  'home-office': ['police'],
  education: ['schools', 'childrens_social_care'],
  housing: ['homelessness'],
};
const TOPIC_SERVICES: Record<string, string[]> = {
  'nhs-and-health': ['general_practice', 'hospitals', 'adult_social_care'],
  'justice-and-policing': ['police', 'criminal_courts', 'prisons'],
  housing: ['homelessness'],
  education: ['schools', 'childrens_social_care'],
};
export const servicesForDept = (slug: string) => DEPT_SERVICES[slug] || [];
export const servicesForTopic = (slug: string) => TOPIC_SERVICES[slug] || [];

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const TREND: Record<string, { label: string; fg: string; mark: string }> = {
  worsening: { label: 'Worsening', fg: '#7a1612', mark: '▼' },
  improving: { label: 'Improving', fg: '#2f6b3a', mark: '▲' },
  flat: { label: 'Broadly flat', fg: 'rgba(20,16,13,0.55)', mark: '▬' },
};
function fmt(v: number | null, unit: string): string {
  if (v == null) return 'n/a';
  if (unit === '%') return `${v}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} million`;
  return v.toLocaleString('en-GB');
}

export default async function ServiceIndicator({ services }: { services: string[] }) {
  if (!services.length) return null;
  const { data } = await supabase.from('dashboard_indicators').select('*').in('service', services);
  const rows = ((data || []) as Array<{ service: string; label: string; value: number; unit: string; trend: string }>);
  if (!rows.length) return null;
  rows.sort((a, b) => services.indexOf(a.service) - services.indexOf(b.service));

  const worsening = rows.filter((r) => r.trend === 'worsening').length;

  return (
    <section style={{ marginTop: '2%', marginBottom: '7%', maxWidth: '620px' }}>
      <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 600, color: ACCENT, marginBottom: '8px' }}>
        The Broken State
      </p>
      <h2 style={{ fontSize: 'clamp(21px, 2.4vw, 27px)', fontWeight: 'bold', color: INK, marginBottom: '4px', letterSpacing: '-0.01em' }}>
        Public services performance
      </h2>
      <p style={{ fontSize: '15px', color: INK, opacity: 0.75, marginBottom: '16px', maxWidth: '60ch' }}>
        How the services this department runs are performing now, against a pre-pandemic baseline.
        {worsening > 0 && <> <strong style={{ color: '#7a1612' }}>{worsening} worsening.</strong></>}
      </p>
      <div style={{ border: `1px solid ${HAIRLINE}`, borderTop: `3px solid ${ACCENT}`, background: 'rgba(20,16,13,0.02)' }}>
        {rows.map((r, i) => {
          const t = TREND[r.trend] || TREND.flat;
          return (
            <div key={r.service + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '15px 18px', borderTop: i ? `1px solid ${HAIRLINE}` : 'none', borderLeft: `4px solid ${t.fg}` }}>
              <span style={{ fontSize: '16px', color: INK }}>{r.label}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '12px', whiteSpace: 'nowrap' }}>
                <strong style={{ fontSize: '23px', color: INK }}>{fmt(r.value, r.unit)}</strong>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: t.fg }}>{t.mark} {t.label}</span>
              </span>
            </div>
          );
        })}
      </div>
      <a href="/transparency/state-dashboard" style={{ display: 'inline-block', marginTop: '12px', fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>
        The Broken State dashboard: full data and sources ↗
      </a>
    </section>
  );
}
