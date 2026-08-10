'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

// Client island for the donation page: amount presets + custom entry, then
// POSTs to /api/checkout and redirects to Stripe's hosted checkout URL.
// Tokens: Paper #f4e8d4, Ink #14100d, Accent Red #7a1612.

const PAPER = '#f4e8d4';
const INK = '#14100d';
const ACCENT = '#7a1612';
const PRESETS = [5, 10, 25, 50];

export default function DonateForm() {
  const [selected, setSelected] = useState<number | null>(10);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function donate() {
    setError(null);
    const amt = custom.trim() ? Number(custom) : selected;
    if (!amt || !Number.isFinite(amt) || amt < 1) {
      setError('Please choose or enter an amount of at least £1.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amt * 100) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      window.location.href = data.url; // redirect to Stripe hosted checkout
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const presetStyle = (active: boolean): CSSProperties => ({
    padding: '14px 0',
    fontFamily: 'inherit',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    background: active ? ACCENT : PAPER,
    color: active ? PAPER : INK,
    border: `2px solid ${INK}`,
    borderRadius: 6,
  });

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            style={presetStyle(!custom.trim() && selected === v)}
            onClick={() => {
              setSelected(v);
              setCustom('');
            }}
          >
            £{v}
          </button>
        ))}
      </div>

      <label htmlFor="custom-amount" style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: INK }}>
        Or enter a custom amount
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 20, color: INK }}>£</span>
        <input
          id="custom-amount"
          type="number"
          min={1}
          step={1}
          inputMode="decimal"
          placeholder="e.g. 15"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          style={{ flex: 1, padding: '12px', fontSize: 18, border: `2px solid ${INK}`, borderRadius: 6, background: PAPER, color: INK }}
        />
      </div>

      {error && <p style={{ color: ACCENT, fontWeight: 'bold', marginBottom: 12 }}>{error}</p>}

      <button
        type="button"
        onClick={donate}
        disabled={loading}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: 20,
          fontWeight: 'bold',
          cursor: loading ? 'wait' : 'pointer',
          background: INK,
          color: PAPER,
          border: `2px solid ${INK}`,
          borderRadius: 6,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Redirecting to secure checkout…' : 'Donate with card →'}
      </button>

      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 12, color: INK }}>
        Secure one-off payment via Stripe. No account needed. You&rsquo;ll be redirected to Stripe&rsquo;s checkout page.
      </p>
    </div>
  );
}
