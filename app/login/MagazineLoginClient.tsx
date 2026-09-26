'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';

const INK = '#14100d';
const ACCENT = '#6b2417';

function safeReturnTo(value: string | null): string {
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

const label: CSSProperties = {
  display: 'block',
  fontSize: '15px',
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

const ghostLink: CSSProperties = {
  background: 'none',
  border: 'none',
  color: ACCENT,
  fontFamily: 'inherit',
  fontSize: '15px',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
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

type Mode = 'signin' | 'signup' | 'forgot' | 'changePassword';

export default function MagazineLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const { login, signup, user, setAuthedUser } = useAuth();

  useEffect(() => {
    if (user) router.push(returnTo);
  }, [user, returnTo, router]);

  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );

  // signin / signup fields
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPostcode, setSignupPostcode] = useState('');

  // forgot fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // changePassword fields (also used for forced-reset flow)
  const [cpEmail, setCpEmail] = useState('');
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [isForced, setIsForced] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(() => {
    const v = searchParams.get('verified');
    return v === '1'
      ? 'Email confirmed. You can now sign in and vote.'
      : v === 'invalid'
        ? 'That confirmation link was invalid or has expired.'
        : '';
  });

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await login(signinEmail.trim(), signinPassword);
      if (result?.needsPasswordReset) {
        setCpEmail(result.email);
        setIsForced(true);
        setCpCurrent('');
        setCpNew('');
        setLoading(false);
        switchMode('changePassword');
        return;
      }
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
      const res = await signup(signupEmail.trim(), signupPassword, signupPostcode.trim(), signupName.trim(), returnTo !== '/' ? returnTo : undefined);
      if (res?.needsVerification) {
        setLoading(false);
        setNotice('Account created. Check your email for a confirmation link, then sign in to start voting.');
        return;
      }
      router.push(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      setForgotSent(true);
    } catch {
      // Still show the same generic notice — don't reveal network state.
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    const pwOk = cpNew.length >= 8 && /[A-Za-z]/.test(cpNew) && /[0-9]/.test(cpNew);
    if (!pwOk) { setError('Password must be 8 or more characters with a letter and a number'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cpEmail, currentPassword: cpCurrent, newPassword: cpNew }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Password change failed'); setLoading(false); return; }
      setAuthedUser(data.user);
      router.push(returnTo);
    } catch {
      setError('Something went wrong. Please try again.');
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
        {/* Tabs — hidden in forgot / changePassword modes */}
        {(mode === 'signin' || mode === 'signup') && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(20,16,13,0.2)', marginBottom: '26px' }}>
            <button type="button" onClick={() => switchMode('signin')} style={tab(mode === 'signin')}>Sign In</button>
            <button type="button" onClick={() => switchMode('signup')} style={tab(mode === 'signup')}>Create Account</button>
          </div>
        )}

        {error && (
          <div role="alert" style={{ marginBottom: '18px', padding: '11px 14px', background: 'rgba(107,36,23,0.1)', border: `1px solid ${ACCENT}`, color: ACCENT, fontSize: '15px', lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {notice && (
          <div role="status" style={{ marginBottom: '18px', padding: '11px 14px', background: 'rgba(78,107,52,0.12)', border: '1px solid #4e6b34', color: '#3a5226', fontSize: '15px', lineHeight: 1.4 }}>
            {notice}
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignin}>
            <label style={label} htmlFor="si-email">Email</label>
            <input id="si-email" type="email" autoComplete="username" required value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} style={input} />

            <label style={label} htmlFor="si-pw">Password</label>
            <input id="si-pw" type="password" autoComplete="current-password" required value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} style={{ ...input, marginBottom: '8px' }} />

            <p style={{ margin: '0 0 18px', textAlign: 'right', fontSize: '15px' }}>
              <button type="button" onClick={() => { setForgotEmail(signinEmail); switchMode('forgot'); }} style={ghostLink}>
                Forgot password?
              </button>
            </p>

            <button type="submit" disabled={loading} style={button}>{loading ? 'Signing in…' : 'Sign In'}</button>

            <p style={{ marginTop: '16px', fontSize: '15px', opacity: 0.75 }}>
              New here?{' '}
              <button type="button" onClick={() => switchMode('signup')} style={ghostLink}>
                Create an account
              </button>
            </p>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup}>
            <label style={label} htmlFor="su-name">Full name</label>
            <input id="su-name" type="text" autoComplete="name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} style={input} />

            <label style={label} htmlFor="su-email">Email</label>
            <input id="su-email" type="email" autoComplete="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} style={input} />

            <label style={label} htmlFor="su-pw">Password</label>
            <input id="su-pw" type="password" autoComplete="new-password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} style={{ ...input, marginBottom: '6px' }} />
            <p style={{ margin: '0 0 18px', fontSize: '15px', opacity: 0.6 }}>8 or more characters, with a letter and a number.</p>

            <label style={label} htmlFor="su-postcode">Postcode <span style={{ opacity: 0.6 }}>(optional)</span></label>
            <input id="su-postcode" type="text" autoComplete="postal-code" value={signupPostcode} onChange={(e) => setSignupPostcode(e.target.value)} style={input} />

            <button type="submit" disabled={loading} style={button}>{loading ? 'Creating account…' : 'Create Account'}</button>

            <p style={{ marginTop: '16px', fontSize: '15px', opacity: 0.75 }}>
              Already registered?{' '}
              <button type="button" onClick={() => switchMode('signin')} style={ghostLink}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <div>
            <h2 style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 'bold', letterSpacing: '-0.01em', marginBottom: '16px' }}>
              Forgot password
            </h2>
            {forgotSent ? (
              <div role="status" style={{ padding: '11px 14px', background: 'rgba(78,107,52,0.12)', border: '1px solid #4e6b34', color: '#3a5226', fontSize: '15px', lineHeight: 1.5, marginBottom: '20px' }}>
                If that address is registered, a reset link is on its way. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <label style={label} htmlFor="fp-email">Email</label>
                <input id="fp-email" type="email" autoComplete="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={input} />
                <button type="submit" disabled={loading} style={button}>{loading ? 'Sending…' : 'Send reset link'}</button>
              </form>
            )}
            <p style={{ marginTop: '20px', fontSize: '15px', opacity: 0.75 }}>
              <button type="button" onClick={() => switchMode('signin')} style={ghostLink}>
                ← Back to sign in
              </button>
            </p>
          </div>
        )}

        {mode === 'changePassword' && (
          <div>
            <h2 style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 'bold', letterSpacing: '-0.01em', marginBottom: '10px' }}>
              {isForced ? 'Set a new password' : 'Change password'}
            </h2>
            {isForced && (
              <p style={{ fontSize: '15px', opacity: 0.75, marginBottom: '20px', lineHeight: 1.5 }}>
                You need to set a new password before continuing.
              </p>
            )}
            <form onSubmit={handleChangePassword}>
              <label style={label} htmlFor="cp-current">Current password</label>
              <input id="cp-current" type="password" autoComplete="current-password" required value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} style={input} />

              <label style={label} htmlFor="cp-new">New password</label>
              <input id="cp-new" type="password" autoComplete="new-password" required value={cpNew} onChange={(e) => setCpNew(e.target.value)} style={{ ...input, marginBottom: '6px' }} />
              <p style={{ margin: '0 0 18px', fontSize: '15px', opacity: 0.6 }}>8 or more characters, with a letter and a number.</p>

              <button type="submit" disabled={loading} style={button}>{loading ? 'Saving…' : 'Set new password'}</button>
            </form>
            {!isForced && (
              <p style={{ marginTop: '20px', fontSize: '15px', opacity: 0.75 }}>
                <button type="button" onClick={() => switchMode('signin')} style={ghostLink}>
                  ← Back to sign in
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
