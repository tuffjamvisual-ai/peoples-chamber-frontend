'use client';

// Phones (under 640px, owner, 4 Nov 2026): "Compare by policy" comes first, one theme with every party's position on it,
// with "By party" as the alternative: one party at a time, its position on every theme (ENTRY 141 N1, 16 Nov 2026; it
// was the full list for every party, 49,254px at 375). From 1,024px up the picker is hidden and only the full list
// (children) shows. Styles are in the <style> below, so nothing here applies from 640px up.
import { useState, type ReactNode } from 'react';
import { phoneUpTo } from '@/lib/breakpoints';
import { ShowAll } from '@/app/components/NoJsPager';

// Phones and tablets (T1-GUARD, owner approved 13 Nov 2026: tablets up to 1,023px get the picker; the full grid was 23,216px at 768).
const CSS = `
.mf-controls, .mf-policy, .mf-byparty { display: none; }
@media ${phoneUpTo(1023.98)} {
  .mf-controls { display: block; margin-bottom: 18px; }
  .mf-root[data-mode="policy"] .mf-policy { display: block; }
  .mf-root[data-mode="policy"] .mf-party { display: none; }
  /* By party (ENTRY 141 N1, 16 Nov 2026): one party at a time, chosen from a menu, in place of every party's full list. */
  .mf-root .mf-party { display: none; }
  .mf-root[data-mode="party"] .mf-byparty { display: block; }
  .mf-modes { display: flex; gap: 8px; margin-bottom: 14px; }
  .mf-modes button { flex: 1 1 0; min-height: 44px; padding: 6px 8px; font-size: 15px; font-family: inherit; color: #14100d; background: transparent; border: 1px solid #14100d; cursor: pointer; }
  .mf-modes button[aria-pressed="true"] { background: #14100d; color: #f4e8d4; font-weight: bold; }
  .mf-label { display: block; font-size: 15px; margin-bottom: 4px; }
  .mf-select { width: 100%; min-height: 44px; padding: 6px 10px; font-size: 16px; font-family: inherit; color: #14100d; background: #f4e8d4; border: 1px solid #14100d; }
  .mf-row { border-top: 1px solid rgba(20,16,13,0.2); padding: 12px 0; }
  .mf-name { display: block; min-height: 44px; align-content: center; font-size: 18px; font-weight: 600; color: #14100d; text-decoration: none; }
  .mf-text { display: block; min-height: 44px; font-size: 15px; line-height: 1.7; color: #14100d; text-decoration: none; }
  .mf-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-left: 8px; vertical-align: middle; }
  .mf-key { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; font-size: 15px; color: #14100d; }
  .mf-key .mf-dot { margin-left: 0; background: #14100d; }
}`;

export type PartyPosition = { slug: string; name: string; colour: string; text: string | null; shifted: boolean };
export type ThemeRow = { theme: string; href: string; positions: PartyPosition[] };

export default function ManifestoPicker({ themes, children }: { themes: ThemeRow[]; children: ReactNode }) {
  const [mode, setMode] = useState<'policy' | 'party'>('policy');
  const [theme, setTheme] = useState(themes[0]?.theme ?? '');
  const row = themes.find((t) => t.theme === theme) ?? themes[0];
  // By party: the parties in the order they appear on the first theme, and the chosen one's position on every theme.
  const parties = themes[0]?.positions.map((p) => ({ slug: p.slug, name: p.name, colour: p.colour })) ?? [];
  const [party, setParty] = useState(parties[0]?.slug ?? '');
  const chosen = parties.find((p) => p.slug === party) ?? parties[0];
  const partyRows = chosen ? themes.map((t) => ({ theme: t.theme, href: t.href, position: t.positions.find((p) => p.slug === chosen.slug) })) : [];
  return (
    <div className="mf-root" data-mode={mode}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mf-controls">
        <div className="mf-modes" role="group" aria-label="How to compare the manifestos">
          <button type="button" aria-pressed={mode === 'policy'} onClick={() => setMode('policy')}>Compare by policy</button>
          <button type="button" aria-pressed={mode === 'party'} onClick={() => setMode('party')}>By party</button>
        </div>
        {mode === 'policy' && (
          <>
            <label className="mf-label" htmlFor="mf-theme">Choose a theme</label>
            <select id="mf-theme" className="mf-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              {themes.map((t) => <option key={t.theme} value={t.theme}>{t.theme}</option>)}
            </select>
            {/* The colour key beside the results (UX2m): each party's rule is its colour; a dot marks a shift since 2024. */}
            <p className="mf-key"><span className="mf-dot" aria-hidden />A dot after a position: the party has shifted since 2024.</p>
          </>
        )}
        {mode === 'party' && (
          <>
            <label className="mf-label" htmlFor="mf-party">Choose a party</label>
            <select id="mf-party" className="mf-select" value={party} onChange={(e) => setParty(e.target.value)}>
              {parties.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
            <p className="mf-key"><span className="mf-dot" aria-hidden />A dot after a position: the party has shifted since 2024.</p>
          </>
        )}
      </div>
      {mode === 'party' && chosen && (
        <ShowAll id="manifesto-party" count={partyRows.length} rows="> *">
        <div className="mf-byparty">
          {partyRows.map((r) => (
            <div key={r.theme} className="mf-row" style={{ borderLeft: `3px solid ${chosen.colour}`, paddingLeft: '10px' }}>
              <span className="mf-name">{r.theme}</span>
              {r.position?.text ? (
                <a className="mf-text" href={`/parties/${chosen.slug}${r.href}`}>
                  {r.position.text}
                  {r.position.shifted && <span className="mf-dot" title="Shifted since 2024" aria-label="Shifted since 2024" style={{ background: chosen.colour }} />}
                </a>
              ) : (
                <span style={{ fontSize: '15px', fontStyle: 'italic' }}>No published position</span>
              )}
            </div>
          ))}
        </div>
        </ShowAll>
      )}
      {mode === 'policy' && row && (
        <ShowAll id="manifesto-policy" count={(row.positions).length} rows="> *">
        <div className="mf-policy">
          {row.positions.map((p) => (
            <div key={p.slug} className="mf-row" style={{ borderLeft: `3px solid ${p.colour}`, paddingLeft: '10px' }}>
              <a className="mf-name" href={`/parties/${p.slug}`}>{p.name}</a>
              {p.text ? (
                <a className="mf-text" href={`/parties/${p.slug}${row.href}`}>
                  {p.text}
                  {p.shifted && <span className="mf-dot" title="Shifted since 2024" aria-label="Shifted since 2024" style={{ background: p.colour }} />}
                </a>
              ) : (
                <span style={{ fontSize: '15px', fontStyle: 'italic' }}>No published position</span>
              )}
            </div>
          ))}
        </div>
        </ShowAll>
      )}
      <div className="mf-party">{children}</div>
    </div>
  );
}
