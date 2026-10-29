const ACCENT = '#7a1612';
const MONO = "var(--font-special-elite), monospace";

// Investigations carry no badge (owner's approval, 29 Oct 2026): their "Investigation" kicker in EditorialArticle
// already says what they are. Briefings and commentary keep theirs.
const LABELS = {
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
    null;
  if (!label) return null;

  return (
    <p
      style={{
        fontFamily: MONO,
        fontSize: '15px',
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
