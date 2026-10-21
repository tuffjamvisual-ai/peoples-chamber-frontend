// "Motability" section for council pages, Work & benefits tab (server component). Reads council_pip_mobility
// (scripts/migrations/2026-10-21t-council-pip-mobility.sql): England and Wales from DWP Stat-Xplore; a county
// council's figure is its districts added up, each district listed with its own figure. Hidden where no figures are
// held (Scotland has moved to Adult Disability Payment; Northern Ireland runs its own system). Wording in
// lib/pip-mobility.ts. Under the figure, one UK-wide line on Motability Scheme leases (Motability Operations).

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { changeLine, derivedNote, eligibleLine, sourceLine, UK_SCHEME_LINE, UK_SCHEME_SOURCE, type PipMobilityRow } from '@/lib/pip-mobility';

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const small = { fontFamily: MONO, fontSize: '15px', color: INK_SOFT, lineHeight: 1.6, margin: '8px 0 0' } as const;

export default async function CouncilPipMobilitySection({ gssCode }: { gssCode: string | null }) {
  if (!gssCode) return null;
  const { data, error } = await supabase.from('council_pip_mobility')
    .select('gss, period, enhanced, derived_from_districts, district_gss').eq('gss', gssCode).order('period', { ascending: false }).limit(13);
  if (error) throw new Error(`council_pip_mobility ${gssCode}: ${error.message}`);
  const rows = (data || []) as PipMobilityRow[];
  if (!rows.length) return null;
  const cur = rows[0];
  const yearEarlier = `${Number(cur.period.slice(0, 4)) - 1}${cur.period.slice(4, 10)}`;
  const prev = rows.find((r) => r.period.slice(0, 10) === yearEarlier);
  const change = changeLine(cur, prev);

  let districts: { name: string; slug: string; enhanced: number }[] = [];
  if (cur.derived_from_districts && cur.district_gss?.length) {
    const [cRes, dRes] = await Promise.all([
      supabase.from('councils').select('gss_code, name, short_name, slug').in('gss_code', cur.district_gss),
      supabase.from('council_pip_mobility').select('gss, enhanced').eq('period', cur.period).in('gss', cur.district_gss),
    ]);
    if (cRes.error) throw new Error(`councils for ${gssCode} districts: ${cRes.error.message}`);
    if (dRes.error) throw new Error(`council_pip_mobility districts of ${gssCode}: ${dRes.error.message}`);
    const count = new Map((dRes.data || []).map((r) => [r.gss as string, r.enhanced as number]));
    districts = (cRes.data || []).map((c) => ({ name: (c.short_name as string) || (c.name as string), slug: c.slug as string, enhanced: count.get(c.gss_code as string) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Motability
      </h2>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: 0 }}>
        {eligibleLine(cur.enhanced)}
        {change && <span style={{ display: 'block', color: INK_SOFT, marginTop: '2px' }}>{change}</span>}
      </p>
      <p style={small}>
        {UK_SCHEME_LINE}{' '}
        <a href={UK_SCHEME_SOURCE.url} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{UK_SCHEME_SOURCE.label}</a>
      </p>
      {districts.length > 0 && (
        <>
          <p style={small}>{derivedNote(districts.length)}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 24px' }}>
            {districts.map((d) => (
              <li key={d.slug} style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, display: 'flex', justifyContent: 'space-between', gap: '12px', minWidth: 0 }}>
                <Link href={`/councils/${d.slug}`} style={{ color: INK, minWidth: 0, overflowWrap: 'anywhere' }}>{d.name}</Link>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.enhanced.toLocaleString('en-GB')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p style={small}>{sourceLine(cur.period)}</p>
    </section>
  );
}
