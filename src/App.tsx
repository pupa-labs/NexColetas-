import React, { useCallback, useEffect, useState } from 'react';
import {
  CompanyItem,
  DashboardMetrics,
  DataViewState,
  ModuleKey,
  PickupItem,
  PickupStatus,
} from '../shared/types/index.ts';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import {
  TenantAuthProvider,
  useTenantAuth,
} from './app/TenantAuthContext.tsx';
import { NexControlLayout } from './components/layout/NexControlLayout.tsx';
import { DashboardModule } from './modules/dashboard/DashboardModule.tsx';
import {
  NewPickupModal,
  OperationsModule,
} from './modules/operations/OperationsModule.tsx';
import { RequestsModule } from './modules/requests/RequestsModule.tsx';
import { CompaniesModule } from './modules/companies/CompaniesModule.tsx';
import { OperatorsModule } from './modules/operators/OperatorsModule.tsx';
import { CoverageModule } from './modules/coverage/CoverageModule.tsx';
import { FinanceModule } from './modules/finance/FinanceModule.tsx';
import { PartnersModule } from './modules/partners/PartnersModule.tsx';
import { SupportModule } from './modules/support/SupportModule.tsx';
import { SettingsView } from './features/settings/SettingsView.tsx';
import { Toast } from './components/ui/DesignSystem.tsx';
import {
  createCompanyRequest,
  createPickupRequest,
  fetchDashboardOverview,
  updatePickupStatusRequest,
} from './services/apiClient.ts';

const INITIAL_METRICS: DashboardMetrics = {
  pickupsToday: 4,
  pickupsPending: 1,
  pickupsInProgress: 1,
  pickupsCompleted: 2,
  registeredCompanies: 2,
  activeOperators: 2,
  estimatedRevenueBrl: 93.4,
  completionRatePercent: 50,
  isDemoData: true,
};

const INITIAL_PICKUPS: PickupItem[] = [
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
];

const INITIAL_COMPANIES: CompanyItem[] = [
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
  },
];

function NexControlAppContent() {
  const { activeTenant, idToken } = useTenantAuth();
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [viewState, setViewState] = useState<DataViewState>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);
  const [pickups, setPickups] = useState<PickupItem[]>(INITIAL_PICKUPS);
  const [companies, setCompanies] = useState<CompanyItem[]>(INITIAL_COMPANIES);
  const [newPickupOpen, setNewPickupOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadOperationalData = useCallback(async () => {
    try {
      const data = await fetchDashboardOverview({
        tenantId: activeTenant.tenantId,
        role: activeTenant.role,
        idToken,
      });
      setMetrics(data.metrics);
      setPickups(data.recentPickups);
      setCompanies(data.companies);
      setErrorMessage('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao consultar servidor NexColetas.';
      setErrorMessage(msg);
    }
  }, [activeTenant, idToken]);

  useEffect(() => {
    loadOperationalData();
  }, [loadOperationalData]);

  const handleCreatePickup = async (payload: {
    companyName: string;
    originNeighborhood: string;
    destinationNeighborhood: string;
    riderName?: string;
    weightKg: number;
    distanceKm: number;
    feeBrl: number;
  }) => {
    const created = await createPickupRequest(
      {
        tenantId: activeTenant.tenantId,
        role: activeTenant.role,
        idToken,
      },
      payload
    );
    await loadOperationalData();
    showToast(`Solicitação ${created.protocol} registrada em Manhuaçu - MG.`);
  };

  const handleUpdatePickupStatus = async (
    pickupId: number,
    nextStatus: PickupStatus
  ) => {
    await updatePickupStatusRequest(
      {
        tenantId: activeTenant.tenantId,
        role: activeTenant.role,
        idToken,
      },
      pickupId,
      nextStatus
    );
    await loadOperationalData();
    showToast('Status da operação atualizado com sucesso.');
  };

  const handleCreateCompany = async (payload: {
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
  }) => {
    const created = await createCompanyRequest(
      {
        tenantId: activeTenant.tenantId,
        role: activeTenant.role,
        idToken,
      },
      payload
    );
    await loadOperationalData();
    showToast(`Empresa ${created.tradeName} cadastrada no Tenant.`);
  };

  return (
    <NexControlLayout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      onOpenNewPickup={() => setNewPickupOpen(true)}
    >
      {activeModule === 'dashboard' && (
        <DashboardModule
          metrics={metrics}
          recentPickups={pickups}
          companies={companies}
          viewState={viewState}
          errorMessage={errorMessage}
          onChangeViewState={setViewState}
          onRefresh={() => {
            loadOperationalData();
            showToast('Indicadores atualizados.');
          }}
          onOpenNewPickup={() => setNewPickupOpen(true)}
          onUpdatePickupStatus={handleUpdatePickupStatus}
          onNavigateModule={setActiveModule}
        />
      )}

      {activeModule === 'operations' && (
        <OperationsModule
          pickups={pickups}
          companies={companies}
          onOpenNewPickup={() => setNewPickupOpen(true)}
          onUpdateStatus={handleUpdatePickupStatus}
        />
      )}

      {activeModule === 'requests' && (
        <RequestsModule
          pickups={pickups}
          companies={companies}
          onOpenNewPickup={() => setNewPickupOpen(true)}
          onUpdateStatus={handleUpdatePickupStatus}
        />
      )}

      {activeModule === 'companies' && (
        <CompaniesModule
          companies={companies}
          onCreateCompany={handleCreateCompany}
        />
      )}

      {activeModule === 'operators' && (
        <OperatorsModule onNotify={showToast} />
      )}

      {activeModule === 'coverage' && (
        <CoverageModule
          pickups={pickups}
          onOpenNewPickup={() => setNewPickupOpen(true)}
        />
      )}

      {activeModule === 'finance' && (
        <FinanceModule pickups={pickups} onNotify={showToast} />
      )}

      {activeModule === 'partners' && <PartnersModule />}

      {activeModule === 'support' && <SupportModule />}

      {activeModule === 'settings' && <SettingsView onNotify={showToast} />}

      <NewPickupModal
        isOpen={newPickupOpen}
        onClose={() => setNewPickupOpen(false)}
        companies={companies}
        onSubmit={handleCreatePickup}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </NexControlLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TenantAuthProvider>
        <NexControlAppContent />
      </TenantAuthProvider>
    </ThemeProvider>
  );
}
