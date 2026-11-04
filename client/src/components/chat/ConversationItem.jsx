import React from 'react';
import { Avatar } from '../common/Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { Image as ImageIcon, FileText, Ban } from 'lucide-react';

const formatConversationTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd/MM/yy');
};

export const ConversationItem = ({
  conversation,
  currentUserId,
  isActive,
  isOnline,
  onClick,
}) => {
  const otherUser = conversation.participants?.find(
    (p) => p._id !== currentUserId
  ) || { fullName: 'Unknown', username: 'unknown' };

  const lastMsg = conversation.lastMessage;
  const isLastMsgFromMe = lastMsg?.sender?._id === currentUserId || lastMsg?.sender === currentUserId;

  const renderLastMessagePreview = () => {
    if (!lastMsg) return 'Tap to start chatting';

    if (lastMsg.deletedForEveryone) {
      return (
        <span className="flex items-center gap-1 italic text-gray-400">
          <Ban className="w-3 h-3" /> Message deleted
        </span>
      );
    }

    let prefix = isLastMsgFromMe ? 'You: ' : '';

    if (lastMsg.messageType === 'image') {
      return (
        <span className="flex items-center gap-1">
          {prefix}
          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> Photo
        </span>
      );
    }

    if (lastMsg.messageType === 'file') {
      return (
        <span className="flex items-center gap-1">
          {prefix}
          <FileText className="w-3.5 h-3.5 text-emerald-500" /> {lastMsg.fileName || 'File'}
        </span>
      );
    }

    return `${prefix}${lastMsg.content || ''}`;
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/60 select-none ${
        isActive
          ? 'bg-emerald-50/70 dark:bg-gray-800/90'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      {/* Avatar */}
      <Avatar
        src={otherUser.profilePicture}
        name={otherUser.fullName}
        size="lg"
        isOnline={isOnline}
        showStatus={true}
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {otherUser.fullName}
          </h4>
          <span className="text-[11px] text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap ml-2">
            {formatConversationTime(conversation.lastMessageAt || conversation.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p
            className={`text-xs truncate max-w-[190px] ${
              conversation.unreadCount > 0
                ? 'font-semibold text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {renderLastMessagePreview()}
          </p>

          {/* Unread count badge */}
          {conversation.unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-emerald-500 rounded-full shadow-sm ml-2">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
