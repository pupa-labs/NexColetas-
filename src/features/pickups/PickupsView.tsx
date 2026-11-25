import React, { useState } from 'react';
import { Filter, PackagePlus, Search } from 'lucide-react';
import {
  CompanyItem,
  PickupItem,
  PickupStatus,
} from '../../../shared/types/index.ts';
import { MANHUACU_NEIGHBORHOODS } from '../../../shared/constants/index.ts';
import {
  formatCurrencyBRL,
  formatDateTimeBR,
} from '../../../shared/validators/smartData.ts';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ResponsiveTable,
  Select,
  StatusBadge,
} from '../../components/ui/DesignSystem.tsx';

interface PickupsViewProps {
  pickups: PickupItem[];
  companies: CompanyItem[];
  onOpenNewPickup: () => void;
  onUpdateStatus: (pickupId: number, status: PickupStatus) => void;
}

export const PickupsView: React.FC<PickupsViewProps> = ({
  pickups,
  onOpenNewPickup,
  onUpdateStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = pickups.filter((item) => {
    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.protocol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q) ||
      item.originNeighborhood.toLowerCase().includes(q) ||
      item.destinationNeighborhood.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
            Gestão de Coletas Urbanas
          </h1>
          <p className="text-xs text-[var(--nex-muted)] mt-0.5">
            Controle de protocolos, despacho de motoboys e comprovação digital em
            Manhuaçu - MG
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PackagePlus className="w-4 h-4" />}
          onClick={onOpenNewPickup}
        >
          Solicitar Nova Coleta
        </Button>
      </div>

      {/* Barra de Busca e Filtro por Status */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--nex-muted)] absolute left-3 top-3" />
            <input
              type="search"
              aria-label="Buscar coleta por protocolo, empresa ou bairro"
              placeholder="Buscar por protocolo (NX-2026...), empresa ou bairro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--nex-input-bg)] text-[var(--nex-text)] border border-[var(--nex-border)] focus:outline-none focus:border-[var(--nex-primary)]"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrar coletas por status"
            className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)]"
          >
            <Filter className="w-3.5 h-3.5 text-[var(--nex-muted)] ml-2 mr-1" />
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'PENDING', label: 'Pendentes' },
              { id: 'IN_PROGRESS', label: 'Em Andamento' },
              { id: 'COMPLETED', label: 'Concluídas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[var(--nex-primary)] text-[var(--nex-primary-fg)]'
                    : 'text-[var(--nex-muted)] hover:text-[var(--nex-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma coleta encontrada para os filtros selecionados"
          description="Altere o termo de busca ou registre uma nova coleta urbana em Manhuaçu - MG."
          actionLabel="Solicitar Nova Coleta"
          onAction={onOpenNewPickup}
        />
      ) : (
        <Card
          title={`Coletas Listadas (${filtered.length})`}
          subtitle="Valores expressos em Real Brasileiro (R$) · Pesos em kg · Distâncias em km"
        >
          <ResponsiveTable
            data={filtered}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: 'protocol',
                header: 'Protocolo / Data',
                render: (row) => (
                  <div>
                    <div className="font-mono font-bold text-xs text-[var(--nex-text)] tabular-nums">
                      {row.protocol}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)] tabular-nums">
                      {formatDateTimeBR(row.createdAt)} ·{' '}
                      {row.isDemo ? 'DEMONSTRAÇÃO' : 'Real'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'company',
                header: 'Empresa Embarcadora',
                render: (row) => (
                  <div>
                    <div className="font-semibold text-xs text-[var(--nex-text)]">
                      {row.companyName}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      Operador: {row.operatorName || 'Hub Central Manhuaçu'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'route',
                header: 'Origem → Destino',
                render: (row) => (
                  <div className="text-xs">
                    <span className="font-medium text-[var(--nex-text)]">
                      {row.originNeighborhood}
                    </span>{' '}
                    →{' '}
                    <span className="font-medium text-[var(--nex-text)]">
                      {row.destinationNeighborhood}
                    </span>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      Motoboy: {row.riderName || 'Aguardando despacho'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'metrics',
                header: 'Carga / Tarifa',
                align: 'right',
                render: (row) => (
                  <div className="text-xs tabular-nums">
                    <div className="font-bold text-[var(--nex-text)]">
                      {formatCurrencyBRL(row.feeBrl)}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      {Number(row.weightKg).toFixed(2)} kg ·{' '}
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
                key: 'actions',
                header: 'Operação',
                align: 'right',
                render: (row) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {row.status === 'PENDING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onUpdateStatus(row.id, 'IN_PROGRESS')}
                      >
                        Despachar
                      </Button>
                    )}
                    {row.status === 'IN_PROGRESS' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateStatus(row.id, 'COMPLETED')}
                      >
                        Confirmar Entrega
                      </Button>
                    )}
                    {row.status === 'COMPLETED' && (
                      <span className="text-xs text-[var(--nex-muted)]">
                        Concluída
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

interface NewPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyItem[];
  onSubmit: (payload: {
    companyName: string;
    originNeighborhood: string;
    destinationNeighborhood: string;
    riderName?: string;
    weightKg: number;
    distanceKm: number;
    feeBrl: number;
  }) => Promise<void>;
}

export const NewPickupModal: React.FC<NewPickupModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSubmit,
}) => {
  const [companyName, setCompanyName] = useState(
    companies[0]?.tradeName || 'Café das Montanhas Manhuaçu'
  );
  const [originNeighborhood, setOriginNeighborhood] = useState('Centro');
  const [destinationNeighborhood, setDestinationNeighborhood] =
    useState('Coqueiro Rural');
  const [riderName, setRiderName] = useState('Lucas Ferreira (Motoboy #14)');
  const [weightKg, setWeightKg] = useState('2.5');
  const [distanceKm, setDistanceKm] = useState('4.2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedFee = Math.max(
    12,
    8.5 + (parseFloat(distanceKm) || 1) * 2.4 + (parseFloat(weightKg) || 1) * 1.1
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) {
      setError('Selecione ou informe a empresa solicitante.');
      return;
    }
    if (originNeighborhood === destinationNeighborhood) {
      setError(
        'O bairro de destino deve ser diferente do ponto de coleta inicial ou conter observação.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        companyName,
        originNeighborhood,
        destinationNeighborhood,
        riderName,
        weightKg: parseFloat(weightKg) || 1.5,
        distanceKm: parseFloat(distanceKm) || 3.2,
        feeBrl: Number(calculatedFee.toFixed(2)),
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao registrar coleta.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const neighborhoodOptions = MANHUACU_NEIGHBORHOODS.map((n) => ({
    value: n,
    label: `${n} (Manhuaçu - MG)`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Solicitação de Coleta Urbana — Manhuaçu - MG"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            isLoading={submitting}
            onClick={handleSave}
          >
            Confirmar Coleta ({formatCurrencyBRL(calculatedFee)})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Empresa Embarcadora (Tenant Atual)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ex.: Café das Montanhas Manhuaçu"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Bairro de Origem (Coleta)"
            value={originNeighborhood}
            onChange={(e) => setOriginNeighborhood(e.target.value)}
            options={neighborhoodOptions}
          />
          <Select
            label="Bairro de Destino (Entrega)"
            value={destinationNeighborhood}
            onChange={(e) => setDestinationNeighborhood(e.target.value)}
            options={neighborhoodOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Peso Estimado (kg)"
            type="number"
            step="0.1"
            min="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <Input
            label="Distância Estimada (km)"
            type="number"
            step="0.1"
            min="0.5"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />
        </div>

        <Input
          label="Motoboy / Operador Designado"
          value={riderName}
          onChange={(e) => setRiderName(e.target.value)}
          placeholder="Ex.: Lucas Ferreira"
        />

        <div className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--nex-muted)]">
              Tarifa Regional Calculada (Manhuaçu - MG):
            </span>
            <span className="text-base font-display font-bold text-[var(--nex-primary)] tabular-nums">
              {formatCurrencyBRL(calculatedFee)}
            </span>
          </div>
          <div className="pt-1.5 border-t border-[var(--nex-border)] flex items-center justify-between text-[11px] text-[var(--nex-muted)] tabular-nums">
            <span>
              Taxa NexColetas (20%):{' '}
              <strong>{formatCurrencyBRL(calculatedFee * 0.2)}</strong>
            </span>
            <span>
              Remuneração Estimada do Operador:{' '}
              <strong className="text-[var(--nex-primary)]">
                {formatCurrencyBRL(calculatedFee * 0.8)}
              </strong>
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
