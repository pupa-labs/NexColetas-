import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calculator,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  CommissionRuleItem,
  FinancialLedgerItem,
  NexPayOverviewResponse,
  PaymentMethodType,
  PixKeyType,
  RemunerationCalculationResult,
  WithdrawalRequestItem,
  WithdrawalStatus,
} from '../../../shared/types/index.ts';
import {
  brlToCents,
  centsToBrl,
  formatCentsBRL,
} from '../../../shared/nexpay/financialEngine.ts';
import { formatDateTimeBR } from '../../../shared/validators/smartData.ts';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';
import {
  createNexPayWithdrawalRequest,
  fetchNexPayOverview,
  previewNexPayRemunerationRequest,
  reverseNexPayLedgerEntryRequest,
  saveNexPayCommissionRuleRequest,
  settleNexPayDebtPixRequest,
  settleNexPayOperationRequest,
  updateNexPayWithdrawalStatusRequest,
} from '../../services/apiClient.ts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ResponsiveTable,
  Select,
  StatCard,
  Tabs,
} from '../../components/ui/DesignSystem.tsx';

interface NexPayAdminViewProps {
  onNotify?: (msg: string) => void;
}

const WITHDRAWAL_STATUS_LABELS: Record<
  WithdrawalStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' }
> = {
  requested: { label: 'Solicitado (Reserva Ativa)', variant: 'warning' },
  under_review: { label: 'Em Análise', variant: 'primary' },
  approved: { label: 'Aprovado', variant: 'primary' },
  processing: { label: 'Em Processamento', variant: 'warning' },
  paid: { label: 'Pago (Liquidado)', variant: 'success' },
  rejected: { label: 'Rejeitado (Estornado)', variant: 'danger' },
  cancelled: { label: 'Cancelado (Estornado)', variant: 'neutral' },
  failed: { label: 'Falhou (Estornado)', variant: 'danger' },
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
  OPERATION_EARNING: 'Remuneração de Operação',
  EARNING_RELEASE: 'Liberação de Saldo',
  PLATFORM_COMMISSION_CASH: 'Recebimento em Espécie (Comissão Devida)',
  CASH_COMMISSION_DEDUCTION: 'Desconto de Comissão em Saldo',
  DEBT_RECORDED: 'Registro de Saldo Devedor',
  DEBT_COMPENSATION: 'Compensação Automática de Dívida',
  DEBT_PIX_SETTLEMENT: 'Regularização de Dívida via PIX',
  WITHDRAWAL_RESERVE: 'Reserva para Saque PIX',
  WITHDRAWAL_PAID: 'Liquidação de Saque PIX',
  WITHDRAWAL_REFUND: 'Estorno de Reserva de Saque',
  REVERSAL_COMPENSATORY: 'Estorno Compensatório Auditado',
  INCENTIVE_BONUS: 'Bônus / Incentivo Operacional',
};

