import { desc, eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  auditLogs,
  companies,
  companyAddresses,
  pickups,
} from '../../../src/db/schema.ts';
import { CompanyItem, DashboardMetrics, PickupItem } from '../../../shared/types/index.ts';

// Fallback em memória caso o proxy do banco ainda esteja inicializando
const fallbackCompanies: CompanyItem[] = [
  {
    id: 1,
    tenantId: 'tenant_manhuacu_hq',
    tradeName: 'Café das Montanhas Manhuaçu (DEMONSTRAÇÃO)',
    legalName: 'Torrefação e Comércio Café das Montanhas Ltda',
    cnpj: '12.345.678/0001-95',
    email: 'logistica@cafemontanha.com.br',
    phone: '(33) 98812-4410',
    segment: 'Agroindústria & Café Especial',
    status: 'ACTIVE',
    isDemo: true,
    createdAt: new Date().toISOString(),
    address: {
      cep: '36900-000',
      street: 'Praça Cordovil Pinto Coelho',
      number: '140',
      neighborhood: 'Centro',
      city: 'Manhuaçu',
      state: 'MG',
    },
  },
  {
    id: 2,
    tenantId: 'tenant_manhuacu_hq',
    tradeName: 'Farmácia Central Alfa (DEMONSTRAÇÃO)',
    legalName: 'Rede Farmacêutica Alfa Manhuaçu S/A',
    cnpj: '45.723.174/0001-10',
    email: 'expedicao@farmaciaalfa.com.br',
    phone: '(33) 99941-2200',
    segment: 'Saúde & Medicamentos',
    status: 'ACTIVE',
    isDemo: true,
    createdAt: new Date().toISOString(),
    address: {
      cep: '36900-110',
      street: 'Avenida Salime Nacif',
      number: '520',
      neighborhood: 'Baixada',
      city: 'Manhuaçu',
      state: 'MG',
    },
  },
  {
    id: 3,
    tenantId: 'tenant_empresa_b',
    tradeName: 'Autopeças BR-262 (DEMONSTRAÇÃO)',
    legalName: 'Distribuidora Automotiva Leste Mineiro Ltda',
    cnpj: '11.444.777/0001-61',
    email: 'coletas@autopecas262.com.br',
    phone: '(33) 98405-9100',
    segment: 'Autopeças & Distribuição',
    status: 'ACTIVE',
    isDemo: true,
    createdAt: new Date().toISOString(),
    address: {
      cep: '36904-000',
      street: 'Rodovia BR-262 Km 39',
      number: '850',
      neighborhood: 'Ponte da Aldeia',
      city: 'Manhuaçu',
      state: 'MG',
    },
  },
];

const fallbackPickups: PickupItem[] = [
  {
    id: 101,
    tenantId: 'tenant_manhuacu_hq',
    protocol: 'NX-2026-0101',
    companyName: 'Café das Montanhas Manhuaçu (DEMONSTRAÇÃO)',
    originNeighborhood: 'Centro',
    destinationNeighborhood: 'Coqueiro Rural',
    city: 'Manhuaçu - MG',
    riderName: 'Lucas Ferreira (DEMO)',
    operatorName: 'Hub Central Manhuaçu',
    weightKg: 4.5,
    distanceKm: 5.8,
    feeBrl: 24.9,
    status: 'IN_PROGRESS',
    isDemo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 102,
    tenantId: 'tenant_manhuacu_hq',
    protocol: 'NX-2026-0102',
    companyName: 'Farmácia Central Alfa (DEMONSTRAÇÃO)',
    originNeighborhood: 'Baixada',
    destinationNeighborhood: 'Santa Luzia',
    city: 'Manhuaçu - MG',
    riderName: 'Rafael Souza (DEMO)',
    operatorName: 'Hub Central Manhuaçu',
    weightKg: 1.2,
    distanceKm: 2.4,
    feeBrl: 14.5,
    status: 'COMPLETED',
    isDemo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 103,
    tenantId: 'tenant_manhuacu_hq',
    protocol: 'NX-2026-0103',
    companyName: 'Café das Montanhas Manhuaçu (DEMONSTRAÇÃO)',
    originNeighborhood: 'Bom Pastor',
    destinationNeighborhood: 'São Vicente',
    city: 'Manhuaçu - MG',
    riderName: 'Aguardando despacho',
    operatorName: 'Hub Central Manhuaçu',
    weightKg: 8.0,
    distanceKm: 4.1,
    feeBrl: 32.0,
    status: 'PENDING',
    isDemo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 104,
    tenantId: 'tenant_manhuacu_hq',
    protocol: 'NX-2026-0104',
    companyName: 'Farmácia Central Alfa (DEMONSTRAÇÃO)',
    originNeighborhood: 'Centro',
    destinationNeighborhood: 'Engenho da Serra',
    city: 'Manhuaçu - MG',
    riderName: 'Carlos Mendes (DEMO)',
    operatorName: 'Operador Leste MG',
    weightKg: 2.1,
    distanceKm: 6.3,
    feeBrl: 22.0,
    status: 'COMPLETED',
    isDemo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 201,
    tenantId: 'tenant_empresa_b',
    protocol: 'NX-2026-0201',
    companyName: 'Autopeças BR-262 (DEMONSTRAÇÃO)',
    originNeighborhood: 'Alfa Sul',
    destinationNeighborhood: 'Ponte da Aldeia',
    city: 'Manhuaçu - MG',
    riderName: 'Marcos Oliveira (DEMO)',
    operatorName: 'Operador BR-262',
    weightKg: 12.4,
    distanceKm: 7.9,
    feeBrl: 45.0,
    status: 'IN_PROGRESS',
    isDemo: true,
    createdAt: new Date().toISOString(),
  },
];

