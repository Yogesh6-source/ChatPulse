import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, Camera, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WEBP, GIF).');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('username', username.toLowerCase().trim());
      formData.append('email', email.toLowerCase().trim());
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (bio.trim()) formData.append('bio', bio.trim());
      if (avatarFile) formData.append('avatar', avatarFile);

      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800/90 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/80 backdrop-blur-xl animate-slide-up my-6">
      {/* Brand logo & header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-2">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create an Account
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Join ChatPulse and connect with anyone in real-time
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Profile Picture Upload (Optional) */}
        <div className="flex flex-col items-center justify-center pb-1">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 group transition"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1">Photo (optional)</span>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Miller"
              required
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 text-sm text-gray-900 dark:text-white outline-none transition"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Username *
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-gray-400 text-sm font-semibold">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sarahm"
              required
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 text-sm text-gray-900 dark:text-white outline-none transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Email Address *
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              required
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 text-sm text-gray-900 dark:text-white outline-none transition"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Password (min 6 characters) *
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 text-sm text-gray-900 dark:text-white outline-none transition"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password *
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/80 focus:border-emerald-500 text-sm text-gray-900 dark:text-white outline-none transition"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Complete Registration'
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/80">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
