import React, { useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Search, ShieldCheck, Clock } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { format, isToday, isYesterday } from 'date-fns';

const formatLastSeen = (dateString) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Offline';

  if (isToday(date)) {
    return `Last seen today at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Last seen yesterday at ${format(date, 'h:mm a')}`;
  }
  return `Last seen on ${format(date, 'MMM d, yyyy')}`;
};

const formatDateDivider = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export const ChatPanel = ({
  conversation,
  messages,
  currentUserId,
  onlineUsers,
  typingUsers,
  loadingMessages,
  onBack,
  onSendMessage,
  onDeleteMessage,
  onReplyMessage,
  onReactMessage,
  replyingTo,
  onCancelReply,
  onTyping,
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const otherUser = conversation?.participants?.find(
    (p) => p._id !== currentUserId
  ) || { fullName: 'User', username: 'user' };

  const isOtherUserOnline =
    onlineUsers.has(otherUser._id) || otherUser.isOnline;

  const activeTypers = typingUsers[conversation._id] || {};
  const isOtherUserTyping = !!activeTypers[otherUser._id];

  // Auto-scroll to bottom on messages update
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [conversation?._id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isOtherUserTyping]);

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({
        type: 'date_divider',
        id: `divider-${msgDate}`,
        date: msg.createdAt,
      });
      lastDate = msgDate;
    }
    groupedMessages.push({
      type: 'message',
      ...msg,
    });
  });

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-chat-bgLight dark:bg-chat-bgDark overflow-hidden select-none">
      {/* Header */}
      <div className="h-16 px-3 sm:px-4 bg-white/95 dark:bg-[#202c33] border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between z-10 backdrop-blur-md shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button for mobile & small screens */}
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 -ml-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 active:scale-90 transition flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Back to conversations"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <Avatar
            src={otherUser.profilePicture}
            name={otherUser.fullName}
            size="md"
            isOnline={isOtherUserOnline}
            showStatus={true}
            className="flex-shrink-0"
          />

          <div className="overflow-hidden min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {otherUser.fullName}
            </h3>
            <p className="text-xs truncate">
              {isOtherUserTyping ? (
                <span className="text-emerald-500 font-medium animate-pulse">
                  typing...
                </span>
              ) : isOtherUserOnline ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : (
                <span className="text-gray-400 dark:text-gray-400">
                  {formatLastSeen(otherUser.lastSeen)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action icons & Retention info */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
          <div
            title="Messages automatically delete 7 days after viewing"
            className="hidden sm:flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/50"
          >
            <Clock className="w-3 h-3 text-emerald-500" />
            <span>7-day retention</span>
          </div>

          <button
            title="Search in conversation"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/60 transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            title="Options"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/60 transition cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message History Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 chat-wallpaper-light dark:chat-wallpaper-dark flex flex-col"
      >
        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="p-4 bg-white/85 dark:bg-gray-800/85 backdrop-blur-md rounded-2xl shadow-sm text-xs text-gray-600 dark:text-gray-300 max-w-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2">
              <span className="text-2xl">👋</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                No messages yet. Say hello to start the conversation!
              </p>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-400 mt-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>Messages delete 7 days after viewing</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-end">
            {/* Top Retention Banner */}
            <div className="flex justify-center my-2 select-none">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-2xs text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Messages automatically delete 7 days after viewing</span>
              </div>
            </div>

            {groupedMessages.map((item) => {
              if (item.type === 'date_divider') {
                return (
                  <div key={item.id} className="flex justify-center my-3 select-none">
                    <span className="px-3 py-1 bg-white/85 dark:bg-gray-800/85 backdrop-blur-md rounded-lg shadow-2xs text-[11px] font-semibold text-gray-500 dark:text-gray-400 border border-gray-100/60 dark:border-gray-700/60">
                      {formatDateDivider(item.date)}
                    </span>
                  </div>
                );
              }

              const isMe =
                item.sender?._id === currentUserId ||
                item.sender === currentUserId;

              return (
                <MessageBubble
                  key={item._id}
                  message={item}
                  isMe={isMe}
                  currentUserId={currentUserId}
                  onDelete={onDeleteMessage}
                  onReply={onReplyMessage}
                  onReact={onReactMessage}
                />
              );
            })}
          </div>
        )}

        {/* Real-time typing bubble */}
        {isOtherUserTyping && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#202c33] rounded-2xl w-fit shadow-xs mb-2 rounded-tl-xs border border-gray-100 dark:border-transparent">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
      />
    </div>
  );
};
