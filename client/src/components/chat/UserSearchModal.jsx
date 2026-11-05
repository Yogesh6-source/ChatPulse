import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Search, MessageSquarePlus } from 'lucide-react';
import { searchUsers } from '../../services/firebaseData';
import { useAuth } from '../../context/AuthContext';

export const UserSearchModal = ({
  isOpen,
  onClose,
  onSelectUser,
  onlineUsers,
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openingUserId, setOpeningUserId] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      setError('');
      setOpeningUserId(null);
      return;
    }

    let active = true;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const results = await searchUsers(query, user._id);
        if (active) setUsers(results);
      } catch (err) {
        if (active) setError(err.message || 'Failed to search users.');
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [isOpen, query, user]);

  const handleSelect = async (selectedUser) => {
    if (openingUserId) return;
    try {
      setOpeningUserId(selectedUser._id);
      setError('');
      await onSelectUser(selectedUser._id);
      onClose();
    } catch (err) {
      console.error('Failed to open conversation:', err);
      setError(err.message || 'Failed to open conversation.');
    } finally {
      setOpeningUserId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Conversation">
      <div className="flex flex-col gap-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username..."
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/60 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none transition"
          />
        </div>

        {/* User list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-rose-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              {query ? 'No users found matching your search' : 'Type to search for people'}
            </div>
          ) : (
            users.map((u) => {
              const isOnline = onlineUsers.has(u._id) || u.isOnline;
              const isOpening = openingUserId === u._id;
              return (
                <div
                  key={u._id}
                  onClick={() => handleSelect(u)}
                  className={`flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition ${
                    isOpening ? 'opacity-70 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={u.profilePicture}
                      name={u.fullName}
                      size="md"
                      isOnline={isOnline}
                      showStatus={true}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {u.fullName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(u);
                    }}
                    disabled={Boolean(openingUserId)}
                    className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition disabled:opacity-50"
                    title="Start Chat"
                  >
                    {isOpening ? (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MessageSquarePlus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
