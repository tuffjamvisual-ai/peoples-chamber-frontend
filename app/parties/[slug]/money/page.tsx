// Per-party money dossier — /parties/[slug]/money
//
// The data layer the policy and critique pages never had: every
// declared donation to this party broken down by year, donor type,
// donor concentration, sector, and central-HQ vs constituency split.
// Same OpenGovShell convention as /parties/[slug] and /bio.
//
// Pulls from the political_donations table using the party's
// recipient_name. Trade-union donor flagging uses the donor name
// (memberships filed under "Trade Union" donor_type only catch
// some unions; the patterned matcher in lib/donor-sectors.ts is
// authoritative).

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../../components/OpenGovShell';
import PartySidebar from '../../../components/PartySidebar';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import { sectorForDonor } from '@/lib/donor-sectors';
import { donorNameToSlug } from '../../../donors/[slug]/page';

export const revalidate = 3600;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  recipient_name: string | null;
  mp_party_string: string | null;
};

type Donation = {
  donor_name: string | null;
  donor_type: string | null;
  amount: number | null;
  accepted_date: string | null;
  received_date: string | null;
  reported_date: string | null;
  accounting_unit_name: string | null;
  nature: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: party } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  const name = party?.name || 'Party';
  return {
    title: `${name}, money map`,
    description: `Every declared donation to ${name}: by year, by donor type, by sector, by constituency vs HQ. The donor concentration nobody else calculates.`,
    alternates: { canonical: `/parties/${slug}/money` },
  };
}

