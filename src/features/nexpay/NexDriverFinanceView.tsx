import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Coins,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  NexPayOverviewResponse,
  PaymentMethodType,
  PixKeyType,
  RemunerationCalculationResult,
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
  Select,
  StatCard,
  Tabs,
} from '../../components/ui/DesignSystem.tsx';

interface NexDriverFinanceViewProps {
  onNotify?: (msg: string) => void;
}

export const NexDriverFinanceView: React.FC<NexDriverFinanceViewProps> = ({
  onNotify,
}) => {
  const { activeTenant, idToken } = useTenantAuth();
  const isStrictOperator =
    activeTenant.role === 'OPERATOR' || activeTenant.role === 'RIDER';
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    activeTenant.operatorId || 'OP-101'
  );
  const [activeSection, setActiveSection] = useState<string>('wallet');
  const [overview, setOverview] = useState<NexPayOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulador "Antes de Aceitar Operação"
  const [offerProtocol, setOfferProtocol] = useState('NX-2026-0812');
  const [offerGrossBrl, setOfferGrossBrl] = useState('50.00');
  const [offerDistanceKm, setOfferDistanceKm] = useState('4.5');
  const [offerPaymentMethod, setOfferPaymentMethod] =
    useState<PaymentMethodType>('DIGITAL');
  const [offerEstimate, setOfferEstimate] =
    useState<RemunerationCalculationResult | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);

  // Modal de Saque PIX do Operador
  const [wthModalOpen, setWthModalOpen] = useState(false);
  const [wthAmountBrl, setWthAmountBrl] = useState('40.00');
  const [wthPixKeyType, setWthPixKeyType] = useState<PixKeyType>('CPF');
  const [wthPixKey, setWthPixKey] = useState('111.444.777-35');
  const [wthSubmitting, setWthSubmitting] = useState(false);

  // Modal de Regularização de Taxas Pendentes por PIX
  const [regularizeModalOpen, setRegularizeModalOpen] = useState(false);
  const [regAmountBrl, setRegAmountBrl] = useState('18.00');
  const [regPixRef, setRegPixRef] = useState('PIX-DRIVER-2026-881');
  const [regSubmitting, setRegSubmitting] = useState(false);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const requestCtx = {
    tenantId: activeTenant.tenantId,
    role: activeTenant.role,
    operatorId: isStrictOperator
      ? activeTenant.operatorId || 'OP-101'
      : selectedOperatorId,
    idToken,
  };

  const loadOperatorFinance = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchNexPayOverview(
        {
          tenantId: activeTenant.tenantId,
          role: activeTenant.role,
          operatorId: isStrictOperator
            ? activeTenant.operatorId || 'OP-101'
            : selectedOperatorId,
          idToken,
        },
        selectedOperatorId
      );
      setOverview(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar carteira NexDriver.'
      );
    }
  }, [activeTenant, idToken, isStrictOperator, selectedOperatorId]);

  useEffect(() => {
    loadOperatorFinance();
  }, [loadOperatorFinance]);

  useEffect(() => {
    let active = true;
    previewNexPayRemunerationRequest(
      {
        tenantId: activeTenant.tenantId,
        role: activeTenant.role,
        operatorId: selectedOperatorId,
        idToken,
      },
      {
        grossOperationAmountCents: brlToCents(offerGrossBrl),
        distanceKm: parseFloat(offerDistanceKm) || 3.5,
        weightKg: 2.0,
        ruleCode: 'RULE-STD-MANHUACU',
      }
    )
      .then((res) => {
        if (active) setOfferEstimate(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    activeTenant.role,
    activeTenant.tenantId,
    idToken,
    offerDistanceKm,
    offerGrossBrl,
    selectedOperatorId,
  ]);

  const wallet = overview?.wallets[0];
  const ledger = overview?.ledger || [];
  const earnings = overview?.earnings || [];
  const cashSettlements = overview?.cashSettlements || [];
  const debts = overview?.debts || [];
  const withdrawals = overview?.withdrawals || [];

  const handleCompleteOffer = async () => {
    if (!wallet) return;
    setAcceptingOffer(true);
    setError(null);
    try {
      const res = await settleNexPayOperationRequest(requestCtx, {
        operationId: offerProtocol,
        operatorId: wallet.operatorId,
        paymentMethod: offerPaymentMethod,
        grossAmountCents: brlToCents(offerGrossBrl),
        distanceKm: parseFloat(offerDistanceKm) || 3.5,
        weightKg: 2.0,
        ruleCode: 'RULE-STD-MANHUACU',
      });
      await loadOperatorFinance();
      setOfferProtocol(`NX-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      notify(
        `Coleta ${res.earning?.operationId} concluída! Líquido: ${formatCentsBRL(res.earning?.netEarningCents || 0)}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao registrar conclusão da coleta.'
      );
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setWthSubmitting(true);
    setError(null);
    try {
      const res = await createNexPayWithdrawalRequest(requestCtx, {
        operatorId: wallet.operatorId,
        amountCents: brlToCents(wthAmountBrl),
        pixKey: wthPixKey,
        pixKeyType: wthPixKeyType,
        beneficiaryName: wallet.operatorName,
      });
      await loadOperatorFinance();
      setWthModalOpen(false);
      notify(
        `Saque PIX ${res.withdrawal?.withdrawalCode} solicitado com reserva de ${formatCentsBRL(res.withdrawal?.amountCents || 0)}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao solicitar saque PIX.'
      );
    } finally {
      setWthSubmitting(false);
    }
  };

  const handleRegularizeDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setRegSubmitting(true);
    setError(null);
    try {
      const res = await settleNexPayDebtPixRequest(requestCtx, {
        operatorId: wallet.operatorId,
        amountCents: brlToCents(regAmountBrl),
        pixReceiptReference: regPixRef,
      });
      await loadOperatorFinance();
      setRegularizeModalOpen(false);
      notify(
        `Comissão pendente regularizada via PIX (${formatCentsBRL(res.settledCents || 0)}).`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao regularizar comissão pendente.'
      );
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: number) => {
    setError(null);
    try {
      await updateNexPayWithdrawalStatusRequest(requestCtx, withdrawalId, {
        nextStatus: 'cancelled',
        reasonOrNote: 'Cancelado pelo operador no NexDriver',
      });
      await loadOperatorFinance();
      notify('Saque cancelado e valor reservado devolvido ao saldo disponível.');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao cancelar saque PIX.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior NexDriver (Mobile-First) */}
      <div className="p-4 rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#174D35] text-[#F5F7F4] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-bold text-[var(--nex-text-primary)]">
                NexDriver — Carteira & Ganhos do Operador
              </span>
              <Badge variant="primary">Mobile-First</Badge>
            </div>
            <p className="text-xs text-[var(--nex-text-secondary)]">
              {wallet
                ? `${wallet.operatorName} (${wallet.operatorId}) · ${wallet.city}`
                : 'Selecione um operador para visualizar a carteira'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Selecionar carteira de operador no NexDriver"
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--nex-surface-secondary)] text-[var(--nex-text-primary)] border border-[var(--nex-border)]"
          >
            <option value="OP-101">OP-101 · Lucas Ferreira (Motoboy #14)</option>
            <option value="OP-102">OP-102 · Rafael Souza (Operador Regional)</option>
            <option value="OP-103">OP-103 · Carlos Mendes (Hub Leste MG)</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (wallet) {
                setWthPixKey(wallet.pixKey);
                setWthPixKeyType(wallet.pixKeyType);
              }
              setWthModalOpen(true);
            }}
          >
            Solicitar Saque PIX
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[var(--nex-danger)]/10 border border-[var(--nex-danger)]/30 text-xs font-semibold text-[var(--nex-danger)] flex items-center justify-between"
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* 6 Indicadores da Operator Wallet */}
      {wallet && (
        <section
          aria-label="Resumo da Carteira do Operador"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <StatCard
            title="Saldo disponível"
            value={formatCentsBRL(wallet.availableBalanceCents)}
            helper={`Em reserva de saque: ${formatCentsBRL(wallet.reservedWithdrawalCents)}`}
            trendLabel="Liberado para PIX"
            trendTone="positive"
            icon={<Wallet className="w-4 h-4" />}
          />
          <StatCard
            title="Valores a liberar"
            value={formatCentsBRL(wallet.pendingReleaseCents)}
            helper="Operações em ciclo de conferência"
            trendLabel="Ciclo D+1"
            trendTone="neutral"
            icon={<RefreshCw className="w-4 h-4" />}
          />
          <StatCard
            title="Saldo devedor (Comissões em Dinheiro)"
            value={formatCentsBRL(wallet.debtBalanceCents)}
            helper="Compensado automaticamente ou quitável via PIX"
            trendLabel={
              wallet.debtBalanceCents > 0 ? 'Pendente' : 'Zero dívidas'
            }
            trendTone={wallet.debtBalanceCents > 0 ? 'warning' : 'positive'}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <StatCard
            title="Ganhos do dia"
            value={formatCentsBRL(wallet.todayEarningsCents)}
            helper={`${wallet.totalCompletedOperations} coletas acumuladas`}
            trendLabel="Hoje"
            trendTone="positive"
            icon={<Coins className="w-4 h-4" />}
          />
          <StatCard
            title="Ganhos semanais"
            value={formatCentsBRL(wallet.weekEarningsCents)}
            helper="Remuneração líquida dos últimos 7 dias"
            trendLabel="Semana atual"
            trendTone="positive"
            icon={<Banknote className="w-4 h-4" />}
          />
          <StatCard
            title="Ganhos mensais"
            value={formatCentsBRL(wallet.monthEarningsCents)}
            helper="Remuneração líquida acumulada no mês"
            trendLabel="Mês atual"
            trendTone="positive"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
        </section>
      )}

      {/* Prévia de Remuneração Estimada Antes do Aceite da Operação */}
      <Card
        title="Prévia de Remuneração Antes de Aceitar a Operação"
        subtitle="Transparência total para o operador: Veja o valor da coleta, a comissão NexColetas e o líquido liberado antes de aceitar"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Valor da Coleta (R$)"
              type="number"
              step="0.50"
              value={offerGrossBrl}
              onChange={(e) => setOfferGrossBrl(e.target.value)}
            />
            <Input
              label="Distância (km)"
              type="number"
              step="0.5"
              value={offerDistanceKm}
              onChange={(e) => setOfferDistanceKm(e.target.value)}
            />
            <Select
              label="Pagamento do Cliente"
              value={offerPaymentMethod}
              onChange={(e) =>
                setOfferPaymentMethod(e.target.value as PaymentMethodType)
              }
              options={[
                { value: 'DIGITAL', label: 'Digital (PIX / Faturado)' },
                { value: 'CASH', label: 'Em Dinheiro (Espécie)' },
              ]}
            />
          </div>

          <div className="lg:col-span-5 p-4 rounded-xl bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2 text-xs">
            {offerEstimate && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--nex-text-secondary)]">
                    Valor Total da Operação:
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCentsBRL(offerEstimate.grossOperationAmountCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--nex-text-secondary)]">
                    Taxa NexColetas ({offerEstimate.platformPercentApplied}%):
                  </span>
                  <span className="font-semibold text-[var(--nex-danger)] tabular-nums">
                    -{formatCentsBRL(offerEstimate.platformCommissionCents)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-[var(--nex-border)] flex items-center justify-between">
                  <span className="font-bold text-[var(--nex-text-primary)]">
                    Sua Remuneração Líquida:
                  </span>
                  <span className="text-base font-display font-bold text-[var(--nex-primary)] tabular-nums">
                    {formatCentsBRL(offerEstimate.netOperatorEarningCents)}
                  </span>
                </div>
                {wallet &&
                  wallet.debtBalanceCents > 0 &&
                  offerPaymentMethod === 'DIGITAL' && (
                    <div className="text-[11px] text-[var(--nex-warning)] font-medium">
                      Compensação prevista de saldo devedor: -
                      {formatCentsBRL(
                        Math.min(
                          wallet.debtBalanceCents,
                          offerEstimate.netOperatorEarningCents
                        )
                      )}{' '}
                      (Saldo livre após compensação:{' '}
                      {formatCentsBRL(
                        Math.max(
                          0,
                          offerEstimate.netOperatorEarningCents -
                            wallet.debtBalanceCents
                        )
                      )}
                      )
                    </div>
                  )}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={acceptingOffer}
                    onClick={handleCompleteOffer}
                  >
                    Aceitar e Concluir Coleta ({offerProtocol})
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Navegação pelas 6 Áreas Financeiras do NexDriver */}
      <Tabs
        activeTab={activeSection}
        onChange={setActiveSection}
        items={[
          { id: 'wallet', label: 'Wallet & Resumo' },
          { id: 'earnings', label: 'Earnings (Ganhos)', count: earnings.length },
          {
            id: 'transactions',
            label: 'Transactions (Extrato)',
            count: ledger.length,
          },
          {
            id: 'withdrawals',
            label: 'Withdrawals (Saques PIX)',
            count: withdrawals.length,
          },
          {
            id: 'cash_collections',
            label: 'Cash Collections (Dinheiro)',
            count: cashSettlements.length,
          },
          {
            id: 'outstanding_fees',
            label: 'Outstanding Platform Fees',
            count: debts.filter((d) => d.remainingDebtCents > 0).length,
          },
        ]}
      />

      {activeSection === 'wallet' && wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Dados Bancários & Chave PIX Cadastrada"
            subtitle="Utilizada para solicitações de saque no NexPay"
          >
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--nex-border)]">
                <span className="text-[var(--nex-text-secondary)]">Titular:</span>
                <span className="font-semibold">{wallet.operatorName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--nex-border)]">
                <span className="text-[var(--nex-text-secondary)]">
                  Tipo de Chave PIX:
                </span>
                <Badge variant="neutral">{wallet.pixKeyType}</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--nex-text-secondary)]">Chave PIX:</span>
                <span className="font-mono font-semibold">{wallet.pixKey}</span>
              </div>
            </div>
          </Card>

          <Card
            title="Situação de Comissões & Saldo Devedor"
            subtitle="Transparência sobre recebimentos em dinheiro e taxas da plataforma"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Saldo Devedor Atual:</span>
                <span className="text-base font-display font-bold text-[var(--nex-warning)] tabular-nums">
                  {formatCentsBRL(wallet.debtBalanceCents)}
                </span>
              </div>
              <p className="text-[var(--nex-text-secondary)]">
                Quando você recebe uma coleta em dinheiro diretamente do
                cliente, a comissão NexColetas é descontada do seu saldo
                disponível ou compensada automaticamente nos seus próximos
                ganhos digitais.
              </p>
              {wallet.debtBalanceCents > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRegAmountBrl(
                      centsToBrl(wallet.debtBalanceCents).toFixed(2)
                    );
                    setRegularizeModalOpen(true);
                  }}
                >
                  Regularizar Saldo Devedor por PIX
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeSection === 'earnings' && (
        <Card
          title={`Meus Ganhos por Operação (${earnings.length})`}
          subtitle="Detalhamento de valor bruto, taxa NexColetas, compensação e líquido liberado"
        >
          {earnings.length === 0 ? (
            <EmptyState
              title="Nenhum ganho registrado"
              description="Conclua uma operação acima para visualizar sua remuneração."
            />
          ) : (
            <div className="space-y-3">
              {earnings.map((e) => (
                <div
                  key={e.id}
                  className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-[var(--nex-text-primary)]">
                      {e.operationId} ·{' '}
                      {e.paymentMethod === 'CASH'
                        ? 'Recebido em Dinheiro'
                        : 'Pagamento Digital'}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      {formatDateTimeBR(e.createdAt)} · Regra: {e.ruleCode}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-bold text-[var(--nex-primary)]">
                      Líquido: {formatCentsBRL(e.netEarningCents)}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Bruto: {formatCentsBRL(e.grossAmountCents)} · Taxa:{' '}
                      {formatCentsBRL(e.platformCommissionCents)}
                      {e.compensatedDebtCents > 0 &&
                        ` · Compensado: -${formatCentsBRL(e.compensatedDebtCents)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'transactions' && (
        <Card
          title={`Extrato Financeiro Imutável (${ledger.length})`}
          subtitle="Todas as movimentações de crédito, débito, reserva e compensação"
        >
          <div className="space-y-2.5">
            {ledger.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{l.ledgerCode}</span>
                    <Badge
                      variant={l.direction === 'CREDIT' ? 'success' : 'warning'}
                    >
                      {l.direction === 'CREDIT' ? 'CRÉDITO' : 'DÉBITO'}
                    </Badge>
                  </div>
                  <p className="text-[var(--nex-text-secondary)]">
                    {l.description}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <div
                    className={`font-bold ${
                      l.direction === 'CREDIT'
                        ? 'text-[var(--nex-success)]'
                        : 'text-[var(--nex-danger)]'
                    }`}
                  >
                    {l.direction === 'CREDIT' ? '+' : '-'}
                    {formatCentsBRL(l.amountCents)}
                  </div>
                  <div className="text-[11px] text-[var(--nex-text-secondary)]">
                    Saldo após: {formatCentsBRL(l.balanceAfterCents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeSection === 'withdrawals' && (
        <Card
          title={`Meus Saques PIX (${withdrawals.length})`}
          subtitle="Acompanhe o status e comprovantes das suas solicitações de saque"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setWthModalOpen(true)}
            >
              Solicitar Saque
            </Button>
          }
        >
          {withdrawals.length === 0 ? (
            <EmptyState
              title="Nenhum saque solicitado"
              description="Quando você solicitar um saque PIX, ele aparecerá aqui com reserva imediata de saldo."
            />
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-bold">
                      {w.withdrawalCode} · {formatCentsBRL(w.amountCents)}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Chave {w.pixKeyType}: {w.pixKey} · Status: {w.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(w.status === 'requested' ||
                      w.status === 'under_review') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelWithdrawal(w.id)}
                      >
                        Cancelar e Estornar Reserva
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'cash_collections' && (
        <Card
          title={`Coletas Recebidas em Dinheiro (${cashSettlements.length})`}
          subtitle="Operações em que o cliente pagou em espécie diretamente ao operador"
        >
          {cashSettlements.length === 0 ? (
            <EmptyState
              title="Nenhuma coleta em dinheiro registrada para este operador"
              description="Utilize o simulador acima selecionando 'Em Dinheiro (Espécie)' para registrar um recebimento em mãos."
            />
          ) : (
            <div className="space-y-3">
              {cashSettlements.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs tabular-nums"
                >
                  <div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Operação
                    </div>
                    <div className="font-mono font-bold">{c.operationId}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Valor Recebido em Mãos
                    </div>
                    <div className="font-bold">
                      {formatCentsBRL(c.cashCollectedCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Taxa NexColetas
                    </div>
                    <div className="font-bold text-[var(--nex-danger)]">
                      {formatCentsBRL(c.platformCommissionCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Saldo Devedor Gerado
                    </div>
                    <div className="font-bold text-[var(--nex-warning)]">
                      {formatCentsBRL(c.remainingDebtCents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'outstanding_fees' && (
        <Card
          title={`Taxas Pendentes da Plataforma (${debts.length})`}
          subtitle="Comissões de operações em dinheiro aguardando compensação automática ou regularização PIX"
          action={
            wallet &&
            wallet.debtBalanceCents > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setRegAmountBrl(
                    centsToBrl(wallet.debtBalanceCents).toFixed(2)
                  );
                  setRegularizeModalOpen(true);
                }}
              >
                Regularizar via PIX
              </Button>
            )
          }
        >
          {debts.length === 0 ? (
            <EmptyState
              title="Nenhuma taxa pendente"
              description="Sua carteira está 100% em dia com a NexColetas."
            />
          ) : (
            <div className="space-y-3">
              {debts.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold">
                      Operação {d.operationId} · Status: {d.status}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      {d.reason}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-bold text-[var(--nex-warning)]">
                      Restante: {formatCentsBRL(d.remainingDebtCents)}
                    </div>
                    <div className="text-[11px] text-[var(--nex-text-secondary)]">
                      Original: {formatCentsBRL(d.originalDebtCents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal de Saque PIX NexDriver */}
      <Modal
        isOpen={wthModalOpen}
        onClose={() => setWthModalOpen(false)}
        title="Solicitar Saque PIX — NexDriver Wallet"
        footer={
          <>
            <Button variant="outline" onClick={() => setWthModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={wthSubmitting}
              onClick={handleRequestWithdrawal}
            >
              Confirmar Solicitação PIX
            </Button>
          </>
        }
      >
        <form onSubmit={handleRequestWithdrawal} className="space-y-4">
          <Input
            label={`Valor do Saque (Disponível: ${formatCentsBRL(wallet?.availableBalanceCents || 0)})`}
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
              { value: 'PHONE', label: 'Telefone' },
              { value: 'EVP', label: 'Chave Aleatória' },
            ]}
          />
          <Input
            label="Chave PIX"
            value={wthPixKey}
            onChange={(e) => setWthPixKey(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* Modal de Regularização de Taxas Pendentes por PIX */}
      <Modal
        isOpen={regularizeModalOpen}
        onClose={() => setRegularizeModalOpen(false)}
        title="Regularizar Saldo Devedor por PIX"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRegularizeModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={regSubmitting}
              onClick={handleRegularizeDebt}
            >
              Confirmar Regularização
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegularizeDebt} className="space-y-4">
          <Input
            label="Valor a Regularizar (R$)"
            type="number"
            step="0.50"
            value={regAmountBrl}
            onChange={(e) => setRegAmountBrl(e.target.value)}
            required
          />
          <Input
            label="Código / Comprovante PIX"
            value={regPixRef}
            onChange={(e) => setRegPixRef(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
