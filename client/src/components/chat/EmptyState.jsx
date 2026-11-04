import React from 'react';
import { MessageSquareDashed, ShieldCheck, Zap, Lock } from 'lucide-react';

export const EmptyState = ({ onOpenSearch }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-[#0b141a] text-center select-none h-full border-b-[6px] border-emerald-500">
      <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 mb-6 shadow-sm ring-8 ring-emerald-50/50 dark:ring-emerald-950/20">
        <MessageSquareDashed className="w-12 h-12" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        ChatPulse Web
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
        Send and receive private messages in real time. Choose a conversation from the sidebar or start a new chat.
      </p>

      <button
        onClick={onOpenSearch}
        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-xl shadow-md transition transform hover:scale-105 active:scale-95 flex items-center gap-2 mb-8"
      >
        <Zap className="w-4 h-4" />
        <span>Start New Conversation</span>
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200/60 dark:border-gray-800 pt-6">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span>End-to-end encrypted private session</span>
      </div>
    </div>
  );
};
