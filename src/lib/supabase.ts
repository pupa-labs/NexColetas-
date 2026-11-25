import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase Frontend (Público / Anon Key).
 * Utiliza exclusivamente chaves públicas VITE_SUPABASE_*.
 * A autenticação principal permanece no Firebase Auth nesta etapa.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseClientConfigured = Boolean(
  supabaseUrl.trim() && supabaseAnonKey.trim()
);

export const supabaseClient: SupabaseClient | null = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