export async function listCompaniesByTenant(tenantId: string): Promise<CompanyItem[]> {
  try {
    const rows =
      tenantId === 'platform_global'
        ? await db.select().from(companies).orderBy(desc(companies.id))
        : await db
            .select()
            .from(companies)
            .where(eq(companies.tenantId, tenantId))
            .orderBy(desc(companies.id));

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tradeName: r.tradeName,
      legalName: r.legalName,
      cnpj: r.cnpj,
      email: r.email,
      phone: r.phone,
      segment: r.segment,
      status: (r.status as 'ACTIVE' | 'PENDING' | 'SUSPENDED') || 'ACTIVE',
      isDemo: r.isDemo,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listCompaniesByTenant:', error);
    return tenantId === 'platform_global'
      ? fallbackCompanies
      : fallbackCompanies.filter((c) => c.tenantId === tenantId);
  }
}

export async function createCompanyForTenant(input: {
  tenantId: string;
  tradeName: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  segment: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}): Promise<CompanyItem> {
  const effectiveTenant =
    input.tenantId === 'platform_global' ? 'tenant_manhuacu_hq' : input.tenantId;

  try {
    const inserted = await db
      .insert(companies)
      .values({
        tenantId: effectiveTenant,
        tradeName: input.tradeName,
        legalName: input.legalName,
        cnpj: input.cnpj,
        email: input.email,
        phone: input.phone,
        segment: input.segment || 'Varejo & Logística',
        status: 'ACTIVE',
        isDemo: false,
      })
      .returning();

    const company = inserted[0];

    await db.insert(companyAddresses).values({
      companyId: company.id,
      cep: input.cep,
      street: input.street,
      number: input.number || 'S/N',
      neighborhood: input.neighborhood,
      city: input.city || 'Manhuaçu',
      state: input.state || 'MG',
      isPrimary: true,
    });

    await db.insert(auditLogs).values({
      tenantId: effectiveTenant,
      action: 'COMPANY_CREATED',
      entityType: 'companies',
      entityId: String(company.id),
      metadataJson: JSON.stringify({ tradeName: company.tradeName, cnpj: company.cnpj }),
    });

    return {
      id: company.id,
      tenantId: company.tenantId,
      tradeName: company.tradeName,
      legalName: company.legalName,
      cnpj: company.cnpj,
      email: company.email,
      phone: company.phone,
      segment: company.segment,
      status: 'ACTIVE',
      isDemo: company.isDemo,
      createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
      address: {
        cep: input.cep,
        street: input.street,
        number: input.number,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
      },
    };
  } catch (error) {
    console.error('Database insert failed in createCompanyForTenant:', error);
    throw new Error(
      'Não foi possível salvar a empresa. Verifique se o CNPJ já está cadastrado.',
      { cause: error }
    );
  }
}

export async function listPickupsByTenant(tenantId: string): Promise<PickupItem[]> {
  try {
    const rows =
      tenantId === 'platform_global'
        ? await db.select().from(pickups).orderBy(desc(pickups.id))
        : await db
            .select()
            .from(pickups)
            .where(eq(pickups.tenantId, tenantId))
            .orderBy(desc(pickups.id));

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      protocol: r.protocol,
      companyId: r.companyId,
      companyName: r.companyName,
      originNeighborhood: r.originNeighborhood,
      destinationNeighborhood: r.destinationNeighborhood,
      city: r.city,
      riderName: r.riderName,
      operatorName: r.operatorName,
      weightKg: Number(r.weightKg),
      distanceKm: Number(r.distanceKm),
      feeBrl: Number(r.feeBrl),
      status: (r.status as PickupItem['status']) || 'PENDING',
      isDemo: r.isDemo,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listPickupsByTenant:', error);
    return tenantId === 'platform_global'
      ? fallbackPickups
      : fallbackPickups.filter((p) => p.tenantId === tenantId);
  }
}

