// /your-area: everything Open Govt holds for one council area and constituency,
// reached from the homepage "Your area" search (postcode or town). The address
// carries ONS codes only (?council=&constituency=&place=), never a postcode.
//
// Each topic shows the same headline figure its full section shows first, read by
// the same loader the section uses, and links to that section. Topics with no
// figures for the area are listed at the end rather than shown empty.

import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { POSTCODE_RE, cleanPostcode, codesForPostcode, codesForPoint, findPlaces, findCouncilByName, LookupError } from '@/lib/area-lookup';
import type { AreaCodes, Place } from '@/lib/area-lookup';
import { normaliseParty } from '@/lib/party-helpers';
import OpenGovShell from '../components/OpenGovShell';
import AreaSearch from '../components/AreaSearch';
import { loadCrime } from '../components/CouncilCrimeSection';
import { loadChildPoverty } from '../components/CouncilChildPovertySection';
import { loadFuelPoverty } from '../components/CouncilFuelPovertySection';
import { loadHousePriceHeadline } from '../components/CouncilHousePricesSection';
import { loadHomelessness, quarterEnd } from '../components/CouncilHomelessnessSection';
import { loadClaimantHeadline } from '../components/CouncilClaimantCountSection';
import { loadSchoolsHeadline } from '../components/CouncilSchoolInspectionsSection';
import { loadRoadHeadline } from '../components/CouncilRoadCasualtiesSection';
import { loadBroadbandHeadline } from '../components/CouncilConnectivitySection';
import { getAreaTotals, getCouncilRefs, countyTotals, latestYears, nationOfCode, rankByHours, ordinal as sewageOrdinal } from '@/lib/sewage';
import { getLeagueData, bandLabel, ordinal } from '@/lib/council-league';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';
import { balanceColumns, TWO_COLUMN_CSS } from '@/lib/balance-columns';
import { displayMpName } from '@/lib/mp-name';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your area',
  description: 'Your MP, your council and the latest local figures for your area, from a postcode or town.',
  alternates: { canonical: '/your-area' },
  robots: { index: false, follow: true },
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = "var(--font-special-elite), monospace";
const GSS = /^[ENSW]\d{8}$/;

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 12px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 6px' };
const big: CSSProperties = { fontFamily: MONO, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' };
const link: CSSProperties = { color: ACCENT, textDecoration: 'underline' };

const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');
const pct1 = (n: number) => `${n.toFixed(1)}%`;
const upDown = (n: number, unit = '%') => (n === 0 ? 'no change' : `${n > 0 ? 'up' : 'down'} ${unit === '%' ? `${Math.abs(n).toFixed(1)}%` : n0(Math.abs(n))}`);
const fyText = (fye: number) => `${fye - 1}/${String(fye).slice(2)}`;

type Council = { slug: string; name: string; short_name: string | null; type: string; type_label: string | null; political_control: string | null; parent_slug: string | null; population: number | null; gss_code: string | null };
type Card = { key: string; title: string; lines: ReactNode[]; href: string; linkText: string };

// A topic that fails to load is left out (and logged) rather than taking the page down.
async function settle<T>(label: string, p: Promise<T>): Promise<T | null> {
  try { return await p; } catch (e) { console.error(`your-area ${label}:`, e); return null; }
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <OpenGovShell pageStamp="Your Area">
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>Your area</h1>
      </header>
      {children}
      <div style={{ marginTop: '32px', maxWidth: '640px' }}>
        <p style={{ ...para, marginBottom: '8px' }}>Search another area</p>
        <AreaSearch />
      </div>
    </OpenGovShell>
  );
}

