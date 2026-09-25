const ACCENT = '#7a1612';
const MONO = "'Special Elite', monospace";

const LABELS = {
  investigation: 'Open Govt · Investigation',
  briefing:      'Open Govt · Briefing',
  commentary:    'Open Govt · Commentary',
};

export default function ContentBadge({
  kind,
  opinion,
}: {
  kind?: 'briefing';
  opinion?: boolean;
}) {
  const label =
    opinion        ? LABELS.commentary :
    kind === 'briefing' ? LABELS.briefing :
    LABELS.investigation;

  return (
    <p
      style={{
        fontFamily: MONO,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.22em',
        color: ACCENT,
        margin: '0 0 12px',
        display: 'inline-block',
        border: `1px solid ${ACCENT}`,
        padding: '2px 7px 1px',
      }}
    >
      {label}
    </p>
  );
}
