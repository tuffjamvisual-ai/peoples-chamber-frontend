'use client';

// The cookie settings form on /cookies, as on GOV.UK: Yes or No to cookies that measure website use, saved with
// writeConsent (lib/cookie-consent.ts), which also tells the banner and PostHog. No choice yet: No is selected.
import { useEffect, useId, useRef, useState } from 'react';
import { readConsent, writeConsent } from '@/lib/cookie-consent';

const INK = '#14100d';
const PAPER = '#fbf4e6';
const MONO = 'var(--font-special-elite), monospace';

export default function CookieSettingsForm() {
  const [choice, setChoice] = useState<'yes' | 'no'>('no');
  const [saved, setSaved] = useState(false);
  const savedRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    // The saved choice is read from the browser after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readConsent()?.analytics) setChoice('yes');
  }, []);

  useEffect(() => {
    if (saved) savedRef.current?.focus();
  }, [saved]);

  const radio = (value: 'yes' | 'no', label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 10px', cursor: 'pointer', fontSize: '16px' }}>
      <input
        type="radio"
        name={`${id}-analytics`}
        value={value}
        checked={choice === value}
        onChange={() => setChoice(value)}
        className="focus-ring"
        style={{ width: '22px', height: '22px', margin: 0, flexShrink: 0, accentColor: INK, cursor: 'pointer' }}
      />
      {label}
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        writeConsent(choice === 'yes');
        setSaved(true);
      }}
      style={{ fontFamily: MONO, color: INK }}
    >
      {saved && (
        <div ref={savedRef} tabIndex={-1} role="status" style={{ border: `2px solid ${INK}`, background: PAPER, padding: '12px 14px', margin: '0 0 18px', outline: 'none' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6, margin: 0 }}>You&rsquo;ve set your cookie preferences.</p>
        </div>
      )}
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px' }}>Use cookies that measure my website use</legend>
        {radio('yes', 'Yes')}
        {radio('no', 'No')}
      </fieldset>
      <button
        type="submit"
        className="focus-ring"
        style={{ fontFamily: MONO, fontSize: '16px', color: PAPER, background: INK, border: `2px solid ${INK}`, padding: '8px 14px', cursor: 'pointer' }}
      >
        Save cookie settings
      </button>
    </form>
  );
}