export default async function YourAreaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const councilCode = GSS.test(one(sp.council)) ? one(sp.council) : null;
  const constituencyCode = GSS.test(one(sp.constituency)) ? one(sp.constituency) : null;
  const place = one(sp.place).replace(/[^\p{L}\p{N} '’.,()-]/gu, '').slice(0, 60) || null;

  if (!councilCode && !constituencyCode) {
    // A search sent without the page script (?q=, or ?lat=&lon=&place= after picking
    // a place): look it up here and go to the codes address, never keeping the postcode.
    const q = one(sp.q).trim().slice(0, 60);
    const lat = Number(one(sp.lat)), lon = Number(one(sp.lon));
    let target: (AreaCodes & { place: string | null }) | null = null;
    let choices: Place[] = [];
    let message: string | null = null;
    try {
      if (one(sp.lat) && one(sp.lon)) {
        target = { ...(await codesForPoint(lat, lon)), place };
      } else if (q) {
        if (POSTCODE_RE.test(cleanPostcode(q))) {
          target = { ...(await codesForPostcode(q)), place: null };
        } else {
          const council = await findCouncilByName(q);
          if (council) {
            target = { councilCode: council.gss_code, councilName: council.name, constituencyCode: null, constituencyName: null, place: null };
          } else {
            const places = await findPlaces(q);
            if (places.length === 1) target = { ...(await codesForPoint(places[0].lat, places[0].lon)), place: places[0].name };
            else if (places.length > 1) choices = places;
            else message = 'No town, village or council has that name. Check the spelling or enter a postcode.';
          }
        }
      }
    } catch (e) {
      message = e instanceof LookupError ? e.message : 'Lookup is unavailable right now. Please try again.';
    }
    if (target && (target.councilCode || target.constituencyCode)) {
      const p = new URLSearchParams();
      if (target.councilCode) p.set('council', target.councilCode);
      if (target.constituencyCode) p.set('constituency', target.constituencyCode);
      if (target.place) p.set('place', target.place);
      redirect(`/your-area?${p.toString()}`);
    }
    return (
      <Shell>
        {message && <p style={{ ...para, color: ACCENT }}>{message}</p>}
        {choices.length > 0 ? (
          <>
            <p style={para}>More than one place has that name. Which one?</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
              {choices.map((c) => (
                <li key={c.label} style={{ ...para, marginBottom: '4px' }}>
                  <a href={`/your-area?lat=${c.lat}&lon=${c.lon}&place=${encodeURIComponent(c.name)}`} style={link}>{c.label}</a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          !message && <p style={para}>Enter a postcode, town or council to see your MP, your council and the latest figures for your area.</p>
        )}
      </Shell>
    );
  }

  // Council, its county (two tier areas) and the MP.
  const { data: councilRow, error: councilErr } = councilCode
    ? await supabase.from('councils').select('slug, name, short_name, type, type_label, political_control, parent_slug, population, gss_code').eq('gss_code', councilCode).maybeSingle()
    : { data: null, error: null };
  if (councilErr) throw new Error(`your-area council lookup failed: ${councilErr.message}`);
  const council = councilRow as Council | null;
  let county: Council | null = null;
  if (council?.parent_slug) {
    const { data, error } = await supabase.from('councils').select('slug, name, short_name, type, type_label, political_control, parent_slug, population, gss_code').eq('slug', council.parent_slug).maybeSingle();
    if (error) throw new Error(`your-area county lookup failed: ${error.message}`);
    county = data as Council | null;
  }
  let mp: { member_id: number; name: string; display_name: string | null; party: string | null; constituency: string | null } | null = null;
  let constituencyName: string | null = null;
  if (constituencyCode) {
    const { data, error } = await supabase.from('mps').select('member_id, name, display_name, party, constituency, current_member').eq('constituency_gss_code', constituencyCode).order('current_member', { ascending: false }).limit(5);
    if (error) throw new Error(`your-area MP lookup failed: ${error.message}`);
    const rows = (data ?? []) as Array<{ member_id: number; name: string; display_name: string | null; party: string | null; constituency: string | null; current_member: boolean | null }>;
    mp = rows.find((r) => r.current_member) ?? null;
    constituencyName = mp?.constituency ?? rows[0]?.constituency ?? null;
  }

  // A council searched by name has no single constituency: list the MPs for every
  // constituency that overlaps it (ONS constituency to council lookup). Barnsley and
  // Sheffield are held under their pre-2025 codes in councils, so both are tried.
  let areaMps: { member_id: number; name: string; display_name: string | null; party: string | null; constituency: string | null }[] = [];
  if (!constituencyCode && council?.gss_code) {
    const alias: Record<string, string> = { E08000016: 'E08000038', E08000019: 'E08000039' };
    const codes = [council.gss_code, alias[council.gss_code]].filter(Boolean) as string[];
    const col = council.type === 'county' ? 'county_gss_code' : 'council_gss_code';
    const { data: geo, error: geoErr } = await supabase.from('welfare_constituency_geography').select('constituency_gss_code').in(col, codes).limit(500);
    if (geoErr) throw new Error(`your-area constituency list failed: ${geoErr.message}`);
    const pcons = [...new Set(((geo ?? []) as { constituency_gss_code: string }[]).map((g) => g.constituency_gss_code))];
    if (pcons.length) {
      const { data: m, error: mErr } = await supabase.from('mps').select('member_id, name, display_name, party, constituency').in('constituency_gss_code', pcons).eq('current_member', true).order('constituency');
      if (mErr) throw new Error(`your-area MP list failed: ${mErr.message}`);
      areaMps = (m ?? []) as typeof areaMps;
    }
  }

  // County councils: district figures are summed, as on the county's own page.
  let districtCodes: string[] = [];
  if (council?.type === 'county') {
    const { data: kids, error: kidsErr } = await supabase.from('councils').select('gss_code').eq('parent_slug', council.slug);
    if (kidsErr) throw new Error(`your-area districts lookup failed: ${kidsErr.message}`);
    districtCodes = ((kids ?? []) as { gss_code: string | null }[]).map((k) => k.gss_code).filter((g): g is string => !!g);
  }

  // Petitions most signed in the constituency (petition.parliament.uk, petitions that
  // reached 10,000 signatures only, as on the MP profile's Petitions tab).
  type PetitionRow = { petition_id: number; signature_count: number; petitions: { action: string; state: string; url: string } | null };
  let petitions: PetitionRow[] = [];
  if (constituencyCode) {
    const { data, error } = await supabase
      .from('petition_constituency_signatures')
      .select('petition_id, signature_count, petitions(action, state, url)')
      .eq('constituency_gss_code', constituencyCode)
      .order('signature_count', { ascending: false })
      .limit(3);
    if (error) console.error('your-area petitions:', error.message);
    else petitions = ((data ?? []) as unknown as PetitionRow[]).filter((r) => r.petitions?.action);
  }

  const code = council?.gss_code ?? null;
  const summed = council?.type === 'county' ? districtCodes : code ? [code] : [];
  const eduOrRoads = county?.gss_code ?? code; // county council in two tier areas
  const eduOrRoadsCouncil = county ?? council;
  const page = (c: Council | null, tab: string) => (c ? `/councils/${c.slug}#${tab}` : '/councils');

  const [crime, child, fuel, house, homeless, claimant, schools, roads, broadband, councilRefs, sewageTotals, league] = await Promise.all([
    summed.length ? settle('crime', loadCrime(summed, council?.population ?? null)) : null,
    summed.length ? settle('child poverty', loadChildPoverty(summed)) : null,
    code ? settle('fuel poverty', loadFuelPoverty(code)) : null,
    code ? settle('house prices', loadHousePriceHeadline(code)) : null,
    summed.length ? settle('homelessness', loadHomelessness(summed)) : null,
    code ? settle('claimant count', loadClaimantHeadline(code)) : null,
    eduOrRoads ? settle('schools', loadSchoolsHeadline(eduOrRoads)) : null,
    eduOrRoads ? settle('roads', loadRoadHeadline(eduOrRoads)) : null,
    summed.length ? settle('broadband', loadBroadbandHeadline(summed)) : null,
    council?.type === 'county' ? settle('council list', getCouncilRefs()) : null,
    settle('sewage', getAreaTotals()),
    code?.startsWith('E') ? settle('ratings', getLeagueData()) : null,
  ]);

  const cards: Card[] = [];
  const missing: string[] = [];
  // Why a topic has no figures here, where the reason is the source's coverage
  // (the same nation checks the loaders apply). Otherwise no reason is given.
  const areaCode = code ?? constituencyCode ?? '';
  const nation = areaCode[0];
  const NATION_NAME: Record<string, string> = { E: 'England', W: 'Wales', S: 'Scotland', N: 'Northern Ireland' };
  const reasonFor = (title: string): string | null => {
    const t = title.toLowerCase();
    if (nation !== 'E' && (t === 'homelessness' || t === 'fuel poverty' || t === 'schools' || t === 'council area rating')) return 'published for England only';
    if (nation === 'N' && t.startsWith('road casualties')) return 'published for Great Britain only';
    if (nation === 'W' && t === 'sewage spills') return 'Welsh figures are not on Open Govt yet';
    return null;
  };
  const add = (title: string, ok: unknown, card: () => Omit<Card, 'title'>) => {
    if (ok) cards.push({ title, ...card() }); else missing.push(title);
  };

  add('Crime', council && crime, () => ({
    key: 'crime', href: page(council, 'crime'), linkText: 'Crime in full',
    lines: [
      <p key="a" style={big}><strong>{n0(crime!.headline.total)}</strong> crimes recorded {crime!.headline.periodText}</p>,
      <p key="b" style={para}>{crime!.headline.change}</p>,
    ],
  }));
  add(county ? `Road casualties in ${county.short_name || county.name}` : 'Road casualties', eduOrRoadsCouncil && roads && (roads.killed != null || roads.ksi != null), () => ({
    key: 'roads', href: page(eduOrRoadsCouncil, 'crime'), linkText: 'Road casualties in full',
    lines: [
      roads!.ksi != null && roads!.killed != null ? (() => {
        // Seriously injured = killed or seriously injured, less those killed.
        const injured = Math.max(0, Math.round(roads!.ksi!) - roads!.killed!);
        return (
          <p key="a" style={big}>
            <strong>{n0(injured)}</strong> {injured === 1 ? 'person' : 'people'} seriously injured and <strong>{n0(roads!.killed!)}</strong> killed on the roads in {roads!.year}
          </p>
        );
      })() : roads!.ksi != null ? (
        <p key="a" style={big}><strong>{n0(roads!.ksi)}</strong> {Math.round(roads!.ksi) === 1 ? 'person' : 'people'} killed or seriously injured on the roads in {roads!.year}</p>
      ) : (
        <p key="a" style={big}><strong>{n0(roads!.killed!)}</strong> {roads!.killed === 1 ? 'person' : 'people'} killed on the roads in {roads!.year}</p>
      ),
      county ? <p key="b" style={para}>Figures for the whole of {county.name}, which looks after the roads here, not just {council?.short_name || council?.name}.</p> : null,
    ],
  }));
  add('House prices', council && house, () => ({
    key: 'house', href: page(council, 'housing'), linkText: 'House prices in full',
    lines: [
      <p key="a" style={big}><strong>£{n0(house!.price)}</strong> average house price, {house!.month}</p>,
      house!.change12 != null ? <p key="b" style={para}>{upDown(house!.change12).replace(/^./, (c) => c.toUpperCase())} over 12 months</p> : null,
    ],
  }));
  add('Homelessness', council && homeless && (homeless.owed != null || homeless.ta != null), () => ({
    key: 'homeless', href: page(council, 'housing'), linkText: 'Homelessness in full',
    lines: [
      homeless!.latestA1 && homeless!.owed != null ? <p key="a" style={big}><strong>{n0(homeless!.owed)}</strong> households owed help because they were homeless or at risk, {homeless!.labelOf(homeless!.latestA1)}</p> : null,
      homeless!.latestTA && homeless!.ta != null ? <p key="b" style={para}>{n0(homeless!.ta)} households in temporary accommodation at {quarterEnd(homeless!.latestTA)}{homeless!.children != null ? `, with ${n0(homeless!.children)} children` : ''}</p> : null,
    ],
  }));
  add('Claimant count', council && claimant, () => ({
    key: 'claimant', href: page(council, 'work'), linkText: 'Work and benefits in full',
    lines: [
      <p key="a" style={big}><strong>{n0(claimant!.claimants)}</strong> people claiming benefits because they are out of work, {claimant!.month}</p>,
      <p key="b" style={para}>{[claimant!.rate != null ? `${claimant!.rate.toFixed(1)}% of residents aged 16 to 64` : null, claimant!.change != null && claimant!.yearAgoMonth ? `${upDown(claimant!.change, 'n')} on ${claimant!.yearAgoMonth}` : null].filter(Boolean).join(' · ')}</p>,
    ],
  }));
  add('Child poverty', council && child && (child.ahc || child.bhc), () => {
    const fig = child!.ahc ?? child!.bhc!;
    return {
      key: 'child', href: page(council, 'work'), linkText: 'Child poverty in full',
      lines: [
        <p key="a" style={big}><strong>{fig.pct != null ? pct1(fig.pct) : n0(fig.count)}</strong>{fig.pct != null ? ' of children under 16' : ' children under 16'} live in low income families, {fyText(child!.latest)}</p>,
        <p key="b" style={para}>{n0(fig.count)} children, measured {child!.ahc ? 'after' : 'before'} housing costs</p>,
      ],
    };
  });
  add('Fuel poverty', council && fuel, () => ({
    key: 'fuel', href: page(council, 'work'), linkText: 'Fuel poverty in full',
    lines: [
      <p key="a" style={big}><strong>{pct1(fuel!.pct)}</strong> of households in fuel poverty, {fuel!.year}</p>,
      <p key="b" style={para}>{n0(fuel!.mine.fuel_poor)} households{fuel!.engPct != null ? ` · England ${pct1(fuel!.engPct)}` : ''}</p>,
    ],
  }));
  add(county ? `Schools in ${county.short_name || county.name}` : 'Schools', eduOrRoadsCouncil && schools, () => ({
    key: 'schools', href: page(eduOrRoadsCouncil, 'schools'), linkText: 'Schools in full',
    lines: [
      <p key="a" style={big}><strong>{n0(schools!.count)}</strong> open state schools with {n0(schools!.pupils)} pupils</p>,
      <p key="b" style={para}>{schools!.concern === 0 ? 'None' : n0(schools!.concern)} in a category of concern · Ofsted, as at {schools!.snapshot}</p>,
      county ? <p key="c" style={para}>Figures for the whole of {county.name}, which runs schools here, not just {council?.short_name || council?.name}.</p> : null,
    ],
  }));
  add('Broadband', council && broadband, () => ({
    key: 'broadband', href: page(council, 'broadband'), linkText: 'Broadband and mobile in full',
    lines: [
      <p key="a" style={big}><strong>{pct1(broadband!.gigabitPct)}</strong> of homes and businesses can get gigabit broadband, {broadband!.month}</p>,
    ],
  }));

  // Sewage: council area and constituency, ranked as on /sewage.
  const sewageLines: ReactNode[] = [];
  if (sewageTotals) {
    const years = latestYears(sewageTotals);
    const rankFor = (type: 'council' | 'constituency', c: string | null) => {
      if (!c) return null;
      const nation = nationOfCode(c);
      const year = nation ? years[nation] : null;
      if (!nation || year == null) return null;
      const base = sewageTotals.filter((t) => t.area_type === type && t.nation === nation && t.year === year);
      const ranked = rankByHours(type === 'council' && council?.type === 'county' && councilRefs ? countyTotals(base, councilRefs, year) : base);
      const r = ranked.find((t) => t.area_gss_code === c);
      return r ? { r, year } : null;
    };
    const sc = rankFor('council', code);
    const sk = rankFor('constituency', constituencyCode);
    if (sc) sewageLines.push(<p key="a" style={big}><strong>{n0(sc.r.spill_hours)}</strong> hours of sewage spills in {sc.r.area_name}, {sc.year}</p>, <p key="b" style={para}>{n0(sc.r.overflows)} storm overflows · {sewageOrdinal(sc.r.rank)} most of {n0(sc.r.of)} {council?.type === 'county' ? 'county council areas' : 'council areas'}</p>);
    if (sk) sewageLines.push(<p key="c" style={para}>{sk.r.area_name} constituency: {n0(sk.r.spill_hours)} hours from {n0(sk.r.overflows)} overflows · {sewageOrdinal(sk.r.rank)} most of {n0(sk.r.of)}</p>);
  }
  const sewageQs = new URLSearchParams();
  if (code) sewageQs.set('council', code);
  if (constituencyCode) sewageQs.set('constituency', constituencyCode);
  add('Sewage spills', sewageLines.length > 0, () => ({ key: 'sewage', href: `/sewage?${sewageQs.toString()}#your-area`, linkText: 'Sewage spills in full', lines: sewageLines }));

  if (constituencyCode) {
    const where = mp?.constituency ?? constituencyName ?? 'this constituency';
    add('Petitions', petitions.length > 0, () => ({
      key: 'petitions', href: mp ? `/mps/${mp.member_id}#petitions` : 'https://petition.parliament.uk/', linkText: mp ? `Petitions in ${where} in full` : 'Parliament petitions site',
      lines: [
        <p key="h" style={{ ...para, marginBottom: '8px' }}>Most signed in {where}</p>,
        <ol key="l" style={{ margin: '0 0 6px', paddingLeft: '20px' }}>
          {petitions.map((p) => (
            <li key={p.petition_id} style={{ ...para, marginBottom: '6px' }}>
              <a href={p.petitions!.url} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{p.petitions!.action}</a>
              <br />{n0(p.signature_count)} signatures here · {p.petitions!.state === 'open' ? 'open' : 'closed'}
            </li>
          ))}
        </ol>,
        <p key="n" style={{ ...para, fontSize: '14px' }}>Petitions that reached 10,000 signatures in this Parliament.</p>,
      ],
    }));
  }

  // League table hidden (lib/feature-flags.ts): no area rating card, and the county card keeps only its Ofsted grade.
  const leagueRow = league ? [...league.rows, ...league.separate].find((r) => r.code === code) : null;
  if (SHOW_LEAGUE_TABLE) add('Council area rating', council && leagueRow && leagueRow.areaRank != null, () => ({
    key: 'ratings', href: page(council, 'ratings'), linkText: 'Ratings in full',
    lines: [
      <p key="a" style={big}><strong>{ordinal(leagueRow!.areaRank!)}</strong> of {n0(league!.stability.ranked)} areas in England</p>,
      <p key="b" style={para}>Band {leagueRow!.areaBand} ({bandLabel(leagueRow!.areaBand)})</p>,
    ],
  }));

  // County councils are not ranked as areas (their districts are, one by one), so the
  // county card gives its Ofsted children's services grade and its districts' ranks,
  // as the county's own Ratings tab does.
  if (council?.type === 'county' && league) {
    const ofsted = league.ofstedByCouncil.get(council.gss_code ?? '');
    const all = [...league.rows, ...league.separate];
    const ranks = SHOW_LEAGUE_TABLE ? districtCodes.map((c) => all.find((r) => r.code === c)).filter((r): r is NonNullable<typeof r> => !!r && r.areaRank != null).sort((a, b) => a.areaRank! - b.areaRank!) : [];
    add('Council ratings', ofsted?.grade || ranks.length, () => ({
      key: 'ratings', href: page(council, 'ratings'), linkText: 'Ratings in full',
      lines: [
        ofsted?.grade ? <p key="a" style={big}>Ofsted children&rsquo;s services: <strong>{ofsted.grade}</strong></p> : null,
        ranks.length ? <p key="b" style={para}>Its districts are ranked one by one: from {ordinal(ranks[0].areaRank!)} ({ranks[0].name}) to {ordinal(ranks[ranks.length - 1].areaRank!)} ({ranks[ranks.length - 1].name}) of {n0(league.stability.ranked)} areas in England</p> : null,
      ],
    }));
    const i = missing.indexOf('Council area rating');
    if (i >= 0) missing.splice(i, 1);
  }

  // Two columns of even height, cut once so the reading order runs down the left
  // column and then the right. Height is judged by how much text a topic holds
  // (headline text is larger, so it counts double).
  const textLen = (n: ReactNode): number => {
    if (n == null || typeof n === 'boolean') return 0;
    if (typeof n === 'string' || typeof n === 'number') return String(n).length;
    if (Array.isArray(n)) return n.reduce((t: number, x) => t + textLen(x), 0);
    const el = n as { props?: { children?: ReactNode; style?: CSSProperties } };
    const inner = textLen(el.props?.children ?? null);
    return el.props?.style === big ? inner * 2 : inner;
  };
  const columns = balanceColumns(cards, (c) => 120 + textLen(c.lines));

  const control = (c: Council) =>
    c.political_control ? (c.political_control === 'No overall control' ? 'No party has overall control' : `Run by ${c.political_control}`) : null;

  return (
    <Shell>
      {place && (
        <p style={{ ...para, marginBottom: '18px' }}>
          Results for the area containing the centre of {place}. Enter a postcode for an exact match.
        </p>
      )}

      {/* Two newspaper columns, no boxes: items flow down one column then the next,
          so a short item never leaves a gap beside a long one. One column on phones. */}
      <style>{TWO_COLUMN_CSS}</style>
      <div className="og-two" style={{ marginBottom: '8px' }}>
        <section style={{ borderTop: `3px solid ${ACCENT}`, padding: '14px 0 18px' }}>
          <h2 style={h2}>{!constituencyCode && areaMps.length > 1 ? 'MPs for this area' : 'Your MP'}</h2>
          {!constituencyCode && areaMps.length > 0 ? (
            <>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 6px' }}>
                {areaMps.map((m) => (
                  <li key={m.member_id} style={{ ...para, marginBottom: '4px' }}>
                    <a href={`/mps/${m.member_id}`} style={{ color: INK }}><strong>{displayMpName(m.display_name || m.name)}</strong></a> · {normaliseParty(m.party)} · {m.constituency}
                  </li>
                ))}
              </ul>
              {areaMps.length > 1 && <p style={para}>Constituencies that cover part of {council?.name}. Enter a postcode to find your own MP.</p>}
            </>
          ) : mp ? (
            <>
              <p style={big}><a href={`/mps/${mp.member_id}`} style={{ color: INK }}><strong>{displayMpName(mp.display_name || mp.name)}</strong></a></p>
              <p style={para}>{normaliseParty(mp.party)} · {mp.constituency}</p>
              <p style={para}><a href={`/mps/${mp.member_id}`} style={link}>Votes, expenses, interests and speeches</a></p>
            </>
          ) : (
            <p style={para}>{constituencyName ? `No sitting MP is listed for ${constituencyName}.` : constituencyCode ? 'We could not match a constituency for this area.' : 'Enter a postcode to find your MP.'}</p>
          )}
        </section>

        <section style={{ borderTop: `3px solid ${ACCENT}`, padding: '14px 0 18px' }}>
          <h2 style={h2}>Your council</h2>
          {council ? (
            <>
              <p style={big}><a href={`/councils/${council.slug}`} style={{ color: INK }}><strong>{council.name}</strong></a></p>
              {control(council) && <p style={para}>{control(council)}</p>}
              {county && (
                <p style={para}>
                  County council: <a href={`/councils/${county.slug}`} style={{ color: INK, textDecoration: 'underline' }}>{county.name}</a>
                  {control(county) ? ` · ${control(county)}` : ''}
                </p>
              )}
              <p style={para}><a href={`/councils/${council.slug}`} style={link}>Spending, leadership and services</a></p>
            </>
          ) : (
            <p style={para}>We could not match a council for this area.</p>
          )}
        </section>
      </div>

      {cards.length > 0 && (
        <div className="og-two">
          {columns.map((col, ci) => (
            <div key={ci}>
              {col.map((c) => (
                <section key={c.key} style={{ borderTop: `1px solid ${HAIRLINE}`, padding: '14px 0 18px' }}>
                  <h2 style={h2}>{c.title}</h2>
                  <div>{c.lines}</div>
                  <p style={{ ...para, marginTop: '8px', marginBottom: 0 }}><a href={c.href} style={link}>{c.linkText} →</a></p>
                </section>
              ))}
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p style={{ ...para, marginTop: '20px' }}>
          Not shown for {NATION_NAME[nation] ? `this area (${NATION_NAME[nation]})` : 'this area'}:{' '}
          {missing.map((m) => { const r = reasonFor(m); return r ? `${m} (${r})` : `${m} (no figures held for this area)`; }).join('; ')}.
        </p>
      )}
    </Shell>
  );
}
