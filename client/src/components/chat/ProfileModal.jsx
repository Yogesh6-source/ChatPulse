import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Camera, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !username.trim()) {
      setError('Full name and username cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatarFile,
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar
              src={avatarPreview || user?.profilePicture}
              name={fullName || user?.fullName}
              size="2xl"
              className="ring-4 ring-emerald-500/20"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-xs text-gray-400">Click photo to change avatar</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-700/60 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-700/60 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              About / Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-700/60 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email (Registered)
            </label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-200/50 dark:bg-gray-800/80 border border-transparent text-gray-500 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-xl shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
