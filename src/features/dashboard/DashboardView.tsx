import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Leaf,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  CompanyItem,
  DashboardMetrics,
  DataViewState,
  ModuleKey,
  PickupItem,
  PickupStatus,
} from '../../../shared/types/index.ts';
import {
  formatCurrencyBRL,
  formatDateTimeBR,
} from '../../../shared/validators/smartData.ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  ResponsiveTable,
  Skeleton,
  StatCard,
  StatusBadge,
  Tabs,
} from '../../components/ui/DesignSystem.tsx';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  recentPickups: PickupItem[];
  companies: CompanyItem[];
  viewState: DataViewState;
  errorMessage?: string;
  onChangeViewState: (state: DataViewState) => void;
  onRefresh: () => void;
  onOpenNewPickup: () => void;
  onUpdatePickupStatus: (pickupId: number, nextStatus: PickupStatus) => void;
  onNavigateModule: (module: ModuleKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  recentPickups,
  companies,
  viewState,
  errorMessage,
  onChangeViewState,
  onRefresh,
  onOpenNewPickup,
  onUpdatePickupStatus,
  onNavigateModule,
}) => {
  const { activeTenant } = useTenantAuth();
  const [selectedCorridor, setSelectedCorridor] = useState<string>(
    'Centro / Comercial'
  );
  const [operationTab, setOperationTab] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  const filteredOperations = recentPickups.filter((item) =>
    operationTab === 'ALL' ? true : item.status === operationTab
  );

  const corridors = [
    {
      name: 'Centro / Comercial',
      activePickups:
        recentPickups.filter(
          (p) =>
            p.originNeighborhood === 'Centro' ||
            p.destinationNeighborhood === 'Centro'
        ).length || 2,
      avgSlaMinutes: 18,
      co2SavedKg: 4.2,
    },
    {
      name: 'Coqueiro Rural / BR-262',
      activePickups:
        recentPickups.filter(
          (p) =>
            p.originNeighborhood.includes('Coqueiro') ||
            p.destinationNeighborhood.includes('Coqueiro')
        ).length || 1,
      avgSlaMinutes: 24,
      co2SavedKg: 3.1,
    },
    {
      name: 'Baixada / Santa Luzia',
      activePickups:
        recentPickups.filter(
          (p) =>
            p.originNeighborhood === 'Baixada' ||
            p.destinationNeighborhood === 'Santa Luzia'
        ).length || 1,
      avgSlaMinutes: 16,
      co2SavedKg: 2.8,
    },
    {
      name: 'Ponte da Aldeia / Alfa Sul',
      activePickups:
        recentPickups.filter(
          (p) =>
            p.originNeighborhood === 'Alfa Sul' ||
            p.destinationNeighborhood === 'Ponte da Aldeia'
        ).length || 1,
      avgSlaMinutes: 27,
      co2SavedKg: 5.4,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Dashboard Foundation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[var(--nex-border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nex-text-secondary)]">
            <span>Manhuaçu, Minas Gerais, Brasil</span>
            <span aria-hidden="true">·</span>
            <span>Sua coleta. Nossa conexão.</span>
            <span aria-hidden="true">·</span>
            <Badge tone="demo">
              {metrics.isDemoData
                ? 'DATASET DE DEMONSTRAÇÃO (ISOLADO)'
                : 'DADOS OPERACIONAIS DO TENANT'}
            </Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text-primary)] mt-1">
            Dashboard Foundation — Operação Regional
          </h1>
        </div>

        {/* Simulador de Estados de Visão (Demonstração vs Sem Dados vs Carregando vs Erro) */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Simulador de estados de dados"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[var(--nex-surface)] border border-[var(--nex-border)] text-xs"
          >
            {(
              [
                { id: 'ready', label: 'Demonstração Layout' },
                { id: 'empty', label: 'Estado Limpo (Sem Dados)' },
                { id: 'loading', label: 'Skeleton' },
                { id: 'error', label: 'Erro' },
              ] as { id: DataViewState; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangeViewState(st.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewState === st.id
                    ? 'bg-[var(--nex-primary)] text-[var(--nex-primary-fg)]'
                    : 'text-[var(--nex-text-secondary)] hover:text-[var(--nex-text-primary)]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRefresh}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {viewState === 'loading' && (
        <Card
          title="Carregando Estrutura Operacional — Manhuaçu - MG"
          subtitle="Validando componentes Skeleton do Design System NexColetas..."
        >
          <Skeleton rows={6} />
        </Card>
      )}

      {viewState === 'error' && (
        <ErrorState
          title="Não foi possível sincronizar os indicadores deste escopo"
          message={
            errorMessage ||
            'Verifique a disponibilidade da API ou clique em Tentar Novamente para restaurar o painel.'
          }
          onRetry={() => {
            onChangeViewState('ready');
            onRefresh();
          }}
        />
      )}

      {viewState === 'empty' && (
        <EmptyState
          title="Nenhuma operação ativa registrada (Estado Limpo)"
          description="Este estado garante que dados de demonstração nunca sejam misturados com dados reais em produção. Crie uma nova solicitação para iniciar a operação."
          actionLabel="Criar Nova Solicitação"
          onAction={onOpenNewPickup}
        />
      )}

      {viewState === 'ready' && (
        <>
          {/* Aviso de Transparência sobre Dados de Demonstração (Requisito 8) */}
          <Alert
            title="Validação Visual de Fundação — Dados de Demonstração Isolados"
            variant="info"
          >
            Os indicadores abaixo estão identificados como{' '}
            <strong>DEMONSTRAÇÃO</strong> para validar a hierarquia tipográfica,
            responsividade e tokens dos temas (GREEN, LIGHT e NIGHT) na base
            inicial de Manhuaçu - MG. Utilize o botão{' '}
            <strong>Estado Limpo (Sem Dados)</strong> acima para inspecionar a
            tela sem registros de demonstração.
          </Alert>

          {/* 6 STAT CARDS REUTILIZÁVEIS OBRIGATÓRIOS (ITEM 8 — DASHBOARD FOUNDATION) */}
          <section
            aria-label="Indicadores principais do Dashboard Foundation"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
          >
            <StatCard
              label="Total de coletas"
              value={metrics.pickupsToday}
              helperText="Base Manhuaçu · DEMO"
              icon={<Package className="w-4 h-4" />}
              highlight
            />
            <StatCard
              label="Coletas em andamento"
              value={metrics.pickupsInProgress}
              helperText="Em trânsito urbano"
              icon={<Truck className="w-4 h-4" />}
            />
            <StatCard
              label="Coletas concluídas"
              value={metrics.pickupsCompleted}
              helperText="Entrega confirmada"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              label="Solicitações pendentes"
              value={metrics.pickupsPending}
              helperText="Aguardando despacho"
              icon={<ClipboardList className="w-4 h-4" />}
            />
            <StatCard
              label="Operadores ativos"
              value={metrics.activeOperators}
              helperText="Hubs Manhuaçu - MG"
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Empresas cadastradas"
              value={metrics.registeredCompanies}
              helperText="Escopo do Tenant"
              icon={<Building2 className="w-4 h-4" />}
            />
          </section>

          {/* OPERAÇÕES RECENTES + INDICADORES REGIONAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Operações Recentes (2 colunas) */}
            <Card
              title="Operações Recentes — Manhuaçu e Região"
              subtitle="Listagem modular utilizando Table, Tabs, StatusBadge e Pagination do Design System"
              className="lg:col-span-2"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateModule('operations')}
                  >
                    Módulo Operações
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={onOpenNewPickup}
                  >
                    Nova Solicitação
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <Tabs
                  ariaLabel="Filtro de operações recentes"
                  activeTab={operationTab}
                  onChange={setOperationTab}
                  tabs={[
                    {
                      id: 'ALL',
                      label: 'Todas',
                      count: recentPickups.length,
                    },
                    {
                      id: 'IN_PROGRESS',
                      label: 'Em Andamento',
                      count: recentPickups.filter(
                        (p) => p.status === 'IN_PROGRESS'
                      ).length,
                    },
                    {
                      id: 'PENDING',
                      label: 'Pendentes',
                      count: recentPickups.filter((p) => p.status === 'PENDING')
                        .length,
                    },
                    {
                      id: 'COMPLETED',
                      label: 'Concluídas',
                      count: recentPickups.filter(
                        (p) => p.status === 'COMPLETED'
                      ).length,
                    },
                  ]}
                />

                <ResponsiveTable
                  data={filteredOperations}
                  keyExtractor={(item) => item.id}
                  columns={[
                    {
                      key: 'protocol',
                      header: 'Protocolo',
                      render: (row) => (
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-xs text-[var(--nex-text-primary)] tabular-nums">
                            {row.protocol}
                          </span>
                          <span className="text-[11px] text-[var(--nex-text-secondary)]">
                            {row.isDemo ? 'DEMONSTRAÇÃO' : 'Registro Real'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'company',
                      header: 'Empresa Embarcadora',
                      render: (row) => (
                        <div className="max-w-[200px] truncate font-medium text-xs text-[var(--nex-text-primary)]">
                          {row.companyName}
                        </div>
                      ),
                    },
                    {
                      key: 'route',
                      header: 'Origem → Destino',
                      render: (row) => (
                        <span className="text-xs text-[var(--nex-text-secondary)]">
                          {row.originNeighborhood} →{' '}
                          {row.destinationNeighborhood}
                        </span>
                      ),
                    },
                    {
                      key: 'fee',
                      header: 'Volume / Tarifa',
                      align: 'right',
                      render: (row) => (
                        <div className="text-xs tabular-nums">
                          <div className="font-semibold text-[var(--nex-text-primary)]">
                            {formatCurrencyBRL(row.feeBrl)}
                          </div>
                          <div className="text-[11px] text-[var(--nex-text-secondary)]">
                            {Number(row.weightKg).toFixed(1)} kg ·{' '}
                            {Number(row.distanceKm).toFixed(1)} km
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      key: 'action',
                      header: 'Ação',
                      align: 'right',
                      render: (row) => {
                        const nextMap: Record<
                          PickupStatus,
                          { label: string; next: PickupStatus } | null
                        > = {
                          PENDING: { label: 'Despachar', next: 'IN_PROGRESS' },
                          IN_PROGRESS: { label: 'Concluir', next: 'COMPLETED' },
                          COMPLETED: null,
                          ALERT: { label: 'Retomar', next: 'IN_PROGRESS' },
                        };
                        const action = nextMap[row.status];
                        if (!action) {
                          return (
                            <span className="text-xs text-[var(--nex-text-secondary)]">
                              Concluída
                            </span>
                          );
                        }
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onUpdatePickupStatus(row.id, action.next)
                            }
                          >
                            {action.label}
                          </Button>
                        );
                      },
                    },
                  ]}
                />

                <Pagination
                  currentPage={page}
                  totalPages={1}
                  onPageChange={setPage}
                />
              </div>
            </Card>

            {/* Indicadores Operacionais & Corredores */}
            <Card
              title="Indicadores por Corredor Urbano"
              subtitle="Métricas operacionais e eficiência logística em Manhuaçu - MG"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)]">
                    <div className="text-[var(--nex-text-secondary)]">
                      Taxa de Conclusão
                    </div>
                    <div className="text-lg font-display font-bold text-[var(--nex-text-primary)] tabular-nums mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-[var(--nex-primary)]" />
                      {metrics.completionRatePercent}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)]">
                    <div className="text-[var(--nex-text-secondary)]">
                      Volume Estimado
                    </div>
                    <div className="text-lg font-display font-bold text-[var(--nex-text-primary)] tabular-nums mt-0.5">
                      {formatCurrencyBRL(metrics.estimatedRevenueBrl)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {corridors.map((c) => {
                    const isSelected = selectedCorridor === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedCorridor(c.name)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--nex-surface-secondary)] border-[var(--nex-primary)]'
                            : 'bg-[var(--nex-surface)] border-[var(--nex-border)] hover:bg-[var(--nex-surface-secondary)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-[var(--nex-text-primary)]">
                          <span>{c.name}</span>
                          <span className="tabular-nums text-[var(--nex-primary)]">
                            {c.activePickups} coletas
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--nex-text-secondary)] tabular-nums">
                          <span>SLA médio: {c.avgSlaMinutes} min</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-[var(--nex-success)]">
                            <Leaf className="w-3 h-3" />
                            -{c.co2SavedKg} kg CO₂
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[var(--nex-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--nex-text-secondary)]">
                    Empresas ativas no escopo:
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--nex-text-primary)]">
                    {companies.length} empresas
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* GRÁFICOS + ATIVIDADE RECENTE + ALERTAS (REQUISITO 8) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estrutura preparada para Gráficos */}
            <Card
              title="Gráfico Operacional — Distribuição de Coletas"
              subtitle="Estrutura visual preparada para telemetria regional (DEMONSTRAÇÃO)"
            >
              <div className="space-y-4">
                {[
                  {
                    label: 'Coletas Concluídas',
                    count: metrics.pickupsCompleted,
                    total: Math.max(1, metrics.pickupsToday),
                    barColor: 'bg-[#174D35]',
                  },
                  {
                    label: 'Coletas em Andamento',
                    count: metrics.pickupsInProgress,
                    total: Math.max(1, metrics.pickupsToday),
                    barColor: 'bg-[#5DAA70]',
                  },
                  {
                    label: 'Solicitações Pendentes',
                    count: metrics.pickupsPending,
                    total: Math.max(1, metrics.pickupsToday),
                    barColor: 'bg-[#B8DCC0]',
                  },
                ].map((bar) => {
                  const pct = Math.round((bar.count / bar.total) * 100);
                  return (
                    <div key={bar.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--nex-text-primary)]">
                          {bar.label}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-[var(--nex-text-secondary)]">
                          {bar.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[var(--nex-surface-secondary)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${bar.barColor}`}
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-[var(--nex-border)] flex items-center justify-between text-xs text-[var(--nex-text-secondary)]">
                  <span>Cobertura Inicial: Manhuaçu - MG</span>
                  <button
                    type="button"
                    onClick={() => onNavigateModule('coverage')}
                    className="inline-flex items-center gap-1 font-semibold text-[var(--nex-primary)] hover:underline cursor-pointer"
                  >
                    Coverage Network
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>

            {/* Atividade Recente */}
            <Card
              title="Atividade Recente"
              subtitle="Registro cronológico de eventos operacionais do Tenant"
            >
              <div className="space-y-3">
                {recentPickups.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg bg-[var(--nex-surface-secondary)]/60 border border-[var(--nex-border)] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--nex-text-primary)] truncate">
                        {p.protocol} · {p.companyName}
                      </div>
                      <div className="text-[11px] text-[var(--nex-text-secondary)] truncate">
                        <MapPin className="w-3 h-3 inline mr-1 text-[var(--nex-primary)]" />
                        {p.originNeighborhood} → {p.destinationNeighborhood}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={p.status} />
                      <div className="text-[10px] text-[var(--nex-text-secondary)] tabular-nums mt-0.5">
                        {formatDateTimeBR(p.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Alertas Operacionais */}
            <Card
              title="Alertas & Governança"
              subtitle="Avisos de rota, SLA e isolamento multi-tenant"
            >
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)]/70 border border-[var(--nex-border)] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--nex-warning)] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--nex-text-primary)]">
                      Janela Pico — Eixo BR-262 / Ponte da Aldeia
                    </div>
                    <p className="text-[var(--nex-text-secondary)] mt-0.5">
                      Corredor em foco ({selectedCorridor}) com priorização para
                      coletas expressas urbanas.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)]/70 border border-[var(--nex-border)] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--nex-primary)] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--nex-text-primary)]">
                      Escopo Isolado: {activeTenant.tenantId}
                    </div>
                    <p className="text-[var(--nex-text-secondary)] mt-0.5">
                      Validação de permissões por função ({activeTenant.role}) e
                      separação estrita de dados de demonstração.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
