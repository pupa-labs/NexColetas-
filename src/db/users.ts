import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Usuário NexColetas',
        role: email === 'deividbmx779@gmail.com' ? 'SUPER_ADMIN' : 'COMPANY_ADMIN',
        tenantId: 'tenant_manhuacu_hq',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Falha ao sincronizar perfil do usuário no banco de dados.', {
      cause: error,
    });
  }
}

export async function getUsersByTenant(tenantId: string) {
  try {
    if (tenantId === 'platform_global') {
      return await db.select().from(users);
    }
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  } catch (error) {
    console.error('Database query failed in getUsersByTenant:', error);
    throw new Error('Não foi possível consultar a lista de usuários do tenant.', {
      cause: error,
    });
  }
}
