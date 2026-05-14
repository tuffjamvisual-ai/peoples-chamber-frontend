'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

// The login form is rendered as a single illustrated PNG overlay
// (public/login-overlay.png — 1024×1536). Transparent <input> and
// <button> elements are positioned absolutely over the painted field
// frames, in percentage coordinates so the layout scales with viewport.
// Tweak the FIELD coordinate constants if anything sits off-position.

const FIELD = {
  // x / y / w / h as % of the overlay container
  signinEmail:    { top: 36.5, left: 6,  width: 38, height: 5 },
  signinPassword: { top: 47,   left: 6,  width: 38, height: 5 },
  rememberMe:     { top: 53.5, left: 6,  width: 14, height: 3 },
  forgotLink:     { top: 53.5, left: 28, width: 16, height: 3 },
  signinBtn:      { top: 58,   left: 6,  width: 38, height: 6 },
  oauthGoogle:    { top: 70.5, left: 6,  width: 38, height: 5.5 },
  oauthApple:     { top: 77.5, left: 6,  width: 38, height: 5.5 },

  signupName:     { top: 28,   left: 56, width: 38, height: 5 },
  signupEmail:    { top: 39,   left: 56, width: 38, height: 5 },
  signupPassword: { top: 50,   left: 56, width: 38, height: 5 },
  signupBtn:      { top: 67.5, left: 56, width: 38, height: 6 },
};

function safeReturnTo(value: string | null): string {
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

const transparentInput: React.CSSProperties = {
  position: 'absolute',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#14100d',
  fontFamily: 'Special Elite, monospace',
  fontSize: '15px',
  padding: '0 12px',
};

const transparentBtn: React.CSSProperties = {
  position: 'absolute',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'transparent', // hide any text — button surface is painted in the PNG
};

function pct(f: { top: number; left: number; width: number; height: number }): React.CSSProperties {
  return { top: `${f.top}%`, left: `${f.left}%`, width: `${f.width}%`, height: `${f.height}%` };
}

export default function MagazineLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const { login, signup } = useAuth();

  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const [busyMsg, setBusyMsg] = useState('');

  const handleSignin = async () => {
    if (signinLoading) return;
    setSigninError('');
    setSigninLoading(true);
    setBusyMsg('Signing in…');
    try {
      await login(signinEmail, signinPassword);
      router.push(returnTo);
    } catch (err: unknown) {
      setSigninError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigninLoading(false);
      setBusyMsg('');
    }
  };

  const handleSignup = async () => {
    if (signupLoading) return;
    setSignupError('');
    const ok = signupPassword.length >= 8 && /[0-9]/.test(signupPassword) && /[A-Za-z]/.test(signupPassword);
    if (!ok) {
      setSignupError('Password must be 8+ characters and include a letter and a number');
      return;
    }
    if (signupName.trim().length < 3) {
      setSignupError('Please enter your full name');
      return;
    }
    setSignupLoading(true);
    setBusyMsg('Creating account…');
    try {
      await signup(signupEmail, signupPassword, '', signupName);
      router.push(returnTo);
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSignupLoading(false);
      setBusyMsg('');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto', aspectRatio: '1024 / 1536' }}>
      {/* The painted overlay — labels, frames, Big Ben, buttons all live in this PNG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-overlay.png"
        alt=""
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      />

      {/* Inline error / busy banner — sits above the form columns */}
      {(signinError || signupError || busyMsg) && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '6%',
          right: '6%',
          padding: '10px 14px',
          background: 'rgba(196,38,46,0.95)',
          color: '#fff',
          fontFamily: 'Special Elite, monospace',
          fontSize: '13px',
          zIndex: 10,
          textAlign: 'center',
        }}>
          {busyMsg || signinError || signupError}
        </div>
      )}

      {/* ===== SIGN-IN inputs / buttons ===== */}
      <input
        type="text"
        value={signinEmail}
        onChange={(e) => setSigninEmail(e.target.value)}
        aria-label="Email or username"
        autoComplete="username"
        style={{ ...transparentInput, ...pct(FIELD.signinEmail) }}
      />
      <input
        type="password"
        value={signinPassword}
        onChange={(e) => setSigninPassword(e.target.value)}
        aria-label="Password"
        autoComplete="current-password"
        style={{ ...transparentInput, ...pct(FIELD.signinPassword) }}
      />

      <button
        type="button"
        onClick={() => {/* remember-me: stub */}}
        aria-label="Remember me"
        style={{ ...transparentBtn, ...pct(FIELD.rememberMe) }}
      />
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); alert('Password reset is coming soon.'); }}
        aria-label="Forgot password"
        style={{ ...transparentBtn, ...pct(FIELD.forgotLink) }}
      />

      <button
        type="button"
        onClick={handleSignin}
        disabled={signinLoading}
        aria-label="Sign in"
        style={{ ...transparentBtn, ...pct(FIELD.signinBtn) }}
      />

      <button
        type="button"
        disabled
        aria-label="Continue with Google (coming soon)"
        title="Coming soon"
        style={{ ...transparentBtn, ...pct(FIELD.oauthGoogle), cursor: 'not-allowed' }}
      />
      <button
        type="button"
        disabled
        aria-label="Continue with Apple (coming soon)"
        title="Coming soon"
        style={{ ...transparentBtn, ...pct(FIELD.oauthApple), cursor: 'not-allowed' }}
      />

      {/* ===== SIGN-UP inputs / button ===== */}
      <input
        type="text"
        value={signupName}
        onChange={(e) => setSignupName(e.target.value)}
        aria-label="Full name"
        autoComplete="name"
        style={{ ...transparentInput, ...pct(FIELD.signupName) }}
      />
      <input
        type="email"
        value={signupEmail}
        onChange={(e) => setSignupEmail(e.target.value)}
        aria-label="Email"
        autoComplete="email"
        style={{ ...transparentInput, ...pct(FIELD.signupEmail) }}
      />
      <input
        type="password"
        value={signupPassword}
        onChange={(e) => setSignupPassword(e.target.value)}
        aria-label="Password"
        autoComplete="new-password"
        style={{ ...transparentInput, ...pct(FIELD.signupPassword) }}
      />

      <button
        type="button"
        onClick={handleSignup}
        disabled={signupLoading}
        aria-label="Create account"
        style={{ ...transparentBtn, ...pct(FIELD.signupBtn) }}
      />
    </div>
  );
}
