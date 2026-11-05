import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missingConfig = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabasePublishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter(Boolean);

export const supabaseConfigError = missingConfig.length
  ? `Missing Supabase configuration: ${missingConfig.join(', ')}`
  : '';

export const supabase = missingConfig.length
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      accessToken: async () => auth?.currentUser?.getIdToken() ?? null,
    });

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error(supabaseConfigError);
  }
  if (!auth?.currentUser) {
    throw new Error('You must be signed in to upload or view files.');
  }
};
