// Policy programme display page.
// Uses getProgramme/getTimeline from lib/programmes (supabaseAdmin — bypasses
// RLS). A row with is_live=false is a real 404 with nothing of it in the response (owner, 5 Nov 2026), as are drafts on
// app/briefings/[slug]/page.tsx.
//
// force-dynamic: a programme going live or being withdrawn shows straight away.
//
// Current figure: deriveCurrentFigure() from lib/programmes — shared with the
// index page, no copy-paste.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import Timeline from '../../components/Timeline';
import { departments } from '@/lib/departments';
import {
  getProgramme,
  getTimeline,
  deriveCurrentFigure,
  fmtDate,
  fmtNumber,
  type ProgrammeRow,
  type TimelineRow,
} from '@/lib/programmes';

export const dynamic = 'force-dynamic';

const INK      = '#14100d';
const ACCENT   = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const MONO     = "var(--font-special-elite), monospace";

const STATUS_COLOUR: Record<string, string> = {
  active:    '#1a5c36',
  paused:    '#7a5c12',
  cancelled: '#7a1612',
  completed: '#1a3a6e',
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const prog = await getProgramme(slug);
  if (!prog || !prog.is_live) return { title: 'Programme' };
  return {
    title: prog.name,
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
  const currentEntry = deriveCurrentFigure(timeline);

  const deptMetas = departments.filter((d) => prog.dept_slugs.includes(d.slug));
  const statusColour = STATUS_COLOUR[prog.status] ?? INK;

  return (
    <OpenGovShell pageStamp="Programmes">
      <BackLink
        fallbackHref="/programmes"
        label="← Programmes"
        className="no-hover-scale"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '-6%', marginBottom: '12px',
          color: INK, textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />


      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{
            fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: statusColour,
            border: `1px solid ${statusColour}`,
            padding: '2px 8px',
          }}>
            {prog.status}
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(26px, 3.8vw, 44px)',
          fontWeight: 'bold',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '12px',
        }}>
          {prog.name}
        </h1>
        {prog.started_date && (
          <p style={{
            fontFamily: MONO, fontSize: '15px',
            color: '#14100d',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Started {fmtDate(prog.started_date)}
          </p>
        )}
        {prog.summary && (
          <p style={{
            fontSize: '17px', lineHeight: 1.7,
            color: '#14100d',
            maxWidth: '680px', marginTop: '14px',
          }}>
            {prog.summary}
          </p>
        )}
      </header>

      {/* Target vs current figure */}
      <section style={{
        margin: '0 0 36px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        maxWidth: '720px',
      }}>
        <div style={{ border: `1px solid ${HAIRLINE}`, padding: '16px 18px' }}>
          <p style={{
            fontFamily: MONO, fontSize: '15px',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: '#14100d', margin: '0 0 8px',
          }}>
            Target
          </p>
          {prog.target_figure !== null && (
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: INK, margin: '0 0 4px', lineHeight: 1 }}>
              {fmtNumber(prog.target_figure)}
              {prog.target_unit && (
                <span style={{ fontSize: '15px', fontWeight: 'normal', color: '#14100d', marginLeft: '6px' }}>
                  {prog.target_unit}
                </span>
              )}
            </p>
          )}
          {prog.target_label ? (
            <p style={{
              fontFamily: MONO, fontSize: '15px',
              color: '#14100d',
              margin: prog.target_figure !== null ? '4px 0 0' : '0',
            }}>
              {prog.target_label}
            </p>
          ) : prog.target_figure === null ? (
            <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', margin: 0 }}>
              No target set
            </p>
          ) : null}
        </div>

        <div style={{ border: `1px solid ${HAIRLINE}`, padding: '16px 18px' }}>
          <p style={{
            fontFamily: MONO, fontSize: '15px',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: '#14100d', margin: '0 0 8px',
          }}>
            Latest figure
          </p>
          {currentEntry ? (
            <>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: INK, margin: '0 0 4px', lineHeight: 1 }}>
                {fmtNumber(currentEntry.figure_value!)}
                {currentEntry.figure_unit && (
                  <span style={{ fontSize: '15px', fontWeight: 'normal', color: '#14100d', marginLeft: '6px' }}>
                    {currentEntry.figure_unit}
                  </span>
                )}
              </p>
              <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', margin: '4px 0 0' }}>
                {fmtDate(currentEntry.entry_date)}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', margin: 0 }}>
              No approved figure yet
            </p>
          )}
        </div>
      </section>

      {/* Timeline */}
      <Timeline entries={timeline} />

      {/* Department links */}
      {deptMetas.length > 0 && (
        <section style={{ maxWidth: '720px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '15px',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: '#14100d',
            marginBottom: '12px', fontWeight: 'normal',
          }}>
            Departments responsible
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {deptMetas.map((dept) => (
              <Link
                key={dept.slug}
                href={`/departments/${dept.slug}`}
                style={{
                  fontFamily: MONO, fontSize: '15px', color: ACCENT,
                  textDecoration: 'underline', textUnderlineOffset: '3px',
                  letterSpacing: '0.04em',
                }}
              >
                {dept.shortName} →
              </Link>
            ))}
          </div>
        </section>
      )}
    </OpenGovShell>
  );
}
