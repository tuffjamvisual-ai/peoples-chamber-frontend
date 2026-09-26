'use client';

export default function MpProfileError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '10% auto',
        padding: '0 24px',
        fontFamily: 'Special Elite, monospace',
        color: '#14100d',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: 'bold',
          marginBottom: '16px',
          letterSpacing: '-0.01em',
        }}
      >
        This page took too long to load
      </h1>
      <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.75, marginBottom: '28px' }}>
        The data for this MP profile is loading slowly. Try again in a moment.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 28px',
          background: '#14100d',
          color: '#f1e7d3',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: '16px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
