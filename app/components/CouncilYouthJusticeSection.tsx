// "Youth justice" section for English council pages, Crime tab (owner approved 18 Nov 2026, Cowork ENTRY 303). Reads
// council_youth_first_entrants (children's first caution or conviction, by the council where they live) and
// youth_justice_services (the council's youth justice service: its caseload and, for the year to March 2025, its funding
// by source). Run by county, unitary, metropolitan and London borough councils; a district page points to its county.
// England and Wales beside each figure (the release has no England only total). Wording in lib/youth-justice.ts.
import Link from 'next/link';
import { addPanelNote, addPanelSource } from '@/lib/panel-sources';
import { OGL_NOTE } from '@/lib/fold-notes';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';
import { loadFte, loadServices, loadServiceTotals, fteText, rateText, val, pounds, yearLabel, fyLabel, FUNDING_SOURCES, EW, SOURCE_PAGE, SOURCE_LABEL, RANKING_PATH, type YjsRow, type FteRow } from '@/lib/youth-justice';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 6px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;

function Heading() {
  return <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>Youth justice</h2>;
}

export default async function CouncilYouthJusticeSection({ gssCode, country, isDistrict, countyName, countySlug }: {
  gssCode: string | null; country: string | null; isDistrict: boolean; countyName?: string | null; countySlug?: string | null;
}) {
  if (!gssCode || country !== 'England') return null;
  if (isDistrict) {
    if (!countyName || !countySlug) return null;
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0, lineHeight: 1.6 }}>
          Youth justice here is run by{' '}
          <Link href={`/councils/${countySlug}`} style={{ color: INK, textDecoration: 'underline' }}>{countyName}</Link>
          , which shows the figures.
        </p>
      </section>
    );
  }
  const [fte, services] = await Promise.all([loadFte(gssCode), loadServices(gssCode)]);
  const own = fte.filter((r) => r.area_code === gssCode);
  const cur = own[0];
  const svc = services[0];
  if (!cur && !svc) return null;
  const at = (code: string, y: number) => fte.find((r) => r.area_code === code && r.year === y);
  const prev = cur ? at(gssCode, cur.year - 1) : undefined;
  const first = cur ? own[own.length - 1] : undefined;
  const ew = cur ? at(EW, cur.year) : undefined;
  const rateChange = (a: FteRow | undefined, b: FteRow | undefined) => {
    const x = val(a?.fte_rate), y = val(b?.fte_rate);
    if (x == null || y == null || !b) return null;
    const d = Math.round(x - y);
    return d === 0 ? `the same as in ${b.year}` : `${d > 0 ? 'up' : 'down'} ${Math.abs(d)} per 100,000 on ${b.year} (${Math.round(y)})`;
  };
  const svcPrev = svc ? services.find((s) => s.yjs_name === svc.yjs_name && s.year === `${Number(svc.year.slice(0, 4)) - 1}-${String(Number(svc.year.slice(5)) - 1).padStart(2, '0')}`) : undefined;
  const totals = svc ? await loadServiceTotals(svc.year) : null;
  const shared = svc && svc.council_codes.length > 1 ? svc.council_codes.filter((c) => c !== gssCode) : [];
  const { data: others } = shared.length
    ? await cachedQuery(['q:app/components/CouncilYouthJusticeSection.tsx:shared', JSON.stringify(shared)], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('gss_code, slug, short_name, name').in('gss_code', shared))
    : { data: [] as { gss_code: string; slug: string; short_name: string | null; name: string }[] };
  const sharedWith = (others ?? []).map((o) => ({ slug: o.slug as string, name: (o.short_name as string) || (o.name as string) }));
  const funding = svc && val(svc.funding_total) != null ? FUNDING_SOURCES.map(([k, label]) => [label, val(svc[k] as YjsRow['funding_total'])] as const).filter(([, v]) => v != null && v > 0) : [];

  addPanelSource({ label: SOURCE_LABEL, href: SOURCE_PAGE });
  addPanelNote(OGL_NOTE);
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      {cur && (
        <>
          <p style={line}>Children given their first caution or conviction in {yearLabel(cur.year)}: <strong>{fteText(cur)}</strong></p>
          <p style={line}>Rate: <strong>{rateText(cur)}</strong>{ew ? ` (England and Wales ${Math.round(val(ew.fte_rate) ?? 0)})` : ''}</p>
          {rateChange(cur, prev) && <p style={line}>On the year: {rateChange(cur, prev)}</p>}
          {first && first.year !== cur.year && val(first.fte_rate) != null && val(cur.fte_rate) != null && <p style={line}>Since {first.year}: {(() => { const d = Math.round(val(cur.fte_rate)! - val(first.fte_rate)!); return d === 0 ? 'no change' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d)} per 100,000, from ${Math.round(val(first.fte_rate)!)}`; })()}</p>}
        </>
      )}
      {svc && (
        <>
          <p style={{ ...line, marginTop: '12px' }}>
            Youth justice service: <strong>{svc.yjs_name}</strong>
            {sharedWith.length ? <>, shared with {sharedWith.map((o, i) => <span key={o.slug}>{i ? (i === sharedWith.length - 1 ? ' and ' : ', ') : ''}<Link href={`/councils/${o.slug}`} style={{ color: INK, textDecoration: 'underline' }}>{o.name}</Link></span>)}</> : ''}
          </p>
          <p style={line}>
            Children cautioned or sentenced in {fyLabel(svc.year)}: <strong>{svc.children_cautioned_sentenced == null ? 'not published' : svc.children_cautioned_sentenced.toLocaleString('en-GB')}</strong>
            {svcPrev?.children_cautioned_sentenced != null ? ` (${svcPrev.children_cautioned_sentenced.toLocaleString('en-GB')} the year before)` : ''}
            {totals ? `; England ${totals.England.toLocaleString('en-GB')}, Wales ${totals.Wales.toLocaleString('en-GB')}` : ''}
          </p>
          {funding.length > 0 && (
            <p style={line}>
              Funding, {fyLabel(svc.year)}: <strong>{pounds(svc.funding_total)}</strong> ({funding.map(([l, v]) => `${l === 'Youth Justice Board grant' ? l : l.toLowerCase()} ${pounds(v)}`).join(', ')})
            </p>
          )}
        </>
      )}
      <p style={small}>A first caution or conviction is counted by where the child lives; the service&rsquo;s caseload by the service. Rates are per 100,000 children aged 10 to 17.</p>
      <p style={small}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council in England and Wales</Link>, with what the figures mean.
      </p>
    </section>
  );
}
