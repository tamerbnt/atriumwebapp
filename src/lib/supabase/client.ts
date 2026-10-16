import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read Vite environment variables with live project fallback
const DEFAULT_SUPABASE_URL = 'https://tzzncsbvezywtaknwind.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_32fUrUTxIXdeau3MgAPR_g_7LoZ4rwu';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
  );
};

export type SupabaseConnectionState = 'connected' | 'connecting' | 'offline' | 'unconfigured';

let cachedClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    try {
      cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('[Atrium Supabase] Failed to initialize client:', err);
      return null;
    }
  }
  return cachedClient;
};

// Export singleton instance or null
export const supabase = getSupabaseClient();
