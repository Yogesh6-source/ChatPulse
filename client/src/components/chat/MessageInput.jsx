import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, X, FileText, AlertCircle, Reply } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

export const MessageInput = ({
  onSendMessage,
  onTyping,
  replyingTo = null,
  onCancelReply = null,
  currentUserId = null,
}) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendError, setSendError] = useState('');

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Auto-focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);

    if (val.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping(true);
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping(false);
      }, 1500);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }
    }
  };

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds the 50MB limit.');
      return;
    }

    setSendError('');
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview({ type: 'image', src: reader.result });
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setFilePreview({ type: 'video', src: url });
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    if (filePreview?.type === 'video' && filePreview.src) {
      URL.revokeObjectURL(filePreview.src);
    }
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectEmoji = (emoji) => {
    setContent((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !selectedFile) || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSendError('');
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }

      await onSendMessage({
        content: content.trim(),
        file: selectedFile,
        replyTo: replyingTo,
      });

      if (filePreview?.type === 'video' && filePreview.src) {
        URL.revokeObjectURL(filePreview.src);
      }
      setContent('');
      setSelectedFile(null);
      setFilePreview(null);
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onCancelReply) onCancelReply();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('Failed to send:', err);
      setSendError(err.message || 'Failed to send the message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative p-2 sm:p-3 bg-white/95 dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-800 backdrop-blur-md flex-shrink-0">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-2 bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl border-y border-r border-emerald-200/50 dark:border-emerald-800/40 animate-slide-up select-none">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <Reply className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                Replying to {replyingTo.senderId === currentUserId || replyingTo.sender?._id === currentUserId
                  ? 'yourself'
                  : replyingTo.sender?.fullName || replyingTo.sender?.username || 'User'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap max-h-16 overflow-y-auto">
                {replyingTo.content ||
                  (replyingTo.messageType === 'image'
                    ? '📷 Photo'
                    : replyingTo.messageType === 'video'
                    ? '🎥 Video'
                    : '📎 Attachment')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-2.5 mb-2 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-up">
          {filePreview ? (
            filePreview.type === 'video' ? (
              <video
                src={filePreview.src}
                className="w-12 h-12 rounded-lg object-cover"
                muted
              />
            ) : (
              <img
                src={filePreview.src}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            )
          ) : (
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleSelectEmoji}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {sendError && (
        <div
          role="alert"
          className="mb-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`p-2 sm:p-2.5 rounded-full transition flex-shrink-0 cursor-pointer ${
            showEmojiPicker
              ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60'
          }`}
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition flex-shrink-0 cursor-pointer"
          title="Attach Image, Video, or Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 min-h-[40px] max-h-32 bg-gray-100 dark:bg-gray-700/70 rounded-2xl flex items-center px-3.5 sm:px-4 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
            className="w-full bg-transparent resize-none border-none outline-none text-base sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 leading-normal max-h-28 overflow-y-auto"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!content.trim() && !selectedFile) || isSubmitting}
          className={`p-2 sm:p-2.5 rounded-full transition flex items-center justify-center flex-shrink-0 cursor-pointer ${
            content.trim() || selectedFile
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transform hover:scale-105 active:scale-95'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          title="Send"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};
