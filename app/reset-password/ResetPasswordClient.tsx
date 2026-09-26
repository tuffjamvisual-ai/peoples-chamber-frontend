'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';

const INK = '#14100d';
const ACCENT = '#6b2417';

const label: CSSProperties = {
  display: 'block', fontSize: '15px', textTransform: 'uppercase',
  letterSpacing: '0.14em', opacity: 0.7, marginBottom: '6px',
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(20,16,13,0.04)', border: '1px solid rgba(20,16,13,0.28)',
  borderRadius: '2px', color: INK, fontFamily: 'inherit', fontSize: '16px',
  outline: 'none', boxSizing: 'border-box', marginBottom: '18px',
};

const buttonStyle: CSSProperties = {
  width: '100%', padding: '13px', background: INK, color: '#f1e7d3',
  border: 'none', borderRadius: '2px', fontFamily: 'inherit',
  fontSize: '16px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
};

export default function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();
  const { setAuthedUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto', fontFamily: 'Special Elite, monospace', color: INK }}>
        <p style={{ fontSize: '15px', opacity: 0.75 }}>
          This reset link is invalid.{' '}
          <a href="/login" style={{ color: ACCENT, textDecoration: 'underline' }}>Return to sign in</a>
          {' '}and use Forgot password to request a new one.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const pwOk = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
    if (!pwOk) { setError('Password must be 8 or more characters with a letter and a number'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Reset failed'); setLoading(false); return; }
      setAuthedUser(data.user);
      router.push('/');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', fontFamily: 'Special Elite, monospace', color: INK }}>
      <style>{`
        .pc-reset input:focus { border-color: ${INK}; background: rgba(20,16,13,0.07); }
        .pc-reset button[type=submit]:hover { background: #2a211a; }
        .pc-reset button[type=submit]:disabled { opacity: 0.55; cursor: default; }
      `}</style>
      <div className="pc-reset">
        {error && (
          <div role="alert" style={{ marginBottom: '18px', padding: '11px 14px', background: 'rgba(107,36,23,0.1)', border: `1px solid ${ACCENT}`, color: ACCENT, fontSize: '15px', lineHeight: 1.4 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={label} htmlFor="rp-pw">New password</label>
          <input
            id="rp-pw" type="password" autoComplete="new-password" required
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: '6px' }}
          />
          <p style={{ margin: '0 0 18px', fontSize: '15px', opacity: 0.6 }}>8 or more characters, with a letter and a number.</p>
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
