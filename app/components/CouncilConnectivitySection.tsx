// "Broadband and mobile" section for council pages (server component, UK).
// Reads council_broadband and council_mobile_coverage — Ofcom Connected
// Nations; see scripts/migrations/2026-10-11n-council-connectivity.sql.
//
// County councils have no rows of their own: their figures are summed from
// their districts (gssCodes) — broadband from Ofcom's premises counts,
// mobile premises shares weighted by premises and land shares weighted by
// area. A county figure is only shown when every district has it.

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type B = {
  council_gss_code: string; data_month: string; all_premises: number;
  sfbb_n: number | null; ufbb100_n: number | null; ufbb300_n: number | null; full_fibre_n: number | null; gigabit_n: number | null;
  unable_10_n: number | null; unable_decent_n: number | null; ff_takeup_of_all_pct: number | null;
};
type M = {
  council_gss_code: string; data_month: string; prem_count: number | null; pixel_count: number | null;
  g4_in_none_pct: number | null; g4_in_all_pct: number | null; g4_out_none_pct: number | null;
  g4_geo_none_pct: number | null; g5_out_none_pct: number | null; voice_in_none_pct: number | null;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMonth = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const pct = (n: number | null) => (n == null ? 'n/a' : `${n.toFixed(1)}%`);

// For the area summary (/your-area): the same gigabit share this section leads with
// (a county is the total of its districts, and only when every district has figures).
export async function loadBroadbandHeadline(gssCodes: string[]) {
  if (gssCodes.length === 0) return null;
  const { data, error: dataErr } = await supabase
    .from('council_broadband')
    .select('council_gss_code, data_month, all_premises, gigabit_n')
    .in('council_gss_code', gssCodes)
    .order('data_month', { ascending: false })
    .limit(1000);
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`CouncilConnectivitySection council_broadband: ${dataErr.message}`);
  const all = (data ?? []) as { council_gss_code: string; data_month: string; all_premises: number; gigabit_n: number | null }[];
  if (all.length === 0) return null;
  const month = all[0].data_month;
  const rows = all.filter((r) => r.data_month === month);
  if (rows.length < gssCodes.length || rows.some((r) => r.gigabit_n == null)) return null;
  const premises = rows.reduce((t, r) => t + Number(r.all_premises), 0);
  if (!premises) return null;
  return {
    gigabitPct: (rows.reduce((t, r) => t + Number(r.gigabit_n), 0) / premises) * 100,
    premises,
    month: fmtMonth(month),
  };
}

