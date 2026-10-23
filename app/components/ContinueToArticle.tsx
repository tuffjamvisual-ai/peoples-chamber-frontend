import type { CSSProperties } from 'react';

// The "Continue to full article" line under a summary on article lists. It sits inside the card's own link, so it
// is a span styled as a link and the whole card stays clickable.
export default function ContinueToArticle({ style }: { style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'block',
        marginTop: '6px',
        fontSize: '15px',
        color: '#7a1612',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        ...style,
      }}
    >
      Continue to full article
    </span>
  );
}