export const NexPayAdminView: React.FC<NexPayAdminViewProps> = ({ onNotify }) => {
  const { activeTenant, idToken } = useTenantAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [overview, setOverview] = useState<NexPayOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('ALL');

  // Modais de operação financeira
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleProtocol, setSettleProtocol] = useState('NX-2026-0510');
  const [settleOperatorId, setSettleOperatorId] = useState('OP-101');
  const [settlePaymentMethod, setSettlePaymentMethod] =
    useState<PaymentMethodType>('DIGITAL');
  const [settleGrossBrl, setSettleGrossBrl] = useState('62.50');
  const [settleDistanceKm, setSettleDistanceKm] = useState('4.2');
  const [settleWeightKg, setSettleWeightKg] = useState('2.0');
  const [settleRuleCode, setSettleRuleCode] = useState('RULE-STD-MANHUACU');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Modal de Solicitação de Saque PIX
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [wthOperatorId, setWthOperatorId] = useState('OP-101');
  const [wthAmountBrl, setWthAmountBrl] = useState('50.00');
  const [wthPixKeyType, setWthPixKeyType] = useState<PixKeyType>('CPF');
  const [wthPixKey, setWthPixKey] = useState('111.444.777-35');
  const [wthBeneficiary, setWthBeneficiary] = useState('Lucas Ferreira');
  const [wthSubmitting, setWthSubmitting] = useState(false);

  // Modal de Ação em Saque (Rejeição / Aprovação / Pagamento / Falha)
  const [reviewWithdrawal, setReviewWithdrawal] =
    useState<WithdrawalRequestItem | null>(null);
  const [reviewNextStatus, setReviewNextStatus] =
    useState<WithdrawalStatus>('approved');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewReceipt, setReviewReceipt] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Modal de Estorno Compensatório de Ledger
  const [reverseLedgerTarget, setReverseLedgerTarget] =
    useState<FinancialLedgerItem | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseSubmitting, setReverseSubmitting] = useState(false);

  // Modal de Regularização de Dívida via PIX
  const [debtPixModalOpen, setDebtPixModalOpen] = useState(false);
  const [debtPixOperatorId, setDebtPixOperatorId] = useState('OP-101');
  const [debtPixAmountBrl, setDebtPixAmountBrl] = useState('18.00');
  const [debtPixReference, setDebtPixReference] = useState('PIX-MANHUACU-9901');
  const [debtPixSubmitting, setDebtPixSubmitting] = useState(false);

  // Simulador de Remuneração & Editor de Regras
  const [simGrossBrl, setSimGrossBrl] = useState('50.00');
  const [simDistanceKm, setSimDistanceKm] = useState('4.0');
  const [simWeightKg, setSimWeightKg] = useState('2.0');
  const [simRuleCode, setSimRuleCode] = useState('RULE-STD-MANHUACU');
  const [simResult, setSimResult] =
    useState<RemunerationCalculationResult | null>(null);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleCodeInput, setRuleCodeInput] = useState('RULE-STD-MANHUACU');
  const [ruleNameInput, setRuleNameInput] = useState(
    'Padrão Urbano Manhuaçu (20% Plataforma)'
  );
  const [ruleCategoryInput, setRuleCategoryInput] =
    useState<CommissionRuleItem['serviceCategory']>('STANDARD');
  const [ruleRegionInput, setRuleRegionInput] = useState('Manhuaçu - MG');
  const [rulePercentInput, setRulePercentInput] = useState('20');
  const [ruleFixedFeeBrl, setRuleFixedFeeBrl] = useState('0.00');
  const [ruleOperatorBaseBrl, setRuleOperatorBaseBrl] = useState('0.00');
  const [rulePerKmBrl, setRulePerKmBrl] = useState('0.00');
  const [rulePerKgBrl, setRulePerKgBrl] = useState('0.00');
  const [ruleIncentiveBrl, setRuleIncentiveBrl] = useState('0.00');
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  const isAdmin =
    activeTenant.role === 'SUPER_ADMIN' || activeTenant.role === 'ADMIN';

  const requestCtx = {
    tenantId: activeTenant.tenantId,
    role: activeTenant.role,
    operatorId: activeTenant.operatorId,
    idToken,
  };

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const loadNexPayData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNexPayOverview(
        {
          tenantId: activeTenant.tenantId,
          role: activeTenant.role,
          operatorId: activeTenant.operatorId,
          idToken,
        },
        selectedOperatorFilter !== 'ALL' ? selectedOperatorFilter : undefined
      );
      setOverview(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Falha ao carregar dados do NexPay.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeTenant, idToken, selectedOperatorFilter]);

  useEffect(() => {
    loadNexPayData();
  }, [loadNexPayData]);

  const runRemunerationSimulation = useCallback(async () => {
    try {
      const res = await previewNexPayRemunerationRequest(
        {
          tenantId: activeTenant.tenantId,
          role: activeTenant.role,
          operatorId: activeTenant.operatorId,
          idToken,
        },
        {
          grossOperationAmountCents: brlToCents(simGrossBrl),
          distanceKm: parseFloat(simDistanceKm) || 3.5,
          weightKg: parseFloat(simWeightKg) || 1.5,
          ruleCode: simRuleCode,
        }
      );
      setSimResult(res);
    } catch {
      // ignora erro de digitação transitório
    }
  }, [
    activeTenant.operatorId,
    activeTenant.role,
    activeTenant.tenantId,
    idToken,
    simDistanceKm,
    simGrossBrl,
    simRuleCode,
    simWeightKg,
  ]);

  useEffect(() => {
    runRemunerationSimulation();
  }, [runRemunerationSimulation]);

  const handleSettleOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettleSubmitting(true);
    setError(null);
    try {
      const res = await settleNexPayOperationRequest(requestCtx, {
        operationId: settleProtocol.trim(),
        operatorId: settleOperatorId,
        paymentMethod: settlePaymentMethod,
        grossAmountCents: brlToCents(settleGrossBrl),
        distanceKm: parseFloat(settleDistanceKm) || 3.5,
        weightKg: parseFloat(settleWeightKg) || 1.5,
        ruleCode: settleRuleCode,
      });
      await loadNexPayData();
      setSettleModalOpen(false);
      setSettleProtocol(`NX-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      const compMsg =
        res.earning?.compensatedDebtCents > 0
          ? ` (Compensado: ${formatCentsBRL(res.earning.compensatedDebtCents)} · Liberado: ${formatCentsBRL(res.earning.releasedAmountCents)})`
          : '';
      notify(
        `Operação ${res.earning?.operationId} liquidada via ${settlePaymentMethod === 'CASH' ? 'Dinheiro (Espécie)' : 'Pagamento Digital'}${compMsg}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao liquidar operação.'
      );
    } finally {
      setSettleSubmitting(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWthSubmitting(true);
    setError(null);
    try {
      const res = await createNexPayWithdrawalRequest(requestCtx, {
        operatorId: wthOperatorId,
        amountCents: brlToCents(wthAmountBrl),
        pixKey: wthPixKey,
        pixKeyType: wthPixKeyType,
        beneficiaryName: wthBeneficiary,
      });
      await loadNexPayData();
      setWithdrawalModalOpen(false);
      notify(
        `Saque PIX ${res.withdrawal?.withdrawalCode} solicitado com reserva imediata de ${formatCentsBRL(res.withdrawal?.amountCents || 0)}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Falha ao solicitar saque PIX.'
      );
    } finally {
      setWthSubmitting(false);
    }
  };

  const handleTransitionWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewWithdrawal) return;
    setReviewSubmitting(true);
    setError(null);
    try {
      await updateNexPayWithdrawalStatusRequest(
        requestCtx,
        reviewWithdrawal.id,
        {
          nextStatus: reviewNextStatus,
          reasonOrNote: reviewReason,
          receiptCode: reviewReceipt || undefined,
        }
      );
      await loadNexPayData();
      setReviewWithdrawal(null);
      setReviewReason('');
      setReviewReceipt('');
      notify(
        `Status do saque ${reviewWithdrawal.withdrawalCode} atualizado para '${reviewNextStatus}'.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar status do saque.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReverseLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseLedgerTarget) return;
    setReverseSubmitting(true);
    setError(null);
    try {
      const res = await reverseNexPayLedgerEntryRequest(
        requestCtx,
        reverseLedgerTarget.id,
        reverseReason
      );
      await loadNexPayData();
      setReverseLedgerTarget(null);
      setReverseReason('');
      notify(
        `Estorno compensatório ${res.compensatoryEntry?.ledgerCode} registrado com sucesso.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao estornar lançamento.'
      );
    } finally {
      setReverseSubmitting(false);
    }
  };

  const handleSettleDebtPix = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtPixSubmitting(true);
    setError(null);
    try {
      const res = await settleNexPayDebtPixRequest(requestCtx, {
        operatorId: debtPixOperatorId,
        amountCents: brlToCents(debtPixAmountBrl),
        pixReceiptReference: debtPixReference,
      });
      await loadNexPayData();
      setDebtPixModalOpen(false);
      notify(
        `Saldo devedor regularizado via PIX (${formatCentsBRL(res.settledCents || 0)}).`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao regularizar saldo devedor.'
      );
    } finally {
      setDebtPixSubmitting(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleSubmitting(true);
    setError(null);
    try {
      const saved = await saveNexPayCommissionRuleRequest(requestCtx, {
        ruleCode: ruleCodeInput,
        name: ruleNameInput,
        serviceCategory: ruleCategoryInput,
        region: ruleRegionInput,
        isExpress: ruleCategoryInput === 'EXPRESS',
        platformPercentBps: Math.round((parseFloat(rulePercentInput) || 0) * 100),
        platformFixedFeeCents: brlToCents(ruleFixedFeeBrl),
        operatorFixedBaseCents: brlToCents(ruleOperatorBaseBrl),
        perKmRateCents: brlToCents(rulePerKmBrl),
        perKgRateCents: brlToCents(rulePerKgBrl),
        incentiveBonusCents: brlToCents(ruleIncentiveBrl),
        deductCashCommissionFromBalance: true,
      });
      await loadNexPayData();
      setRuleModalOpen(false);
      notify(`Regra de comissão ${saved.ruleCode} salva no NexPay.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao salvar regra de comissão.'
      );
    } finally {
      setRuleSubmitting(false);
    }
  };

  const metrics = overview?.metrics;
  const wallets = overview?.wallets || [];
  const ledger = overview?.ledger || [];
  const rules = overview?.rules || [];
  const earnings = overview?.earnings || [];
  const cashSettlements = overview?.cashSettlements || [];
  const debts = overview?.debts || [];
  const compensations = overview?.compensations || [];
  const withdrawals = overview?.withdrawals || [];
  const withdrawalEvents = overview?.withdrawalEvents || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional NexPay Financial Foundation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">NexPay Financial Foundation</Badge>
            <Badge variant={isAdmin ? 'success' : 'neutral'}>
              {isAdmin
                ? 'NexColetas Control · Acesso Administrativo'
                : `Escopo: ${activeTenant.role}`}
            </Badge>
            <Badge variant="neutral">Precisão em Centavos Inteiros (BRL)</Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text-primary)]">
            NexPay — Gestão Financeira, Ledger Imutável & Liquidação
          </h1>
          <p className="text-xs text-[var(--nex-text-secondary)]">
            Controle de carteiras de operadores, remuneração, comissões em espécie,
            compensação automática de saldo devedor e preparação de saques PIX em
            Manhuaçu - MG.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={loadNexPayData}
          >
            Atualizar Ledger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => setWithdrawalModalOpen(true)}
          >
            Solicitar Saque PIX
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setSettleModalOpen(true)}
          >
            Liquidar Operação (Digital / Cash)
          </Button>
        </div>
      </div>

      {/* Aviso Transparente sobre Preparação PIX sem PSP Fictício */}
      <div className="p-3.5 rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--nex-primary)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-[var(--nex-text-primary)]">
              Ledger Imutável, Reserva Atômica de Saldo e Preparação de Saques PIX
            </div>
            <p className="text-[var(--nex-text-secondary)]">
              Todos os lançamentos financeiros possuem chave de idempotência e
              trilha de auditoria no Cloud SQL. Solicitações de saque PIX reservam
              o saldo elegível imediatamente, mas não disparam transferências
              bancárias automáticas externas sem um PSP homologado.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <select
            aria-label="Filtrar por operador"
            value={selectedOperatorFilter}
            onChange={(e) => setSelectedOperatorFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--nex-surface-secondary)] text-[var(--nex-text-primary)] border border-[var(--nex-border)]"
          >
            <option value="ALL">Todos os Operadores (Visão Consolidada)</option>
            <option value="OP-101">OP-101 · Lucas Ferreira (Motoboy #14)</option>
            <option value="OP-102">OP-102 · Rafael Souza (Operador Regional)</option>
            <option value="OP-103">OP-103 · Carlos Mendes (Hub Leste MG)</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[var(--nex-danger)]/10 border border-[var(--nex-danger)]/30 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--nex-danger)]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* Navegação Interna do NexPay Control */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'dashboard', label: 'Dashboard Financeiro' },
          {
            id: 'operators_finance',
            label: 'Operators Finance (Carteiras)',
            count: wallets.length,
          },
          {
            id: 'ledger',
            label: 'Financial Ledger (Imutável)',
            count: ledger.length,
          },
          {
            id: 'cash_and_debts',
            label: 'Dinheiro & Compensação de Dívidas',
            count: debts.filter((d) => d.remainingDebtCents > 0).length,
          },
          {
            id: 'withdrawals',
            label: 'Saques PIX (Withdrawals)',
            count: withdrawals.length,
          },
          {
            id: 'rates_and_rules',
            label: 'Rates & Rules (Motor de Taxas)',
            count: rules.length,
          },
        ]}
      />

      {/* ABA 1: DASHBOARD FINANCEIRO (NEXPAY ADMIN) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 9 Indicadores Executivos Obrigatórios do NexPay Admin */}
          <section
            aria-label="Indicadores executivos do NexPay Admin"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <StatCard
              title="Total de ganhos dos operadores"
              value={formatCentsBRL(metrics?.totalOperatorEarningsCents || 0)}
              helper="Acumulado mensal líquido dos operadores"
              trendLabel="Manhuaçu - MG"
              trendTone="positive"
              icon={<Coins className="w-4 h-4" />}
            />
            <StatCard
              title="Saldo disponível"
              value={formatCentsBRL(metrics?.totalAvailableBalanceCents || 0)}
              helper="Saldo líquido elegível para saque PIX"
              trendLabel="Reserva verificada"
              trendTone="positive"
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard
              title="Valores aguardando liberação"
              value={formatCentsBRL(metrics?.totalPendingReleaseCents || 0)}
              helper="Operações em ciclo de conferência"
              trendLabel="Ciclo D+1"
              trendTone="neutral"
              icon={<RefreshCw className="w-4 h-4" />}
            />
            <StatCard
              title="Saldo devedor total"
              value={formatCentsBRL(metrics?.totalOperatorDebtCents || 0)}
              helper="Comissões pendentes de coletas em dinheiro"
              trendLabel={
                (metrics?.totalOperatorDebtCents || 0) > 0
                  ? 'Compensação ativa'
                  : 'Zero pendências'
              }
              trendTone={
                (metrics?.totalOperatorDebtCents || 0) > 0
                  ? 'warning'
                  : 'positive'
              }
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <StatCard
              title="Comissões NexColetas"
              value={formatCentsBRL(metrics?.totalPlatformCommissionsCents || 0)}
              helper="Receita líquida de intermediação da plataforma"
              trendLabel="Regra padrão 20%"
              trendTone="positive"
              icon={<Scale className="w-4 h-4" />}
            />
            <StatCard
              title="Saques solicitados"
              value={`${metrics?.withdrawalsRequestedCount || 0} (${formatCentsBRL(metrics?.withdrawalsRequestedCents || 0)})`}
              helper="Total histórico de solicitações PIX"
              trendLabel="Com reserva atômica"
              trendTone="neutral"
              icon={<ArrowUpRight className="w-4 h-4" />}
            />
            <StatCard
              title="Saques pendentes"
              value={`${metrics?.withdrawalsPendingCount || 0} (${formatCentsBRL(metrics?.withdrawalsPendingCents || 0)})`}
              helper="Aguardando aprovação ou processamento"
              trendLabel="Fila administrativa"
              trendTone="warning"
              icon={<FileSpreadsheet className="w-4 h-4" />}
            />
            <StatCard
              title="Saques pagos"
              value={`${metrics?.withdrawalsPaidCount || 0} (${formatCentsBRL(metrics?.withdrawalsPaidCents || 0)})`}
              helper="Saques PIX aprovados e liquidados"
              trendLabel="Com comprovante"
              trendTone="positive"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              title="Saques falhos / rejeitados"
              value={`${metrics?.withdrawalsFailedCount || 0} (${formatCentsBRL(metrics?.withdrawalsFailedCents || 0)})`}
              helper="Reserva devolvida via estorno compensatório"
              trendLabel="Saldo protegido"
              trendTone="neutral"
              icon={<RotateCcw className="w-4 h-4" />}
            />
          </section>

          {/* Resumo Rápido de Operações Liquidadas & Compensações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Últimas Operações Liquidadas (Operation Earnings)"
              subtitle="Cálculo automático de comissão NexColetas, compensação de dívida e saldo liberado"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSettleModalOpen(true)}
                >
                  Liquidar Operação
                </Button>
              }
            >
              {earnings.length === 0 ? (
                <EmptyState
                  title="Nenhuma operação liquidada neste filtro"
                  description="Clique em Liquidar Operação para registrar uma coleta paga via Digital ou Dinheiro."
                />
              ) : (
                <div className="space-y-3">
                  {earnings.slice(0, 5).map((e) => (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--nex-text-primary)]">
                            {e.operationId}
                          </span>
                          <Badge
                            variant={
                              e.paymentMethod === 'CASH' ? 'warning' : 'success'
                            }
                          >
                            {e.paymentMethod === 'CASH'
                              ? 'Dinheiro (Espécie)'
                              : 'Pagamento Digital'}
                          </Badge>
                        </div>
                        <div className="text-[var(--nex-text-secondary)]">
                          {e.operatorName} · Regra: {e.ruleCode}
                        </div>
                      </div>
                      <div className="text-right tabular-nums space-y-0.5">
                        <div className="font-bold text-[var(--nex-text-primary)]">
                          Bruto: {formatCentsBRL(e.grossAmountCents)} → Líquido:{' '}
                          <span className="text-[var(--nex-primary)]">
                            {formatCentsBRL(e.netEarningCents)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--nex-text-secondary)]">
                          Comissão: {formatCentsBRL(e.platformCommissionCents)}
                          {e.compensatedDebtCents > 0 && (
                            <span className="text-[var(--nex-warning)] font-semibold">
                              {' '}
                              · Compensado: -{formatCentsBRL(e.compensatedDebtCents)}{' '}
                              (Liberado: {formatCentsBRL(e.releasedAmountCents)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Demonstração Rápida: Compensação Automática (R$ 18,00 → R$ 50,00)"
              subtitle="Teste com 1 clique os cenários financeiros obrigatórios no banco Cloud SQL"
            >
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2">
                  <div className="font-semibold text-[var(--nex-text-primary)]">
                    Cenário 1 · Compensação Automática de Saldo Devedor
                  </div>
                  <p className="text-[var(--nex-text-secondary)]">
                    O operador <strong>Lucas Ferreira (OP-101)</strong> possui
                    saldo devedor de <strong>R$ 18,00</strong>. Ao concluir uma
                    próxima operação digital com ganho líquido de{' '}
                    <strong>R$ 50,00</strong> (Valor bruto R$ 62,50 com taxa de
                    20%), o NexPay compensa automaticamente{' '}
                    <strong>R$ 18,00</strong> e libera <strong>R$ 32,00</strong>{' '}
                    com dois lançamentos separados no ledger.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSettleProtocol(
                        `NX-2026-COMP-${Math.floor(100 + Math.random() * 899)}`
                      );
                      setSettleOperatorId('OP-101');
                      setSettlePaymentMethod('DIGITAL');
                      setSettleGrossBrl('62.50');
                      setSettleRuleCode('RULE-STD-MANHUACU');
                      setSettleModalOpen(true);
                    }}
                  >
                    Simular Ganho R$ 50,00 + Compensação R$ 18,00
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2">
                  <div className="font-semibold text-[var(--nex-text-primary)]">
                    Cenário 2 · Coleta Paga em Dinheiro (Cash) com Registro de Comissão
                  </div>
                  <p className="text-[var(--nex-text-secondary)]">
                    Quando o cliente paga R$ 50,00 em espécie diretamente ao
                    operador, o NexPay registra o recebimento em mãos, calcula a
                    comissão de 20% (<strong>R$ 10,00</strong>) e desconta do
                    saldo disponível ou gera saldo devedor quando não há saldo.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSettleProtocol(
                        `NX-2026-CASH-${Math.floor(100 + Math.random() * 899)}`
                      );
                      setSettleOperatorId('OP-103');
                      setSettlePaymentMethod('CASH');
                      setSettleGrossBrl('50.00');
                      setSettleRuleCode('RULE-STD-MANHUACU');
                      setSettleModalOpen(true);
                    }}
                  >
                    Registrar Coleta em Dinheiro (R$ 50,00)
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 2: OPERATORS FINANCE (CARTEIRAS DE OPERADORES) */}
      {activeTab === 'operators_finance' && (
        <Card
          title={`Carteiras Financeiras de Operadores (${wallets.length})`}
          subtitle="Isolamento por operador · Saldo disponível, valores a liberar, reserva de saque e saldo devedor"
        >
          <ResponsiveTable
            data={wallets}
            keyExtractor={(w) => w.operatorId}
            columns={[
              {
                key: 'operator',
                header: 'Operador / Chave PIX',
                render: (w) => (
                  <div>
                    <div className="font-semibold text-xs text-[var(--nex-text-primary)]">
                      {w.operatorName}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)] font-mono">
                      ID: {w.operatorId} · PIX ({w.pixKeyType}): {w.pixKey}
                    </div>
                  </div>
                ),
              },
              {
                key: 'available',
                header: 'Saldo Disponível',
                align: 'right',
                render: (w) => (
                  <div className="font-bold text-xs text-[var(--nex-primary)] tabular-nums">
                    {formatCentsBRL(w.availableBalanceCents)}
                  </div>
                ),
              },
              {
                key: 'pending',
                header: 'A Liberar / Reservado',
                align: 'right',
                render: (w) => (
                  <div className="text-xs tabular-nums">
                    <div>A liberar: {formatCentsBRL(w.pendingReleaseCents)}</div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Em saque: {formatCentsBRL(w.reservedWithdrawalCents)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'debt',
                header: 'Saldo Devedor',
                align: 'right',
                render: (w) => (
                  <div
                    className={`font-bold text-xs tabular-nums ${
                      w.debtBalanceCents > 0
                        ? 'text-[var(--nex-warning)]'
                        : 'text-[var(--nex-text-secondary)]'
                    }`}
                  >
                    {formatCentsBRL(w.debtBalanceCents)}
                  </div>
                ),
              },
              {
                key: 'earnings',
                header: 'Ganhos (Dia / Semana / Mês)',
                align: 'right',
                render: (w) => (
                  <div className="text-xs tabular-nums">
                    <div className="font-semibold text-[var(--nex-text-primary)]">
                      Hoje: {formatCentsBRL(w.todayEarningsCents)}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Sem: {formatCentsBRL(w.weekEarningsCents)} · Mês:{' '}
                      {formatCentsBRL(w.monthEarningsCents)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status Financeiro',
                render: (w) => (
                  <Badge
                    variant={
                      w.financialStatus === 'REGULAR' ? 'success' : 'warning'
                    }
                  >
                    {w.financialStatus === 'REGULAR'
                      ? 'Regular'
                      : 'Comissão Pendente'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Ações Rápidas',
                align: 'right',
                render: (w) => (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWthOperatorId(w.operatorId);
                        setWthPixKey(w.pixKey);
                        setWthPixKeyType(w.pixKeyType);
                        setWthBeneficiary(w.operatorName);
                        setWithdrawalModalOpen(true);
                      }}
                    >
                      Saque PIX
                    </Button>
                    {w.debtBalanceCents > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDebtPixOperatorId(w.operatorId);
                          setDebtPixAmountBrl(
                            centsToBrl(w.debtBalanceCents).toFixed(2)
                          );
                          setDebtPixModalOpen(true);
                        }}
                      >
                        Quitar Dívida
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ABA 3: FINANCIAL LEDGER IMUTÁVEL */}
      {activeTab === 'ledger' && (
        <Card
          title={`Financial Ledger Imutável (${ledger.length} lançamentos)`}
          subtitle="Proibida a exclusão de registros · Correções ocorrem exclusivamente por estorno ou lançamento compensatório"
        >
          <ResponsiveTable
            data={ledger}
            keyExtractor={(l) => l.id}
            columns={[
              {
                key: 'code',
                header: 'Identificador / Data',
                render: (l) => (
                  <div>
                    <div className="font-mono font-bold text-xs text-[var(--nex-text-primary)]">
                      {l.ledgerCode}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)] tabular-nums">
                      {formatDateTimeBR(l.createdAt)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'operator',
                header: 'Operador / Origem',
                render: (l) => (
                  <div>
                    <div className="font-semibold text-xs text-[var(--nex-text-primary)]">
                      {l.operatorName}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)] font-mono">
                      Ref: {l.originReference} · Autor: {l.actor}
                    </div>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Tipo / Descrição',
                render: (l) => (
                  <div className="max-w-md">
                    <div className="font-semibold text-xs text-[var(--nex-text-primary)]">
                      {LEDGER_TYPE_LABELS[l.entryType] || l.entryType}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      {l.description}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--nex-text-secondary)] opacity-75">
                      Idempotency: {l.idempotencyKey}
                    </div>
                  </div>
                ),
              },
              {
                key: 'direction',
                header: 'Natureza / Valor',
                align: 'right',
                render: (l) => (
                  <div className="tabular-nums">
                    <div
                      className={`font-bold text-xs flex items-center justify-end gap-1 ${
                        l.direction === 'CREDIT'
                          ? 'text-[var(--nex-success)]'
                          : 'text-[var(--nex-danger)]'
                      }`}
                    >
                      {l.direction === 'CREDIT' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {l.direction === 'CREDIT' ? '+' : '-'}
                        {formatCentsBRL(l.amountCents)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Saldo após: {formatCentsBRL(l.balanceAfterCents)} · Dívida:{' '}
                      {formatCentsBRL(l.debtAfterCents)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (l) => (
                  <Badge
                    variant={
                      l.status === 'POSTED'
                        ? 'success'
                        : l.status === 'REVERSED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {l.status === 'POSTED'
                      ? 'Confirmado'
                      : l.status === 'REVERSED'
                        ? 'Estornado'
                        : 'Aguardando'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Auditoria',
                align: 'right',
                render: (l) =>
                  l.status === 'POSTED' &&
                  l.entryType !== 'REVERSAL_COMPENSATORY' &&
                  isAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => setReverseLedgerTarget(l)}
                    >
                      Estornar
                    </Button>
                  ) : (
                    <span className="text-[11px] text-[var(--nex-text-secondary)] flex items-center justify-end gap-1">
                      <Lock className="w-3 h-3" /> Imutável
                    </span>
                  ),
              },
            ]}
          />
        </Card>
      )}

      {/* ABA 4: PAGAMENTO EM DINHEIRO & COMPENSAÇÃO DE SALDO DEVEDOR */}
      {activeTab === 'cash_and_debts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title={`Saldos Devedores de Operadores (${debts.length})`}
              subtitle="Comissões NexColetas pendentes geradas em operações pagas em dinheiro"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDebtPixModalOpen(true)}
                >
                  Regularizar via PIX
                </Button>
              }
            >
              {debts.length === 0 ? (
                <EmptyState
                  title="Nenhum saldo devedor registrado"
                  description="Todos os operadores estão regulares com as comissões da plataforma."
                />
              ) : (
                <div className="space-y-3">
                  {debts.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--nex-text-primary)]">
                          {d.operatorName} ({d.operatorId})
                        </span>
                        <Badge
                          variant={
                            d.status === 'SETTLED'
                              ? 'success'
                              : d.status === 'PARTIALLY_PAID'
                                ? 'primary'
                                : 'warning'
                          }
                        >
                          {d.status === 'SETTLED'
                            ? 'Quitado'
                            : d.status === 'PARTIALLY_PAID'
                              ? 'Parcialmente Compensado'
                              : 'Em Aberto'}
                        </Badge>
                      </div>
                      <p className="text-[var(--nex-text-secondary)]">
                        {d.reason}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--nex-border)] tabular-nums">
                        <span>
                          Original: {formatCentsBRL(d.originalDebtCents)}
                        </span>
                        <span className="font-bold text-[var(--nex-warning)]">
                          Restante: {formatCentsBRL(d.remainingDebtCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title={`Histórico de Compensações Automáticas (${compensations.length})`}
              subtitle="Descontos automáticos de saldo devedor sobre novos ganhos digitais"
            >
              {compensations.length === 0 ? (
                <EmptyState
                  title="Nenhuma compensação automática executada ainda"
                  description="Liquide uma operação digital para um operador com saldo devedor (ex.: Lucas Ferreira OP-101) para ver a compensação automática em ação."
                  actionLabel="Simular Compensação (OP-101)"
                  onAction={() => {
                    setSettleOperatorId('OP-101');
                    setSettlePaymentMethod('DIGITAL');
                    setSettleGrossBrl('62.50');
                    setSettleModalOpen(true);
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {compensations.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[var(--nex-text-primary)]">
                        <span>
                          Operação {c.sourceOperationId} · {c.operatorName}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--nex-text-secondary)]">
                          Dívida #{c.debtId}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
                        <div>
                          <div className="text-[11px] text-[var(--nex-text-secondary)]">
                            Ganho Líquido
                          </div>
                          <div className="font-bold">
                            {formatCentsBRL(c.grossEarningCents)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[var(--nex-text-secondary)]">
                            Compensado
                          </div>
                          <div className="font-bold text-[var(--nex-warning)]">
                            -{formatCentsBRL(c.compensatedCents)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[var(--nex-text-secondary)]">
                            Saldo Liberado
                          </div>
                          <div className="font-bold text-[var(--nex-success)]">
                            {formatCentsBRL(c.netReleasedCents)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card
            title={`Liquidações de Coletas Pagas em Dinheiro (${cashSettlements.length})`}
            subtitle="Registro de valor recebido em espécie pelo operador, comissão NexColetas e retenção"
          >
            <ResponsiveTable
              data={cashSettlements}
              keyExtractor={(c) => c.id}
              columns={[
                {
                  key: 'op',
                  header: 'Operação / Operador',
                  render: (c) => (
                    <div>
                      <div className="font-mono font-bold text-xs text-[var(--nex-text-primary)]">
                        {c.operationId}
                      </div>
                      <div className="text-[11px] text-[var(--nex-text-secondary)]">
                        {c.operatorName} ({c.operatorId})
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'collected',
                  header: 'Recebido em Espécie',
                  align: 'right',
                  render: (c) => (
                    <span className="font-bold text-xs tabular-nums">
                      {formatCentsBRL(c.cashCollectedCents)}
                    </span>
                  ),
                },
                {
                  key: 'commission',
                  header: 'Comissão NexColetas',
                  align: 'right',
                  render: (c) => (
                    <span className="font-semibold text-xs text-[var(--nex-primary)] tabular-nums">
                      {formatCentsBRL(c.platformCommissionCents)}
                    </span>
                  ),
                },
                {
                  key: 'deducted',
                  header: 'Descontado do Saldo',
                  align: 'right',
                  render: (c) => (
                    <span className="text-xs tabular-nums">
                      {formatCentsBRL(c.deductedFromBalanceCents)}
                    </span>
                  ),
                },
                {
                  key: 'debt',
                  header: 'Saldo Devedor Gerado',
                  align: 'right',
                  render: (c) => (
                    <span className="font-bold text-xs text-[var(--nex-warning)] tabular-nums">
                      {formatCentsBRL(c.remainingDebtCents)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Liquidação',
                  render: (c) => (
                    <Badge
                      variant={
                        c.settlementStatus === 'DEDUCTED_FROM_WALLET'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {c.settlementStatus === 'DEDUCTED_FROM_WALLET'
                        ? 'Descontado da Carteira'
                        : 'Registrado em Saldo Devedor'}
                    </Badge>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ABA 5: SAQUES PIX (WITHDRAWALS — PREPARAÇÃO COM RESERVA DE SALDO) */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          <Card
            title={`Solicitações de Saque PIX (${withdrawals.length})`}
            subtitle="Reserva preventiva de saldo na solicitação · Devolução automática via lançamento compensatório em caso de falha, cancelamento ou rejeição"
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setWithdrawalModalOpen(true)}
              >
                Nova Solicitação PIX
              </Button>
            }
          >
            <ResponsiveTable
              data={withdrawals}
              keyExtractor={(w) => w.id}
              columns={[
                {
                  key: 'code',
                  header: 'Código / Data',
                  render: (w) => (
                    <div>
                      <div className="font-mono font-bold text-xs text-[var(--nex-text-primary)]">
                        {w.withdrawalCode}
                      </div>
                      <div className="text-[11px] text-[var(--nex-text-secondary)] tabular-nums">
                        {formatDateTimeBR(w.requestedAt)}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'operator',
                  header: 'Beneficiário / Operador',
                  render: (w) => (
                    <div>
                      <div className="font-semibold text-xs text-[var(--nex-text-primary)]">
                        {w.beneficiaryName}
                      </div>
                      <div className="text-[11px] text-[var(--nex-text-secondary)]">
                        {w.operatorName} ({w.operatorId})
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'pix',
                  header: 'Chave PIX',
                  render: (w) => (
                    <div className="text-xs font-mono">
                      <Badge variant="neutral">{w.pixKeyType}</Badge>{' '}
                      <span>{w.pixKey}</span>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Valor Reservado',
                  align: 'right',
                  render: (w) => (
                    <div className="font-bold text-xs text-[var(--nex-text-primary)] tabular-nums">
                      {formatCentsBRL(w.amountCents)}
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status / Comprovante',
                  render: (w) => {
                    const st = WITHDRAWAL_STATUS_LABELS[w.status] || {
                      label: w.status,
                      variant: 'neutral' as const,
                    };
                    return (
                      <div className="space-y-1">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {w.rejectionReason && (
                          <div className="text-[11px] text-[var(--nex-danger)]">
                            Motivo: {w.rejectionReason}
                          </div>
                        )}
                        {w.receiptCode && (
                          <div className="text-[11px] font-mono text-[var(--nex-success)]">
                            Comprovante: {w.receiptCode}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Controle Administrativo',
                  align: 'right',
                  render: (w) => {
                    const isTerminal = [
                      'paid',
                      'rejected',
                      'cancelled',
                      'failed',
                    ].includes(w.status);
                    if (isTerminal) {
                      return (
                        <span className="text-[11px] text-[var(--nex-text-secondary)]">
                          Finalizado
                        </span>
                      );
                    }
                    return (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {isAdmin && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setReviewWithdrawal(w);
                                setReviewNextStatus('paid');
                                setReviewReceipt(`PIX-COMP-${w.withdrawalCode}`);
                              }}
                            >
                              Aprovar / Pagar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setReviewWithdrawal(w);
                                setReviewNextStatus('rejected');
                              }}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {(w.status === 'requested' ||
                          w.status === 'under_review') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReviewWithdrawal(w);
                              setReviewNextStatus('cancelled');
                              setReviewReason('Cancelado a pedido do titular');
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          </Card>

          <Card
            title={`Trilha de Auditoria de Saques PIX (${withdrawalEvents.length} eventos)`}
            subtitle="Histórico cronológico de transições de status e estornos de reserva"
          >
            <div className="space-y-2.5">
              {withdrawalEvents.slice(0, 8).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-[var(--nex-text-primary)]">
                      {ev.withdrawalCode}
                    </span>{' '}
                    · <span className="font-semibold">{ev.fromStatus}</span> →{' '}
                    <span className="font-semibold text-[var(--nex-primary)]">
                      {ev.toStatus}
                    </span>
                    <p className="text-[11px] text-[var(--nex-text-secondary)]">
                      {ev.note}
                    </p>
                  </div>
                  <div className="text-[11px] text-[var(--nex-text-secondary)] tabular-nums">
                    Autor: {ev.actor} · {formatDateTimeBR(ev.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 6: RATES & RULES (MOTOR DE CÁLCULO DE REMUNERAÇÃO E COMISSÃO) */}
      {activeTab === 'rates_and_rules' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Simulador Interativo de Remuneração */}
            <div className="lg:col-span-5">
              <Card
                title="Simulador de Remuneração Estimada"
                subtitle="Cálculo em centavos inteiros antes do aceite da operação"
              >
                <div className="space-y-4">
                  <Select
                    label="Regra de Contrato / Região"
                    value={simRuleCode}
                    onChange={(e) => setSimRuleCode(e.target.value)}
                    options={rules.map((r) => ({
                      value: r.ruleCode,
                      label: `${r.name} (${(r.platformPercentBps / 100).toFixed(1)}%)`,
                    }))}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Valor da Operação (R$)"
                      type="number"
                      step="0.50"
                      value={simGrossBrl}
                      onChange={(e) => setSimGrossBrl(e.target.value)}
                    />
                    <Input
                      label="Distância (km)"
                      type="number"
                      step="0.5"
                      value={simDistanceKm}
                      onChange={(e) => setSimDistanceKm(e.target.value)}
                    />
                    <Input
                      label="Peso (kg)"
                      type="number"
                      step="0.5"
                      value={simWeightKg}
                      onChange={(e) => setSimWeightKg(e.target.value)}
                    />
                  </div>

                  {simResult && (
                    <div className="p-4 rounded-xl bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--nex-text-secondary)]">
                          Valor Bruto da Operação:
                        </span>
                        <span className="font-bold text-[var(--nex-text-primary)] tabular-nums">
                          {formatCentsBRL(simResult.grossOperationAmountCents)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--nex-text-secondary)]">
                          Taxa NexColetas ({simResult.platformPercentApplied}%):
                        </span>
                        <span className="font-semibold text-[var(--nex-danger)] tabular-nums">
                          -{formatCentsBRL(simResult.platformCommissionCents)}
                        </span>
                      </div>
                      {(simResult.distanceBonusCents > 0 ||
                        simResult.weightBonusCents > 0 ||
                        simResult.incentiveBonusCents > 0) && (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--nex-text-secondary)]">
                            Adicionais (Km / Peso / Incentivo):
                          </span>
                          <span className="font-semibold text-[var(--nex-success)] tabular-nums">
                            +
                            {formatCentsBRL(
                              simResult.distanceBonusCents +
                                simResult.weightBonusCents +
                                simResult.incentiveBonusCents
                            )}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[var(--nex-border)] flex items-center justify-between">
                        <span className="font-bold text-[var(--nex-text-primary)]">
                          Remuneração Líquida do Operador:
                        </span>
                        <span className="text-base font-display font-bold text-[var(--nex-primary)] tabular-nums">
                          {formatCentsBRL(simResult.netOperatorEarningCents)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Tabela de Regras Configuradas */}
            <div className="lg:col-span-7">
              <Card
                title={`Regras de Comissão & Remuneração (${rules.length})`}
                subtitle="Configuração protegida por permissão administrativa NexColetas Control"
                action={
                  isAdmin ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Settings2 className="w-4 h-4" />}
                      onClick={() => setRuleModalOpen(true)}
                    >
                      Configurar Regra
                    </Button>
                  ) : (
                    <Badge variant="neutral">Somente Leitura (Exige Admin)</Badge>
                  )
                }
              >
                <div className="space-y-3">
                  {rules.map((r) => (
                    <div
                      key={r.ruleCode}
                      className="p-4 rounded-xl bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-[var(--nex-primary)]">
                            {r.ruleCode}
                          </span>{' '}
                          ·{' '}
                          <span className="font-semibold text-[var(--nex-text-primary)]">
                            {r.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="primary">{r.serviceCategory}</Badge>
                          <Badge variant="success">
                            {(r.platformPercentBps / 100).toFixed(1)}% Comissão
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[var(--nex-text-secondary)] tabular-nums">
                        <div>
                          Taxa Fixa:{' '}
                          <strong className="text-[var(--nex-text-primary)]">
                            {formatCentsBRL(r.platformFixedFeeCents)}
                          </strong>
                        </div>
                        <div>
                          Base Operador:{' '}
                          <strong className="text-[var(--nex-text-primary)]">
                            {formatCentsBRL(r.operatorFixedBaseCents)}
                          </strong>
                        </div>
                        <div>
                          Valor/Km:{' '}
                          <strong className="text-[var(--nex-text-primary)]">
                            {formatCentsBRL(r.perKmRateCents)}
                          </strong>
                        </div>
                        <div>
                          Incentivo:{' '}
                          <strong className="text-[var(--nex-text-primary)]">
                            {formatCentsBRL(r.incentiveBonusCents)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: LIQUIDAR OPERAÇÃO (DIGITAL OU DINHEIRO / COMPENSAÇÃO AUTOMÁTICA) */}
      <Modal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        title="Liquidar Operação Concluída — NexPay Settlement Engine"
        footer={
          <>
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={settleSubmitting}
              onClick={handleSettleOperation}
            >
              Confirmar Liquidação no Ledger
            </Button>
          </>
        }
      >
        <form onSubmit={handleSettleOperation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Protocolo da Operação"
              value={settleProtocol}
              onChange={(e) => setSettleProtocol(e.target.value)}
              required
            />
            <Select
              label="Operador Responsável"
              value={settleOperatorId}
              onChange={(e) => setSettleOperatorId(e.target.value)}
              options={[
                {
                  value: 'OP-101',
                  label: 'OP-101 · Lucas Ferreira (Dívida R$ 18,00)',
                },
                {
                  value: 'OP-102',
                  label: 'OP-102 · Rafael Souza (Saldo R$ 285,00)',
                },
                {
                  value: 'OP-103',
                  label: 'OP-103 · Carlos Mendes (Saldo R$ 0,00)',
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Modalidade de Pagamento"
              value={settlePaymentMethod}
              onChange={(e) =>
                setSettlePaymentMethod(e.target.value as PaymentMethodType)
              }
              options={[
                {
                  value: 'DIGITAL',
                  label: 'Pagamento Digital (Gera Crédito + Compensa Dívida)',
                },
                {
                  value: 'CASH',
                  label: 'Pagamento em Dinheiro / Espécie (Cobra Comissão)',
                },
              ]}
            />
            <Select
              label="Regra de Comissão Aplicada"
              value={settleRuleCode}
              onChange={(e) => setSettleRuleCode(e.target.value)}
              options={rules.map((r) => ({
                value: r.ruleCode,
                label: r.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Valor Bruto (R$)"
              type="number"
              step="0.50"
              value={settleGrossBrl}
              onChange={(e) => setSettleGrossBrl(e.target.value)}
              required
            />
            <Input
              label="Distância (km)"
              type="number"
              step="0.5"
              value={settleDistanceKm}
              onChange={(e) => setSettleDistanceKm(e.target.value)}
            />
            <Input
              label="Peso (kg)"
              type="number"
              step="0.5"
              value={settleWeightKg}
              onChange={(e) => setSettleWeightKg(e.target.value)}
            />
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] text-xs space-y-1">
            <div className="font-semibold text-[var(--nex-text-primary)]">
              Resumo da Liquidação (Cálculo Server-Side em Centavos):
            </div>
            <p className="text-[var(--nex-text-secondary)]">
              {settlePaymentMethod === 'DIGITAL'
                ? 'O operador receberá a remuneração líquida. Caso possua saldo devedor aberto, o NexPay compensará automaticamente e liberará o saldo restante.'
                : 'O operador reteve o valor integral em espécie. O NexPay calculará a comissão da plataforma e descontará do saldo disponível ou registrará saldo devedor.'}
            </p>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: SOLICITAÇÃO DE SAQUE PIX COM RESERVA DE SALDO */}
      <Modal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        title="Solicitar Saque PIX (Com Reserva Imediata de Saldo)"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setWithdrawalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={wthSubmitting}
              onClick={handleCreateWithdrawal}
            >
              Reservar Saldo e Solicitar Saque
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWithdrawal} className="space-y-4">
          <Select
            label="Carteira do Operador"
            value={wthOperatorId}
            onChange={(e) => {
              const opId = e.target.value;
              setWthOperatorId(opId);
              const found = wallets.find((w) => w.operatorId === opId);
              if (found) {
                setWthPixKey(found.pixKey);
                setWthPixKeyType(found.pixKeyType);
                setWthBeneficiary(found.operatorName);
              }
            }}
            options={wallets.map((w) => ({
              value: w.operatorId,
              label: `${w.operatorName} — Disponível: ${formatCentsBRL(w.availableBalanceCents)}`,
            }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Valor do Saque (R$)"
              type="number"
              step="1.00"
              min="10"
              value={wthAmountBrl}
              onChange={(e) => setWthAmountBrl(e.target.value)}
              required
            />
            <Select
              label="Tipo de Chave PIX"
              value={wthPixKeyType}
              onChange={(e) => setWthPixKeyType(e.target.value as PixKeyType)}
              options={[
                { value: 'CPF', label: 'CPF' },
                { value: 'CNPJ', label: 'CNPJ' },
                { value: 'EMAIL', label: 'E-mail' },
                { value: 'PHONE', label: 'Telefone Celular' },
                { value: 'EVP', label: 'Chave Aleatória (EVP)' },
              ]}
            />
          </div>

          <Input
            label="Chave PIX de Destino"
            value={wthPixKey}
            onChange={(e) => setWthPixKey(e.target.value)}
            required
          />

          <Input
            label="Nome do Beneficiário"
            value={wthBeneficiary}
            onChange={(e) => setWthBeneficiary(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* MODAL 3: REVISÃO / TRANSIÇÃO DE STATUS DE SAQUE PIX */}
      <Modal
        isOpen={Boolean(reviewWithdrawal)}
        onClose={() => setReviewWithdrawal(null)}
        title={`Gerenciar Saque PIX #${reviewWithdrawal?.withdrawalCode || ''}`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setReviewWithdrawal(null)}
            >
              Fechar
            </Button>
            <Button
              variant={
                ['rejected', 'failed', 'cancelled'].includes(reviewNextStatus)
                  ? 'danger'
                  : 'primary'
              }
              isLoading={reviewSubmitting}
              onClick={handleTransitionWithdrawal}
            >
              Confirmar Status ({reviewNextStatus})
            </Button>
          </>
        }
      >
        <form onSubmit={handleTransitionWithdrawal} className="space-y-4">
          <Select
            label="Novo Status do Saque PIX"
            value={reviewNextStatus}
            onChange={(e) =>
              setReviewNextStatus(e.target.value as WithdrawalStatus)
            }
            options={
              isAdmin
                ? [
                    { value: 'under_review', label: 'Em Análise (under_review)' },
                    { value: 'approved', label: 'Aprovado (approved)' },
                    { value: 'processing', label: 'Em Processamento (processing)' },
                    {
                      value: 'paid',
                      label: 'Pago / Liquidado com Comprovante (paid)',
                    },
                    {
                      value: 'rejected',
                      label: 'Rejeitado — Devolver Reserva ao Saldo (rejected)',
                    },
                    {
                      value: 'failed',
                      label: 'Falhou — Devolver Reserva ao Saldo (failed)',
                    },
                    {
                      value: 'cancelled',
                      label: 'Cancelado — Devolver Reserva ao Saldo (cancelled)',
                    },
                  ]
                : [
                    {
                      value: 'cancelled',
                      label: 'Cancelar Solicitação e Devolver Reserva (cancelled)',
                    },
                  ]
            }
          />

          {reviewNextStatus === 'paid' && (
            <Input
              label="Código do Comprovante Administrativo"
              value={reviewReceipt}
              onChange={(e) => setReviewReceipt(e.target.value)}
              placeholder="Ex.: PIX-MANUAL-2026-0001"
            />
          )}

          <Input
            label={
              reviewNextStatus === 'rejected'
                ? 'Motivo Obrigatório da Rejeição'
                : 'Observação de Auditoria'
            }
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            placeholder="Descreva o motivo ou nota de auditoria..."
            required={reviewNextStatus === 'rejected'}
          />
        </form>
      </Modal>

      {/* MODAL 4: ESTORNO COMPENSATÓRIO DE LANÇAMENTO DO LEDGER */}
      <Modal
        isOpen={Boolean(reverseLedgerTarget)}
        onClose={() => setReverseLedgerTarget(null)}
        title={`Estorno Compensatório — ${reverseLedgerTarget?.ledgerCode || ''}`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setReverseLedgerTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={reverseSubmitting}
              onClick={handleReverseLedger}
            >
              Emitir Lançamento Compensatório
            </Button>
          </>
        }
      >
        <form onSubmit={handleReverseLedger} className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] text-xs space-y-1">
            <div className="font-semibold text-[var(--nex-text-primary)]">
              Lançamento Original: {reverseLedgerTarget?.ledgerCode} (
              {formatCentsBRL(reverseLedgerTarget?.amountCents || 0)})
            </div>
            <p className="text-[var(--nex-text-secondary)]">
              O lançamento original permanecerá preservado no banco de dados com
              status <strong>REVERSED</strong> e um novo lançamento inverso (
              <strong>REVERSAL_COMPENSATORY</strong>) será gravado no ledger.
            </p>
          </div>
          <Input
            label="Justificativa Obrigatória de Auditoria"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="Ex.: Correção de valor divergente no romaneio de entrega"
            required
          />
        </form>
      </Modal>

      {/* MODAL 5: REGULARIZAÇÃO DE SALDO DEVEDOR VIA PIX */}
      <Modal
        isOpen={debtPixModalOpen}
        onClose={() => setDebtPixModalOpen(false)}
        title="Regularização de Saldo Devedor via PIX"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDebtPixModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={debtPixSubmitting}
              onClick={handleSettleDebtPix}
            >
              Confirmar Regularização no Ledger
            </Button>
          </>
        }
      >
        <form onSubmit={handleSettleDebtPix} className="space-y-4">
          <Select
            label="Operador com Saldo Devedor"
            value={debtPixOperatorId}
            onChange={(e) => setDebtPixOperatorId(e.target.value)}
            options={wallets.map((w) => ({
              value: w.operatorId,
              label: `${w.operatorName} — Dívida: ${formatCentsBRL(w.debtBalanceCents)}`,
            }))}
          />
          <Input
            label="Valor a Regularizar (R$)"
            type="number"
            step="0.50"
            value={debtPixAmountBrl}
            onChange={(e) => setDebtPixAmountBrl(e.target.value)}
            required
          />
          <Input
            label="Referência / Comprovante PIX"
            value={debtPixReference}
            onChange={(e) => setDebtPixReference(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* MODAL 6: CONFIGURAÇÃO DE REGRA DE COMISSÃO (ADMIN) */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="Configurar Regra de Comissão & Remuneração (NexPay Rules)"
        footer={
          <>
            <Button variant="outline" onClick={() => setRuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={ruleSubmitting}
              onClick={handleSaveRule}
            >
              Salvar Regra de Comissão
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código da Regra"
              value={ruleCodeInput}
              onChange={(e) => setRuleCodeInput(e.target.value)}
              required
            />
            <Select
              label="Categoria de Serviço"
              value={ruleCategoryInput}
              onChange={(e) =>
                setRuleCategoryInput(
                  e.target.value as CommissionRuleItem['serviceCategory']
                )
              }
              options={[
                { value: 'STANDARD', label: 'STANDARD (Urbano Padrão)' },
                { value: 'EXPRESS', label: 'EXPRESS (Modalidade Expressa)' },
                { value: 'CARGO', label: 'CARGO (Volume / Peso)' },
                { value: 'CONTRACT', label: 'CONTRACT (Contrato B2B)' },
              ]}
            />
          </div>
          <Input
            label="Nome da Regra"
            value={ruleNameInput}
            onChange={(e) => setRuleNameInput(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input
              label="Comissão NexColetas (%)"
              type="number"
              step="0.5"
              value={rulePercentInput}
              onChange={(e) => setRulePercentInput(e.target.value)}
              required
            />
            <Input
              label="Taxa Fixa Plataforma (R$)"
              type="number"
              step="0.50"
              value={ruleFixedFeeBrl}
              onChange={(e) => setRuleFixedFeeBrl(e.target.value)}
            />
            <Input
              label="Base Fixa Operador (R$)"
              type="number"
              step="0.50"
              value={ruleOperatorBaseBrl}
              onChange={(e) => setRuleOperatorBaseBrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Adicional / Km (R$)"
              type="number"
              step="0.20"
              value={rulePerKmBrl}
              onChange={(e) => setRulePerKmBrl(e.target.value)}
            />
            <Input
              label="Adicional / Kg (R$)"
              type="number"
              step="0.20"
              value={rulePerKgBrl}
              onChange={(e) => setRulePerKgBrl(e.target.value)}
            />
            <Input
              label="Incentivo / Bônus (R$)"
              type="number"
              step="0.50"
              value={ruleIncentiveBrl}
              onChange={(e) => setRuleIncentiveBrl(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
