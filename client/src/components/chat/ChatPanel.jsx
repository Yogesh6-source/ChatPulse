import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, MoreVertical, Search } from 'lucide-react';
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
  const isInitialLoadRef = useRef(true);

  const otherUser = conversation?.participants?.find(
    (p) => p._id !== currentUserId
  ) || { fullName: 'User', username: 'user' };

  const isOtherUserOnline =
    onlineUsers.has(otherUser._id) || otherUser.isOnline;

  const activeTypers = typingUsers[conversation._id] || {};
  const isOtherUserTyping = !!activeTypers[otherUser._id];

  // Helper to scroll to bottom - instant for initial load, smooth for active chatting
  const scrollToBottom = useCallback((behavior = 'auto') => {
    if (!containerRef.current) return;
    if (behavior === 'auto') {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    } else {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // When conversation ID changes, mark as initial load so we start at the bottom
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [conversation?._id]);

  // When messages load or change
  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return;

    if (isInitialLoadRef.current) {
      // Initial opening of chat: jump to bottom instantly so user sees latest messages like WhatsApp
      isInitialLoadRef.current = false;
      scrollToBottom('auto');
      const timer = setTimeout(() => scrollToBottom('auto'), 50);
      return () => clearTimeout(timer);
    }

    const el = containerRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    const lastMsg = messages[messages.length - 1];
    const isSentByMe =
      lastMsg &&
      (lastMsg.senderId === currentUserId ||
        lastMsg.sender?._id === currentUserId ||
        lastMsg.sender === currentUserId);

    // If I sent the message OR I am already near the bottom, scroll down smoothly
    if (isSentByMe || isAtBottom) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [messages, currentUserId, scrollToBottom]);

  // When other user starts typing and we are near the bottom, keep bottom pinned
  useEffect(() => {
    if (!containerRef.current || !isOtherUserTyping) return;
    const el = containerRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [isOtherUserTyping, scrollToBottom]);

  // Group messages by date — memoized so it only recomputes when messages change
  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;
    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ type: 'date_divider', id: `divider-${msgDate}`, date: msg.createdAt });
        lastDate = msgDate;
      }
      groups.push({ type: 'message', ...msg });
    });
    return groups;
  }, [messages]);

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

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
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
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 chat-wallpaper-light dark:chat-wallpaper-dark flex flex-col messages-scroll-container"
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
            </div>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-end">
            <div className="flex-1" />
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
        currentUserId={currentUserId}
      />
    </div>
  );
};
