'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';

// Real, visible sign-in / create-account form rendered inside the dossier
// folder (ink on parchment). Wired to the existing /api/auth login + signup
// via AuthContext. Replaces the old transparent-input-over-PNG overlay.

const INK = '#14100d';
const ACCENT = '#6b2417';

function safeReturnTo(value: string | null): string {
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

const label: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  opacity: 0.7,
  marginBottom: '6px',
};

const input: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(20,16,13,0.04)',
  border: '1px solid rgba(20,16,13,0.28)',
  borderRadius: '2px',
  color: INK,
  fontFamily: 'inherit',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '18px',
};

const button: CSSProperties = {
  width: '100%',
  padding: '13px',
  background: INK,
  color: '#f1e7d3',
  border: 'none',
  borderRadius: '2px',
  fontFamily: 'inherit',
  fontSize: '16px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

function tab(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? `3px solid ${INK}` : '3px solid transparent',
    color: INK,
    opacity: active ? 1 : 0.5,
    fontFamily: 'inherit',
    fontSize: '17px',
    letterSpacing: '0.04em',
    cursor: 'pointer',
  };
}

export default function MagazineLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );

  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setError('');
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(signinEmail.trim(), signinPassword);
      router.push(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (signupName.trim().length < 3) { setError('Please enter your full name'); return; }
    const pwOk = signupPassword.length >= 8 && /[0-9]/.test(signupPassword) && /[A-Za-z]/.test(signupPassword);
    if (!pwOk) { setError('Password must be 8 or more characters with a letter and a number'); return; }
    setLoading(true);
    try {
      await signup(signupEmail.trim(), signupPassword, '', signupName.trim());
      router.push(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', fontFamily: 'Special Elite, monospace', color: INK }}>
      <style>{`
        .pc-login input:focus { border-color: ${INK}; background: rgba(20,16,13,0.07); }
        .pc-login button[type=submit]:hover { background: #2a211a; }
        .pc-login button[type=submit]:disabled { opacity: 0.55; cursor: default; }
      `}</style>

      <div className="pc-login">
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(20,16,13,0.2)', marginBottom: '26px' }}>
          <button type="button" onClick={() => switchMode('signin')} style={tab(mode === 'signin')}>Sign In</button>
          <button type="button" onClick={() => switchMode('signup')} style={tab(mode === 'signup')}>Create Account</button>
        </div>

        {error && (
          <div role="alert" style={{ marginBottom: '18px', padding: '11px 14px', background: 'rgba(107,36,23,0.1)', border: `1px solid ${ACCENT}`, color: ACCENT, fontSize: '14px', lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignin}>
            <label style={label} htmlFor="si-email">Email</label>
            <input id="si-email" type="email" autoComplete="username" required value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} style={input} />

            <label style={label} htmlFor="si-pw">Password</label>
            <input id="si-pw" type="password" autoComplete="current-password" required value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} style={input} />

            <button type="submit" disabled={loading} style={button}>{loading ? 'Signing in…' : 'Sign In'}</button>

            <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.75 }}>
              New here?{' '}
              <button type="button" onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', color: ACCENT, font: 'inherit', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Create an account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <label style={label} htmlFor="su-name">Full name</label>
            <input id="su-name" type="text" autoComplete="name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} style={input} />

            <label style={label} htmlFor="su-email">Email</label>
            <input id="su-email" type="email" autoComplete="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} style={input} />

            <label style={label} htmlFor="su-pw">Password</label>
            <input id="su-pw" type="password" autoComplete="new-password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} style={{ ...input, marginBottom: '6px' }} />
            <p style={{ margin: '0 0 18px', fontSize: '13px', opacity: 0.6 }}>8 or more characters, with a letter and a number.</p>

            <button type="submit" disabled={loading} style={button}>{loading ? 'Creating account…' : 'Create Account'}</button>

            <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.75 }}>
              Already registered?{' '}
              <button type="button" onClick={() => switchMode('signin')} style={{ background: 'none', border: 'none', color: ACCENT, font: 'inherit', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
