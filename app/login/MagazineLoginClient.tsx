'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup' | 'forgot';

const ink = '#14100d';
const inkSoft = 'rgba(20,16,13,0.7)';
const inkHairline = 'rgba(20,16,13,0.3)';
const accent = '#7a1612';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'transparent',
  color: ink,
  border: `2px solid ${inkHairline}`,
  fontFamily: 'inherit',
  fontSize: '15px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  marginBottom: '6px',
  opacity: 0.8,
};

function safeReturnTo(value: string | null): string {
  if (!value) return '/';
  // Only honour same-origin relative paths to prevent open-redirect.
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export default function MagazineLoginClient({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const queryMode = searchParams.get('mode');
  const startMode: Mode = (queryMode === 'signup' || queryMode === 'login' || queryMode === 'forgot') ? queryMode : initialMode;
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>(startMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [postcode, setPostcode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (honeypot) return;
        const strong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
        if (!strong) { setError('Password must be at least 8 characters with one uppercase letter and one number'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (!ageConfirmed) { setError('You must confirm you are 18 or older'); return; }
        if (!username.trim()) { setError('Username is required'); return; }
        await signup(email, password, postcode, username);
        router.push(returnTo);
      } else if (mode === 'login') {
        await login(email, password);
        router.push(returnTo);
      } else {
        setSuccess('Password reset instructions sent to your email (feature coming soon)');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create your account' : 'Reset password';

  return (
    <article style={{ maxWidth: '480px', margin: '0 auto', color: ink, fontFamily: 'Special Elite, monospace' }}>
      <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
        The People&apos;s Chamber
      </p>
      <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '24px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
        {heading}
      </h1>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', border: `2px solid ${accent}`, background: 'rgba(122,22,18,0.08)', color: accent, fontSize: '14px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', border: `2px solid ${inkHairline}`, background: 'transparent', color: ink, fontSize: '14px' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} autoComplete="email" />
        </div>

        {mode !== 'forgot' && (
          <div>
            <label htmlFor="pw" style={labelStyle}>Password</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
        )}

        {mode === 'signup' && (
          <>
            <div>
              <label htmlFor="pw2" style={labelStyle}>Confirm password</label>
              <input id="pw2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="username" style={labelStyle}>Username</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20} style={inputStyle} autoComplete="username" />
            </div>
            <div>
              <label htmlFor="postcode" style={labelStyle}>Postcode (optional)</label>
              <input id="postcode" type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} style={inputStyle} autoComplete="postal-code" />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: inkSoft }}>
              <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} style={{ marginTop: '4px' }} />
              <span>I confirm I am 18 years of age or older</span>
            </label>
          </>
        )}

        {/* honeypot — hidden from users, traps bots */}
        <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '14px 16px',
            background: accent,
            color: '#f4e8d4',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '15px',
            letterSpacing: '0.05em',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transform: 'rotate(-0.2deg)',
          }}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
        </button>
      </form>

      {mode === 'login' && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={() => setMode('forgot')} style={{ background: 'transparent', border: 'none', color: ink, fontFamily: 'inherit', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer' }}>
            Forgot password?
          </button>
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: inkSoft }}>
        {mode === 'login' && (<>Don&apos;t have an account?{' '}<button onClick={() => setMode('signup')} style={modeSwitchStyle}>Sign up</button></>)}
        {mode === 'signup' && (<>Already have an account?{' '}<button onClick={() => setMode('login')} style={modeSwitchStyle}>Sign in</button></>)}
        {mode === 'forgot' && (<>Remember your password?{' '}<button onClick={() => setMode('login')} style={modeSwitchStyle}>Sign in</button></>)}
      </div>
    </article>
  );
}

const modeSwitchStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#7a1612',
  fontFamily: 'inherit',
  fontSize: '14px',
  textDecoration: 'underline',
  cursor: 'pointer',
};
