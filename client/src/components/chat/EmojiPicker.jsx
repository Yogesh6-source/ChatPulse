import React, { useState } from 'react';
import { Search } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Smileys & Emotion': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
    '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
    '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾',
    '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'
  ],
  'Gestures & People': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
    '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
    '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
    '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶'
  ],
  'Objects & Symbols': [
    '🔥', '✨', '🌟', '⭐', '⚡', '💥', '💯', '💢', '💨', '💦',
    '💤', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽',
    '🏀', '🏈', '🎾', '🍕', '🍔', '🍟', '🌮', '🍿', '🍩', '☕',
    '🚀', '🛸', '💡', '📱', '💻', '📷', '🔒', '🔑', '💬', '📢'
  ],
};

export const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('Smileys & Emotion');
  const [search, setSearch] = useState('');

  const filteredEmojis = search.trim()
    ? Object.values(EMOJI_CATEGORIES)
        .flat()
        .filter((emoji) => emoji.includes(search))
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div
      className="absolute bottom-14 left-0 sm:left-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 animate-slide-up flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Category selector */}
      <div className="flex gap-1 mb-2 border-b border-gray-100 dark:border-gray-700/80 pb-2 overflow-x-auto">
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setSearch('');
            }}
            className={`px-2.5 py-1 text-xs rounded-lg whitespace-nowrap font-medium transition ${
              activeCategory === cat && !search
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {cat.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700/70 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none transition"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto p-1">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-125 transition transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
