import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  Trash2,
  FileText,
  Download,
  Ban,
  Reply,
  CornerUpLeft,
  SmilePlus,
} from 'lucide-react';
import { format } from 'date-fns';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MessageBubble = ({
  message,
  isMe,
  currentUserId,
  onDelete,
  onReply,
  onReact,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reactionPickerRef = useRef(null);

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  // Close reaction picker on outside click
  useEffect(() => {
    if (!showReactionPicker) return undefined;
    const handleOutsideClick = (e) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showReactionPicker]);

  // Status icon
  const renderStatus = () => {
    if (!isMe || message.deletedForEveryone) return null;

    if (message.status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-sky-400 dark:text-sky-300 ml-1 inline-block" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300 ml-1 inline-block" />;
    }
    return <Check className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400 ml-1 inline-block" />;
  };

  const isDeleted = message.deletedForEveryone;
  const reactionsMap = message.reactions || {};
  const reactionEntries = Object.entries(reactionsMap).filter(
    ([, uids]) => Array.isArray(uids) && uids.length > 0
  );
  const hasReactions = reactionEntries.length > 0;

  const scrollToRepliedMessage = (targetId) => {
    if (!targetId) return;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-400', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-emerald-400');
      }, 2000);
    }
  };

  return (
    <div
      id={`msg-${message._id}`}
      className={`relative group flex flex-col mb-1.5 transition-all duration-300 rounded-2xl ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => {
        setShowOptions(false);
        setConfirmDelete(false);
      }}
    >
      <div
        className={`flex items-center gap-1 max-w-[88%] sm:max-w-[75%] ${
          isMe ? 'flex-row' : 'flex-row-reverse'
        }`}
      >
        {/* Action Bar (Reply, React, Delete) */}
        {!isDeleted && (showOptions || showReactionPicker) && (
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1 ${
              showReactionPicker ? 'opacity-100' : ''
            }`}
          >
            {/* Reply Button */}
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                title="Reply"
                className="p-1 rounded-full text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            )}

            {/* React Button & Popover */}
            {onReact && (
              <div className="relative" ref={reactionPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                  title="React with emoji"
                  className={`p-1 rounded-full transition cursor-pointer ${
                    showReactionPicker
                      ? 'text-emerald-500 bg-gray-100 dark:bg-gray-800'
                      : 'text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>

                {/* Quick Reaction Floating Palette */}
                {showReactionPicker && (
                  <div
                    className={`absolute bottom-full mb-1 z-30 flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 animate-slide-up ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onReact(message._id, emoji);
                          setShowReactionPicker(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delete option for sender */}
            {isMe && onDelete && (
              <>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    title="Delete message"
                    className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 text-[10px]">Delete?</span>
                    <button
                      type="button"
                      onClick={() => onDelete(message._id)}
                      className="text-rose-500 font-semibold hover:underline cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Message Bubble Box */}
        <div
          className={`relative px-3.5 py-2 rounded-2xl shadow-sm text-sm break-words transition-all ${
            isMe
              ? 'bg-emerald-600 text-white dark:bg-[#005c4b] rounded-tr-xs'
              : 'bg-white text-gray-900 dark:bg-[#202c33] dark:text-gray-100 rounded-tl-xs border border-gray-100 dark:border-transparent'
          } ${isDeleted ? 'opacity-80 italic' : ''}`}
        >
          {isDeleted ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-200 dark:text-gray-400 py-0.5">
              <Ban className="w-3.5 h-3.5" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Quoted Replying Header */}
              {message.replyTo && (
                <div
                  onClick={() => scrollToRepliedMessage(message.replyTo._id)}
                  title="Click to view replied message"
                  className={`mb-2 px-2.5 py-1.5 rounded-xl border-l-4 cursor-pointer text-xs transition-opacity hover:opacity-90 select-none ${
                    isMe
                      ? 'bg-black/20 border-emerald-300 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[11px] text-emerald-300 dark:text-emerald-400 mb-0.5">
                    <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {message.replyTo.senderId === currentUserId
                        ? 'You'
                        : message.replyTo.senderName || 'User'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 break-words whitespace-pre-wrap max-w-full [overflow-wrap:anywhere]">
                    {message.replyTo.content ||
                      (message.replyTo.messageType === 'image'
                        ? '📷 Photo'
                        : message.replyTo.messageType === 'video'
                        ? '🎥 Video'
                        : '📎 Attachment')}
                  </p>
                </div>
              )}

              {/* Image attachment */}
              {message.messageType === 'image' && message.fileUrl && (
                <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-95 transition"
                  >
                    <img
                      src={message.fileUrl}
                      alt={message.fileName || 'Attachment'}
                      className="w-full max-h-72 object-cover rounded-xl"
                      loading="lazy"
                    />
                  </a>
                </div>
              )}

              {/* Video attachment */}
              {message.messageType === 'video' && message.fileUrl && (
                <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                  <video
                    src={message.fileUrl}
                    controls
                    preload="metadata"
                    className="w-full max-h-72 rounded-xl"
                  />
                  {message.fileName && (
                    <p className="text-[10px] opacity-75 mt-0.5 truncate">{message.fileName}</p>
                  )}
                </div>
              )}

              {/* File attachment */}
              {message.messageType === 'file' && message.fileUrl && (
                <div className="mb-2">
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.fileName}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition ${
                      isMe
                        ? 'bg-emerald-700/60 dark:bg-emerald-900/40 text-white'
                        : 'bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    <FileText className="w-6 h-6 text-emerald-300 dark:text-emerald-400 flex-shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-medium truncate max-w-[180px]">
                        {message.fileName || 'Document'}
                      </p>
                      {message.fileSize && (
                        <p className="text-[10px] opacity-75">
                          {formatFileSize(message.fileSize)}
                        </p>
                      )}
                    </div>
                    <Download className="w-4 h-4 flex-shrink-0 opacity-80" />
                  </a>
                </div>
              )}

              {/* Text content */}
              {message.content && (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text">
                  {message.content}
                </p>
              )}
            </>
          )}

          {/* Timestamp & Status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
              isMe
                ? 'text-emerald-100/80 dark:text-gray-300/80'
                : 'text-gray-400 dark:text-gray-400'
            }`}
          >
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      </div>

      {/* Emoji Reactions List attached to message */}
      {!isDeleted && hasReactions && (
        <div
          className={`flex flex-wrap gap-1 mt-1 px-1 z-10 ${
            isMe ? 'justify-end' : 'justify-start'
          }`}
        >
          {reactionEntries.map(([emoji, uids]) => {
            const hasReacted = currentUserId && uids.includes(currentUserId);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact && onReact(message._id, emoji)}
                title={
                  hasReacted
                    ? `You and ${uids.length - 1} other reacted with ${emoji}`
                    : `${uids.length} person(s) reacted with ${emoji}`
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all shadow-xs border cursor-pointer ${
                  hasReacted
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-400/50'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span className="text-[10px] font-medium leading-none">{uids.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
