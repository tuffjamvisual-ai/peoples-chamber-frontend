import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '@/app/components/OpenGovShell';
import BackLink from '@/app/components/BackLink';
import NoJsPager from '@/app/components/NoJsPager';
import { displayMpName } from '@/lib/mp-name';
import { lookupMember } from '@/lib/former-mps';
import { divisionHref } from '@/lib/division-links';
import { ARCHIVE_FIRST_YEAR, ARCHIVE_LAST_YEAR, ARCHIVE_NOTE, HANSARD_LABEL, archiveDate, memberVotesInYear } from '@/lib/historic-archive';

// One member's votes in one year from 2004 to 2016 (owner, 6 Nov 2026), linked from their page. Kept apart from the voting record, with no rebellion figures.
// The archive does not change, so each page is rendered once and cached. Not in the sitemap.
export const revalidate = 2592000;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
type Params = { id: string; year: string };

const memberName = cache(async (memberId: number): Promise<string | null> => {
  const { data, error } = await supabase.from('mps').select('display_name, name').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`/mps/[id]/votes-from-hansard mps: ${error.message}`);
  if (data) return displayMpName((data.display_name || data.name || '').trim()) || null;
  const m = await lookupMember(memberId);
  return m.kind === 'former_mp' ? m.mp.name : null;
});

const parse = ({ id, year }: Params) => {
  const memberId = Number(id), y = Number(year);
  return Number.isInteger(memberId) && memberId > 0 && /^\d{4}$/.test(year) && y >= ARCHIVE_FIRST_YEAR && y <= ARCHIVE_LAST_YEAR ? { memberId, year: y } : null;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = parse(await params);
  const name = p ? await memberName(p.memberId) : null;
  if (!p || !name) return { title: 'Commons votes' };
  return {
    title: titleWithin(`${name}: Commons votes in ${p.year}`),
    description: `How ${name} voted in the House of Commons in ${p.year}. ${HANSARD_LABEL}.`,
    alternates: { canonical: `/mps/${p.memberId}/votes-from-hansard/${p.year}` },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = parse(await params);
  if (!p) notFound();
  const [name, { summary, votes }] = await Promise.all([memberName(p.memberId), memberVotesInYear(p.memberId, p.year)]);
  if (!name || !votes.length) notFound();
  const years = [...new Set(summary.map((v) => Number(v.division_date.slice(0, 4))))].sort((a, b) => a - b);
  return (
    <OpenGovShell>
      <BackLink fallbackHref={`/mps/${p.memberId}`} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: '15px', minHeight: '44px' }} />
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', lineHeight: 1.15, margin: '0 0 10px', color: INK }}>{name}: Commons votes in {p.year}</h1>
      <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px', color: INK }}>{HANSARD_LABEL}</p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px', color: INK, maxWidth: '46em' }}>
        {votes.length.toLocaleString('en-GB')} votes, newest first. {ARCHIVE_NOTE} <Link href={`/mps/${p.memberId}`} prefetch={false} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{name}&rsquo;s page</Link>
      </p>
      <NoJsPager id="hv-rows" count={votes.length} rows="> li" size={25}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {votes.map((v) => (
            <li key={v.division_external_id} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <Link href={divisionHref(v.division_date, v.division_number)} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '6px 0', fontSize: '15px', lineHeight: 1.4, color: INK, textDecoration: 'none' }}>
                <span><strong>{v.side === 'aye' ? 'Aye' : 'No'}{v.is_teller ? ' (teller)' : ''}</strong>, {v.title}, {archiveDate(v.division_date)}, Division {v.division_number}</span>
              </Link>
            </li>
          ))}
        </ul>
      </NoJsPager>
      <nav aria-label="Other years" style={{ marginTop: '20px', fontSize: '15px', color: INK }}>
        <h2 style={{ fontSize: '17px', fontWeight: 'bold', margin: '0 0 4px' }}>Other years</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {years.map((y) => (
            <li key={y}>
              {y === p.year
                ? <strong aria-current="page" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>{y}</strong>
                : <Link href={`/mps/${p.memberId}/votes-from-hansard/${y}`} prefetch={false} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{y}</Link>}
            </li>
          ))}
        </ul>
      </nav>
    </OpenGovShell>
  );
}
