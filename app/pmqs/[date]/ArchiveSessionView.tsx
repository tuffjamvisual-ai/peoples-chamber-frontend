import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import OpenGovShell from '../../components/OpenGovShell';
import MoreChain, { openingCount, PHONE_ROOM, textHeightAt375 } from '../../components/MoreChain';
import OpenHashTarget from '../../components/OpenHashTarget';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { answeredBy, archiveExchanges, longDateArchive, officialRecord, type ArchiveContribution, type ArchiveExchange, type ArchiveSession } from '@/lib/pmqs-archive';

import BackLink from '@/app/components/BackLink';
const INK = '#14100d';
const ACCENT = '#7a1612';
const link = { color: ACCENT, textDecoration: 'underline' };
const body = { fontSize: '16px', lineHeight: 1.7, margin: '0 0 8px', whiteSpace: 'pre-line' as const };
const nameLine = { fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' };

// A speaker's name: to their MP page if they have one, else Parliament's page for their member id, which says it leaves
// the site, else their Historic Hansard page, else plain text.
function Name({ c }: { c: ArchiveContribution }) {
  if (!c.name) return null;
  return (
    <p style={nameLine}>
      {!c.href ? c.name : c.site === 'opengovt' ? <Link href={c.href} className="og-tap" style={link}>{c.name}</Link> : <a data-og-row-source="" href={c.href} rel="noopener" className="og-tap" style={link}>{c.name}</a>}
      {c.site === 'parliament' && <span style={{ fontWeight: 'normal' }}> (on parliament.uk)</span>}
    </p>
  );
}

// About how tall an exchange is at 375px: its text, and the name, rule and padding of each contribution.
const heightAt375 = (e: ArchiveExchange) => [e.lead, ...e.answers].reduce((px, c) => px + 70 + textHeightAt375(c.text), 30);

// A session in the archive, laid out like a current session page (app/pmqs/[date]/page.tsx), 25 exchanges at a time.
export default async function ArchiveSessionView({ session }: { session: ArchiveSession }) {
  const exchanges = await archiveExchanges(session.date);
  const record = officialRecord(session.date);
  const title = longDateArchive(session.date);
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: "Prime Minister's Questions", path: '/pmqs' }, { name: title, path: `/pmqs/${session.date}` }])} />
      <OpenHashTarget />
      <BackLink fallbackHref="/pmqs" />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', color: INK }}>
        Prime Minister&rsquo;s Questions, {title}
      </h1>
      {answeredBy(session.date) && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px', color: INK }}>Answered by {answeredBy(session.date)}.</p>}
      {session.note && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px', color: INK }}>{session.note}</p>}
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px', color: INK }}>
        {session.exchanges} {session.exchanges === 1 ? 'contribution' : 'contributions'} in the record (in Sources at the end of the page).
      </p>
      <div style={{ color: INK }}>
        {/* Phones: as many exchanges as fit the 2,500px length (UX5, T1-6, 11 Nov 2026); wider, as before. */}
        <MoreChain mainAction ordered first={openingCount(exchanges.map(heightAt375))} phoneFirst={openingCount(exchanges.map(heightAt375), PHONE_ROOM)} items={exchanges.map((e) => (
          <li key={e.lead.order} id={`r-${e.lead.order}`} style={{ padding: '14px 0', borderTop: '1px solid rgba(20,16,13,0.25)' }}>
            <Name c={e.lead} />
            <p style={body}>{e.lead.text}</p>
            {e.answers.map((a) => (
              <div key={a.order} id={`r-${a.order}`} style={{ margin: '10px 0 8px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
                <Name c={a} />
                <p style={body}>{a.text}</p>
              </div>
            ))}
          </li>
        ))} />
      </div>
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside. The sitting's record is in this one Sources fold; each
          speaker's own page stays on its row. */}
      <PageSources sources={[{ label: record.label.replace(/^Read the official record in /, 'The official record in '), href: record.href }]} />
    </OpenGovShell>
  );
}
