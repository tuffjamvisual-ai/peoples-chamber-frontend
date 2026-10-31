// The source credit on pages built from UK Parliament's APIs (owner's wording, 26 Oct 2026, report 81): the API, and
// an optional note. Since 31 Oct 2026 (owner) the Open Parliament Licence attribution is in the footer of every page
// (OpenGovShell, which imports OPEN_PARLIAMENT_LICENCE_URL from here), so this no longer repeats it; with neither an
// api nor a note it renders nothing, and pages that used it that way no longer do.

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
export const OPEN_PARLIAMENT_LICENCE_URL = 'https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/';

export default function ParliamentSourceCredit({ api, note, marginTop = '28px' }: { api?: 'Statutory Instruments API' | 'Treaties API'; note?: React.ReactNode; marginTop?: string }) {
  if (!api && !note) return null;
  return (
    <div style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, marginTop }}>
      {api && <p style={{ margin: 0 }}>Source: UK Parliament {api}</p>}
      {note && <p style={{ margin: api ? '6px 0 0' : 0 }}>{note}</p>}
    </div>
  );
}
