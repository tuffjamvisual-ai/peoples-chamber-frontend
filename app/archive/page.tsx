// /archive: search the archive held on the Mac's SSD (Cowork ENTRY 480 PART A, owner approved 21 Nov 2026 22:44): 3.2
// million records (Commons and Lords debates and written answers, historic Lords Hansard 1914 to 2005, petitions,
// legislation, Find a Tender and more), read from the SSD's SQLite full text index through the tunnel. Nothing in
// Supabase (owner's rule 18:12). Not linked, not in the sitemap, noindex, 404 unless ARCHIVE_ENABLED is '1', signed in
// readers only, never cached. A plain GET form (works without JavaScript): q, dataset, page.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../components/OpenGovShell';
import { archiveSearch, archiveEnabled, archiveLimited, archiveUserId, longDate, DATASETS, MAX_PAGE, OFFLINE } from './archive';
import ArchiveSignedOut from './SignedOut';

export const metadata: Metadata = {
  title: 'Archive search | opengovt',
  robots: { index: false, follow: false, nocache: true },
};

const INK = '#14100d';
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const field = { fontSize: '16px', padding: '10px 12px', border: `2px solid ${INK}`, background: '#fffdf7', color: INK, minHeight: '44px' } as const;

export default async function ArchiveSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await archiveEnabled())) notFound();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 200).trim();
  const dataset = DATASETS.some((d) => d.name === one(sp.dataset)) ? one(sp.dataset) : '';
  const pageNo = Math.min(MAX_PAGE, Math.max(0, Math.floor(Number(one(sp.page)) || 0)));
  const here = (p: number) => `/archive?${new URLSearchParams({ q, ...(dataset ? { dataset } : {}), ...(p ? { page: String(p) } : {}) })}`;
  // Signed in readers only, checked here on the server before any call to the Mac (ENTRY 480 ADDENDUM).
  const userId = await archiveUserId();
  if (!userId) return <ArchiveSignedOut returnTo={q ? here(pageNo) : '/archive'} />;
  const limited = q.length >= 2 && (await archiveLimited('search', userId));
  const result = q.length >= 2 && !limited ? await archiveSearch(q, dataset, pageNo) : null;
  const hits = result?.ok ? result.data.hits : [];

  return (
    <OpenGovShell>
      <header style={{ marginBottom: '18px', color: INK }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.1 }}>Search the archive</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: 0 }}>
          3.2 million records: Commons and Lords debates and written answers, House of Lords debates from 1914 to 2005, petitions,
          legislation, public contracts and more. Search the full text, then open any record.
        </p>
      </header>
      <form method="get" action="/archive" role="search" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 20px' }}>
        <label htmlFor="archive-q" style={{ position: 'absolute', left: '-9999px' }}>Search words</label>
        <input id="archive-q" name="q" type="search" defaultValue={q} maxLength={200} placeholder="e.g. coal, &quot;home rule&quot;, Addison"
          style={{ ...field, flex: '1 1 260px', minWidth: 0 }} />
        <label htmlFor="archive-dataset" style={{ position: 'absolute', left: '-9999px' }}>Which records</label>
        <select id="archive-dataset" name="dataset" defaultValue={dataset} style={{ ...field, flex: '1 1 220px', minWidth: 0, maxWidth: '100%' }}>
          <option value="">All records</option>
          {DATASETS.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.records.toLocaleString('en-GB')})</option>)}
        </select>
        <button type="submit" style={{ ...field, padding: '10px 18px', background: INK, color: '#fffdf7', cursor: 'pointer' }}>Search</button>
      </form>

      {limited && <p style={{ fontSize: '15px', margin: '0 0 14px', color: INK, fontWeight: 'bold' }}>Too many searches for now. Please wait a minute and search again.</p>}
      {result && !result.ok && (
        <p role="status" style={{ fontSize: '16px', margin: '0 0 14px', color: INK, fontWeight: 'bold' }}>
          {result.reason === 'no words' ? 'Please search for more specific words: very common words such as "the" are not searched on their own.' : OFFLINE}
        </p>
      )}
      {result?.ok && (
        <p style={{ fontSize: '15px', margin: '0 0 14px', color: INK }}>
          {hits.length === 0 ? 'Nothing found.' : `Results ${pageNo * 20 + 1} to ${pageNo * 20 + hits.length}, most relevant first.`}
        </p>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '52em' }}>
        {hits.map((h) => (
          <li key={h.id} style={{ borderTop: '1px solid rgba(20,16,13,0.25)', padding: '12px 0', color: INK }}>
            <div style={{ fontSize: '15px' }}>{[longDate(h.date), h.dataset].filter(Boolean).join(' · ')}</div>
            <Link href={`/archive/${h.id}`} prefetch={false} style={{ fontSize: '18px', fontWeight: 'bold', color: INK }}>{h.title || 'Untitled record'}</Link>
            {h.snippet && <p style={{ margin: '6px 0 0', fontSize: '15px', lineHeight: 1.6 }}>{h.snippet}</p>}
          </li>
        ))}
      </ol>
      {result?.ok && (pageNo > 0 || result.data.more) && (
        <nav aria-label="Results pages" style={{ display: 'flex', gap: '16px', margin: '16px 0 0', fontSize: '16px' }}>
          {pageNo > 0 && <Link href={here(pageNo - 1)} prefetch={false} style={{ color: INK, minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Previous</Link>}
          {result.data.more && <Link href={here(pageNo + 1)} prefetch={false} style={{ color: INK, minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Next</Link>}
        </nav>
      )}
    </OpenGovShell>
  );
}
