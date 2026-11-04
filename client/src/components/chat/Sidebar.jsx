import React, { useState } from 'react';
import { Avatar } from '../common/Avatar';
import { ConversationItem } from './ConversationItem';
import {
  MessageSquarePlus,
  Moon,
  Sun,
  LogOut,
  Search,
  X,
  MessageCircle,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Sidebar = ({
  conversations,
  activeConversation,
  onlineUsers,
  loading,
  onSelectConversation,
  onOpenSearch,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations locally based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const otherUser = conv.participants?.find((p) => p._id !== user._id);
    if (!otherUser) return false;
    const q = searchQuery.toLowerCase();
    return (
      otherUser.fullName.toLowerCase().includes(q) ||
      otherUser.username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-800 select-none">
      {/* Sidebar Header */}
      <div className="h-16 px-4 bg-gray-50/80 dark:bg-[#202c33] border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
        {/* User profile trigger */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition"
          title="Edit Profile"
        >
          <Avatar
            src={user?.profilePicture}
            name={user?.fullName}
            size="md"
            isOnline={true}
            showStatus={true}
          />
          <div className="overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-500 transition">
              {user?.fullName}
            </h3>
            <p className="text-[11px] text-gray-400 truncate">@{user?.username}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
          {/* New Chat Button */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-full hover:bg-gray-200/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-300 transition"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5 text-emerald-500" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Profile Settings */}
          <button
            onClick={onOpenProfile}
            className="p-2 rounded-full hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition"
            title="Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-500 hover:text-rose-500 transition"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800/80">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-emerald-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          /* Skeleton Loader */
          <div className="divide-y divide-gray-100 dark:divide-gray-800/40 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {searchQuery ? 'No conversations found' : 'No chats yet'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs mb-4">
              {searchQuery
                ? 'Try a different search term or search registered users.'
                : 'Click below to find friends and start your first conversation.'}
            </p>
            <button
              onClick={onOpenSearch}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Find Users
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUser = conv.participants?.find((p) => p._id !== user._id);
            const isOnline = otherUser
              ? onlineUsers.has(otherUser._id) || otherUser.isOnline
              : false;

            return (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                currentUserId={user._id}
                isActive={activeConversation?._id === conv._id}
                isOnline={isOnline}
                onClick={() => onSelectConversation(conv)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
