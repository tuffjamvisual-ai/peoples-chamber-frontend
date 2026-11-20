// "Houses in multiple occupation (HMOs)" section, council pages, Housing tab (server component; owner approved 19 Nov
// 2026, Cowork ENTRY 362, as mocked up in ENTRY 358 with Cowork's four changes). Reads council_hmos (migration
// 2026-11-19a). England: the council's estimate, its estimate of HMOs needing a mandatory licence, those licensed, the
// licensed share and the rate for every 1,000 homes, 2011-12 to 2024-25. Wales: estimated, known, mandatory and
// additional licences, per 1,000 homes, no licensed share. Scotland: licences in force, per 1,000 homes with its own year.
// Northern Ireland: a note. A county shows the sum of its districts (only years where every district has the figure),
// as the other sections. Wording in lib/hmos.ts.
import Link from 'next/link';
import { addPanelNote, addPanelSource } from '@/lib/panel-sources';
import { OGL_NOTE } from '@/lib/fold-notes';
import {
  loadAreas, sumDistricts, count, fy, marchDate, share, perThousand, perThousandText, noteText, NO_FIGURE, NATIONAL_PATH, SOURCE,
  DEFINITION_2018, ENGLAND_ESTIMATE_NOTE, WALES_NOTE, SCOTLAND_NOTE, NI_NOTE, OVER_100_NOTE, type HmoRow,
} from '@/lib/hmos';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '0 0 8px' } as const;
const small = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6, margin: '8px 0 0' } as const;
const cell = { padding: '6px 8px', borderBottom: `1px solid ${INK_HAIRLINE}`, textAlign: 'right' as const, whiteSpace: 'nowrap' as const };
const head = { ...cell, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 'normal' as const };

function Heading() {
  return (
    <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
      Houses in multiple occupation (HMOs)
    </h2>
  );
}

