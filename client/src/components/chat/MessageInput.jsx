import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, X, Image as ImageIcon, FileText } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

export const MessageInput = ({ onSendMessage, onTyping }) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

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

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
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
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }

      await onSendMessage({
        content: content.trim(),
        file: selectedFile,
      });

      setContent('');
      setSelectedFile(null);
      setFilePreview(null);
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('Failed to send:', err);
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
    <div className="relative p-3 bg-white/95 dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-800 backdrop-blur-md">
      {/* Attachment Preview Banner */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-2.5 mb-2 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-up">
          {filePreview ? (
            <img
              src={filePreview}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover"
            />
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

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`p-2.5 rounded-full transition ${
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
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition"
          title="Attach Image or Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 min-h-[42px] max-h-32 bg-gray-100 dark:bg-gray-700/70 rounded-2xl flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent resize-none border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 leading-normal max-h-28 overflow-y-auto"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!content.trim() && !selectedFile) || isSubmitting}
          className={`p-2.5 rounded-full transition flex items-center justify-center ${
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
