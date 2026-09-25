const ACCENT = '#7a1612';
const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.6)';
const MONO = '"Special Elite", monospace';

export default function DataBlock({
  headlineFigure,
  context,
  source,
  sourceDate,
  historicalComparison,
}: {
  headlineFigure: string;
  context: string;
  source: string;
  sourceDate?: string;
  historicalComparison?: string;
}) {
  return (
    <div
      aria-label={`Data: ${headlineFigure} — ${context}`}
      style={{
        margin: '32px 0',
        border: `1px solid rgba(20,16,13,0.18)`,
        borderTop: `3px solid ${ACCENT}`,
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: ACCENT,
          margin: '0',
          padding: '8px 20px 6px',
          borderBottom: `1px solid rgba(20,16,13,0.1)`,
        }}
      >
        What the data shows
      </p>
      <div style={{ padding: '16px 20px 14px' }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 'bold',
            color: ACCENT,
            lineHeight: 1,
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
          }}
        >
          {headlineFigure}
        </p>
        <p
          style={{
            fontFamily: MONO,
            fontSize: '16px',
            color: INK,
            lineHeight: 1.5,
            margin: '0 0 10px',
          }}
        >
          {context}
        </p>
        {historicalComparison && (
          <p
            style={{
              fontFamily: MONO,
              fontSize: '14px',
              color: INK_SOFT,
              margin: '0 0 10px',
              lineHeight: 1.5,
            }}
          >
            {historicalComparison}
          </p>
        )}
        {/* Source rendered as plain text — no outbound links per house rule */}
        <p
          style={{
            fontFamily: MONO,
            fontSize: '12px',
            color: INK_SOFT,
            margin: '0',
            paddingTop: '10px',
            borderTop: `1px dotted rgba(20,16,13,0.15)`,
            lineHeight: 1.5,
          }}
        >
          Source: {source}{sourceDate ? ` · ${sourceDate}` : ''}
        </p>
      </div>
    </div>
  );
}
