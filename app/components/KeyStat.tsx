const ACCENT = '#7a1612';
const INK = '#14100d';
const MONO = '"Special Elite", monospace';

export default function KeyStat({
  stat,
  label,
  context,
}: {
  stat: string;
  label: string;
  context?: string;
}) {
  return (
    <div
      aria-label={`${stat} — ${label}`}
      style={{
        margin: '32px 0',
        padding: '20px 24px 18px',
        borderLeft: `4px solid ${ACCENT}`,
        background: 'rgba(122,22,18,0.04)',
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: 'clamp(36px, 5vw, 54px)',
          fontWeight: 'bold',
          color: ACCENT,
          lineHeight: 1,
          margin: '0 0 10px',
          letterSpacing: '-0.02em',
        }}
      >
        {stat}
      </p>
      <p
        style={{
          fontFamily: MONO,
          fontSize: '16px',
          color: INK,
          lineHeight: 1.5,
          margin: context ? '0 0 6px' : '0',
        }}
      >
        {label}
      </p>
      {context && (
        <p
          style={{
            fontFamily: MONO,
            fontSize: '13px',
            color: 'rgba(20,16,13,0.6)',
            margin: '0',
            lineHeight: 1.5,
          }}
        >
          {context}
        </p>
      )}
    </div>
  );
}