export default async function PartyMoney({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: partyRow } = await supabase
    .from('parties')
    .select('slug, name, party_colour, recipient_name, mp_party_string')
    .eq('slug', slug)
    .maybeSingle();
  const party = partyRow as Party | null;

  if (!party || !party.recipient_name) {
    return (
      <OpenGovShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found, or has no Electoral Commission record.</p>
      </OpenGovShell>
    );
  }

  // Pull everything declared against this party's EC recipient name.
  // Most major parties have 10-20k records; pagination handles it.
  const PAGE = 1000;
  const donations: Donation[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('donor_name, donor_type, amount, accepted_date, received_date, reported_date, accounting_unit_name, nature')
      .eq('recipient_name', party.recipient_name)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    donations.push(...(data as Donation[]));
    if (data.length < PAGE) break;
  }

  const total = donations.reduce((s, d) => s + Number(d.amount || 0), 0);

  // Per-donor roll-up
  type DonorAgg = { name: string; donorType: string | null; count: number; total: number };
  const byDonor = new Map<string, DonorAgg>();
  for (const d of donations) {
    const n = (d.donor_name || '(anonymous)').trim() || '(anonymous)';
    const ex = byDonor.get(n) ?? { name: n, donorType: d.donor_type, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(d.amount || 0);
    byDonor.set(n, ex);
  }
  const donorRanked = Array.from(byDonor.values()).sort((a, b) => b.total - a.total);
  const distinctDonors = donorRanked.length;
  const top10Share = total > 0 ? donorRanked.slice(0, 10).reduce((s, d) => s + d.total, 0) / total : 0;

  // Donor type mix
  const typeAgg = new Map<string, { type: string; total: number; count: number }>();
  for (const d of donations) {
    const t = (d.donor_type || 'Unknown').trim() || 'Unknown';
    const ex = typeAgg.get(t) ?? { type: t, total: 0, count: 0 };
    ex.total += Number(d.amount || 0);
    ex.count += 1;
    typeAgg.set(t, ex);
  }
  const typeRows = Array.from(typeAgg.values()).sort((a, b) => b.total - a.total);

  // Year-over-year (using accepted_date, fall back to received_date)
  const byYear = new Map<number, { year: number; total: number; count: number }>();
  for (const d of donations) {
    const dateStr = d.accepted_date || d.received_date || d.reported_date;
    if (!dateStr) continue;
    const yr = Number(dateStr.slice(0, 4));
    if (!Number.isFinite(yr) || yr < 2000) continue;
    const ex = byYear.get(yr) ?? { year: yr, total: 0, count: 0 };
    ex.total += Number(d.amount || 0);
    ex.count += 1;
    byYear.set(yr, ex);
  }
  const yearRows = Array.from(byYear.values()).sort((a, b) => b.year - a.year);
  const maxYearTotal = Math.max(...yearRows.map((y) => y.total), 1);

  // Central HQ vs constituency vs other
  type UnitBucket = 'Central HQ' | 'Constituency-level' | 'Parliamentary office' | 'Regional / liaison' | 'Other';
  function classifyUnit(name: string | null): UnitBucket {
    if (!name) return 'Other';
    const t = name.toLowerCase().trim();
    if (t === 'central party' || t.includes('central office')) return 'Central HQ';
    if (t.includes('parliamentary office') || t.includes('westminster parliament') || t.includes('mp grouping') || t.includes('westminster group')) return 'Parliamentary office';
    if (t.match(/^(scotland|london|wales|northern ireland|north west|north east|south east|south west|east of england|east midlands|west midlands|yorkshire)$/) || t.includes('liaison') || t.includes('trade union') || t.includes('regional')) return 'Regional / liaison';
    if (t.includes('limited') || t.includes(' ltd') || t.includes(' plc') || t.includes('national party') || t.includes('national executive')) return 'Other';
    return 'Constituency-level';
  }
  const unitAgg = new Map<string, { bucket: string; total: number; count: number }>();
  for (const d of donations) {
    const b = classifyUnit(d.accounting_unit_name);
    const ex = unitAgg.get(b) ?? { bucket: b, total: 0, count: 0 };
    ex.total += Number(d.amount || 0);
    ex.count += 1;
    unitAgg.set(b, ex);
  }
  const unitRows = Array.from(unitAgg.values()).sort((a, b) => b.total - a.total);

  // Top funding sectors
  const sectorAgg = new Map<string, { label: string; colour: string; total: number; donors: Set<string> }>();
  for (const d of donations) {
    if (!d.donor_name) continue;
    const s = sectorForDonor(d.donor_name);
    if (!s) continue;
    const ex = sectorAgg.get(s.label) ?? { label: s.label, colour: s.colour, total: 0, donors: new Set<string>() };
    ex.total += Number(d.amount || 0);
    ex.donors.add(d.donor_name);
    sectorAgg.set(s.label, ex);
  }
  const sectorRows = Array.from(sectorAgg.values()).sort((a, b) => b.total - a.total);

  const accent = party.party_colour || ACCENT;

  return (
    <OpenGovShell>
      <a
        href={`/parties/${party.slug}`}
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← {party.name}
      </a>

      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          {party.name} · Money map
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who actually funds the {party.name}
        </h1>
        <div style={{ height: '4px', background: accent, width: '80px', marginBottom: '12px' }} />
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '60ch' }}>
          Every declared donation to the {party.name} on the Electoral Commission register, aggregated by year, by donor type, by sector and by accounting unit. The headline number on the policy page is &pound;{Math.round(total).toLocaleString()} across {donations.length.toLocaleString()} declared donations from {distinctDonors.toLocaleString()} distinct donors. The figures below are the decomposition.
        </p>
      </header>

      <PartySidebar party={party} active="money">

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By donor type</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>The most diagnostic single decomposition. Tells you who actually owns the party.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={th}>Donor type</th>
              <th style={{ ...th, textAlign: 'right' }}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>% of all-time</th>
            </tr>
          </thead>
          <tbody>
            {typeRows.map((r) => (
              <tr key={r.type} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={td}>{r.type}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.count.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{((r.total / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Year by year</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>Declared total per calendar year. Election years and leadership-change years usually spike.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={th}>Year</th>
              <th style={{ ...th, textAlign: 'right' }}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Scale</th>
            </tr>
          </thead>
          <tbody>
            {yearRows.map((r) => (
              <tr key={r.year} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={{ ...td, fontFamily: 'monospace' }}>{r.year}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.count.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                <td style={{ padding: '6px', width: '40%' }}>
                  <div style={{ background: accent, height: '8px', width: `${Math.round((r.total / maxYearTotal) * 100)}%`, minWidth: r.total > 0 ? '2px' : 0 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Where the money landed · accounting unit</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>Money that lands at Central HQ funds the party machine. Money that lands at a constituency association funds a single seat. The mix tells you whether the party is centrally bankrolled or locally rooted.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={th}>Where</th>
              <th style={{ ...th, textAlign: 'right' }}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>% of all-time</th>
            </tr>
          </thead>
          <tbody>
            {unitRows.map((r) => (
              <tr key={r.bucket} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={td}>{r.bucket}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.count.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{((r.total / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {sectorRows.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={sectionH2}>Top funding sectors</h2>
          <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>Donor names matched against the site&rsquo;s sector classifier. Untagged donors (individuals, generic companies) are not included &mdash; this is the political-economy view.</p>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>Sector</th>
                <th style={{ ...th, textAlign: 'right' }}>Distinct donors</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sectorRows.map((r) => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <td style={td}><span style={{ padding: '2px 8px', border: `1px solid ${r.colour}`, color: r.colour, fontSize: '13px' }}>{r.label}</span></td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.donors.size}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Top 30 donors · lifetime</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={th}>#</th>
              <th style={th}>Donor</th>
              <th style={th}>Type</th>
              <th style={{ ...th, textAlign: 'right' }}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Lifetime total</th>
            </tr>
          </thead>
          <tbody>
            {donorRanked.slice(0, 30).map((d, i) => (
              <tr key={d.name} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={{ ...td, opacity: 0.6 }}>{i + 1}</td>
                <td style={td}>
                  <Link href={`/donors/${donorNameToSlug(d.name)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{d.name}</Link>
                </td>
                <td style={{ ...td, fontSize: '13px', opacity: 0.75 }}>{d.donorType || ''}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{d.count}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        All-time, all accounting units. Includes both monetary donations and non-cash benefits.
      </p>

      </PartySidebar>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'k';
  return '£' + Math.round(n);
}

function Tile({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: small ? '14px' : '22px', fontWeight: 'bold', color: ACCENT, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '13px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', verticalAlign: 'top' };
