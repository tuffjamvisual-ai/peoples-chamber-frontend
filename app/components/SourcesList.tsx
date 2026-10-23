// The list of records a piece was checked against, as the evidence panel shows them and the /sources pages list
// them (moved out of EvidencePanel, 23 Oct 2026). Each line links the document where there is one.

const ACCENT = '#6b2417';

// A record is plain text, or text with a link to the document itself (added 16 Oct 2026 at
// the owner's request: sources link to the exact document where one could be found and
// opened; anything without a stable public page stays as text).
// A source made of two documents gives `links` instead: each links the first place its `match` phrase appears in the
// text, so the wording stays as written (added 21 Oct 2026).
export type EvidenceRecord = string | { text: string; url?: string; links?: { match: string; url: string }[] };

export const linkStyle = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' } as const;

function withLinks(text: string, links: { match: string; url: string }[]): React.ReactNode[] {
  const spots = links.map((l) => ({ ...l, at: text.indexOf(l.match) })).filter((l) => l.at >= 0).sort((x, y) => x.at - y.at);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const l of spots) {
    if (l.at < pos) continue;
    out.push(text.slice(pos, l.at));
    out.push(<a key={l.at} href={l.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{l.match}</a>);
    pos = l.at + l.match.length;
  }
  out.push(text.slice(pos));
  return out;
}

export function SourcesList({ records }: { records: EvidenceRecord[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
      {records.map((r, i) => {
        const text = typeof r === 'string' ? r : r.text;
        const url = typeof r === 'string' ? undefined : r.url;
        const links = typeof r === 'string' ? undefined : r.links;
        if (links?.length) return <li key={i} style={{ marginBottom: '6px', overflowWrap: 'anywhere' }}>{withLinks(text, links)}</li>;
        // Link the part before the first colon (publisher, title, date); the notes after it stay as text.
        const cut = text.indexOf(': ');
        const head = cut > 0 ? text.slice(0, cut) : text;
        const rest = cut > 0 ? text.slice(cut) : '';
        return (
          <li key={i} style={{ marginBottom: '6px', overflowWrap: 'anywhere' }}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{head}</a>
            ) : head}
            {rest}
          </li>
        );
      })}
    </ul>
  );
}
