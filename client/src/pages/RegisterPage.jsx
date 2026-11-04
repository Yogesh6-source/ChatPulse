import React from 'react';
import { Register } from '../components/auth/Register';

export const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-gray-100 to-teal-50 dark:from-gray-950 dark:via-[#0b141a] dark:to-gray-900 overflow-y-auto">
      <Register />
    </div>
  );
};
