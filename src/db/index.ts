import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

export type DatabaseProvider = 'supabase' | 'local';

export interface DatabaseConnectionTarget {
  provider: DatabaseProvider;
  nodeEnv: string;
  poolConfig: PoolConfig;
  description: string;
}

/**
 * Resolve explicitamente o alvo de conexão PostgreSQL (Supabase vs Desenvolvimento Local).
 * Regra crítica de segurança e infraestrutura:
 * - Em produção (NODE_ENV === 'production'), OU quando DB_PROVIDER === 'supabase',
 *   EXIGE obrigatoriamente SUPABASE_DATABASE_URL e NUNCA realiza fallback silencioso para outro banco.
 * - O banco PostgreSQL local (SQL_HOST) só é permitido explicitamente em ambiente de desenvolvimento.
 */
export function resolveDatabaseConnectionTarget(
  env: Record<string, string | undefined> = process.env
): DatabaseConnectionTarget {
  const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
  const explicitProvider = (env.DB_PROVIDER || '').trim().toLowerCase();
  const supabaseDbUrl = (env.SUPABASE_DATABASE_URL || '').trim();

  const isProduction = nodeEnv === 'production';
  const requiresSupabase =
    isProduction ||
    explicitProvider === 'supabase' ||
    (explicitProvider === '' && Boolean(supabaseDbUrl));

  if (requiresSupabase) {
    if (!supabaseDbUrl) {
      throw new Error(
        'Configuração crítica ausente: SUPABASE_DATABASE_URL é obrigatória em produção ou quando DB_PROVIDER="supabase". Fallback silencioso para banco local está bloqueado.'
      );
    }

    return {
      provider: 'supabase',
      nodeEnv,
      poolConfig: {
        connectionString: supabaseDbUrl,
        ssl: supabaseDbUrl.includes('localhost')
          ? false
          : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      },
      description: 'Supabase PostgreSQL (SUPABASE_DATABASE_URL)',
    };
  }

  // Modo explícito de desenvolvimento local (NODE_ENV !== 'production')
  const sqlHost = (env.SQL_HOST || '').trim();
  const sqlUser = (env.SQL_USER || '').trim();
  const sqlPassword = env.SQL_PASSWORD || '';
  const sqlDbName = (env.SQL_DB_NAME || '').trim();

  return {
    provider: 'local',
    nodeEnv,
    poolConfig: {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword,
      database: sqlDbName,
      max: 10,
      connectionTimeoutMillis: 15000,
    },
    description: `PostgreSQL de Desenvolvimento Local (${sqlHost || 'local'})`,
  };
}

declare global {
  var _postgresPool: Pool | undefined;
  var _postgresTarget: DatabaseConnectionTarget | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const target = resolveDatabaseConnectionTarget(process.env);
    global._postgresTarget = target;
    global._postgresPool = new Pool(target.poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

/**
 * Verificação de saúde e conectividade do banco PostgreSQL ativo (Supabase ou Local Dev)
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  provider: DatabaseProvider;
  nodeEnv: string;
  description: string;
  supabaseConfigured: boolean;
  silentFallbackBlockedInProduction: boolean;
  latencyMs: number;
  postgresVersion?: string;
  error?: string;
}> {
  const start = Date.now();
  const target =
    global._postgresTarget || resolveDatabaseConnectionTarget(process.env);

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT version() AS version, current_database() AS db_name');
      const latencyMs = Date.now() - start;
      const versionRow = res.rows?.[0];
      return {
        ok: true,
        provider: target.provider,
        nodeEnv: target.nodeEnv,
        description: target.description,
        supabaseConfigured: Boolean((process.env.SUPABASE_DATABASE_URL || '').trim()),
        silentFallbackBlockedInProduction: true,
        latencyMs,
        postgresVersion: versionRow?.version
          ? String(versionRow.version).split(' on ')[0]
          : 'PostgreSQL',
      };
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const latencyMs = Date.now() - start;
    return {
      ok: false,
      provider: target.provider,
      nodeEnv: target.nodeEnv,
      description: target.description,
      supabaseConfigured: Boolean((process.env.SUPABASE_DATABASE_URL || '').trim()),
      silentFallbackBlockedInProduction: true,
      latencyMs,
      error: error instanceof Error ? error.message : 'Falha na conexão PostgreSQL',
    };
  }
}
