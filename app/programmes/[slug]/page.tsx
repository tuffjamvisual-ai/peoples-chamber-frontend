// Policy programme display page.
// Uses getProgramme/getTimeline from lib/programmes (supabaseAdmin — bypasses
// RLS) so is_live=false rows are reachable for editorial review, matching the
// same pattern as app/briefings/[slug]/page.tsx. A "NOT LIVE" banner +
// robots:noindex gate the pre-publish state. notFound() fires only when the
// slug matches no row at all.
//
// ISR: force-dynamic — draft previews must be immediately visible after a row
// is inserted; ISR caching would serve stale draft state.
//
// Current figure: deriveCurrentFigure() from lib/programmes — shared with the
// index page, no copy-paste.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
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
const MONO     = "'Special Elite', monospace";

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
  if (!prog) return { title: 'Programme' };
  return {
    title: prog.name,
    description: prog.summary?.slice(0, 155) ?? `Track progress on ${prog.name}.`,
    alternates: { canonical: `/programmes/${slug}` },
    ...(prog.is_live ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function ProgrammePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const prog: ProgrammeRow | null = await getProgramme(slug);
  if (!prog) notFound();

  const timeline: TimelineRow[] = await getTimeline(prog.id, !prog.is_live);
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

      {!prog.is_live && (
        <div style={{
          margin: '0 0 20px', padding: '10px 14px',
          border: `1px solid ${ACCENT}`,
          background: 'rgba(122,22,18,0.06)',
          fontFamily: MONO, fontSize: '15px', color: ACCENT,
        }}>
          NOT LIVE — pending review. Not public, not listed, not indexed.
        </div>
      )}

      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{
            fontFamily: MONO, fontSize: '11px', letterSpacing: '0.1em',
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
            fontFamily: MONO, fontSize: '13px',
            color: 'rgba(20,16,13,0.5)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Started {fmtDate(prog.started_date)}
          </p>
        )}
        {prog.summary && (
          <p style={{
            fontSize: '17px', lineHeight: 1.7,
            color: 'rgba(20,16,13,0.8)',
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
            fontFamily: MONO, fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: 'rgba(20,16,13,0.45)', margin: '0 0 8px',
          }}>
            Target
          </p>
          {prog.target_figure !== null && (
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: INK, margin: '0 0 4px', lineHeight: 1 }}>
              {fmtNumber(prog.target_figure)}
              {prog.target_unit && (
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'rgba(20,16,13,0.55)', marginLeft: '6px' }}>
                  {prog.target_unit}
                </span>
              )}
            </p>
          )}
          {prog.target_label ? (
            <p style={{
              fontFamily: MONO, fontSize: '13px',
              color: 'rgba(20,16,13,0.6)',
              margin: prog.target_figure !== null ? '4px 0 0' : '0',
            }}>
              {prog.target_label}
            </p>
          ) : prog.target_figure === null ? (
            <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(20,16,13,0.4)', margin: 0 }}>
              No target set
            </p>
          ) : null}
        </div>

        <div style={{ border: `1px solid ${HAIRLINE}`, padding: '16px 18px' }}>
          <p style={{
            fontFamily: MONO, fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: 'rgba(20,16,13,0.45)', margin: '0 0 8px',
          }}>
            Latest figure
          </p>
          {currentEntry ? (
            <>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: INK, margin: '0 0 4px', lineHeight: 1 }}>
                {fmtNumber(currentEntry.figure_value!)}
                {currentEntry.figure_unit && (
                  <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'rgba(20,16,13,0.55)', marginLeft: '6px' }}>
                    {currentEntry.figure_unit}
                  </span>
                )}
              </p>
              <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(20,16,13,0.5)', margin: '4px 0 0' }}>
                {fmtDate(currentEntry.entry_date)}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(20,16,13,0.4)', margin: 0 }}>
              No approved figure yet
            </p>
          )}
        </div>
      </section>

      {/* Timeline */}
      {timeline.length > 0 && (
        <section style={{ marginBottom: '40px', maxWidth: '720px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '13px',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'rgba(20,16,13,0.45)',
            marginBottom: '16px', fontWeight: 'normal',
          }}>
            Timeline
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: `2px solid ${HAIRLINE}` }}>
            {timeline.map((entry) => (
              <li key={entry.id} style={{ padding: '0 0 24px 20px', position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '-5px', top: '5px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: entry.is_approved ? INK : ACCENT,
                  display: 'block',
                }} />
                <p style={{
                  fontFamily: MONO, fontSize: '12px',
                  color: 'rgba(20,16,13,0.45)',
                  margin: '0 0 4px',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {fmtDate(entry.entry_date)}
                  {!entry.is_approved && (
                    <span style={{ color: ACCENT, marginLeft: '8px' }}>[PENDING APPROVAL]</span>
                  )}
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: INK, margin: '0 0 6px', lineHeight: 1.35 }}>
                  {entry.title}
                </p>
                {entry.figure_value !== null && (
                  <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '0 0 6px', fontWeight: 600 }}>
                    {fmtNumber(entry.figure_value)}
                    {entry.figure_unit ? (
                      <span style={{ fontWeight: 'normal', color: 'rgba(20,16,13,0.55)', marginLeft: '5px' }}>
                        {entry.figure_unit}
                      </span>
                    ) : null}
                  </p>
                )}
                {entry.body && (
                  <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'rgba(20,16,13,0.75)', margin: '0 0 6px' }}>
                    {entry.body}
                  </p>
                )}
                {entry.source_label && (
                  <p style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(20,16,13,0.45)', margin: 0 }}>
                    Source: {entry.source_label}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Department links */}
      {deptMetas.length > 0 && (
        <section style={{ maxWidth: '720px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '13px',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'rgba(20,16,13,0.45)',
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
                  fontFamily: MONO, fontSize: '13px', color: ACCENT,
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
