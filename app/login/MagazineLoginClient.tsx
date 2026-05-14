'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const ink = '#14100d';
const inkSoft = 'rgba(20,16,13,0.7)';
const inkHairline = 'rgba(20,16,13,0.3)';
const red = '#c4262e';
const blue = '#1e3a8a';
const cream = '#ebe5d8';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontWeight: 600,
  marginBottom: '6px',
  opacity: 0.8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  background: 'transparent',
  color: ink,
  border: `2px solid ${inkHairline}`,
  fontFamily: 'inherit',
  fontSize: '14px',
  outline: 'none',
  marginBottom: '14px',
};

const oauthBtn: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'transparent',
  color: ink,
  border: `2px solid ${inkHairline}`,
  fontFamily: 'inherit',
  fontSize: '14px',
  cursor: 'not-allowed',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  marginBottom: '10px',
  opacity: 0.6,
};

function safeReturnTo(value: string | null): string {
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export default function MagazineLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const { login, signup } = useAuth();

  // Both forms always visible, side-by-side, so no single "mode" state.
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPw, setShowSigninPw] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const pwHas8 = signupPassword.length >= 8;
  const pwHasNum = /[0-9]/.test(signupPassword);
  const pwHasLetter = /[A-Za-z]/.test(signupPassword);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninError('');
    setSigninLoading(true);
    try {
      await login(signinEmail, signinPassword);
      router.push(returnTo);
    } catch (err: unknown) {
      setSigninError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigninLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!pwHas8 || !pwHasNum || !pwHasLetter) {
      setSignupError('Password must be at least 8 characters with one letter and one number');
      return;
    }
    setSignupLoading(true);
    try {
      // signup signature: (email, password, postcode, username)
      // Postcode is no longer collected on this page; pass '' to keep backend happy.
      await signup(signupEmail, signupPassword, '', signupName);
      router.push(returnTo);
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div style={{ color: ink, fontFamily: 'Special Elite, monospace' }}>
      {/* Two-column layout with Big Ben slot in the middle */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 240px) minmax(0, 1fr)',
        gap: '20px',
        alignItems: 'start',
        marginBottom: '40px',
      }}>
        {/* === LEFT COLUMN — SIGN IN === */}
        <section>
          <span style={{ display: 'inline-block', background: ink, color: cream, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 10px', marginBottom: '12px' }}>
            Welcome back
          </span>
          <h2 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '6px', transform: 'rotate(-0.3deg)' }}>
            SIGN IN
          </h2>
          <p style={{ fontSize: '15px', color: red, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.02em' }}>
            YOUR VOICE. YOUR VIEW.
            <span style={{ display: 'block', height: '2px', width: '180px', background: red, marginTop: '4px' }} />
          </p>
          <p style={{ fontSize: '14px', color: inkSoft, marginBottom: '20px' }}>
            Sign in to follow bills, track votes, and take part in what matters.
          </p>

          {signinError && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', border: `2px solid ${red}`, color: red, fontSize: '13px' }}>
              {signinError}
            </div>
          )}

          <form onSubmit={handleSignin}>
            <label htmlFor="signin-email" style={labelStyle}>Email or username</label>
            <input id="signin-email" type="text" value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} required style={inputStyle} autoComplete="username" />

            <label htmlFor="signin-pw" style={labelStyle}>Password</label>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <input id="signin-pw" type={showSigninPw ? 'text' : 'password'} value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 0, paddingRight: '36px' }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowSigninPw((s) => !s)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: inkSoft, fontSize: '16px' }}>
                {showSigninPw ? '🙈' : '👁'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: inkSoft, cursor: 'pointer' }}>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" style={{ color: red, textDecoration: 'underline' }}>Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={signinLoading}
              style={{
                width: '100%',
                padding: '13px',
                background: red,
                color: '#fff',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: signinLoading ? 'wait' : 'pointer',
                opacity: signinLoading ? 0.6 : 1,
                marginBottom: '16px',
              }}
            >
              {signinLoading ? 'SIGNING IN…' : 'SIGN IN  →'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0 14px' }}>
              <div style={{ flex: 1, height: '1px', background: inkHairline }} />
              <span style={{ fontSize: '12px', color: inkSoft, letterSpacing: '0.18em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: inkHairline }} />
            </div>

            <button type="button" disabled style={oauthBtn} title="Coming soon">
              <span style={{ fontWeight: 700 }}>G</span> Continue with Google
            </button>
            <button type="button" disabled style={oauthBtn} title="Coming soon">
              <span></span> Continue with Apple
            </button>
          </form>
        </section>

        {/* === CENTRE — Big Ben slot === */}
        <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login-bigben.png"
            alt=""
            aria-hidden
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            style={{ maxWidth: '100%', maxHeight: '500px', display: 'block', filter: 'sepia(0.1) contrast(1.05)' }}
          />
        </div>

        {/* === RIGHT COLUMN — SIGN UP === */}
        <section>
          <span style={{ display: 'inline-block', background: ink, color: cream, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 10px', marginBottom: '12px' }}>
            Join the Chamber
          </span>
          <h2 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '6px', transform: 'rotate(-0.3deg)' }}>
            SIGN UP
          </h2>
          <p style={{ fontSize: '15px', color: red, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.02em' }}>
            BE INFORMED. BE HEARD.
            <span style={{ display: 'block', height: '2px', width: '210px', background: red, marginTop: '4px' }} />
          </p>
          <p style={{ fontSize: '14px', color: inkSoft, marginBottom: '20px' }}>
            Create your free account and get closer to the decisions that shape our country.
          </p>

          {signupError && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', border: `2px solid ${red}`, color: red, fontSize: '13px' }}>
              {signupError}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <label htmlFor="signup-name" style={labelStyle}>Full name</label>
            <input id="signup-name" type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} required minLength={3} maxLength={40} style={inputStyle} autoComplete="name" />

            <label htmlFor="signup-email" style={labelStyle}>Email</label>
            <input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required style={inputStyle} autoComplete="email" />

            <label htmlFor="signup-pw" style={labelStyle}>Password</label>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input id="signup-pw" type={showSignupPw ? 'text' : 'password'} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} style={{ ...inputStyle, marginBottom: 0, paddingRight: '36px' }} autoComplete="new-password" />
              <button type="button" onClick={() => setShowSignupPw((s) => !s)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: inkSoft, fontSize: '16px' }}>
                {showSignupPw ? '🙈' : '👁'}
              </button>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 18px', fontSize: '13px' }}>
              <PwRule met={pwHas8}>At least 8 characters</PwRule>
              <PwRule met={pwHasNum}>Include a number</PwRule>
              <PwRule met={pwHasLetter}>Include a letter</PwRule>
            </ul>

            <button
              type="submit"
              disabled={signupLoading}
              style={{
                width: '100%',
                padding: '13px',
                background: blue,
                color: '#fff',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: signupLoading ? 'wait' : 'pointer',
                opacity: signupLoading ? 0.6 : 1,
              }}
            >
              {signupLoading ? 'CREATING…' : 'CREATE ACCOUNT  →'}
            </button>

            <p style={{ marginTop: '16px', fontSize: '12px', color: inkSoft, lineHeight: 1.55 }}>
              By signing up, you agree to our{' '}
              <a href="#" style={{ color: red, textDecoration: 'underline' }}>Terms</a>
              {' '}and{' '}
              <a href="#" style={{ color: red, textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>
          </form>
        </section>
      </div>

      {/* === "This is your chamber" callout strip === */}
      <div style={{
        border: `2px solid ${ink}`,
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: '20px',
        alignItems: 'center',
        marginBottom: '40px',
      }}>
        <div style={{ fontSize: '36px' }} aria-hidden>📣</div>
        <div>
          <p style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1.15 }}>
            THIS IS YOUR CHAMBER.{' '}
            <span style={{ color: red }}>DON&apos;T JUST READ. TAKE PART.</span>
          </p>
        </div>
        <div style={{ fontSize: '13px', textAlign: 'right', lineHeight: 1.5, color: inkSoft }}>
          Track the bills.<br />Question the power.<br />Shape what&apos;s next.
        </div>
      </div>

      {/* === Four feature columns === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px', paddingBottom: '20px' }}>
        <Feature icon="📖" title="TRACK BILLS" body="Follow how bills move from first reading to decision." />
        <Feature icon="📻" title="HAVE YOUR SAY" body="Vote in polls. Share your perspective." />
        <Feature icon="🔍" title="WATCH CLOSELY" body="Hold leaders accountable. See receipts." />
        <Feature icon="👥" title="MAKE IT COUNT" body="Informed people build a stronger democracy." />
      </div>
    </div>
  );
}

function PwRule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: met ? '#1e3a8a' : inkSoft, marginBottom: '3px' }}>
      <span style={{ width: '14px', textAlign: 'center' }}>{met ? '✓' : '○'}</span>
      <span>{children}</span>
    </li>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontSize: '28px', marginBottom: '6px' }} aria-hidden>{icon}</div>
      <h4 style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '6px' }}>{title}</h4>
      <p style={{ fontSize: '13px', color: inkSoft, lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}
