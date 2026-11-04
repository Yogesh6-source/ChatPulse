import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareOff, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-6">
        <MessageSquareOff className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">404</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-xl shadow-md transition flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Chats</span>
      </Link>
    </div>
  );
};
