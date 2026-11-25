import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const explicitProvider = (process.env.DB_PROVIDER || '').trim().toLowerCase();
const supabaseDbUrl = (process.env.SUPABASE_DATABASE_URL || '').trim();

const useSupabase =
  nodeEnv === 'production' ||
  explicitProvider === 'supabase' ||
  (explicitProvider === '' && Boolean(supabaseDbUrl));

if (useSupabase && !supabaseDbUrl) {
  throw new Error(
    'SUPABASE_DATABASE_URL must be set when NODE_ENV="production" or DB_PROVIDER="supabase". Silent fallback is disabled.'
  );
}

const dbCredentials = useSupabase
  ? {
      url: supabaseDbUrl,
    }
  : (() => {
      const sqlHost = process.env.SQL_HOST;
      const sqlDbName = process.env.SQL_DB_NAME;
      const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
      const password =
        process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

      if (!sqlHost || !sqlDbName || !user || !password) {
        throw new Error(
          'Local development database requires SQL_HOST, SQL_DB_NAME, and SQL_ADMIN_USER/SQL_ADMIN_PASSWORD (or configure SUPABASE_DATABASE_URL).'
        );
      }

      return {
        host: sqlHost,
        user,
        password,
        database: sqlDbName,
        ssl: false,
      };
    })();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
  verbose: true,
});
