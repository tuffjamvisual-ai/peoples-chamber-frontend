import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ContinueToArticle from '../components/ContinueToArticle';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import { listSummary } from '@/lib/editorials/list-summary';
import { supabase } from '@/lib/supabase';

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
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

type ReportType = 'Investigation' | 'Briefing' | 'Commentary';

interface Item {
  href: string;
  type: ReportType;
  kicker: string | null;
  headline: string;
  summary: string;
  date: string; // ISO date or timestamp
}

function typeOf(e: EditorialEntry): ReportType {
  if (e.opinion) return 'Commentary';
  return e.kind === 'briefing' ? 'Briefing' : 'Investigation';
}

export default async function ReportsPage() {
  const fileItems: Item[] = (Object.values(editorials) as EditorialEntry[]).map((e) => ({
    href: `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
    type: typeOf(e),
    kicker: e.kicker ?? null,
    headline: e.headline,
    summary: listSummary(e),
    date: e.publishedAt,
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

      <div style={{ borderTop: `1px solid ${HAIRLINE}`, fontFamily: '"Special Elite", monospace' }}>
        {items.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="no-hover-scale"
            style={{ display: 'block', padding: '22px 0', borderBottom: `1px solid ${HAIRLINE}`, textDecoration: 'none', color: INK }}
          >
            {/* The type, then the piece's own kicker when it says something the type does not. */}
            <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.28em', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>
              {e.type}
              {e.kicker && e.kicker.toLowerCase() !== e.type.toLowerCase() ? ` · ${e.kicker}` : ''}
            </div>
            <h2 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: '8px' }}>
              {e.headline}
            </h2>
            <div style={{ fontSize: '15px', color: INK, marginBottom: '6px' }}>
              {new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </div>
            {e.summary && (
              <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0, maxWidth: '46em' }}>{e.summary}</p>
            )}
            <ContinueToArticle />
          </Link>
        ))}
      </div>
    </OpenGovShell>
  );
}
