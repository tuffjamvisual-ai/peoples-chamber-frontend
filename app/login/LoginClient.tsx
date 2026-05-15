'use client';

// Inline dark-theme sign in / sign up form. Restored from the
// pre-magazine AuthModal (deleted as orphan in commit 6512358) and
// converted from modal-shell to inline page: removed overlay +
// isOpen/onClose, added URL ?mode= initialisation and post-auth
// redirect to ?returnTo= (default /).

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'login';
  const returnTo = params.get('returnTo') || '/';

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [postcode, setPostcode] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();

  const onAuthDone = () => {
    router.push(returnTo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (honeypot) return;
        const passwordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
        if (!passwordStrong) {
          setError('Password must be at least 8 characters with one uppercase letter and one number');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (!ageConfirmed) {
          setError('You must confirm you are 18 or older');
          setLoading(false);
          return;
        }
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        await signup(email, password, postcode, username);
        onAuthDone();
      } else if (mode === 'login') {
        await login(email, password);
        onAuthDone();
      } else if (mode === 'forgot') {
        setSuccess('Password reset instructions sent to your email (feature coming soon)');
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (mode !== 'forgot') {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#606060] flex items-center justify-center p-4">
      <div className="bg-[#505050] rounded-lg p-8 max-w-md w-full border border-[#5a5a5a]">
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create your account' : 'Reset password'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-[#8a3a3a]/20 border border-[#8a3a3a]/50 rounded text-[#e0a0a0] text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded text-white text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#404040]/50 border border-[#5a5a5a] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
          />

          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[#404040]/50 border border-[#5a5a5a] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
            />
          )}

          {mode === 'signup' && (
            <>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#404040]/50 border border-[#5a5a5a] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
              />

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className="w-full bg-[#404040]/50 border border-[#5a5a5a] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
              />

              <input
                type="text"
                placeholder="Your postcode (optional)"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full bg-[#404040]/50 border border-[#5a5a5a] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
              />

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="ageConfirm"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="ageConfirm" className="text-sm text-white">
                  I confirm I am 18 years of age or older
                </label>
              </div>
            </>
          )}

          {/* Honeypot — invisible field to trap bots */}
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#404040] hover:bg-[#404040] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 border border-white"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setMode('forgot')}
              className="text-sm text-white hover:text-white opacity-80 hover:opacity-100"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-white">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => setMode('signup')} className="text-white underline hover:no-underline">
                Sign up
              </button>
            </>
          ) : mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-white underline hover:no-underline">
                Sign in
              </button>
            </>
          ) : (
            <>
              Remember your password?{' '}
              <button onClick={() => setMode('login')} className="text-white underline hover:no-underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
