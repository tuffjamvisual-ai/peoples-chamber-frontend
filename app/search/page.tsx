import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SearchInput from './SearchInput';
import { searchContent, isPhrase, PHRASE_LIMIT, TOTAL_LIMIT, type SearchResult } from '@/lib/search-content';

export const dynamic = 'force-dynamic';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const MONO = "'Special Elite', monospace";

const TYPE_META: Record<string, { label: string; color: string }> = {
  editorial:    { label: 'Investigation', color: '#7a1612' },
  pressRelease: { label: 'Release',       color: '#1a5c36' },
  briefing:     { label: 'Briefing',      color: '#1a3a6e' },
  bill:         { label: 'Bill',          color: '#5c2a7a' },
  division:     { label: 'Division',      color: '#7a5c12' },
  mp:           { label: 'MP',            color: '#3a3a3a' },
};

const POPULAR = [
  'knife crime', 'small boats', 'NHS', 'energy bills',
  'income tax', 'immigration', 'renters', 'grooming gangs',
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ResultRow({ r }: { r: SearchResult }) {
  const meta = TYPE_META[r.type] ?? { label: r.type, color: '#3a3a3a' };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: meta.color,
            border: `1px solid ${meta.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {meta.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={r.url}
            style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: INK,
              textDecoration: 'none',
              lineHeight: 1.4,
              marginBottom: r.standfirst ? '4px' : 0,
            }}
          >
            {r.title}
          </Link>
          {r.standfirst && (
            <p style={{ fontSize: '14px', color: 'rgba(20,16,13,0.7)', margin: '0 0 5px', lineHeight: 1.55 }}>
              {r.standfirst.length > 200 ? r.standfirst.slice(0, 200) + '…' : r.standfirst}
            </p>
          )}
          <span style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(20,16,13,0.45)' }}>
            {r.date ? fmtDate(r.date) : ''}
            {r.kicker       ? (r.date ? ` · ${r.kicker}` : r.kicker) : ''}
            {r.org          ? (r.date ? ` · ${r.org}`    : r.org)    : ''}
            {r.constituency && r.party
              ? ` · ${r.constituency} · ${r.party}`
              : r.constituency ?? r.party ?? ''}
          </span>
        </div>
      </div>
    </li>
  );
}

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    dept?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const sp   = await searchParams;
  const q    = (sp.q    ?? '').trim();
  const type = sp.type  ?? 'all';
  const dept = sp.dept  ?? null;
  const from = sp.from  ?? null;
  const to   = sp.to    ?? null;
  const sort = (sp.sort === 'newest' ? 'newest' : 'relevance') as 'relevance' | 'newest';

  const results: SearchResult[] = q.length >= 2
    ? await searchContent(q, type, dept, from, to, sort)
    : [];

  return (
    <OpenGovShell pageStamp="Search">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '-6%', marginBottom: '12px',
          color: INK, textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 'bold',
          letterSpacing: '-0.02em',
          marginBottom: '10px',
          transform: 'rotate(-0.3deg)',
          textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
        }}>
          Search
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: 'rgba(20,16,13,0.75)' }}>
          Investigations, press releases, briefings, bills, votes and MPs — searched together.
        </p>
      </header>

      {/* key remounts on q|type change so useState reinitialises with the current URL value */}
      <SearchInput key={q + '|' + type + '|' + (dept ?? '') + '|' + sort} defaultQ={q} defaultType={type} defaultDept={dept ?? ''} defaultSort={sort} />

      {q.length >= 2 && results.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', color: INK, marginBottom: '6px' }}>No results for &ldquo;{q}&rdquo;</p>
          <p style={{ fontSize: '14px', color: 'rgba(20,16,13,0.55)' }}>
            Try different keywords, or{' '}
            <Link href="/departments" style={{ color: ACCENT }}>browse departments</Link>
          </p>
        </div>
      )}

      {results.length > 0 && (
        <section>
          <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(20,16,13,0.45)', marginBottom: '12px' }}>
            {results.length >= (isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT) ? `${isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT}+ results` : `${results.length} result${results.length === 1 ? '' : 's'}`}
            {type !== 'all' && ` · ${TYPE_META[type]?.label ?? type} only`}
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, i) => <ResultRow key={i} r={r} />)}
          </ol>
        </section>
      )}

      {!q && (
        <div>
          <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(20,16,13,0.45)', marginBottom: '12px', letterSpacing: '0.05em' }}>
            POPULAR SEARCHES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {POPULAR.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                style={{
                  padding: '6px 13px',
                  fontFamily: MONO,
                  fontSize: '13px',
                  color: 'rgba(20,16,13,0.55)',
                  border: `1px solid ${HAIRLINE}`,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </OpenGovShell>
  );
}
