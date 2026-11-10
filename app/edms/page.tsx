import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { displayMpName } from '@/lib/mp-name';
import { supabaseAdminRead } from '@/lib/supabase-admin';
import { allEdms, edmState, memberEdmIds } from '@/lib/edm-pages';
import { petitionDate } from '@/lib/petition-pages';
import { ShowAll } from '@/app/components/NoJsPager';

// Early day motions this Parliament (owner, backlog item 15b, 6 Nov 2026), newest first, 25 at a time. With over 4,000 motions the
// whole list cannot sit in the page, so Show more is a link that asks for 25 more and lands on the first new one, and it works with
// JavaScript off. Filters, sort and search filter a cached list, so they cost no database read. Filter links are nofollow, so crawlers
// do not read every combination (owner, 6 Nov 2026: bots read /feedback once per page). Show more stays followable, so every motion
// can be reached by link. data-own-more stops lib/phone-enhance.ts folding the list a second time.
export const dynamic = 'force-dynamic';

type Search = { state?: string; prayer?: string; q?: string; sort?: string; member?: string; role?: string; show?: string };
const INK = '#14100d';
const ACCENT = '#7a1612';
const STEP = 25;
const filtered = (s: Search) => !!(s.state || s.prayer || s.q || s.sort || s.member || s.show);
const n0 = (n: number) => n.toLocaleString('en-GB');

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const s = await searchParams;
  return {
    title: 'Early day motions in the Commons',
    description: 'Every early day motion tabled in the House of Commons since the July 2024 general election, with its text, sponsors, signatures and amendments.',
    alternates: { canonical: '/edms' },
    ...(filtered(s) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function EdmsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const state = s.state === 'open' || s.state === 'closed' ? s.state : null;
  const prayer = s.prayer === '1';
  const sort = s.sort === 'signatures' ? 'signatures' : null;
  const q = (s.q ?? '').trim().slice(0, 100);
  const memberId = /^\d{1,7}$/.test(s.member ?? '') ? Number(s.member) : null;
  const role = s.role === 'tabled' || s.role === 'signed' ? s.role : null;

  const [{ rows, sessionStart }, member] = await Promise.all([allEdms(), memberId ? memberEdmIds(memberId) : null]);
  const memberName = memberId
    ? await supabaseAdminRead.from('mps').select('display_name, name').eq('member_id', memberId).maybeSingle().then(({ data }) => displayMpName((data?.display_name || data?.name) as string | undefined) ?? null)
    : null;
  const inMember = member ? new Set(role === 'tabled' ? member.tabled : role === 'signed' ? member.signed : [...member.tabled, ...member.signed]) : null;

  // A number finds that number in every session; anything else searches titles.
  const asNumber = q.replace(/^edm\s*/i, '').trim().toUpperCase();
  const isNumber = /^\d+([A-Z]\d*)?$/.test(asNumber);
  const needle = q.toLocaleLowerCase('en-GB');
  let list = rows.filter((m) => {
    const st = edmState(m, sessionStart);
    if (state === 'open' && st !== 'Open') return false;
    if (state === 'closed' && st !== 'Closed') return false;
    if (prayer && !m.is_prayer) return false;
    if (inMember && !inMember.has(m.id)) return false;
    if (!q) return true;
    return isNumber ? (m.uin_with_suffix ?? '').toUpperCase() === asNumber : m.title.toLocaleLowerCase('en-GB').includes(needle);
  });
  if (sort) list = [...list].sort((a, b) => b.signature_count - a.signature_count || b.date_tabled.localeCompare(a.date_tabled));
  const wanted = Number(s.show);
  const show = Number.isInteger(wanted) && wanted > STEP ? Math.min(wanted, list.length) : STEP;
  const shown = list.slice(0, show);

  const href = (over: Partial<Record<keyof Search, string | null>>) => {
    const p = new URLSearchParams();
    const pick = { state, prayer: prayer ? '1' : null, sort, q: q || null, member: memberId ? String(memberId) : null, role, ...over };
    for (const [k, v] of Object.entries(pick)) if (v) p.set(k, v);
    const text = p.toString();
    return text ? `/edms?${text}` : '/edms';
  };
  const chips: { label: string; on: boolean; to: string }[] = [
    { label: 'Open', on: state === 'open', to: href({ state: state === 'open' ? null : 'open' }) },
    { label: 'Closed', on: state === 'closed', to: href({ state: state === 'closed' ? null : 'closed' }) },
    { label: 'Prayers against statutory instruments', on: prayer, to: href({ prayer: prayer ? null : '1' }) },
    { label: 'Most signatures first', on: !!sort, to: href({ sort: sort ? null : 'signatures' }) },
    ...(memberId ? [
      { label: 'Tabled', on: role === 'tabled', to: href({ role: role === 'tabled' ? null : 'tabled' }) },
      { label: 'Signed', on: role === 'signed', to: href({ role: role === 'signed' ? null : 'signed' }) },
    ] : []),
  ];

  return (
    <OpenGovShell>
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Early day motions', path: '/edms' }])} />
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>{memberName ? `Early day motions: ${memberName}` : 'Early day motions'}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.6 }}>
        Motions MPs have tabled in the House of Commons since the July 2024 general election. Few are debated; other MPs sign them to show support.
      </p>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 16px', maxWidth: '720px', lineHeight: 1.6 }}>
        Open means tabled this session and not withdrawn. Closed means tabled in an earlier session.
      </p>

      <form action="/edms" method="get" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 12px', maxWidth: '720px' }}>
        <label htmlFor="edm-search" style={{ flex: '1 0 100%', fontSize: '15px', fontWeight: 'bold', color: INK }}>Search by title or number</label>
        <input id="edm-search" type="search" name="q" defaultValue={q} style={{ flex: '1 1 200px', minWidth: 0, minHeight: '44px', padding: '8px 10px', fontSize: '16px', color: INK, background: '#fbf4e6', border: `1px solid ${INK}`, borderRadius: 0, boxSizing: 'border-box' }} />
        {state && <input type="hidden" name="state" value={state} />}
        {prayer && <input type="hidden" name="prayer" value="1" />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {memberId && <input type="hidden" name="member" value={memberId} />}
        {role && <input type="hidden" name="role" value={role} />}
        <button type="submit" style={{ minHeight: '44px', padding: '8px 16px', fontSize: '15px', fontWeight: 'bold', color: '#fbf4e6', background: INK, border: `1px solid ${INK}`, borderRadius: 0, cursor: 'pointer' }}>Search</button>
      </form>

      <ul aria-label="Filters" style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 12px', padding: 0 }}>
        {chips.map((c) => (
          <li key={c.label}>
            <a href={c.to} rel="nofollow" aria-current={c.on ? 'true' : undefined} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '6px 12px', fontSize: '15px', boxSizing: 'border-box', textDecoration: 'none', border: `1px solid ${INK}`, color: c.on ? '#fbf4e6' : INK, background: c.on ? ACCENT : 'transparent' }}>{c.label}</a>
          </li>
        ))}
      </ul>

      <p role="status" style={{ fontSize: '15px', color: INK, margin: '0 0 8px' }}>
        {n0(list.length)} {list.length === 1 ? 'motion' : 'motions'}{sort ? ', most signatures first' : ', newest first'}
        {filtered(s) && <> · <a href="/edms" rel="nofollow" style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>Clear filters</a></>}
      </p>

      {shown.length === 0 ? <p style={{ fontSize: '16px', color: INK, margin: '16px 0' }}>No motions match.</p> : (
        <ShowAll id="edms-list" count={(shown).length} rows="> li">
        <ul data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map((m, i) => (
            <li key={m.id} id={`m${i + 1}`} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
              <Link href={`/edms/${m.id}`} prefetch={false} className="no-hover-scale" style={{ display: 'block', minHeight: '44px', padding: '12px 0', color: INK, textDecoration: 'none' }}>
                <span style={{ display: 'block', fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{m.title}</span>
                <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '4px' }}>
                  EDM {m.uin_with_suffix} · {petitionDate(m.date_tabled)} · {n0(m.signature_count)} {m.signature_count === 1 ? 'signature' : 'signatures'} · {edmState(m, sessionStart)}
                  {m.is_prayer && <> · Prayer</>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        </ShowAll>
      )}
      {show < list.length && (
        <p style={{ margin: '12px 0 0' }}>
          <a href={`${href({ show: String(show + STEP) })}#m${show + 1}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', padding: '8px 12px', border: `1px solid ${INK}`, fontSize: '15px', fontWeight: 'bold', color: INK, textDecoration: 'none' }}>Show more ({n0(list.length - show)} left)</a>
        </p>
      )}
    </OpenGovShell>
  );
}
