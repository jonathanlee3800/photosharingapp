// Legacy compatibility wrapper
// All existing code that imports from '@/lib/supabaseClient' continues to work.
// New code should import from '@/lib/supabase/client' (browser) or
// '@/lib/supabase/server' (server components) instead.

import { createClient } from '@/lib/supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-public-key') &&
    supabaseUrl.startsWith('https://')
  );
};

// Singleton browser client for use in client components and EventContext
export const supabase = isSupabaseConfigured()
  ? createClient()
  : createClient(); // @supabase/ssr handles missing env gracefully
