import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://cgieybhoizqrrnqtpbwr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaWV5YmhvaXpxcnJucXRwYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTc3OTQsImV4cCI6MjA5NjU3Mzc5NH0.oM4BX9Z6qNhtzTY3bublejA7HlIRjLUZuzlqec0ykNk";

// SSR-safe storage: use localStorage in the browser, no-op on the server.
const browserStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage
    : undefined;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: browserStorage,
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
  }
});
