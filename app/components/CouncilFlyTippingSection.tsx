// "Fly-tipping" section for council pages, Crime & roads tab (server component). Reads council_fly_tipping
// (scripts/migrations/2026-10-19p-council-fly-tipping.sql): England from Defra, Wales from StatsWales, a county
// council's figures being the total of its districts. Scotland and Northern Ireland publish no official council
// figures, so their pages get one line saying so. The wording is in lib/fly-tipping.ts.

import { pageDb } from '@/lib/page-reads';
import { flyTippingView, noFlyTippingFigures, type FlyTippingRow } from '@/lib/fly-tipping';

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Fly-tipping
    </h2>
  );
}

const sectionStyle = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK_SOFT, lineHeight: 1.6, margin: '8px 0 0' } as const;

export default async function CouncilFlyTippingSection({ gssCode, country }: { gssCode: string | null; country: string }) {
  const none = noFlyTippingFigures(country);
  if (none) {
    return (
      <section style={sectionStyle}>
        <Heading />
        <p style={{ ...small, margin: 0 }}>{none}</p>
      </section>
    );
  }
  if (!gssCode) return null;
  const { data, error } = await pageDb().from('council_fly_tipping').select('*').eq('gss', gssCode).order('year', { ascending: false }).limit(5);
  if (error || !data?.length) return null; // table not created yet, or no figures held
  const view = flyTippingView((data as FlyTippingRow[]).map((r) => ({ ...r, incidents_per_1000: r.incidents_per_1000 == null ? null : Number(r.incidents_per_1000) })));
  if (!view) return null;
  return (
    <section style={sectionStyle}>
      <Heading />
      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', margin: 0 }}>
        {view.lines.map((l) => (
          <div key={l.label} style={{ display: 'contents' }}>
            <dt style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.04em', padding: '12px 16px 12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>{l.label}</dt>
            <dd style={{ padding: '12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, minWidth: 0, overflowWrap: 'anywhere' }}>
              {l.value}
              {l.sub && <span style={{ display: 'block', color: INK_SOFT, marginTop: '2px' }}>{l.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {view.notes.map((n) => <p key={n} style={small}>{n}</p>)}
      <p style={small}>{view.source}</p>
    </section>
  );
}
