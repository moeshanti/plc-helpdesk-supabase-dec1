import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: any = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Missing Supabase URL or Key in environment variables.');
} else {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
  }
}

export const supabase = supabaseInstance;
