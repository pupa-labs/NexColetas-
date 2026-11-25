import path from 'path';
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfigStatus,
} from '../lib/supabaseAdmin.ts';

export type NexStorageBucketId =
  | 'pickup-photos'
  | 'payment-receipts'
  | 'operator-documents'
  | 'company-images'
  | 'admin-files';

export interface StorageBucketBlueprint {
  id: NexStorageBucketId;
  label: string;
  isPublic: boolean;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  description: string;
}

/**
 * Estrutura planejada de Buckets do Supabase Storage para a NexColetas.
 * Diretriz de segurança Etapa 1:
 * - Nenhum bucket ou política permissiva é criado automaticamente sem aprovação.
 * - Documentos, fotos de coleta, comprovantes financeiros e arquivos administrativos são estritamente PRIVADOS (isPublic: false).
 */
export const NEXCOLETAS_STORAGE_BUCKETS: Record<
  NexStorageBucketId,
  StorageBucketBlueprint
> = {
  'pickup-photos': {
    id: 'pickup-photos',
    label: 'Fotos de Coleta & Comprovantes de Entrega (POD)',
    isPublic: false,
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    description:
      'Armazenamento privado de registros fotográficos de coletas urbanas e entregas concluídas.',
  },
  'payment-receipts': {
    id: 'payment-receipts',
    label: 'Comprovantes Financeiros & Saques PIX (NexPay)',
    isPublic: false,
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    description:
      'Armazenamento privado de comprovantes de liquidação PIX e quitação de saldo devedor.',
  },
  'operator-documents': {
    id: 'operator-documents',
    label: 'Documentos de Operadores & Motoboys (CNH / CRLV)',
    isPublic: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    description:
      'Armazenamento privado e restrito para documentação de homologação de operadores.',
  },
  'company-images': {
    id: 'company-images',
    label: 'Logotipos & Identidade Visual de Empresas',
    isPublic: false,
    maxSizeBytes: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
    ],
    description:
      'Armazenamento controlado de logomarcas de empresas embarcadoras por tenant.',
  },
  'admin-files': {
    id: 'admin-files',
    label: 'Arquivos Administrativos & Relatórios de Auditoria',
    isPublic: false,
    maxSizeBytes: 15 * 1024 * 1024, // 15 MB
    allowedMimeTypes: [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    description:
      'Armazenamento privado exclusivo da administração NexColetas Control.',
  },
};

/**
 * Constrói um caminho seguro e isolado por tenant para objetos no Supabase Storage,
 * prevenindo Path Traversal (../) e garantindo confinamento por tenantId.
 */
export function buildSafeStorageObjectPath(params: {
  tenantId: string;
  bucketId: NexStorageBucketId;
  entityId: string;
  fileName: string;
}): string {
  const cleanTenant = params.tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanEntity = params.entityId.replace(/[^a-zA-Z0-9_-]/g, '');
  const baseName = path.basename(params.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

  if (!cleanTenant || !cleanEntity || !baseName) {
    throw new Error('Parâmetros inválidos para construção de caminho no Storage.');
  }

  return `${cleanTenant}/${params.bucketId}/${cleanEntity}/${baseName}`;
}

/**
 * Valida se o arquivo atende às regras de MIME type e limite de tamanho do bucket.
 */
export function validateStorageFileRequest(params: {
  bucketId: NexStorageBucketId;
  mimeType: string;
  sizeBytes: number;
}): { valid: boolean; error?: string } {
  const blueprint = NEXCOLETAS_STORAGE_BUCKETS[params.bucketId];
  if (!blueprint) {
    return { valid: false, error: 'Bucket não reconhecido pela arquitetura NexColetas.' };
  }

  if (!blueprint.allowedMimeTypes.includes(params.mimeType)) {
    return {
      valid: false,
      error: `Tipo de arquivo '${params.mimeType}' não permitido para o bucket '${params.bucketId}'.`,
    };
  }

  if (params.sizeBytes <= 0 || params.sizeBytes > blueprint.maxSizeBytes) {
    return {
      valid: false,
      error: `Tamanho do arquivo excede o limite de ${Math.round(blueprint.maxSizeBytes / (1024 * 1024))} MB do bucket '${params.bucketId}'.`,
    };
  }

  return { valid: true };
}

/**
 * Inspeciona o status da preparação do Supabase Storage sem criar buckets ou políticas automaticamente.
 */
export async function getSupabaseStorageReadiness() {
  const configStatus = getSupabaseAdminConfigStatus();
  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    return {
      ready: false,
      configured: false,
      autoProvisioningDisabled: true,
      message:
        'Estrutura do serviço Supabase Storage preparada. Aguardando configuração de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.',
      plannedBuckets: Object.values(NEXCOLETAS_STORAGE_BUCKETS),
    };
  }

  try {
    const { data: existingBuckets, error } = await adminClient.storage.listBuckets();
    if (error) {
      return {
        ready: false,
        configured: true,
        autoProvisioningDisabled: true,
        message: `Cliente Supabase Storage configurado, porém a consulta de buckets retornou: ${error.message}`,
        plannedBuckets: Object.values(NEXCOLETAS_STORAGE_BUCKETS),
      };
    }

    const existingNames = new Set((existingBuckets || []).map((b) => b.name));
    return {
      ready: true,
      configured: configStatus.isAdminClientReady,
      autoProvisioningDisabled: true,
      existingBuckets: Array.from(existingNames),
      plannedBuckets: Object.values(NEXCOLETAS_STORAGE_BUCKETS).map((b) => ({
        ...b,
        existsInRemote: existingNames.has(b.id),
      })),
    };
  } catch (err: unknown) {
    return {
      ready: false,
      configured: true,
      autoProvisioningDisabled: true,
      message:
        err instanceof Error
          ? err.message
          : 'Erro ao inspecionar buckets no Supabase Storage.',
      plannedBuckets: Object.values(NEXCOLETAS_STORAGE_BUCKETS),
    };
  }
}
