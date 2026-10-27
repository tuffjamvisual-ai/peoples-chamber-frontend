// The source credit on pages built from UK Parliament's APIs (owner's wording, 26 Oct 2026, report 81): the API, then
// the Open Parliament Licence attribution on its own line, with the licence linked. Without an api, the licence line
// alone, for a page that already names its source (owner's job, 27 Oct 2026: every page showing Parliament data).

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
export const OPEN_PARLIAMENT_LICENCE_URL = 'https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/';

export default function ParliamentSourceCredit({ api, note, marginTop = '28px' }: { api?: 'Statutory Instruments API' | 'Treaties API'; note?: React.ReactNode; marginTop?: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, marginTop }}>
      {api && <p style={{ margin: 0 }}>Source: UK Parliament {api}</p>}
      <p style={{ margin: 0 }}>
        Contains Parliamentary information licensed under the{' '}
        <a href={OPEN_PARLIAMENT_LICENCE_URL} rel="noopener" style={{ color: ACCENT }}>Open Parliament Licence v3.0</a>.
      </p>
      {note && <p style={{ margin: '6px 0 0' }}>{note}</p>}
    </div>
  );
}
