'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

// /login renders public/login-overlay.png (sign2 — transparent
// 1536x1024 landscape) on top of the magazine template. The PNG
// carries all painted labels, frames, buttons and copy; transparent
// <input>/<button> elements are absolutely positioned over the
// painted fields as percentages so the layout scales with viewport.
// Adjust the FIELD constants below if any hotspot is off.

const FIELD = {
  // x / y / w / h as % of the overlay container (1536 x 1024)
  // ---- LEFT COLUMN — SIGN IN ----
  signinEmail:    { top: 41,   left: 7,  width: 36, height: 6 },
  signinPassword: { top: 53,   left: 7,  width: 36, height: 6 },
  rememberMe:     { top: 63,   left: 7,  width: 14, height: 3.5 },
  forgotLink:     { top: 63,   left: 26, width: 17, height: 3.5 },
  signinBtn:      { top: 68,   left: 7,  width: 36, height: 7 },
  oauthGoogle:    { top: 80,   left: 7,  width: 36, height: 6 },
  oauthApple:     { top: 88,   left: 7,  width: 36, height: 6 },

  // ---- RIGHT COLUMN — SIGN UP ----
  signupName:     { top: 44,   left: 53, width: 38, height: 6 },
  signupEmail:    { top: 55,   left: 53, width: 38, height: 6 },
  signupPassword: { top: 66,   left: 53, width: 38, height: 6 },
  signupBtn:      { top: 85,   left: 53, width: 38, height: 7 },
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
  color: 'transparent', // button surface is painted in the PNG
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
    const pwOk = signupPassword.length >= 8 && /[0-9]/.test(signupPassword) && /[A-Za-z]/.test(signupPassword);
    if (!pwOk) { setSignupError('Password must be 8+ characters with a letter and a number'); return; }
    if (signupName.trim().length < 3) { setSignupError('Please enter your full name'); return; }
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
    <div style={{ position: 'relative', width: '100%', maxWidth: '960px', margin: '0 auto', aspectRatio: '1536 / 1024' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-overlay.png"
        alt=""
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      />

      {(signinError || signupError || busyMsg) && (
        <div style={{
          position: 'absolute',
          top: '-8%',
          left: '5%',
          right: '5%',
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

      {/* ===== SIGN-IN ===== */}
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
      <button type="button" aria-label="Remember me" style={{ ...transparentBtn, ...pct(FIELD.rememberMe) }} />
      <button
        type="button"
        onClick={() => alert('Password reset is coming soon.')}
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
        title="Coming soon"
        aria-label="Continue with Google (coming soon)"
        style={{ ...transparentBtn, ...pct(FIELD.oauthGoogle), cursor: 'not-allowed' }}
      />
      <button
        type="button"
        disabled
        title="Coming soon"
        aria-label="Continue with Apple (coming soon)"
        style={{ ...transparentBtn, ...pct(FIELD.oauthApple), cursor: 'not-allowed' }}
      />

      {/* ===== SIGN-UP ===== */}
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
