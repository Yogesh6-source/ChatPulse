import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const Toast = ({ type = 'info', message, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md transition-all animate-slide-up border bg-white/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 max-w-md">
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
      )}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
