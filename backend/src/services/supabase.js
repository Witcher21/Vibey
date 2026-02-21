import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

/**  Public client – respects RLS / user JWT tokens */
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
);

/**  Admin client – bypasses RLS (server-side only) */
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
);
