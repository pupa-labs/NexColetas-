import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Administrativo Supabase — EXCLUSIVO DO BACKEND (Node.js).
 * Utiliza SUPABASE_SERVICE_ROLE_KEY apenas no servidor.
 * Nunca deve ser importado por componentes React no frontend.
 */
let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminConfigStatus(): {
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
  hasDatabaseUrl: boolean;
  isAdminClientReady: boolean;
} {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const databaseUrl = (process.env.SUPABASE_DATABASE_URL || '').trim();

  return {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    hasDatabaseUrl: Boolean(databaseUrl),
    isAdminClientReady: Boolean(supabaseUrl && serviceRoleKey),
  };
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedAdminClient;
}