export async function createPickupForTenant(input: {
  tenantId: string;
  companyName: string;
  originNeighborhood: string;
  destinationNeighborhood: string;
  riderName?: string;
  weightKg: number;
  distanceKm: number;
  feeBrl: number;
}): Promise<PickupItem> {
  const effectiveTenant =
    input.tenantId === 'platform_global' ? 'tenant_manhuacu_hq' : input.tenantId;
  const protocol = `NX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const inserted = await db
      .insert(pickups)
      .values({
        tenantId: effectiveTenant,
        protocol,
        companyName: input.companyName,
        originNeighborhood: input.originNeighborhood,
        destinationNeighborhood: input.destinationNeighborhood,
        city: 'Manhuaçu - MG',
        riderName: input.riderName || 'Aguardando despacho',
        operatorName: 'Hub Central Manhuaçu',
        weightKg: String(input.weightKg.toFixed(2)),
        distanceKm: String(input.distanceKm.toFixed(2)),
        feeBrl: String(input.feeBrl.toFixed(2)),
        status: 'PENDING',
        isDemo: false,
      })
      .returning();

    const row = inserted[0];

    await db.insert(auditLogs).values({
      tenantId: effectiveTenant,
      action: 'PICKUP_CREATED',
      entityType: 'pickups',
      entityId: row.protocol,
      metadataJson: JSON.stringify({
        companyName: row.companyName,
        origin: row.originNeighborhood,
        destination: row.destinationNeighborhood,
      }),
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      protocol: row.protocol,
      companyName: row.companyName,
      originNeighborhood: row.originNeighborhood,
      destinationNeighborhood: row.destinationNeighborhood,
      city: row.city,
      riderName: row.riderName,
      operatorName: row.operatorName,
      weightKg: Number(row.weightKg),
      distanceKm: Number(row.distanceKm),
      feeBrl: Number(row.feeBrl),
      status: 'PENDING',
      isDemo: row.isDemo,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database insert failed in createPickupForTenant:', error);
    throw new Error('Falha ao registrar nova solicitação de coleta.', {
      cause: error,
    });
  }
}

export async function updatePickupStatusForTenant(
  tenantId: string,
  pickupId: number,
  status: PickupItem['status']
): Promise<void> {
  try {
    await db
      .update(pickups)
      .set({ status })
      .where(eq(pickups.id, pickupId));

    await db.insert(auditLogs).values({
      tenantId,
      action: 'PICKUP_STATUS_UPDATED',
      entityType: 'pickups',
      entityId: String(pickupId),
      metadataJson: JSON.stringify({ newStatus: status }),
    });
  } catch (error) {
    console.error('Database update failed in updatePickupStatusForTenant:', error);
    throw new Error('Falha ao atualizar status da coleta.', { cause: error });
  }
}

export async function getDashboardOverviewByTenant(tenantId: string): Promise<{
  metrics: DashboardMetrics;
  recentPickups: PickupItem[];
  companies: CompanyItem[];
}> {
  const [pickupList, companyList] = await Promise.all([
    listPickupsByTenant(tenantId),
    listCompaniesByTenant(tenantId),
  ]);

  const pickupsToday = pickupList.length;
  const pickupsPending = pickupList.filter((p) => p.status === 'PENDING').length;
  const pickupsInProgress = pickupList.filter((p) => p.status === 'IN_PROGRESS').length;
  const pickupsCompleted = pickupList.filter((p) => p.status === 'COMPLETED').length;
  const estimatedRevenueBrl = pickupList.reduce(
    (sum, item) => sum + Number(item.feeBrl || 0),
    0
  );
  const completionRatePercent =
    pickupsToday > 0 ? Math.round((pickupsCompleted / pickupsToday) * 100) : 0;

  return {
    metrics: {
      pickupsToday,
      pickupsPending,
      pickupsInProgress,
      pickupsCompleted,
      registeredCompanies: companyList.length,
      activeOperators: tenantId === 'platform_global' ? 4 : 2,
      estimatedRevenueBrl,
      completionRatePercent,
      isDemoData: pickupList.some((p) => p.isDemo) || companyList.some((c) => c.isDemo),
    },
    recentPickups: pickupList.slice(0, 8),
    companies: companyList,
  };
}
