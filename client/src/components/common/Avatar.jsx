import React from 'react';

// Generates consistent pleasing background colors based on string
const getAvatarGradient = (name = '') => {
  const gradients = [
    'from-emerald-500 to-teal-700',
    'from-blue-500 to-indigo-700',
    'from-purple-500 to-violet-700',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-700',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  isOnline = false,
  showStatus = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
  };

  const statusDotSizes = {
    sm: 'w-2.5 h-2.5 ring-1',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-4 h-4 ring-2',
    '2xl': 'w-5 h-5 ring-4',
  };

  // Get initials (up to 2 characters)
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const avatarSrc = src
    ? src.startsWith('http') || src.startsWith('data:')
      ? src
      : src
    : null;

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full overflow-hidden flex items-center justify-center font-semibold text-white shadow-sm select-none`}
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add(
                'bg-gradient-to-br',
                ...getAvatarGradient(name).split(' ')
              );
            }}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(
              name
            )}`}
          >
            <span>{initials}</span>
          </div>
        )}
      </div>

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-white dark:ring-gray-900 ${
            statusDotSizes[size] || statusDotSizes.md
          } ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
