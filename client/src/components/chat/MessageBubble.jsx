import React, { useState } from 'react';
import { Check, CheckCheck, Trash2, FileText, Download, Ban } from 'lucide-react';
import { format } from 'date-fns';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MessageBubble = ({ message, isMe, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

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

  return (
    <div
      className={`relative group flex flex-col mb-1.5 ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => {
        setShowOptions(false);
        setConfirmDelete(false);
      }}
    >
      <div className="flex items-center gap-1 max-w-[85%] sm:max-w-[70%]">
        {/* Delete option for sender */}
        {isMe && !isDeleted && showOptions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete message"
                className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-xs">
                <span className="text-gray-500 text-[10px]">Delete?</span>
                <button
                  onClick={() => onDelete(message._id)}
                  className="text-rose-500 font-semibold hover:underline"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  No
                </button>
              </div>
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
                <p className="whitespace-pre-wrap leading-relaxed select-text">
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
    </div>
  );
};
