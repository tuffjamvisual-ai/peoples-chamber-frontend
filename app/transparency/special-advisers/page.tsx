// /transparency/special-advisers: who advises each minister, and what special advisers declared.
//
// Two sources:
//   - the Cabinet Office's yearly named list of special advisers with pay and salary bands and the cost totals
//     (spad_appointments and spad_releases, from /api/sync-spad-roster; owner, 28 Oct 2026), shown in full with
//     each appointing minister linked to their Open Govt page when we matched them;
//   - the departments' quarterly returns of gifts, hospitality and meetings with senior media figures (the four
//     quarterly tables, from /api/sync-spad-transparency, weekly). Every quarter is kept from April to June 2026
//     on; QuarterSections shows one at a time with a selector, the latest first.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import SeeAlso from '../../components/SeeAlso';
import { resolveOrgToDeptSlug } from '@/lib/govOrgSlug';
import ArticleEndSignup from '../../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';
import SpadSource from '../../components/SpadSource';
import { SPAD_LIST_ANCHOR, longDate, totalsLine, buildBackground, plainName, quarterEndDate, monthYearLabel, type SpadRow, type SpadReleaseRow, type SpadInterestRow, type SpadHistoryRow, type SpadPostRow, type SpadBackground, type SpadMinisterStatus, type SpadMinisterInfo } from '@/lib/spad-display';
import Link from 'next/link';
import SpadRosterTable from './SpadRosterTable';
import QuarterSections, { type RosterRow, type GiftRow, type HospRow, type MeetRow } from './QuarterSections';

// The returns label departments by short name. Map them to department pages; anything
// not listed falls back to the GOV.UK name lookup, and unknown names get no link.
const AREA_DEPT: Record<string, string> = {
  'Cabinet Office': 'cabinet-office', DBT: 'business-trade', MHCLG: 'housing',
  DHSC: 'health', MoJ: 'justice', DESNZ: 'energy', Defra: 'environment', DfT: 'transport', DfE: 'education',
  'Home Office': 'home-office', 'Foreign Office': 'foreign-office', DWP: 'work-pensions', NIO: 'northern-ireland-office',
  'Lords Leader & Whips': 'lords-leader', 'Commons Leader & Whips': 'commons-leader', 'HM Treasury': 'treasury', DCMS: 'culture',
  MoD: 'defence', 'Scotland Office': 'scotland-office', 'Wales Office': 'wales-office',
};
const deptFor = (area: string): string | null => AREA_DEPT[area] ?? resolveOrgToDeptSlug(area);

export const revalidate = 3600;

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

