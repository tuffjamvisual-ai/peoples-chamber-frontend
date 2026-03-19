'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
};

export default function AuthModal({ isOpen, onClose, mode: initialMode }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [postcode, setPostcode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        await signup(email, password, postcode);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1f2e] rounded-lg p-8 max-w-md w-full mx-4 border border-gray-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'login' ? 'Sign in' : 'Create your account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
            {error}
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
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Your postcode (optional)"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                <label htmlFor="ageConfirm" className="text-sm text-gray-400">
                  I confirm I am 18 years of age or older
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="text-blue-400 hover:text-blue-300">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-blue-400 hover:text-blue-300">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
