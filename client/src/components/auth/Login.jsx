import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

export const Login = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId.trim() || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(loginId.trim(), password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800/90 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/80 backdrop-blur-xl animate-slide-up">
      {/* Brand logo & header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-3">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to ChatPulse
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sign in to continue to your messages
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or Username */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Email or Username
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="alex or alex@example.com"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none transition"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">Remember me</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="text-center mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/80">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Don't have an account yet?{' '}
          <Link
            to="/register"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Password Recovery"
      >
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            For private real-time chats, your account password is encrypted securely using bcrypt.
          </p>
          <p className="text-xs text-gray-500">
            If you forgot your password during local testing, you can register a new username/account immediately with zero friction!
          </p>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowForgotModal(false)}
              className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
