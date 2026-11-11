// A page's one Sources fold (EL1, owner decision 10 and 11 Nov 2026: "only sources should link outside"). A closed native
// <details> near the end of the page listing, with plain labels, the official sources its figures come from. Outside links
// in a page body go here; the only others allowed are each row's own official document, inline citations in article and
// biography text, the footer licence line and mailto (QA1 A9, scripts/checks/qa/rendered-checks.mjs). Renders nothing
// when there are no sources. data-og-sources marks it for A9.

export type PageSource = { label: string; href: string; note?: React.ReactNode };

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function PageSources({ sources, marginTop = '32px', children }: { sources: (PageSource | null | false | undefined | '' | 0)[]; marginTop?: string; children?: React.ReactNode }) {
  const seen = new Set<string>();
  const list = sources.filter((s): s is PageSource => !!s && !!s.href && !seen.has(s.href) && !!seen.add(s.href));
  if (list.length === 0) return null;
  return (
    <details className="og-sources" data-og-sources="" style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, marginTop, marginBottom: '18px' }}>
      <summary style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Sources ({list.length})
      </summary>
      {children}
      {/* Left aligned, links as the reports' end "Sources (N)" line: accent, underlined. The typeface and size are the
          site's list text at each width (the phone body text rule in app/layout.tsx on phones, as that line has). */}
      <ol style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', overflowWrap: 'anywhere' }}>
        {list.map((s) => (
          <li key={s.href} style={{ marginBottom: '6px' }}>
            <a href={s.href} rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{s.label}</a>
            {s.note && <> {s.note}</>}
          </li>
        ))}
      </ol>
    </details>
  );
}
