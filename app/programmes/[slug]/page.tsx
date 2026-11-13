// Policy programme display page.
// Uses getProgramme/getTimeline from lib/programmes (supabaseAdmin — bypasses
// RLS). A row with is_live=false is a real 404 with nothing of it in the response (owner, 5 Nov 2026), as are drafts on
// app/briefings/[slug]/page.tsx.
//
// force-dynamic: a programme going live or being withdrawn shows straight away.
//
// Current figure: deriveCurrentFigure() from lib/programmes — shared with the
// index page, no copy-paste.

import { namedTitle } from '@/lib/seo-title';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProgramme, getTimeline, type ProgrammeRow, type TimelineRow } from '@/lib/programmes';
import ProgrammeArticle from './ProgrammeArticle';

export const dynamic = 'force-dynamic';



export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const prog = await getProgramme(slug);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!prog || !prog.is_live) notFound();
  return {
    // T1-A3 (6) (owner approved): says it is a tracked government commitment; the name is never cut.
    title: namedTitle(prog.name, (n) => [`${n}: government programme progress`, `${n}: government programme`, n]),
    description: prog.summary?.slice(0, 155) ?? `Track progress on ${prog.name}.`,
    alternates: { canonical: `/programmes/${slug}` },
  };
}

export default async function ProgrammePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const prog: ProgrammeRow | null = await getProgramme(slug);
  if (!prog || !prog.is_live) notFound();
  const timeline: TimelineRow[] = await getTimeline(prog.id, false);
  return <ProgrammeArticle prog={prog} timeline={timeline} />;
}
