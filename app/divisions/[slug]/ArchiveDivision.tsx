import Link from 'next/link';
import { phoneUpTo } from '@/lib/breakpoints';
import { SubFold } from '../../components/PhoneFolds';
import OpenGovShell from '@/app/components/OpenGovShell';
import BackLink from '@/app/components/BackLink';
import PageSources from '@/app/components/PageSources';
import NoJsPager, { NoJsFold } from '@/app/components/NoJsPager';
import { partyColourForMember } from '@/lib/party-helpers';
import { divisionHref, yearHref } from '@/lib/division-links';
import { ARCHIVE_NOTE, archiveDate, archiveNeighbours, archiveProfileHref, archiveTitle, archiveVotes, recordInconsistent, type ArchiveDivision as Division, type ArchiveVote } from '@/lib/historic-archive';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const SUCCESS = '#4a8a3a';
const DANGER = '#a64030';
const TYPE = 'var(--font-special-elite), monospace';
const LONG = 600;

// A division from the archive (11 Oct 2004 to 8 Mar 2016; owner, 6 Nov 2026), in the style of a current one. No rebellion figures. Names and parties as listed
// with the vote; a name links to the member's page, and to their fuller Lords record where they have one (profile_link_id).
export default async function ArchiveDivisionPage({ d }: { d: Division }) {
  const date = String(d.division_date).slice(0, 10);
  const [votes, nb] = await Promise.all([archiveVotes(d.external_id), archiveNeighbours(date, d.division_number)]);
  const title = archiveTitle(d);
  const inconsistent = recordInconsistent(d);
  const named = d.count_shown === 'named list';
  const tellers = votes.filter((v) => v.is_teller).length;
  const group = (side: 'aye' | 'no') => {
    const parties = new Map<string, ArchiveVote[]>();
    for (const v of votes.filter((r) => r.side === side)) {
      const p = v.party_as_listed || 'Party not listed';
      parties.set(p, [...(parties.get(p) ?? []), v]);
    }
    return [...parties.entries()].sort((a, b) => b[1].length - a[1].length)
      .map(([party, rows]) => ({ party, rows: rows.sort((x, y) => x.list_as.localeCompare(y.list_as)) }));
  };
  const before = (d.text_before ?? '').trim();
  const after = inconsistent ? '' : (d.text_after ?? '').trim();
  const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
  const year = Number(date.slice(0, 4));
  const printed = <>{before && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{before}</p>}{after && <p style={{ margin: 0 }}>{after}</p>}</>;
  return (
    <OpenGovShell pageStamp="Division">
      <BackLink fallbackHref={yearHref(year)} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: '15px', minHeight: '44px' }} />
      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '32px', marginBottom: '32px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', transform: 'rotate(-0.2deg)' }}>
          UK Parliament · Commons Division {d.division_number} · {archiveDate(date)}
        </p>
        <h1 style={{ fontFamily: TYPE, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{title}</h1>
        <p style={{ fontSize: '15px', lineHeight: 1.6, marginTop: '12px' }}>{ARCHIVE_NOTE}</p>
      </header>

      <p data-main-action style={{ fontFamily: TYPE, fontSize: 'clamp(15px, 1.7vw, 18px)', marginBottom: d.count_note ? '12px' : '32px', lineHeight: 1.6, transform: 'rotate(-0.15deg)' }}>
        <span style={{ color: INK, fontWeight: 'bold' }}>{d.ayes_shown} Aye</span>{'  /  '}
        <span style={{ color: INK, fontWeight: 'bold' }}>{d.noes_shown} No</span>
        {named && <>{'  ·  '}counted from the list of names</>}
        {!named && <>{'  ·  '}<span style={{ color: ACCENT }}>{d.ayes_shown > d.noes_shown ? 'majority ' : d.ayes_shown < d.noes_shown ? 'lost by ' : 'tied · margin '}{Math.abs(d.ayes_shown - d.noes_shown)}</span></>}
        {tellers > 0 && <>{'  ·  '}{tellers} tellers (not counted)</>}
      </p>
      {d.count_note && <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '32px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}`, maxWidth: '46em' }}>{d.count_note}</p>}
      {d.evel_ayes && d.evel_noes && <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '46em' }}>Hansard also prints a second count for this vote, under English votes for English laws: Ayes {d.evel_ayes}, Noes {d.evel_noes}.</p>}

      {after || (before && before !== 'The House divided:') ? (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={sectionH2}>As printed in Hansard</h2>
          <div style={{ fontFamily: TYPE, fontSize: '16px', lineHeight: 1.7, marginTop: '12px', maxWidth: '46em' }}>
            {before.length > LONG ? <details><summary style={{ display: 'flex', alignItems: 'center', minHeight: '44px', cursor: 'pointer', fontWeight: 'bold' }}>Read the printed text</summary>{printed}</details> : printed}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>How MPs voted</h2>
        <p style={{ fontSize: '15px', lineHeight: 1.6, marginTop: '10px' }}>Names and parties as listed with this vote.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '24px' }}>
          <VoteColumn heading={`Voted AYE (${d.ayes_shown})`} side="Aye" groups={group('aye')} accent={SUCCESS} />
          <VoteColumn heading={`Voted NO (${d.noes_shown})`} side="No" groups={group('no')} accent={DANGER} />
        </div>
      </section>

      <nav aria-label="More votes" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginTop: '36px', paddingTop: '20px', fontSize: '15px', lineHeight: 1.8 }}>
        <h2 style={{ fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>More votes</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {nb.previous && <li>Previous vote: <Link href={divisionHref(nb.previous.date, nb.previous.number)} style={link}>{nb.previous.title}</Link> ({archiveDate(nb.previous.date)})</li>}
          {nb.next && <li>Next vote: <Link href={divisionHref(nb.next.date, nb.next.number)} style={link}>{nb.next.title}</Link> ({archiveDate(nb.next.date)})</li>}
          <li><Link href={yearHref(year)} style={link}>Every Commons vote in {year}</Link> · <Link href="/divisions" style={link}>All divisions</Link></li>
        </ul>
        {nb.sameDay.length > 0 && (
          <>
            {/* UX5 (T1-6, 11 Nov 2026): on phones a closed fold named by this heading, which is hidden there; from 640px up, as before. */}
            <style>{`@media ${phoneUpTo(767.98)} { .dv-sameday-h { display: none; } }`}</style>
            <h3 className="dv-sameday-h" style={{ fontSize: '15px', fontWeight: 'bold', margin: '14px 0 6px' }}>Other votes that day</h3>
            <SubFold label="Other votes that day" summary={`${nb.sameDay.length}`}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {nb.sameDay.map((r) => <li key={r.number}>Division {r.number}: <Link href={divisionHref(r.date, r.number)} style={link}>{r.title}</Link></li>)}
            </ul>
            </SubFold>
          </>
        )}
      </nav>
      {/* EL1 (owner, 10 Nov 2026): the official record is in the page's one Sources fold. Commons Votes starts in 2016, so
          for the archive it is Hansard for the sitting day, which prints this division's lists (UX1e). */}
      <PageSources sources={[{ label: `Hansard for ${archiveDate(date)}, which prints this division`, href: `https://hansard.parliament.uk/Commons/${date}` }]} />
    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = { fontFamily: TYPE, fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 'bold', margin: 0, transform: 'rotate(-0.2deg)' };

function VoteColumn({ heading, side, groups, accent }: { heading: string; side: string; groups: { party: string; rows: ArchiveVote[] }[]; accent: string }) {
  return (
    <div>
      <h3 style={{ fontFamily: TYPE, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: '12px', fontWeight: 'bold' }}>{heading}</h3>
      {/* Each side's names folded under its heading on phones (step 5, 10 Nov 2026: the lists were about 2,100px). */}
      <NoJsFold id={`dvf-${side}`} always label="The names, by party">
      {groups.map((g) => (
        <div key={g.party} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '15px' }}>
            <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: partyColourForMember(g.party, null) }} />
            <strong>{g.party}</strong>
            <span>({g.rows.length})</span>
          </div>
          <NoJsPager id={`dv-${side}-${g.party}`.replace(/[^a-zA-Z0-9-]+/g, '-')} always count={g.rows.length} rows="> li" size={15}>
            <ul data-own-more style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px', lineHeight: 1.55 }}>
              {g.rows.map((v) => {
                const href = archiveProfileHref(v);
                const name = <>{v.list_as}{v.is_teller && <span style={{ marginLeft: '6px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teller</span>}</>;
                return (
                  <li key={v.id} className="arch-row" style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    {href ? <Link href={href} prefetch={false} className="arch-tap" style={{ color: INK, textDecoration: 'none' }}><span>{name}</span></Link> : <span>{name}</span>}
                  </li>
                );
              })}
            </ul>
          </NoJsPager>
        </div>
      ))}
      </NoJsFold>
    </div>
  );
}
