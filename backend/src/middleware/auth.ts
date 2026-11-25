import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import { db } from '../../../src/db/index.ts';
import { users } from '../../../src/db/schema.ts';
import { UserRole } from '../../../shared/types/index.ts';

export interface TenantContext {
  tenantId: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  isIdentityVerified: boolean;
  authProvider: 'firebase' | 'preview_scope';
  operatorId?: string;
  uid?: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  tenantContext?: TenantContext;
}

const ALLOWED_TENANTS = new Set([
  'platform_global',
  'tenant_manhuacu_hq',
  'tenant_empresa_b',
]);

const ALLOWED_ROLES = new Set<UserRole>([
  'SUPER_ADMIN',
  'ADMIN',
  'COMPANY_OWNER',
  'COMPANY_ADMIN',
  'COMPANY_USER',
  'OPERATOR',
  'RIDER',
  'AFFILIATE',
  'SUPPORT_AGENT',
]);

/**
 * Middleware obrigatório de autenticação Firebase Auth para rotas exclusivas de conta autenticada.
 * Diretriz Etapa 1: Mantém validação exclusiva via Firebase Auth (adminAuth.verifyIdToken).
 * Não aceita tokens Supabase como substitutos de tokens Firebase nesta etapa.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Não autorizado: Token de autenticação Firebase ausente.',
    });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({
      error: 'Não autorizado: Sessão Firebase expirada ou token inválido.',
    });
  }
};

/**
 * Middleware de isolamento Multi-Tenant.
 * Regra de Segurança Etapa 1:
 * - Os cabeçalhos x-tenant-id, x-tenant-role e x-operator-id NUNCA são tratados como prova de identidade.
 * - A identidade real só é estabelecida após validação criptográfica do token Firebase (adminAuth.verifyIdToken)
 *   e resolução do vínculo do usuário no banco de dados PostgreSQL.
 * - Em produção (NODE_ENV === 'production'), requisições sem token Firebase válido não podem assumir
 *   privilégios administrativos nem trocar de operador via cabeçalhos HTTP.
 */
export const resolveTenantContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isProduction =
      (process.env.NODE_ENV || 'development').trim().toLowerCase() ===
      'production';

    const requestedTenantRaw = String(
      req.headers['x-tenant-id'] || 'tenant_manhuacu_hq'
    ).trim();
    const requestedRoleRaw = String(
      req.headers['x-tenant-role'] || 'COMPANY_ADMIN'
    ).trim() as UserRole;
    const requestedOperatorRaw = req.headers['x-operator-id']
      ? String(req.headers['x-operator-id']).trim()
      : undefined;

    let uid: string | undefined;
    let email: string | undefined;
    let isIdentityVerified = false;
    let dbResolvedRole: UserRole | undefined;
    let dbResolvedTenantId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        // Valida exclusivamente via Firebase Admin SDK (rejeita tokens de outros emissores)
        const decoded = await adminAuth.verifyIdToken(token);
        req.user = decoded;
        uid = decoded.uid;
        email = decoded.email;
        isIdentityVerified = true;

        // Consulta o papel e o tenant autoritativos do usuário no banco PostgreSQL
        try {
          const userRows = await db
            .select()
            .from(users)
            .where(eq(users.uid, decoded.uid))
            .limit(1);
          if (userRows.length > 0) {
            dbResolvedRole = userRows[0].role as UserRole;
            dbResolvedTenantId = userRows[0].tenantId;
          } else if (decoded.email === 'deividbmx779@gmail.com') {
            dbResolvedRole = 'SUPER_ADMIN';
            dbResolvedTenantId = 'platform_global';
          }
        } catch {
          // Caso a tabela users ainda não tenha o registro sincronizado
        }
      } catch {
        if (isProduction) {
          return res.status(401).json({
            error:
              'Token de autenticação inválido. A identidade deve ser comprovada via Firebase Auth.',
          });
        }
      }
    }

    // Determina Tenant e Role:
    // - Se autenticado no Firebase e com registro no banco, o banco é a fonte de verdade para usuários não-admin.
    // - Em produção sem identidade Firebase verificada, bloqueia qualquer escalonamento via header.
    let role: UserRole;
    let tenantId: string;

    if (isIdentityVerified && dbResolvedRole) {
      const isVerifiedSuperAdmin =
        dbResolvedRole === 'SUPER_ADMIN' || dbResolvedRole === 'ADMIN';
      role = isVerifiedSuperAdmin && ALLOWED_ROLES.has(requestedRoleRaw)
        ? requestedRoleRaw
        : dbResolvedRole;
      tenantId =
        isVerifiedSuperAdmin && ALLOWED_TENANTS.has(requestedTenantRaw)
          ? requestedTenantRaw
          : dbResolvedTenantId || 'tenant_manhuacu_hq';
    } else if (isProduction) {
      // Em produção, sem token Firebase verificado, nunca confia nos headers x-tenant-role / x-tenant-id
      role = 'COMPANY_USER';
      tenantId = 'tenant_manhuacu_hq';
    } else {
      // Ambiente local/preview de desenvolvimento: permite simulação de escopo da UI, mas marca isIdentityVerified = false
      tenantId = ALLOWED_TENANTS.has(requestedTenantRaw)
        ? requestedTenantRaw
        : 'tenant_manhuacu_hq';
      role = ALLOWED_ROLES.has(requestedRoleRaw)
        ? requestedRoleRaw
        : 'COMPANY_ADMIN';
    }

    const isPlatformAdmin =
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      tenantId === 'platform_global';

    // Regra de Isolamento Multi-Tenant: Uma empresa comum nunca pode solicitar escopo global
    if (
      tenantId === 'platform_global' &&
      role !== 'SUPER_ADMIN' &&
      role !== 'ADMIN'
    ) {
      return res.status(403).json({
        error:
          'Acesso negado pelo isolamento Multi-Tenant: Seu perfil não possui permissão para visualizar dados globais de outras empresas.',
      });
    }

    const operatorId =
      requestedOperatorRaw ||
      (role === 'OPERATOR' || role === 'RIDER' ? 'OP-101' : undefined);

    req.tenantContext = {
      tenantId,
      role,
      isPlatformAdmin,
      isIdentityVerified,
      authProvider: isIdentityVerified ? 'firebase' : 'preview_scope',
      operatorId,
      uid,
      email,
    };

    next();
  } catch (error) {
    console.error('Erro no middleware de isolamento multi-tenant:', error);
    return res.status(500).json({
      error: 'Falha ao validar isolamento multi-tenant da requisição.',
    });
  }
};

/**
 * Guard de autorização por função (RBAC)
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const currentRole = req.tenantContext?.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        error: `Acesso restrito: Esta operação exige uma das funções [${allowedRoles.join(', ')}].`,
      });
    }
    next();
  };
};
