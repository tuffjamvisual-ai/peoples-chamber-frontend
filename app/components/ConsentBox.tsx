'use client';

// The consent box at a member's first follow or saved search (job 74; privacy page, report 72 section 5). Unticked;
// the button works only once the box is ticked; the plain wording says what is kept and why, linked to the privacy page.
import { useId, useState } from 'react';
import Link from 'next/link';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export const CONSENT_TEXT =
  'I agree that opengovt keeps a list of what I follow and the searches I save, to send me a weekly email of what changed. What I follow could show my political views. I can stop the emails or delete the list at any time.';

export default function ConsentBox({ onAgree, onCancel, busy }: { onAgree: () => void; onCancel: () => void; busy: boolean }) {
  const [ticked, setTicked] = useState(false);
  const id = useId();
  return (
    <div role="group" aria-label="Your agreement" style={{ marginTop: '12px', padding: '12px 14px', border: `1.5px solid ${ACCENT}`, background: 'rgba(122,22,18,0.04)', maxWidth: '620px', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <input id={id} type="checkbox" autoFocus checked={ticked} onChange={(e) => setTicked(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '3px', flexShrink: 0, cursor: 'pointer' }} />
        <label htmlFor={id} style={{ cursor: 'pointer' }}>{CONSENT_TEXT}</label>
      </div>
      <p style={{ margin: '8px 0 0' }}>
        We do not share it or use it for advertising. <Link href="/privacy" style={{ color: ACCENT }}>Privacy</Link>
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        <button type="button" onClick={onAgree} disabled={!ticked || busy} style={{ fontFamily: MONO, fontSize: '15px', color: '#fff', background: ACCENT, border: 'none', borderRadius: '3px', padding: '7px 14px', cursor: ticked ? 'pointer' : 'not-allowed', opacity: !ticked || busy ? 0.55 : 1 }}>
          Agree and continue
        </button>
        <button type="button" onClick={onCancel} style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, background: 'transparent', border: `1.5px solid ${ACCENT}`, borderRadius: '3px', padding: '7px 14px', cursor: 'pointer' }}>
          Not now
        </button>
      </div>
    </div>
  );
}