export default async function CouncilConnectivitySection({ gssCodes, isCounty }: { gssCodes: string[]; isCounty: boolean }) {
  if (gssCodes.length === 0) return null;
  const [{ data: bData, error: bDataErr }, { data: mData, error: mDataErr }] = await Promise.all([
    supabase.from('council_broadband').select('council_gss_code, data_month, all_premises, sfbb_n, ufbb100_n, ufbb300_n, full_fibre_n, gigabit_n, unable_10_n, unable_decent_n, ff_takeup_of_all_pct').in('council_gss_code', gssCodes).order('data_month', { ascending: false }).limit(1000),
    supabase.from('council_mobile_coverage').select('council_gss_code, data_month, prem_count, pixel_count, g4_in_none_pct, g4_in_all_pct, g4_out_none_pct, g4_geo_none_pct, g5_out_none_pct, voice_in_none_pct').in('council_gss_code', gssCodes).order('data_month', { ascending: false }).limit(1000),
  ]);
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [bDataErr, mDataErr]) if (e && e.code !== 'PGRST116') throw new Error(`CouncilConnectivitySection (council_broadband, council_mobile_coverage): ${e.message}`);
  const bAll = (bData ?? []) as B[];
  if (bAll.length === 0) return null;
  const month = bAll[0].data_month;
  const b = bAll.filter((r) => r.data_month === month);
  if (b.length < gssCodes.length) return null; // a county total would be partial
  const premises = b.reduce((t, r) => t + r.all_premises, 0);
  const sumN = (k: keyof B): number | null => (b.some((r) => r[k] == null) ? null : b.reduce((t, r) => t + Number(r[k]), 0));
  const share = (k: keyof B) => { const n = sumN(k); return n == null ? null : (n / premises) * 100; };
  const takeup = b.some((r) => r.ff_takeup_of_all_pct == null) ? null : b.reduce((t, r) => t + Number(r.ff_takeup_of_all_pct) * r.all_premises, 0) / premises;
  const noDecent = sumN('unable_decent_n');

  const mRows = ((mData ?? []) as M[]).filter((r) => r.data_month === month);
  const mComplete = mRows.length === gssCodes.length;
  const wavg = (k: keyof M, w: 'prem_count' | 'pixel_count'): number | null => {
    if (!mComplete || mRows.some((r) => r[k] == null || r[w] == null)) return null;
    const tw = mRows.reduce((t, r) => t + Number(r[w]), 0);
    return tw ? mRows.reduce((t, r) => t + Number(r[k]) * Number(r[w]), 0) / tw : null;
  };
  const g4InNone = wavg('g4_in_none_pct', 'prem_count');
  const g4InAll = wavg('g4_in_all_pct', 'prem_count');
  const g4OutNone = wavg('g4_out_none_pct', 'prem_count');
  const g4GeoNone = wavg('g4_geo_none_pct', 'pixel_count');
  const g5OutNone = wavg('g5_out_none_pct', 'prem_count');
  const voiceInNone = wavg('voice_in_none_pct', 'prem_count');

  const row = (label: string, value: string, note?: string) => (
    <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
      <td style={{ padding: '6px 16px 6px 0' }}>{label}{note && <span style={{ display: 'block', fontSize: '15px' }}>{note}</span>}</td>
      <td style={{ padding: '6px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
  const at = (none: number | null) => (none == null ? null : 100 - none);

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Broadband and mobile
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{pct(share('gigabit_n'))}</strong> of {fmtNum(premises)} homes and businesses can get gigabit-capable broadband, {fmtMonth(month)}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>
        {[
          noDecent != null ? `${fmtNum(noDecent)} premises can't get decent broadband` : null,
          takeup != null ? `${takeup.toFixed(0)}% of premises use full fibre` : null,
        ].filter(Boolean).join(' · ')}
      </p>

      <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '16px', width: '100%', maxWidth: '560px' }}>
        <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>Fixed broadband available to premises</caption>
        <tbody>
          {row('Superfast (30 Mbit/s or more)', pct(share('sfbb_n')))}
          {row('Ultrafast (100 Mbit/s or more)', pct(share('ufbb100_n')))}
          {row('Ultrafast (300 Mbit/s or more)', pct(share('ufbb300_n')))}
          {row('Gigabit-capable (1,000 Mbit/s)', pct(share('gigabit_n')))}
          {row('Full fibre to the premises', pct(share('full_fibre_n')))}
          {row('Can’t get 10 Mbit/s', pct(share('unable_10_n')))}
          {row('Can’t get decent broadband', pct(share('unable_decent_n')), 'from a fixed line or fixed wireless')}
        </tbody>
      </table>

      {mComplete && (g4InNone != null || g5OutNone != null) && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '16px', width: '100%', maxWidth: '560px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>Mobile coverage</caption>
          <tbody>
            {g4InNone != null && row('4G indoors from at least one network', pct(at(g4InNone)), 'share of premises')}
            {g4InAll != null && row('4G indoors from all four networks', pct(g4InAll), 'share of premises')}
            {g4OutNone != null && row('4G outdoors from at least one network', pct(at(g4OutNone)), 'share of premises')}
            {g5OutNone != null && row('5G outdoors from at least one network', pct(at(g5OutNone)), 'share of premises')}
            {voiceInNone != null && row('Indoor phone calls from at least one network', pct(at(voiceInNone)), 'share of premises')}
            {g4GeoNone != null && row('Land with no outdoor 4G from any network', pct(g4GeoNone), 'share of the area')}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Figures for this county are the total of its district councils. '}
        These figures show what is available, not what people buy. &ldquo;Decent&rdquo; broadband means 10 Mbit/s download and 1 Mbit/s upload, the standard set by the broadband Universal Service Obligation. Full fibre use is the share of all premises with a full fibre connection in use. Mobile figures count the four networks Ofcom reports (EE, O2, Three and Vodafone) and are modelled predictions of signal strength; 5G figures use Ofcom&rsquo;s high-confidence measure.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        Source: Ofcom, Connected Nations ({fmtMonth(month)} data). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
