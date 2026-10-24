import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import { listSummary } from '@/lib/editorials/list-summary';
import { readingLabel, textReadingLabel } from '@/lib/reading-time';
import { supabase } from '@/lib/supabase';
import { topics, matchWords } from '@/lib/topics';
import ReportsArchive, { type ArchiveItem } from './ReportsArchive';

// Reports (owner's approval, 23 Oct 2026): one list of every published investigation, file briefing and published
// database briefing, newest first. It replaces the /editorials and /briefings lists, which now redirect here; the
// articles keep their /editorials/<slug> and /briefings/<slug> addresses. Database briefings are read with the
// public key, which only returns published rows.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Every Open Govt investigation and briefing, newest first, with its date and summary. Each piece is checked against the public record.',
  alternates: { canonical: '/reports' },
};

const INK = '#14100d';

type ReportType = 'Investigation' | 'Briefing' | 'Commentary';

interface Item {
  href: string;
  type: ReportType;
  kicker: string | null;
  headline: string;
  summary: string;
  date: string; // ISO date or timestamp
  readingLabel: string; // "6 min read" (lib/reading-time.ts)
  topics: string[];
}

function typeOf(e: EditorialEntry): ReportType {
  if (e.opinion) return 'Commentary';
  return e.kind === 'briefing' ? 'Briefing' : 'Investigation';
}

export default async function ReportsPage() {
  // Topics, as the topic pages assign them: investigations and file briefings by each topic's editorialSlugs, and
  // published database briefings by the topic's words on headline and summary.
  const fileItems: Item[] = (Object.values(editorials) as EditorialEntry[]).map((e) => ({
    href: `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
    type: typeOf(e),
    kicker: e.kicker ?? null,
    headline: e.headline,
    summary: listSummary(e),
    date: e.publishedAt,
    readingLabel: readingLabel(e),
    topics: topics.filter((t) => t.editorialSlugs.includes(e.slug)).map((t) => t.slug),
  }));

  const { data: dbRows, error: dbErr } = await supabase
    .from('briefings')
    .select('slug, headline, summary, body, published_at, created_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });
  // A failed read throws, so the last good version of the page stays up.
  if (dbErr && dbErr.code !== 'PGRST116') throw new Error(`/reports briefings: ${dbErr.message}`);

  const dbItems: Item[] = (dbRows ?? []).map((r) => ({
    href: `/briefings/${r.slug as string}`,
    type: 'Briefing',
    kicker: 'Daily Briefing',
    headline: r.headline as string,
    // The approved summary (migration 2026-10-23c), or the opening of the body when there is none.
    summary: (r.summary as string | null) || String(r.body || '').replace(/\s+/g, ' ').slice(0, 180).trim() + '…',
    date: (r.published_at as string) || (r.created_at as string),
    // Database briefings: words in the headline, summary and body, at the same rate as the file reports.
    readingLabel: textReadingLabel(r.headline as string, r.summary as string | null, r.body as string | null),
    topics: topics.filter((t) => matchWords(`${r.headline} ${r.summary ?? ''}`, t.words, t.exclude)).map((t) => t.slug),
  }));

  const items = [...fileItems, ...dbItems].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <OpenGovShell pageStamp="Reports">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(14px, 1.6vw, 19px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.05, marginBottom: '14px' }}>
          Reports
        </h1>
      </header>

      <ReportsArchive
        topics={topics.map((t) => ({ slug: t.slug, title: t.title }))}
        items={items.map((e): ArchiveItem => {
          const d = new Date(e.date);
          return {
            href: e.href, type: e.type, kicker: e.kicker, headline: e.headline, summary: e.summary, topics: e.topics, readingLabel: e.readingLabel,
            dateLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
            // Month grouping (two-column archive): "2026-10" and "October 2026", in UTC like the date.
            monthKey: d.toISOString().slice(0, 7),
            monthLabel: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
          };
        })}
      />
    </OpenGovShell>
  );
}