function Cards({ cards }: { cards: { value: string; label: string; sub: string }[] }) {
  return (
    <div className="hmo-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: '10px', margin: '0 0 12px' }}>
      {cards.map((c) => (
        <div key={c.label} style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '10px 12px', fontFamily: MONO, color: INK }}>
          <div style={{ fontSize: '24px', lineHeight: 1.2 }}>{c.value}</div>
          <div style={{ fontSize: '15px', lineHeight: 1.35, marginTop: '4px' }}>{c.label}</div>
          <div style={{ fontSize: '13px', lineHeight: 1.35, marginTop: '6px' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// The notes under the table: each year's own note, and the predecessors of a merged council.
function YearNotes({ rows, nation }: { rows: HmoRow[]; nation: string }) {
  const notes = rows.flatMap((r) => r.notes.map((n) => noteText(n)).filter(Boolean).map((t) => `${nation === 'Scotland' ? marchDate(r.year) : fy(r.year)}: ${t}`));
  const merged = rows.filter((r) => r.predecessors.length);
  const groups = new Map<string, string[]>();
  for (const r of merged) { const k = r.predecessors.join(', '); groups.set(k, [...(groups.get(k) ?? []), fy(r.year)]); }
  return (
    <>
      {notes.map((t) => <p key={t} style={small}>{t}</p>)}
      {[...groups].map(([names, years]) => (
        <p key={names} style={small}>{years.length === 1 ? years[0] : `${years.at(-1)} to ${years[0]}`}: the sum of the councils this council replaced ({names}), each as published.</p>
      ))}
    </>
  );
}

export default async function CouncilHmoSection({ gssCodes, isCounty, country, ownCode, ownName }: {
  gssCodes: string[]; isCounty: boolean; country: string | null; ownCode: string | null; ownName: string;
}) {
  if (country === 'Northern Ireland') {
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <p style={{ ...line, margin: 0 }}>{NI_NOTE}</p>
      </section>
    );
  }
  if (!ownCode || !gssCodes.length) return null;
  const raw = await loadAreas(gssCodes);
  const rows = isCounty ? sumDistricts(raw, gssCodes, ownName, ownCode) : raw.filter((r) => r.ons_code === ownCode);
  const cur = rows[0];
  if (!cur) return null;
  const nation = cur.nation;
  // The source and its licence go in the tab's Sources fold (Cowork ENTRY 410), not in the text. Added here, while the
  // section is read, so the panel route has them before it lists the fold (they were added by a child component before,
  // which renders after the fold's list is read).
  const src = SOURCE[nation as keyof typeof SOURCE];
  if (src) addPanelSource({ label: src.label, href: src.href });
  addPanelNote(OGL_NOTE);
  const rate = perThousand(nation === 'Scotland' ? cur.licensed : cur.estimated, cur.homes);
  const homesLine = cur.homes != null && cur.homes_year ? `${count(cur.homes)} homes, ${marchDate(cur.homes_year)}` : 'Homes: no figure published';

  if (nation === 'England') {
    const pct = share(cur.licensed, cur.licensable);
    const when = marchDate(cur.year);
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <Cards cards={[
          { value: count(cur.estimated), label: 'Estimated HMOs', sub: `Council estimate, ${when}` },
          { value: count(cur.licensable), label: 'Estimated HMOs needing a mandatory licence', sub: `Council estimate, ${when}` },
          { value: count(cur.licensed), label: 'HMOs with a mandatory licence', sub: `Licences in force, ${when}` },
          { value: pct == null ? NO_FIGURE : `${pct}%`, label: 'Licensed out of those needing a mandatory licence', sub: `${fy(cur.year)}` },
          { value: perThousandText(rate), label: 'Estimated HMOs per 1,000 homes', sub: homesLine },
        ]} />
        {cur.estimated != null && (
          <p style={line}>
            {isCounty ? 'Its district councils estimate' : 'The council estimates'} {count(cur.estimated)} HMOs{rate != null ? `, about ${perThousandText(rate)} for every 1,000 homes` : ''}.
            {cur.licensable != null && cur.licensed != null ? ` ${isCounty ? 'They estimate' : 'It estimates'} ${count(cur.licensable)} need a mandatory licence and ${count(cur.licensed)} have one${pct != null ? `: ${pct} per cent` : ''}.` : ''}
          </p>
        )}
        <p style={small}>{ENGLAND_ESTIMATE_NOTE} {DEFINITION_2018}</p>
        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: MONO, fontSize: '14px', color: INK }}>
            <caption style={{ textAlign: 'left', fontSize: '15px', padding: '0 0 6px' }}>Year by year, at 31 March</caption>
            <thead><tr><th scope="col" style={{ ...head, textAlign: 'left' }}>Year</th><th scope="col" style={head}>Estimated</th><th scope="col" style={head}>Needing a licence</th><th scope="col" style={head}>Licensed</th><th scope="col" style={head}>Licensed %</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const p = share(r.licensed, r.licensable);
                return (
                  <tr key={r.year}>
                    <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 'normal' }}>{fy(r.year)}{r.notes.length || r.predecessors.length ? ' *' : ''}</th>
                    <td style={cell}>{count(r.estimated)}</td><td style={cell}>{count(r.licensable)}</td><td style={cell}>{count(r.licensed)}</td><td style={cell}>{p == null ? NO_FIGURE : `${p}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <YearNotes rows={rows} nation={nation} />
        {rows.some((r) => (share(r.licensed, r.licensable) ?? 0) > 100) && <p style={small}>{OVER_100_NOTE}</p>}
        <p style={small}><Link href={NATIONAL_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council</Link>.</p>
      </section>
    );
  }

  if (nation === 'Wales') {
    const when = marchDate(cur.year);
    return (
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <Heading />
        <Cards cards={[
          { value: count(cur.estimated), label: 'Estimated HMOs', sub: `Council estimate, ${when}` },
          { value: count(cur.known), label: 'Known HMOs', sub: `Known to the council, ${when}` },
          { value: count(cur.licensed), label: 'HMO licences in force', sub: cur.mandatory_licences != null && cur.additional_licences != null ? `Mandatory ${count(cur.mandatory_licences)}, additional ${count(cur.additional_licences)}` : when },
          { value: perThousandText(rate), label: 'Estimated HMOs per 1,000 homes', sub: homesLine },
        ]} />
        {cur.estimated != null && (
          <p style={line}>
            The council estimates {count(cur.estimated)} HMOs{cur.known != null ? ` and knows of ${count(cur.known)}` : ''}{cur.licensed != null ? `; ${count(cur.licensed)} hold a licence` : ''}.
          </p>
        )}
        <p style={small}>{WALES_NOTE}</p>
        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: MONO, fontSize: '14px', color: INK }}>
            <caption style={{ textAlign: 'left', fontSize: '15px', padding: '0 0 6px' }}>Year by year, at 31 March</caption>
            <thead><tr><th scope="col" style={{ ...head, textAlign: 'left' }}>Year</th><th scope="col" style={head}>Estimated</th><th scope="col" style={head}>Known</th><th scope="col" style={head}>Mandatory licences</th><th scope="col" style={head}>Additional licences</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 'normal' }}>{fy(r.year)}{r.notes.length ? ' *' : ''}</th>
                  <td style={cell}>{count(r.estimated)}</td><td style={cell}>{count(r.known)}</td><td style={cell}>{count(r.mandatory_licences)}</td><td style={cell}>{count(r.additional_licences)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <YearNotes rows={rows} nation={nation} />
        <p style={small}><Link href={NATIONAL_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council</Link>.</p>
      </section>
    );
  }

  // Scotland
  const recent = rows.slice(0, 10);
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <Heading />
      <Cards cards={[
        { value: count(cur.licensed), label: 'HMO licences in force', sub: marchDate(cur.year) },
        { value: perThousandText(rate), label: 'Licences per 1,000 homes', sub: homesLine },
      ]} />
      {cur.licensed != null && (
        <p style={line}>
          The council had {count(cur.licensed)} HMO licences in force on {marchDate(cur.year)}{rate != null ? `, about ${perThousandText(rate)} for every 1,000 homes` : ''}.
        </p>
      )}
      <p style={small}>{SCOTLAND_NOTE} Scotland publishes no estimate of all HMOs by council.</p>
      <div style={{ overflowX: 'auto', marginTop: '10px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: MONO, fontSize: '14px', color: INK }}>
          <caption style={{ textAlign: 'left', fontSize: '15px', padding: '0 0 6px' }}>Licences in force, at 31 March</caption>
          <thead><tr><th scope="col" style={{ ...head, textAlign: 'left' }}>Date</th><th scope="col" style={head}>Licences in force</th></tr></thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.year}>
                <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 'normal' }}>{marchDate(r.year)}{r.notes.length ? ' *' : ''}</th>
                <td style={cell}>{count(r.licensed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <YearNotes rows={recent} nation={nation} />
      <p style={small}><Link href={NATIONAL_PATH} style={{ color: INK, textDecoration: 'underline' }}>Compare every council</Link>.</p>
    </section>
  );
}
