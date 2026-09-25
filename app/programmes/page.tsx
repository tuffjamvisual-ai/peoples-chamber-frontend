import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import {
  getLiveProgrammes,
  fmtDate,
  fmtNumber,
  type ProgrammeWithFigure,
} from '@/lib/programmes';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Programmes',
  description: 'Major government policy commitments, tracked over time.',
  alternates: { canonical: '/programmes' },
};

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

const STATUS_ORDER = ['active', 'paused', 'completed', 'cancelled'] as const;

export default async function ProgrammesIndexPage() {
  const programmes = await getLiveProgrammes();

  const groups = STATUS_ORDER
    .map((status) => ({
      status,
      items: programmes.filter((p) => p.status === status),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <OpenGovShell pageStamp="Programmes">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 'bold',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '12px',
        }}>
          Programmes
        </h1>
        <p style={{
          fontFamily: MONO, fontSize: '15px',
          color: 'rgba(20,16,13,0.6)',
          letterSpacing: '0.03em',
        }}>
          Major government policy commitments, tracked over time.
        </p>
      </header>

      {programmes.length === 0 && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: 'rgba(20,16,13,0.5)' }}>
          No programmes published yet.
        </p>
      )}

      {groups.map(({ status, items }) => (
        <section key={status} style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '12px',
            textTransform: 'uppercase', letterSpacing: '0.25em',
            color: STATUS_COLOUR[status] ?? INK,
            marginBottom: '16px', fontWeight: 'normal',
            borderBottom: `1px solid ${HAIRLINE}`,
            paddingBottom: '6px',
          }}>
            {status} ({items.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((prog) => (
              <ProgrammeCard key={prog.slug} prog={prog} />
            ))}
          </div>
        </section>
      ))}
    </OpenGovShell>
  );
}

function ProgrammeCard({ prog }: { prog: ProgrammeWithFigure }) {
  const statusColour = STATUS_COLOUR[prog.status] ?? INK;
  return (
    <Link
      href={`/programmes/${prog.slug}`}
      style={{
        display: 'block',
        border: `1px solid ${HAIRLINE}`,
        padding: '16px 20px',
        textDecoration: 'none',
        color: INK,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          fontFamily: MONO, fontSize: '10px', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: statusColour,
          border: `1px solid ${statusColour}`,
          padding: '1px 6px', flexShrink: 0,
        }}>
          {prog.status}
        </span>
        <span style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.2, color: INK }}>
          {prog.name}
        </span>
      </div>

      {prog.summary && (
        <p style={{
          fontSize: '14px', lineHeight: 1.6,
          color: 'rgba(20,16,13,0.72)',
          margin: '4px 0 0',
          maxWidth: '680px',
        }}>
          {prog.summary.length > 160 ? prog.summary.slice(0, 160) + '…' : prog.summary}
        </p>
      )}

      {prog.currentEntry && (
        <p style={{
          fontFamily: MONO, fontSize: '12px',
          color: 'rgba(20,16,13,0.5)',
          margin: '8px 0 0', letterSpacing: '0.04em',
        }}>
          Latest: {fmtNumber(prog.currentEntry.figure_value!)}
          {prog.currentEntry.figure_unit ? ` ${prog.currentEntry.figure_unit}` : ''}
          {' · '}
          {fmtDate(prog.currentEntry.entry_date)}
        </p>
      )}

      {prog.target_figure !== null && (
        <p style={{
          fontFamily: MONO, fontSize: '12px',
          color: 'rgba(20,16,13,0.4)',
          margin: '4px 0 0', letterSpacing: '0.04em',
        }}>
          Target: {fmtNumber(prog.target_figure)}
          {prog.target_unit ? ` ${prog.target_unit}` : ''}
          {prog.target_label ? ` — ${prog.target_label}` : ''}
        </p>
      )}
    </Link>
  );
}
