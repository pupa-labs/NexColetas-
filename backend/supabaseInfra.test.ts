import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseConnectionTarget } from '../src/db/index.ts';
import {
  buildSafeStorageObjectPath,
  NEXCOLETAS_STORAGE_BUCKETS,
  validateStorageFileRequest,
} from './src/services/storageService.ts';

test('1. Produção (NODE_ENV=production) sem SUPABASE_DATABASE_URL bloqueia fallback silencioso com erro explícito', () => {
  assert.throws(
    () =>
      resolveDatabaseConnectionTarget({
        NODE_ENV: 'production',
        SQL_HOST: '127.0.0.1',
        SQL_USER: 'postgres',
        SQL_DB_NAME: 'local_db',
      }),
    /SUPABASE_DATABASE_URL é obrigatória em produção.*Fallback silencioso para banco local está bloqueado/
  );
});

test('2. DB_PROVIDER=supabase sem SUPABASE_DATABASE_URL bloqueia fallback silencioso mesmo em desenvolvimento', () => {
  assert.throws(
    () =>
      resolveDatabaseConnectionTarget({
        NODE_ENV: 'development',
        DB_PROVIDER: 'supabase',
        SQL_HOST: '127.0.0.1',
      }),
    /SUPABASE_DATABASE_URL é obrigatória/
  );
});

test('3. SUPABASE_DATABASE_URL configurada seleciona provedor supabase com SSL habilitado', () => {
  const target = resolveDatabaseConnectionTarget({
    NODE_ENV: 'production',
    SUPABASE_DATABASE_URL:
      'postgresql://postgres.projectref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  });

  assert.equal(target.provider, 'supabase');
  assert.equal(
    target.poolConfig.connectionString,
    'postgresql://postgres.projectref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
  );
  assert.deepEqual(target.poolConfig.ssl, { rejectUnauthorized: false });
});

test('4. Desenvolvimento local (NODE_ENV=development e DB_PROVIDER=local) utiliza PostgreSQL local explicitamente', () => {
  const target = resolveDatabaseConnectionTarget({
    NODE_ENV: 'development',
    DB_PROVIDER: 'local',
    SQL_HOST: '127.0.0.1',
    SQL_USER: 'local_user',
    SQL_PASSWORD: 'local_password',
    SQL_DB_NAME: 'nexcoletas_dev',
  });

  assert.equal(target.provider, 'local');
  assert.equal(target.poolConfig.host, '127.0.0.1');
  assert.equal(target.poolConfig.database, 'nexcoletas_dev');
});

test('5. Estrutura Supabase Storage: Todos os buckets sensíveis são estritamente privados (isPublic === false)', () => {
  for (const bucket of Object.values(NEXCOLETAS_STORAGE_BUCKETS)) {
    assert.equal(
      bucket.isPublic,
      false,
      `O bucket '${bucket.id}' deve ser privado (isPublic: false)`
    );
  }
});

test('6. Estrutura Supabase Storage: Prevenção contra Path Traversal e validação de MIME/tamanho', () => {
  const safePath = buildSafeStorageObjectPath({
    tenantId: 'tenant_manhuacu_hq',
    bucketId: 'payment-receipts',
    entityId: 'WTH-2026-0001',
    fileName: '../../etc/passwd/comprovante_pix.pdf',
  });

  assert.equal(
    safePath,
    'tenant_manhuacu_hq/payment-receipts/WTH-2026-0001/comprovante_pix.pdf'
  );
  assert.ok(!safePath.includes('..'));

  const validCheck = validateStorageFileRequest({
    bucketId: 'payment-receipts',
    mimeType: 'application/pdf',
    sizeBytes: 512 * 1024,
  });
  assert.equal(validCheck.valid, true);

  const invalidMime = validateStorageFileRequest({
    bucketId: 'pickup-photos',
    mimeType: 'application/x-msdownload',
    sizeBytes: 1024,
  });
  assert.equal(invalidMime.valid, false);
});
