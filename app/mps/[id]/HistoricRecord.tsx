import Link from 'next/link';
import NoJsPager, { pagesByHeight } from '@/app/components/NoJsPager';
import RegisterCredit from '@/app/components/RegisterCredit';
import { divisionHref } from '@/lib/division-links';
import { ARCHIVE_NOTE, HANSARD_LABEL, archiveDate, memberVoteSummary, registerHistory, type RegisterBlock, type RegisterCategory } from '@/lib/historic-archive';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const h2 = { fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px', color: INK } as const;
const para = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 10px', color: INK, maxWidth: '46em' } as const;

// On an MP or former MP's page (owner, 6 Nov 2026): their votes from 2004 to 2016, kept apart from the voting record above and without rebellion figures, and
// their register history. A failed read throws, like the page's other reads, so an outage is never cached for a week as a page with neither.
export default async function HistoricRecord({ memberId }: { memberId: number }) {
  const [votes, register] = await Promise.all([memberVoteSummary(memberId), registerHistory(memberId)]);
  return (
    <>
      {votes && (
        <section id="votes-2004-2016" aria-labelledby="mp-votes-archive" style={{ margin: '0 0 36px', color: INK }}>
          <h2 id="mp-votes-archive" style={h2}>{HANSARD_LABEL}</h2>
          <p style={para}>
            {votes.total.toLocaleString('en-GB')} votes ({votes.ayes.toLocaleString('en-GB')} Aye, {votes.noes.toLocaleString('en-GB')} No) from {archiveDate(votes.first)} to {archiveDate(votes.last)}. These are not counted in any other figure on this page. {ARCHIVE_NOTE}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: '12px 0 4px' }}>Latest</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {votes.latest.map((v) => (
              <li key={v.division_external_id} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <Link href={divisionHref(v.division_date, v.division_number)} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '6px 0', fontSize: '15px', lineHeight: 1.4, color: INK, textDecoration: 'none' }}>
                  <span><strong>{v.side === 'aye' ? 'Aye' : 'No'}{v.is_teller ? ' (teller)' : ''}</strong>, {v.title}, {archiveDate(v.division_date)}, Division {v.division_number}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: '14px 0 4px' }}>Every vote by year</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {votes.years.map((y) => (
              <li key={y.year}>
                <Link href={`/mps/${memberId}/votes-from-hansard/${y.year}`} prefetch={false} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '15px', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {y.year} ({y.count})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {register && (
        <section id="register-history" aria-labelledby="mp-register-history" style={{ margin: '0 0 36px', color: INK }}>
          <h2 id="mp-register-history" style={h2}>Register history</h2>
          <p style={para}>
            {register.entries.toLocaleString('en-GB')} entries in the Register of Members&rsquo; Financial Interests, from the editions of {archiveDate(register.firstEdition)} to {archiveDate(register.lastEdition)}, as published and in the order published. Listed as {register.names.join(', ')}. Editions before 2004 are few, only 1 or 2 a year. For the current register, see the interests on this page.
          </p>
          {register.categories.map((c, i) => <Category key={c.key} category={c} id={`rh-${i + 1}`} />)}
          <RegisterCredit />
        </section>
      )}
    </>
  );
}

const declared = (b: RegisterBlock) => (b.first === b.last ? `Declared in the edition of ${archiveDate(b.first)}` : `Declared from ${archiveDate(b.first)} to ${archiveDate(b.last)}`);
// About how tall a block stands on a phone, to page long categories by height.
const blockHeight = (b: RegisterBlock) => b.lines.reduce((px, l) => px + (Math.ceil(l.text.length / 38) || 1) * 24 + 4, 44);

function Category({ category, id }: { category: RegisterCategory; id: string }) {
  return (
    <details className="pa-fold">
      <summary>
        {category.label} ({category.entries.toLocaleString('en-GB')})
      </summary>
      <NoJsPager id={id} always count={category.blocks.length} rows="> li" sizes={pagesByHeight(category.blocks.map(blockHeight), 4000)}>
        <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
          {category.blocks.map((b, i) => (
            <li key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px', lineHeight: 1.55 }}>
              {b.lines.map((l, k) => <p key={k} style={{ margin: '0 0 4px', fontWeight: l.kind === 'heading' ? 'bold' : 'normal', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{l.text}</p>)}
              <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>{declared(b)}</p>
            </li>
          ))}
        </ul>
      </NoJsPager>
    </details>
  );
}
