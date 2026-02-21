import { createClient } from '@supabase/supabase-js';
import { defineBoot } from '#q-app/wrappers';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/* Allow the app to boot even without Supabase credentials */
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    '[Vibey] Supabase credentials not set. Auth features are disabled.',
  );
}

export { supabase };

export default defineBoot(({ app }) => {
  app.config.globalProperties.$supabase = supabase;
});