export const metadata: Metadata = {
  title: "Special Advisers: Who Advises Each UK Minister",
  description:
    'Every UK special adviser named by the Cabinet Office, with their minister, pay band and salary band, and the gifts, hospitality and media meetings they declared each quarter.',
  alternates: { canonical: '/transparency/special-advisers' },
};

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).order('id', { ascending: true }).range(from, from + PAGE - 1);
    // Throw rather than stop (24 Oct 2026, report 36), so a failed page keeps the last good version up.
    if (error) throw new Error(`/transparency/special-advisers ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

// "April to June 2026" → a number that sorts quarters in time order.
const QUARTER_START = ['january', 'april', 'july', 'october'];
const quarterOrder = (q: string) => {
  const m = q.match(/^(\w+)\s+to\s+\w+\s+(\d{4})$/);
  return m ? Number(m[2]) * 10 + QUARTER_START.indexOf(m[1].toLowerCase()) : 0;
};

export default async function SpecialAdvisersPage() {
  const [roster, gifts, hosps, meets, releaseRes] = await Promise.all([
    fetchAll<RosterRow>('special_advisers', 'name, area, quarter'),
    fetchAll<GiftRow>('spad_gifts', 'spad_name, area, quarter, gift_date, gift_descr, donor, value_gbp, outcome'),
    fetchAll<HospRow>('spad_hospitality', 'spad_name, area, quarter, hosp_date, hosp_descr, provider, purpose'),
    fetchAll<MeetRow>('spad_media_meetings', 'spad_name, area, quarter, meeting_date, media_org, individual, purpose'),
    supabase.from('spad_releases').select('release_slug, as_at, headcount, fte, paybill, prior_paybill, source_url').order('as_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (releaseRes.error) throw new Error(`/transparency/special-advisers spad_releases: ${releaseRes.error.message}`);
  const release = releaseRes.data as SpadReleaseRow | null;
  let appointments: SpadRow[] = [];
  if (release) {
    const { data, error } = await supabase.from('spad_appointments')
      .select('adviser_name, minister_title, minister_name, minister_member_id, pay_band, salary_band_text, salary_band_min, notes')
      .eq('release_slug', release.release_slug).order('id', { ascending: true });
    if (error) throw new Error(`/transparency/special-advisers spad_appointments: ${error.message}`);
    appointments = (data ?? []) as SpadRow[];
  }

  // Official background for each adviser in the list (owner, 28 Oct 2026): declared interests, the ministers they
  // advised in every yearly list we hold, and ACOBA advice. Matched by exact name only.
  let background: Record<string, SpadBackground> = {};
  if (appointments.length) {
    const [ints, hist, posts, editions] = await Promise.all([
      fetchAll<SpadInterestRow>('spad_interests', 'adviser_name, department, period, entry_text, category, is_recusal, end_date_text, source_title, source_url, source_page'),
      fetchAll<SpadHistoryRow>('spad_appointments', 'adviser_name, minister_title, as_at, source_url'),
      fetchAll<SpadPostRow>('spad_post_appointments', 'adviser_name, former_department, new_employer, new_role, advice_date, conditions_text, source_url'),
      supabase.from('spad_releases').select('as_at').then(({ data, error }) => { if (error) throw new Error(`/transparency/special-advisers spad_releases: ${error.message}`); return (data ?? []) as { as_at: string }[]; }),
    ]);
    background = buildBackground(appointments.map((a) => a.adviser_name), ints, hist, posts, editions.map((e) => e.as_at));
  }

  // Who holds the posts today (Members API, recomputed weekly; owner, 28 Oct 2026). The list is dated 31 March 2026:
  // a. ministers still in the same post, b. Cabinet ministers appointed since (no official list for them yet),
  // c. advisers whose minister has since left.
  const { data: statusData, error: statusError } = await supabase.from('spad_minister_status')
    .select('kind, minister_title, minister_name, member_id, gender, post_name, started_on, left_on, still_in_post, area');
  if (statusError) throw new Error(`/transparency/special-advisers spad_minister_status: ${statusError.message}`);
  const status = (statusData ?? []) as SpadMinisterStatus[];
  const listedStatus = new Map(status.filter((s) => s.kind === 'listed').map((s) => [s.minister_title, s]));
  const info: Record<string, SpadMinisterInfo> = {};
  for (const [title, s] of listedStatus) info[title] = { left_on: s.still_in_post ? null : s.left_on, api_name: plainName(s.minister_name) };
  const known = status.length > 0;
  const stillTitles = new Set([...listedStatus.values()].filter((s) => s.still_in_post).map((s) => s.minister_title));
  const groupA = known ? appointments.filter((a) => stillTitles.has(a.minister_title)) : appointments;
  const groupC = known ? appointments.filter((a) => !stillTitles.has(a.minister_title)) : [];
  const stillMembers = new Set([...listedStatus.values()].filter((s) => s.still_in_post).map((s) => s.member_id));
  const groupB = status.filter((s) => s.kind === 'current' && !stillMembers.has(s.member_id))
    .map((s) => ({ ...s, advisers: [...new Set(roster.filter((r) => s.area && r.area === s.area && s.started_on && (quarterEndDate(r.quarter) ?? '') > s.started_on).map((r) => r.name))].sort() }));
  // Link only to MP pages we have.
  const bIds = groupB.map((s) => s.member_id).filter((x): x is number => x != null);
  const { data: bMps } = bIds.length ? await supabase.from('mps').select('member_id').in('member_id', bIds) : { data: [] };
  const mpPages = new Set((bMps ?? []).map((m: { member_id: number }) => m.member_id));
  const listedCount = listedStatus.size || new Set(appointments.map((a) => a.minister_title)).size;
  const pm = status.find((s) => s.kind === 'current' && /^prime minister/i.test(s.post_name ?? ''));
  const nextListDue = release ? `July ${Number(release.as_at.slice(0, 4)) + 1}` : '';

  const quarters = [...new Set([...roster, ...gifts, ...hosps, ...meets].map((r) => r.quarter))].sort((a, b) => quarterOrder(b) - quarterOrder(a));
  const deptSlugs: Record<string, string> = {};
  for (const area of new Set(roster.map((r) => r.area))) { const s = deptFor(area); if (s) deptSlugs[area] = s; }
  const totals = release ? totalsLine(release) : null;

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          Transparency · Special Advisers
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.15 }}>
          Who advises Whitehall, and what they declared
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch' }}>
          Special Advisers are political appointees paid out of public funds. They are not civil servants, not ministers and not elected. They write speeches, brief ministers, set tone, and often drive policy. Their conduct sits outside the MPs&rsquo; Register of Interests and outside the standard civil service rules.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', marginTop: '12px' }}>
          Once a year the Cabinet Office publishes every special adviser by name, with the minister who appointed them and their pay band. The Cabinet Office and the major Whitehall departments also publish a quarterly return of each Special Adviser&rsquo;s gifts, hospitality, and meetings with senior media figures. This page brings both together; every quarter is kept from April to June 2026 on.
        </p>
      </header>

      {release && appointments.length > 0 && (
        <section id={SPAD_LIST_ANCHOR} style={{ marginBottom: '40px', scrollMarginTop: '16px' }}>
          <h2 style={sectionH2}>All special advisers in post at {longDate(release.as_at)}</h2>
          {totals && <p style={{ fontSize: '17px', lineHeight: 1.6, fontWeight: 'bold', margin: '0 0 10px', maxWidth: '62ch' }}>{totals}</p>}
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', margin: '0 0 10px' }}>
            This is the latest list the Cabinet Office has published. Ministers have changed since{pm && pm.started_on && pm.started_on > release.as_at ? `: ${plainName(pm.minister_name)} became Prime Minister in ${monthYearLabel(pm.started_on)}` : ''}. The next list is due in {nextListDue}.
          </p>
          {known && <p style={{ fontSize: '15px', lineHeight: 1.7, fontWeight: 'bold', margin: '0 0 14px' }}>{stillTitles.size} of the {listedCount} appointing ministers are still in the same post.</p>}
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', margin: '0 0 14px' }}>
            One row per appointment: an adviser who works for two ministers is listed under each. Salaries are published only from £81,000, in bands of £5,000. Ministers with an Open Govt page are linked; members of the Lords have none.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', margin: '0 0 14px' }}>
            Declared interests are published by each department, not by the adviser. Every special adviser declares their interests to the permanent secretary of their department, who decides which are relevant enough to publish and how any conflict is managed, for example by a recusal: the adviser stays out of the matters named. The Cabinet Office publishes its advisers&rsquo; interests separately each year; most other departments print them inside their annual report and accounts. Each entry below is quoted word for word and linked to the document it comes from.
          </p>
          <h3 style={groupH3}>Ministers still in the same post</h3>
          <p style={{ fontSize: '15px', lineHeight: 1.7, margin: '0 0 10px' }}>Their advisers as listed at {longDate(release.as_at)}.</p>
          <SpadRosterTable rows={groupA} background={background} ministerInfo={info} asAtLabel={longDate(release.as_at)} idPrefix="a" />

          {known && (
            <>
              <h3 style={groupH3}>Ministers appointed since {longDate(release.as_at)}</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', margin: '0 0 10px' }}>
                No official list of special advisers yet. The Cabinet Office&rsquo;s next list is due in {nextListDue}. Advisers named in quarterly declarations since then:
              </p>
              <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, fontSize: '15px' }}>
                {groupB.map((s) => (
                  <li key={s.minister_title} style={{ padding: '8px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    {s.member_id != null && mpPages.has(s.member_id)
                      ? <Link href={`/mps/${s.member_id}`} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: 'bold' }}>{plainName(s.minister_name)}</Link>
                      : <strong>{plainName(s.minister_name)}</strong>}
                    {', '}{s.post_name}{s.started_on ? `, since ${longDate(s.started_on)}` : ''}.
                    <span style={{ display: 'block' }}>Advisers named in quarterly declarations since then: {s.advisers.length ? s.advisers.join(', ') : 'none yet'}.</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 18px' }}>
                Posts and dates: <a href="https://members-api.parliament.uk/" rel="noopener" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>UK Parliament Members API</a>, checked every week. Contains Parliamentary information licensed under the Open Parliament Licence v3.0.
              </p>
            </>
          )}

          {groupC.length > 0 && (
            <details style={{ margin: '8px 0 0' }}>
              <summary style={{ ...groupH3, cursor: 'pointer', display: 'list-item' }}>Advisers listed at {longDate(release.as_at)} whose minister has since left ({groupC.length})</summary>
              <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', margin: '6px 0 10px' }}>
                Special advisers&rsquo; appointments normally end when their minister leaves. Some may have been reappointed; the Cabinet Office has not yet published a new list.
              </p>
              <SpadRosterTable rows={groupC} background={background} ministerInfo={info} asAtLabel={longDate(release.as_at)} idPrefix="c" />
            </details>
          )}
          <SpadSource slug={release.release_slug} url={release.source_url} />
        </section>
      )}

      <h2 style={{ ...sectionH2, fontSize: '22px', color: ACCENT }}>Quarterly declarations</h2>
      <QuarterSections quarters={quarters} roster={roster} gifts={gifts} hosps={hosps} meets={meets} deptSlugs={deptSlugs} />

      <SeeAlso links={[
        { href: '/transparency/revolving-door', label: 'Revolving Door', note: 'Former ministers and officials taking outside jobs, and the conditions attached' },
        { href: '/lobbying', label: 'Lobbying', note: 'Who meets ministers most, and which lobbying firms act for which clients' },
        { href: '/transparency/ministers-meetings', label: "Ministers' meetings", note: 'Every published meeting between ministers and outside organisations' },
        { href: '/transparency/hospitality', label: "Ministers' hospitality", note: 'Gifts, hospitality and travel accepted by ministers' },
        { href: '/departments', label: 'All government departments', note: 'Ministers, budgets, staff and record for each department' },
      ]} />

      {/* Newsletter sign-up at the end of the page, for readers who are not signed in (report 81). */}
      <ArticleEndSignup source="data-special-advisers" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}

const groupH3: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '18px', fontWeight: 'bold', margin: '26px 0 8px' };
const sectionH2: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
