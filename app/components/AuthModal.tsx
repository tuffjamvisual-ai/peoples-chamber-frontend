'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
};

export default function AuthModal({ isOpen, onClose, mode: initialMode }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [postcode, setPostcode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
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
        onClose();
      } else if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'forgot') {
        // Password reset - we'll implement this next
        setSuccess('Password reset instructions sent to your email (feature coming soon)');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (mode !== 'forgot') {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1a1a1a]/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-lg p-8 max-w-md w-full mx-4 border border-[#333333]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create your account' : 'Reset password'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-[#8a3a3a]/20 border border-[#8a3a3a]/50 rounded text-[#8a3a3a] text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded text-white text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#222222]/50 border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#222222]/50 border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
              />
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#222222]/50 border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  className="w-full bg-[#222222]/50 border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Your postcode (optional)"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full bg-[#222222]/50 border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#7697a2] focus:outline-none focus:border-[#ffffff]"
                />
              </div>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#222222] hover:bg-[#222222] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 border border-white"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setMode('forgot')} 
              className="text-sm text-[#ffffff] hover:text-[#ffffff]"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-white">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="text-[#ffffff] hover:text-[#ffffff]">
                Sign up
              </button>
            </>
          ) : mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-[#ffffff] hover:text-[#ffffff]">
                Sign in
              </button>
            </>
          ) : (
            <>
              Remember your password?{' '}
              <button onClick={() => setMode('login')} className="text-[#ffffff] hover:text-[#ffffff]">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
