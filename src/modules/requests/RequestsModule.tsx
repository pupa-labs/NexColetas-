import React from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import {
  CompanyItem,
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
  ResponsiveTable,
  StatusBadge,
} from '../../components/ui/DesignSystem.tsx';

interface RequestsModuleProps {
  pickups: PickupItem[];
  companies: CompanyItem[];
  onOpenNewPickup: () => void;
  onUpdateStatus: (pickupId: number, status: PickupStatus) => void;
}

export const RequestsModule: React.FC<RequestsModuleProps> = ({
  pickups,
  onOpenNewPickup,
  onUpdateStatus,
}) => {
  const pendingRequests = pickups.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--nex-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--nex-text-secondary)]">
            <span>Módulo Solicitações</span>
            <span aria-hidden="true">·</span>
            <span>Manhuaçu - MG</span>
            <span aria-hidden="true">·</span>
            <Badge tone="demo">FUNDAÇÃO SPRINT 01</Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text-primary)] mt-1">
            Solicitações de Coleta e Triagem
          </h1>
          <p className="text-xs text-[var(--nex-text-secondary)] mt-0.5">
            Fila de abertura, aprovação e despacho de solicitações B2B para
            operadores regionais
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewPickup}
        >
          Nova Solicitação
        </Button>
      </div>

      <Alert
        title="Fila de Triagem Regional — Manhuaçu, Minas Gerais"
        variant="info"
      >
        Todas as solicitações abertas por empresas embarcadoras entram como{' '}
        <strong>Solicitação Pendente</strong> até serem despachadas para um
        operador ou motoboy credenciado.
      </Alert>

      {pendingRequests.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação pendente de triagem no momento"
          description="Todas as solicitações atuais já foram despachadas para operação ou concluídas. Você pode abrir uma nova solicitação a qualquer momento."
          actionLabel="Abrir Nova Solicitação"
          onAction={onOpenNewPickup}
        />
      ) : (
        <Card
          title={`Solicitações Aguardando Despacho (${pendingRequests.length})`}
          subtitle="Registros isolados por Tenant · Identificados como DEMONSTRAÇÃO quando aplicável"
        >
          <ResponsiveTable
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: 'protocol',
                header: 'Protocolo',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[var(--nex-primary)] shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-xs text-[var(--nex-text-primary)] tabular-nums">
                        {row.protocol}
                      </div>
                      <div className="text-[11px] text-[var(--nex-text-secondary)]">
                        {formatDateTimeBR(row.createdAt)} ·{' '}
                        {row.isDemo ? 'DEMONSTRAÇÃO' : 'Real'}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'company',
                header: 'Empresa Solicitante',
                render: (row) => (
                  <span className="text-xs font-semibold text-[var(--nex-text-primary)]">
                    {row.companyName}
                  </span>
                ),
              },
              {
                key: 'route',
                header: 'Coleta → Entrega',
                render: (row) => (
                  <span className="text-xs text-[var(--nex-text-secondary)]">
                    {row.originNeighborhood} → {row.destinationNeighborhood}
                  </span>
                ),
              },
              {
                key: 'fee',
                header: 'Tarifa Estimada',
                align: 'right',
                render: (row) => (
                  <span className="text-xs font-bold tabular-nums text-[var(--nex-text-primary)]">
                    {formatCurrencyBRL(row.feeBrl)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'action',
                header: 'Aprovação',
                align: 'right',
                render: (row) => (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onUpdateStatus(row.id, 'IN_PROGRESS')}
                  >
                    Aprovar & Despachar
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};
