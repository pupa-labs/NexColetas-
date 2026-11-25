import {
  CashCollectionSettlementItem,
  CommissionRuleItem,
  CompensationItem,
  FinancialAuditLogItem,
  FinancialLedgerItem,
  NexPayAdminMetrics,
  OperationEarningItem,
  OperatorDebtItem,
  OperatorWalletItem,
  PaymentMethodType,
  PixKeyType,
  RemunerationCalculationInput,
  RemunerationCalculationResult,
  UserRole,
  WithdrawalEventItem,
  WithdrawalRequestItem,
  WithdrawalStatus,
} from '../types/index.ts';

export function brlToCents(brl: number | string): number {
  const numeric = typeof brl === 'string' ? parseFloat(brl.replace(',', '.')) : brl;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function centsToBrl(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function formatCentsBRL(cents: number): string {
  const value = centsToBrl(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function assertAdminPermission(role: UserRole, actionName: string): void {
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error(
      `Permissão negada: A ação '${actionName}' exige perfil administrativo NexColetas Control (SUPER_ADMIN ou ADMIN).`
    );
  }
}

export function assertOperatorAccess(
  callerRole: UserRole,
  callerOperatorId: string | undefined,
  targetOperatorId: string
): void {
  const isAdminOrCompanyManager =
    callerRole === 'SUPER_ADMIN' ||
    callerRole === 'ADMIN' ||
    callerRole === 'COMPANY_OWNER' ||
    callerRole === 'COMPANY_ADMIN';

  if (isAdminOrCompanyManager) {
    return;
  }

  if (!callerOperatorId || callerOperatorId !== targetOperatorId) {
    throw new Error(
      `Violação de isolamento entre operadores: O operador '${callerOperatorId || 'desconhecido'}' não tem permissão para acessar dados financeiros de '${targetOperatorId}'.`
    );
  }
}

/**
 * Motor configurável de cálculo de remuneração e comissão NexColetas.
 * Todos os cálculos ocorrem em centavos inteiros.
 */
export function calculateOperationRemuneration(
  input: RemunerationCalculationInput
): RemunerationCalculationResult {
  const grossCents = Math.max(0, Math.round(input.grossOperationAmountCents));
  const { rule } = input;

  if (grossCents <= 0) {
    throw new Error('O valor bruto da operação deve ser maior que zero.');
  }

  // Comissão percentual em basis points (ex: 2000 bps = 20%)
  const percentCommissionCents = Math.round(
    (grossCents * Math.max(0, rule.platformPercentBps)) / 10000
  );
  const fixedCommissionCents = Math.max(0, Math.round(rule.platformFixedFeeCents));

  const rawCommissionCents = percentCommissionCents + fixedCommissionCents;
  // A comissão da plataforma não pode superar o valor bruto da operação
  const platformCommissionCents = Math.min(grossCents, rawCommissionCents);

  // Adicionais por distância, peso e incentivo quando configurados na regra
  const distanceBonusCents =
    rule.perKmRateCents > 0
      ? Math.round(Math.max(0, input.distanceKm) * rule.perKmRateCents)
      : 0;

  const weightBonusCents =
    rule.perKgRateCents > 0
      ? Math.round(Math.max(0, input.weightKg) * rule.perKgRateCents)
      : 0;

  const incentiveBonusCents = Math.max(0, Math.round(rule.incentiveBonusCents));
  const fixedOperatorBaseCents = Math.max(0, Math.round(rule.operatorFixedBaseCents));

  // Se houver base fixa por contrato maior que zero, soma aos bônus; caso contrário, usa (Bruto - Comissão) + Bônus
  const baseNetFromGross = Math.max(0, grossCents - platformCommissionCents);
  const netOperatorEarningCents =
    fixedOperatorBaseCents > 0
      ? fixedOperatorBaseCents + distanceBonusCents + weightBonusCents + incentiveBonusCents
      : baseNetFromGross + distanceBonusCents + weightBonusCents + incentiveBonusCents;

  return {
    grossOperationAmountCents: grossCents,
    platformCommissionCents,
    platformPercentApplied: rule.platformPercentBps / 100,
    platformFixedAppliedCents: fixedCommissionCents,
    distanceBonusCents,
    weightBonusCents,
    incentiveBonusCents,
    netOperatorEarningCents,
    ruleCode: rule.ruleCode,
    ruleName: rule.name,
  };
}

export interface NexPayMemoryState {
  wallets: OperatorWalletItem[];
  ledger: FinancialLedgerItem[];
  rules: CommissionRuleItem[];
  earnings: OperationEarningItem[];
  cashSettlements: CashCollectionSettlementItem[];
  debts: OperatorDebtItem[];
  compensations: CompensationItem[];
  withdrawals: WithdrawalRequestItem[];
  withdrawalEvents: WithdrawalEventItem[];
  auditLogs: FinancialAuditLogItem[];
  activeLocks: Set<string>;
}

export function createInitialNexPayState(tenantId = 'tenant_manhuacu_hq'): NexPayMemoryState {
  const now = new Date().toISOString();
  return {
    wallets: [
      {
        id: 1,
        tenantId,
        operatorId: 'OP-101',
        operatorName: 'Lucas Ferreira (Motoboy #14)',
        operatorRole: 'RIDER',
        city: 'Manhuaçu - MG',
        pixKey: '111.444.777-35',
        pixKeyType: 'CPF',
        availableBalanceCents: 14200, // R$ 142,00
        pendingReleaseCents: 3800, // R$ 38,00
        reservedWithdrawalCents: 0,
        debtBalanceCents: 1800, // R$ 18,00 (pronto para demonstrar compensação automática!)
        todayEarningsCents: 6400,
        weekEarningsCents: 31200,
        monthEarningsCents: 124500,
        totalCompletedOperations: 28,
        financialStatus: 'DEBT_PENDING',
        updatedAt: now,
      },
      {
        id: 2,
        tenantId,
        operatorId: 'OP-102',
        operatorName: 'Rafael Souza (Operador Regional)',
        operatorRole: 'OPERATOR',
        city: 'Manhuaçu - MG',
        pixKey: 'rafael.logistica@manhuacu.com.br',
        pixKeyType: 'EMAIL',
        availableBalanceCents: 28500, // R$ 285,00
        pendingReleaseCents: 5200,
        reservedWithdrawalCents: 8000, // R$ 80,00 reservado em saque solicitado
        debtBalanceCents: 0,
        todayEarningsCents: 9200,
        weekEarningsCents: 46500,
        monthEarningsCents: 189000,
        totalCompletedOperations: 41,
        financialStatus: 'REGULAR',
        updatedAt: now,
      },
      {
        id: 3,
        tenantId,
        operatorId: 'OP-103',
        operatorName: 'Carlos Mendes (Hub Leste MG)',
        operatorRole: 'RIDER',
        city: 'Manhuaçu - MG',
        pixKey: '(33) 98812-4410',
        pixKeyType: 'PHONE',
        availableBalanceCents: 0,
        pendingReleaseCents: 1950,
        reservedWithdrawalCents: 0,
        debtBalanceCents: 2400, // R$ 24,00 de comissão em dinheiro pendente
        todayEarningsCents: 3200,
        weekEarningsCents: 17800,
        monthEarningsCents: 74000,
        totalCompletedOperations: 16,
        financialStatus: 'DEBT_PENDING',
        updatedAt: now,
      },
    ],
    rules: [
      {
        id: 1,
        tenantId,
        ruleCode: 'RULE-STD-MANHUACU',
        name: 'Padrão Urbano Manhuaçu (20% Plataforma)',
        serviceCategory: 'STANDARD',
        region: 'Manhuaçu - MG',
        isExpress: false,
        platformPercentBps: 2000, // 20%
        platformFixedFeeCents: 0,
        operatorFixedBaseCents: 0,
        perKmRateCents: 0,
        perKgRateCents: 0,
        incentiveBonusCents: 0,
        deductCashCommissionFromBalance: true,
        isActive: true,
        updatedAt: now,
      },
      {
        id: 2,
        tenantId,
        ruleCode: 'RULE-EXP-BR262',
        name: 'Expresso Corredor BR-262 & Distritos (18% + R$ 3,00 Incentivo)',
        serviceCategory: 'EXPRESS',
        region: 'Manhuaçu & Distritos (Realeza / Vilanova)',
        isExpress: true,
        platformPercentBps: 1800, // 18%
        platformFixedFeeCents: 150, // R$ 1,50 taxa fixa
        operatorFixedBaseCents: 0,
        perKmRateCents: 0,
        perKgRateCents: 0,
        incentiveBonusCents: 300, // R$ 3,00 bônus
        deductCashCommissionFromBalance: true,
        isActive: true,
        updatedAt: now,
      },
      {
        id: 3,
        tenantId,
        ruleCode: 'RULE-CONTRACT-B2B',
        name: 'Contrato Corporativo B2B (Remuneração Fixa + Km)',
        serviceCategory: 'CONTRACT',
        region: 'Manhuaçu - MG',
        isExpress: false,
        platformPercentBps: 1500, // 15%
        platformFixedFeeCents: 0,
        operatorFixedBaseCents: 1800, // R$ 18,00 fixo
        perKmRateCents: 220, // R$ 2,20 / km
        perKgRateCents: 50, // R$ 0,50 / kg
        incentiveBonusCents: 0,
        deductCashCommissionFromBalance: true,
        isActive: true,
        updatedAt: now,
      },
    ],
    ledger: [
      {
        id: 1,
        tenantId,
        ledgerCode: 'LDG-2026-0001',
        operatorId: 'OP-101',
        operatorName: 'Lucas Ferreira (Motoboy #14)',
        operationId: 'NX-2026-0098',
        entryType: 'OPERATION_EARNING',
        direction: 'CREDIT',
        amountCents: 14200,
        balanceAfterCents: 14200,
        debtAfterCents: 0,
        description: 'Remuneração líquida consolidada de operações digitais anteriores',
        status: 'POSTED',
        originReference: 'NX-2026-0098',
        idempotencyKey: 'idem-seed-op101-earning-1',
        actor: 'SYSTEM_NEXPAY',
        createdAt: now,
      },
      {
        id: 2,
        tenantId,
        ledgerCode: 'LDG-2026-0002',
        operatorId: 'OP-101',
        operatorName: 'Lucas Ferreira (Motoboy #14)',
        operationId: 'NX-2026-0099',
        entryType: 'DEBT_RECORDED',
        direction: 'DEBIT',
        amountCents: 1800,
        balanceAfterCents: 14200,
        debtAfterCents: 1800,
        description: 'Comissão NexColetas (20%) pendente de operação recebida em espécie (R$ 90,00)',
        status: 'POSTED',
        originReference: 'NX-2026-0099',
        idempotencyKey: 'idem-seed-op101-debt-1',
        actor: 'SYSTEM_NEXPAY',
        createdAt: now,
      },
      {
        id: 3,
        tenantId,
        ledgerCode: 'LDG-2026-0003',
        operatorId: 'OP-102',
        operatorName: 'Rafael Souza (Operador Regional)',
        operationId: 'NX-2026-0102',
        entryType: 'OPERATION_EARNING',
        direction: 'CREDIT',
        amountCents: 36500,
        balanceAfterCents: 36500,
        debtAfterCents: 0,
        description: 'Remuneração líquida de coletas urbanas concluídas em Manhuaçu - MG',
        status: 'POSTED',
        originReference: 'NX-2026-0102',
        idempotencyKey: 'idem-seed-op102-earning-1',
        actor: 'SYSTEM_NEXPAY',
        createdAt: now,
      },
      {
        id: 4,
        tenantId,
        ledgerCode: 'LDG-2026-0004',
        operatorId: 'OP-102',
        operatorName: 'Rafael Souza (Operador Regional)',
        operationId: null,
        entryType: 'WITHDRAWAL_RESERVE',
        direction: 'DEBIT',
        amountCents: 8000,
        balanceAfterCents: 28500,
        debtAfterCents: 0,
        description: 'Reserva de saldo para solicitação de saque PIX #WTH-2026-0001',
        status: 'POSTED',
        originReference: 'WTH-2026-0001',
        idempotencyKey: 'idem-seed-op102-wth-1',
        actor: 'OP-102',
        createdAt: now,
      },
    ],
    earnings: [
      {
        id: 1,
        tenantId,
        operationId: 'NX-2026-0102',
        operatorId: 'OP-102',
        operatorName: 'Rafael Souza (Operador Regional)',
        paymentMethod: 'DIGITAL',
        grossAmountCents: 45625,
        platformCommissionCents: 9125,
        netEarningCents: 36500,
        compensatedDebtCents: 0,
        releasedAmountCents: 36500,
        ruleCode: 'RULE-STD-MANHUACU',
        status: 'RELEASED',
        idempotencyKey: 'idem-earning-nx-2026-0102',
        createdAt: now,
      },
    ],
    cashSettlements: [
      {
        id: 1,
        tenantId,
        operationId: 'NX-2026-0099',
        operatorId: 'OP-101',
        operatorName: 'Lucas Ferreira (Motoboy #14)',
        cashCollectedCents: 9000,
        platformCommissionCents: 1800,
        deductedFromBalanceCents: 0,
        remainingDebtCents: 1800,
        settlementStatus: 'DEBT_REGISTERED',
        idempotencyKey: 'idem-cash-nx-2026-0099',
        createdAt: now,
      },
    ],
    debts: [
      {
        id: 1,
        tenantId,
        operatorId: 'OP-101',
        operatorName: 'Lucas Ferreira (Motoboy #14)',
        operationId: 'NX-2026-0099',
        originalDebtCents: 1800,
        remainingDebtCents: 1800,
        status: 'OPEN',
        reason: 'Comissão NexColetas (20%) referente à operação paga em espécie NX-2026-0099 (R$ 90,00)',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        tenantId,
        operatorId: 'OP-103',
        operatorName: 'Carlos Mendes (Hub Leste MG)',
        operationId: 'NX-2026-0095',
        originalDebtCents: 2400,
        remainingDebtCents: 2400,
        status: 'OPEN',
        reason: 'Comissão NexColetas (20%) referente à operação paga em espécie NX-2026-0095 (R$ 120,00)',
        createdAt: now,
        updatedAt: now,
      },
    ],
    compensations: [],
    withdrawals: [
      {
        id: 1,
        tenantId,
        withdrawalCode: 'WTH-2026-0001',
        operatorId: 'OP-102',
        operatorName: 'Rafael Souza (Operador Regional)',
        amountCents: 8000,
        pixKey: 'rafael.logistica@manhuacu.com.br',
        pixKeyType: 'EMAIL',
        beneficiaryName: 'Rafael Souza Logística ME',
        status: 'requested',
        rejectionReason: null,
        receiptCode: null,
        idempotencyKey: 'idem-seed-op102-wth-1',
        requestedBy: 'OP-102',
        reviewedBy: null,
        requestedAt: now,
        updatedAt: now,
      },
    ],
    withdrawalEvents: [
      {
        id: 1,
        tenantId,
        withdrawalId: 1,
        withdrawalCode: 'WTH-2026-0001',
        fromStatus: 'NONE',
        toStatus: 'requested',
        actor: 'OP-102',
        note: 'Solicitação de saque PIX registrada com reserva preventiva de R$ 80,00.',
        createdAt: now,
      },
    ],
    auditLogs: [
      {
        id: 1,
        tenantId,
        actor: 'SYSTEM_NEXPAY',
        actorRole: 'SUPER_ADMIN',
        action: 'NEXPAY_FOUNDATION_INITIALIZED',
        entityType: 'nexpay_ledger',
        entityId: 'MANHUACU-HQ',
        idempotencyKey: 'idem-init-nexpay',
        metadataJson: JSON.stringify({
          base: 'Manhuaçu - MG',
          precision: 'INTEGER_CENTS',
          pspRealTransferEnabled: false,
        }),
        createdAt: now,
      },
    ],
    activeLocks: new Set<string>(),
  };
}

/**
 * Liquidação atômica de operação concluída (Digital ou Dinheiro/Cash),
 * com idempotência estrita, cálculo de comissão e compensação automática de saldo devedor.
 */
export function settleOperationInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    operationId: string;
    operatorId: string;
    paymentMethod: PaymentMethodType;
    grossAmountCents: number;
    distanceKm?: number;
    weightKg?: number;
    ruleCode?: string;
    deductCashCommissionFromWallet?: boolean;
    idempotencyKey: string;
    actor: string;
    actorRole: UserRole;
  }
): {
  remuneration: RemunerationCalculationResult;
  earning: OperationEarningItem;
  cashSettlement?: CashCollectionSettlementItem;
  compensationsCreated: CompensationItem[];
  ledgerEntriesCreated: FinancialLedgerItem[];
  wallet: OperatorWalletItem;
} {
  const lockKey = `op:${params.operationId}`;
  if (state.activeLocks.has(lockKey)) {
    throw new Error(`Operação '${params.operationId}' já está em processamento concorrente.`);
  }

  state.activeLocks.add(lockKey);
  try {
    // 1. Verificar idempotência e proibição de comissão/liquidação duplicada para a mesma operação
    const existingEarning = state.earnings.find(
      (e) =>
        e.operationId === params.operationId || e.idempotencyKey === params.idempotencyKey
    );
    const existingCash = state.cashSettlements.find(
      (c) =>
        c.operationId === params.operationId || c.idempotencyKey === params.idempotencyKey
    );
    if (existingEarning || existingCash) {
      throw new Error(
        `Idempotência NexPay: A operação '${params.operationId}' já foi liquidada financeiramente. Não é permitido lançar comissão ou remuneração duplicada.`
      );
    }

    const wallet = state.wallets.find((w) => w.operatorId === params.operatorId);
    if (!wallet) {
      throw new Error(`Carteira do operador '${params.operatorId}' não encontrada.`);
    }

    const rule =
      state.rules.find((r) => r.ruleCode === params.ruleCode && r.isActive) ||
      state.rules.find((r) => r.isActive) ||
      state.rules[0];

    if (!rule) {
      throw new Error('Nenhuma regra de comissão ativa configurada no NexPay.');
    }

    const remuneration = calculateOperationRemuneration({
      grossOperationAmountCents: params.grossAmountCents,
      distanceKm: params.distanceKm ?? 3.0,
      weightKg: params.weightKg ?? 1.5,
      serviceCategory: rule.serviceCategory,
      region: rule.region,
      isExpress: rule.isExpress,
      rule,
    });

    const now = new Date().toISOString();
    const ledgerEntriesCreated: FinancialLedgerItem[] = [];
    const compensationsCreated: CompensationItem[] = [];
    let cashSettlement: CashCollectionSettlementItem | undefined;

    let compensatedDebtCents = 0;
    let releasedAmountCents = 0;

    if (params.paymentMethod === 'DIGITAL') {
      // Fluxo Pagamento Digital:
      // 1. Credita remuneração líquida no ledger
      const netEarning = remuneration.netOperatorEarningCents;
      const openDebts = state.debts
        .filter((d) => d.operatorId === wallet.operatorId && d.remainingDebtCents > 0)
        .sort((a, b) => a.id - b.id);

      // Calcula quanto será compensado automaticamente das dívidas abertas
      let availableToCompensate = netEarning;
      for (const debt of openDebts) {
        if (availableToCompensate <= 0) break;
        const deduct = Math.min(debt.remainingDebtCents, availableToCompensate);
        if (deduct > 0) {
          debt.remainingDebtCents -= deduct;
          debt.status = debt.remainingDebtCents === 0 ? 'SETTLED' : 'PARTIALLY_PAID';
          debt.updatedAt = now;
          availableToCompensate -= deduct;
          compensatedDebtCents += deduct;

          const compItem: CompensationItem = {
            id: state.compensations.length + 1,
            tenantId: params.tenantId,
            operatorId: wallet.operatorId,
            operatorName: wallet.operatorName,
            sourceOperationId: params.operationId,
            debtId: debt.id,
            grossEarningCents: netEarning,
            compensatedCents: deduct,
            netReleasedCents: netEarning - compensatedDebtCents,
            idempotencyKey: `${params.idempotencyKey}-comp-${debt.id}`,
            createdAt: now,
          };
          state.compensations.unshift(compItem);
          compensationsCreated.push(compItem);
        }
      }

      releasedAmountCents = netEarning - compensatedDebtCents;

      // Atualiza carteira do operador de forma atômica (nunca permite saldo negativo)
      wallet.availableBalanceCents += netEarning;
      const balanceAfterEarning = wallet.availableBalanceCents;
      const debtBeforeComp = wallet.debtBalanceCents;

      const earningLedger: FinancialLedgerItem = {
        id: state.ledger.length + 1,
        tenantId: params.tenantId,
        ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
        operatorId: wallet.operatorId,
        operatorName: wallet.operatorName,
        operationId: params.operationId,
        entryType: 'OPERATION_EARNING',
        direction: 'CREDIT',
        amountCents: netEarning,
        balanceAfterCents: balanceAfterEarning,
        debtAfterCents: debtBeforeComp,
        description: `Remuneração líquida da operação ${params.operationId} (Bruto ${formatCentsBRL(remuneration.grossOperationAmountCents)} · Taxa NexColetas ${formatCentsBRL(remuneration.platformCommissionCents)})`,
        status: 'POSTED',
        originReference: params.operationId,
        idempotencyKey: `${params.idempotencyKey}-earning`,
        actor: params.actor,
        createdAt: now,
      };
      state.ledger.unshift(earningLedger);
      ledgerEntriesCreated.push(earningLedger);

      // Se houve compensação automática de saldo devedor, gera lançamento separado e rastreável
      if (compensatedDebtCents > 0) {
        wallet.availableBalanceCents = Math.max(
          0,
          wallet.availableBalanceCents - compensatedDebtCents
        );
        wallet.debtBalanceCents = Math.max(0, wallet.debtBalanceCents - compensatedDebtCents);

        const compLedger: FinancialLedgerItem = {
          id: state.ledger.length + 1,
          tenantId: params.tenantId,
          ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
          operatorId: wallet.operatorId,
          operatorName: wallet.operatorName,
          operationId: params.operationId,
          entryType: 'DEBT_COMPENSATION',
          direction: 'DEBIT',
          amountCents: compensatedDebtCents,
          balanceAfterCents: wallet.availableBalanceCents,
          debtAfterCents: wallet.debtBalanceCents,
          description: `Compensação automática de saldo devedor na operação ${params.operationId} (Ganho ${formatCentsBRL(netEarning)} · Compensado ${formatCentsBRL(compensatedDebtCents)} · Liberado ${formatCentsBRL(releasedAmountCents)})`,
          status: 'POSTED',
          originReference: params.operationId,
          idempotencyKey: `${params.idempotencyKey}-debt-comp`,
          actor: 'SYSTEM_NEXPAY',
          createdAt: now,
        };
        state.ledger.unshift(compLedger);
        ledgerEntriesCreated.push(compLedger);
      }

      wallet.todayEarningsCents += netEarning;
      wallet.weekEarningsCents += netEarning;
      wallet.monthEarningsCents += netEarning;
      wallet.totalCompletedOperations += 1;
      wallet.financialStatus = wallet.debtBalanceCents > 0 ? 'DEBT_PENDING' : 'REGULAR';
      wallet.updatedAt = now;
    } else {
      // Fluxo Pagamento em Dinheiro (CASH):
      // O operador recebeu o valor bruto integral (grossAmountCents) em mãos do cliente.
      // Deve à NexColetas a comissão (platformCommissionCents).
      const commissionDue = remuneration.platformCommissionCents;
      const allowWalletDeduction =
        params.deductCashCommissionFromWallet ?? rule.deductCashCommissionFromBalance;

      // 1. Registra no ledger a obrigação da comissão sobre recebimento em dinheiro
      const obligationLedger: FinancialLedgerItem = {
        id: state.ledger.length + 1,
        tenantId: params.tenantId,
        ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
        operatorId: wallet.operatorId,
        operatorName: wallet.operatorName,
        operationId: params.operationId,
        entryType: 'PLATFORM_COMMISSION_CASH',
        direction: 'CREDIT',
        amountCents: remuneration.netOperatorEarningCents,
        balanceAfterCents: wallet.availableBalanceCents,
        debtAfterCents: wallet.debtBalanceCents,
        description: `Recebimento em espécie pelo operador na operação ${params.operationId} (Total recebido: ${formatCentsBRL(remuneration.grossOperationAmountCents)} · Comissão NexColetas: ${formatCentsBRL(commissionDue)} · Líquido retido em mãos: ${formatCentsBRL(remuneration.netOperatorEarningCents)})`,
        status: 'POSTED',
        originReference: params.operationId,
        idempotencyKey: `${params.idempotencyKey}-cash-receipt`,
        actor: params.actor,
        createdAt: now,
      };
      state.ledger.unshift(obligationLedger);
      ledgerEntriesCreated.push(obligationLedger);

      let deductedFromBalanceCents = 0;
      if (allowWalletDeduction && wallet.availableBalanceCents > 0 && commissionDue > 0) {
        deductedFromBalanceCents = Math.min(wallet.availableBalanceCents, commissionDue);
        wallet.availableBalanceCents -= deductedFromBalanceCents;

        const deductionLedger: FinancialLedgerItem = {
          id: state.ledger.length + 1,
          tenantId: params.tenantId,
          ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
          operatorId: wallet.operatorId,
          operatorName: wallet.operatorName,
          operationId: params.operationId,
          entryType: 'CASH_COMMISSION_DEDUCTION',
          direction: 'DEBIT',
          amountCents: deductedFromBalanceCents,
          balanceAfterCents: wallet.availableBalanceCents,
          debtAfterCents: wallet.debtBalanceCents,
          description: `Desconto de comissão NexColetas em créditos disponíveis referente à operação em espécie ${params.operationId}`,
          status: 'POSTED',
          originReference: params.operationId,
          idempotencyKey: `${params.idempotencyKey}-cash-deduct`,
          actor: 'SYSTEM_NEXPAY',
          createdAt: now,
        };
        state.ledger.unshift(deductionLedger);
        ledgerEntriesCreated.push(deductionLedger);
      }

      const remainingDebtCents = commissionDue - deductedFromBalanceCents;
      if (remainingDebtCents > 0) {
        wallet.debtBalanceCents += remainingDebtCents;

        const newDebt: OperatorDebtItem = {
          id: state.debts.length + 1,
          tenantId: params.tenantId,
          operatorId: wallet.operatorId,
          operatorName: wallet.operatorName,
          operationId: params.operationId,
          originalDebtCents: remainingDebtCents,
          remainingDebtCents,
          status: 'OPEN',
          reason: `Comissão NexColetas pendente de operação paga em espécie ${params.operationId} (Recebido em mãos: ${formatCentsBRL(remuneration.grossOperationAmountCents)})`,
          createdAt: now,
          updatedAt: now,
        };
        state.debts.unshift(newDebt);

        const debtLedger: FinancialLedgerItem = {
          id: state.ledger.length + 1,
          tenantId: params.tenantId,
          ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
          operatorId: wallet.operatorId,
          operatorName: wallet.operatorName,
          operationId: params.operationId,
          entryType: 'DEBT_RECORDED',
          direction: 'DEBIT',
          amountCents: remainingDebtCents,
          balanceAfterCents: wallet.availableBalanceCents,
          debtAfterCents: wallet.debtBalanceCents,
          description: `Registro de saldo devedor de comissão (${formatCentsBRL(remainingDebtCents)}) por saldo disponível insuficiente na operação em espécie ${params.operationId}`,
          status: 'POSTED',
          originReference: params.operationId,
          idempotencyKey: `${params.idempotencyKey}-cash-debt`,
          actor: 'SYSTEM_NEXPAY',
          createdAt: now,
        };
        state.ledger.unshift(debtLedger);
        ledgerEntriesCreated.push(debtLedger);
      }

      cashSettlement = {
        id: state.cashSettlements.length + 1,
        tenantId: params.tenantId,
        operationId: params.operationId,
        operatorId: wallet.operatorId,
        operatorName: wallet.operatorName,
        cashCollectedCents: remuneration.grossOperationAmountCents,
        platformCommissionCents: commissionDue,
        deductedFromBalanceCents,
        remainingDebtCents,
        settlementStatus:
          remainingDebtCents === 0 ? 'DEDUCTED_FROM_WALLET' : 'DEBT_REGISTERED',
        idempotencyKey: params.idempotencyKey,
        createdAt: now,
      };
      state.cashSettlements.unshift(cashSettlement);

      releasedAmountCents = remuneration.netOperatorEarningCents;
      wallet.todayEarningsCents += remuneration.netOperatorEarningCents;
      wallet.weekEarningsCents += remuneration.netOperatorEarningCents;
      wallet.monthEarningsCents += remuneration.netOperatorEarningCents;
      wallet.totalCompletedOperations += 1;
      wallet.financialStatus = wallet.debtBalanceCents > 0 ? 'DEBT_PENDING' : 'REGULAR';
      wallet.updatedAt = now;
    }

    const earning: OperationEarningItem = {
      id: state.earnings.length + 1,
      tenantId: params.tenantId,
      operationId: params.operationId,
      operatorId: wallet.operatorId,
      operatorName: wallet.operatorName,
      paymentMethod: params.paymentMethod,
      grossAmountCents: remuneration.grossOperationAmountCents,
      platformCommissionCents: remuneration.platformCommissionCents,
      netEarningCents: remuneration.netOperatorEarningCents,
      compensatedDebtCents,
      releasedAmountCents,
      ruleCode: rule.ruleCode,
      status: params.paymentMethod === 'CASH' ? 'SETTLED_IN_CASH' : 'RELEASED',
      idempotencyKey: params.idempotencyKey,
      createdAt: now,
    };
    state.earnings.unshift(earning);

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      tenantId: params.tenantId,
      actor: params.actor,
      actorRole: params.actorRole,
      action:
        params.paymentMethod === 'CASH'
          ? 'CASH_OPERATION_SETTLED'
          : 'DIGITAL_OPERATION_SETTLED',
      entityType: 'operation_earnings',
      entityId: params.operationId,
      idempotencyKey: params.idempotencyKey,
      metadataJson: JSON.stringify({
        operatorId: wallet.operatorId,
        paymentMethod: params.paymentMethod,
        grossAmountCents: remuneration.grossOperationAmountCents,
        platformCommissionCents: remuneration.platformCommissionCents,
        netEarningCents: remuneration.netOperatorEarningCents,
        compensatedDebtCents,
        releasedAmountCents,
      }),
      createdAt: now,
    });

    return {
      remuneration,
      earning,
      cashSettlement,
      compensationsCreated,
      ledgerEntriesCreated,
      wallet,
    };
  } finally {
    state.activeLocks.delete(lockKey);
  }
}

/**
 * Regularização de saldo devedor via PIX pelo operador
 */
export function settleOperatorDebtByPixInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    operatorId: string;
    amountCents: number;
    pixReceiptReference: string;
    idempotencyKey: string;
    actor: string;
    actorRole: UserRole;
  }
): {
  wallet: OperatorWalletItem;
  ledgerEntry: FinancialLedgerItem;
  settledCents: number;
} {
  const existingLedger = state.ledger.find(
    (l) => l.idempotencyKey === params.idempotencyKey
  );
  if (existingLedger) {
    throw new Error('Idempotência NexPay: Esta regularização PIX já foi processada.');
  }

  const wallet = state.wallets.find((w) => w.operatorId === params.operatorId);
  if (!wallet) {
    throw new Error(`Operador '${params.operatorId}' não encontrado.`);
  }

  if (wallet.debtBalanceCents <= 0) {
    throw new Error('O operador não possui saldo devedor pendente para regularização.');
  }

  const amountToSettle = Math.min(
    wallet.debtBalanceCents,
    Math.max(0, Math.round(params.amountCents))
  );
  if (amountToSettle <= 0) {
    throw new Error('Informe um valor válido maior que zero para regularizar o saldo devedor.');
  }

  const now = new Date().toISOString();
  let remainingToApply = amountToSettle;
  const openDebts = state.debts
    .filter((d) => d.operatorId === wallet.operatorId && d.remainingDebtCents > 0)
    .sort((a, b) => a.id - b.id);

  for (const debt of openDebts) {
    if (remainingToApply <= 0) break;
    const apply = Math.min(debt.remainingDebtCents, remainingToApply);
    debt.remainingDebtCents -= apply;
    debt.status = debt.remainingDebtCents === 0 ? 'SETTLED' : 'PARTIALLY_PAID';
    debt.updatedAt = now;
    remainingToApply -= apply;
  }

  wallet.debtBalanceCents = Math.max(0, wallet.debtBalanceCents - amountToSettle);
  wallet.financialStatus = wallet.debtBalanceCents > 0 ? 'DEBT_PENDING' : 'REGULAR';
  wallet.updatedAt = now;

  const ledgerEntry: FinancialLedgerItem = {
    id: state.ledger.length + 1,
    tenantId: params.tenantId,
    ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
    operatorId: wallet.operatorId,
    operatorName: wallet.operatorName,
    operationId: null,
    entryType: 'DEBT_PIX_SETTLEMENT',
    direction: 'CREDIT',
    amountCents: amountToSettle,
    balanceAfterCents: wallet.availableBalanceCents,
    debtAfterCents: wallet.debtBalanceCents,
    description: `Regularização de saldo devedor via PIX (${params.pixReceiptReference}) no valor de ${formatCentsBRL(amountToSettle)}`,
    status: 'POSTED',
    originReference: params.pixReceiptReference,
    idempotencyKey: params.idempotencyKey,
    actor: params.actor,
    createdAt: now,
  };
  state.ledger.unshift(ledgerEntry);

  state.auditLogs.unshift({
    id: state.auditLogs.length + 1,
    tenantId: params.tenantId,
    actor: params.actor,
    actorRole: params.actorRole,
    action: 'OPERATOR_DEBT_REGULARIZED_PIX',
    entityType: 'operator_debts',
    entityId: wallet.operatorId,
    idempotencyKey: params.idempotencyKey,
    metadataJson: JSON.stringify({
      settledCents: amountToSettle,
      remainingDebtCents: wallet.debtBalanceCents,
      pixReceiptReference: params.pixReceiptReference,
    }),
    createdAt: now,
  });

  return {
    wallet,
    ledgerEntry,
    settledCents: amountToSettle,
  };
}

/**
 * Solicitação de Saque PIX (Preparação sem transferência PSP real) com
 * bloqueio de concorrência, idempotência e reserva imediata de saldo.
 */
export function requestPixWithdrawalInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    operatorId: string;
    amountCents: number;
    pixKey: string;
    pixKeyType: PixKeyType;
    beneficiaryName: string;
    idempotencyKey: string;
    actor: string;
    actorRole: UserRole;
  }
): {
  withdrawal: WithdrawalRequestItem;
  ledgerEntry: FinancialLedgerItem;
  wallet: OperatorWalletItem;
} {
  assertOperatorAccess(
    params.actorRole,
    params.actorRole === 'OPERATOR' || params.actorRole === 'RIDER'
      ? params.actor
      : params.operatorId,
    params.operatorId
  );

  const lockKey = `wallet-wth:${params.operatorId}`;
  if (state.activeLocks.has(lockKey)) {
    throw new Error(
      `Proteção contra concorrência: Já existe uma solicitação de saque em processamento para o operador '${params.operatorId}'.`
    );
  }

  state.activeLocks.add(lockKey);
  try {
    const duplicateIdem = state.withdrawals.find(
      (w) => w.idempotencyKey === params.idempotencyKey
    );
    if (duplicateIdem) {
      throw new Error(
        `Prevenção de saque duplicado: A solicitação com chave '${params.idempotencyKey}' já foi registrada.`
      );
    }

    const wallet = state.wallets.find((w) => w.operatorId === params.operatorId);
    if (!wallet) {
      throw new Error(`Carteira do operador '${params.operatorId}' não encontrada.`);
    }

    const amountCents = Math.round(params.amountCents);
    if (!Number.isFinite(amountCents) || amountCents < 1000) {
      throw new Error('O valor mínimo para solicitação de saque PIX é de R$ 10,00.');
    }

    if (amountCents > wallet.availableBalanceCents) {
      throw new Error(
        `Saldo disponível insuficiente: Solicitado ${formatCentsBRL(amountCents)}, disponível ${formatCentsBRL(wallet.availableBalanceCents)}.`
      );
    }

    if (!params.pixKey || params.pixKey.trim().length < 3) {
      throw new Error('Informe uma chave PIX válida para o saque.');
    }

    const now = new Date().toISOString();
    // Reserva o saldo imediatamente para impedir saques concorrentes acima do saldo
    wallet.availableBalanceCents -= amountCents;
    wallet.reservedWithdrawalCents += amountCents;
    wallet.updatedAt = now;

    const withdrawalCode = `WTH-2026-${String(state.withdrawals.length + 1).padStart(4, '0')}`;
    const withdrawal: WithdrawalRequestItem = {
      id: state.withdrawals.length + 1,
      tenantId: params.tenantId,
      withdrawalCode,
      operatorId: wallet.operatorId,
      operatorName: wallet.operatorName,
      amountCents,
      pixKey: params.pixKey.trim(),
      pixKeyType: params.pixKeyType,
      beneficiaryName: params.beneficiaryName.trim() || wallet.operatorName,
      status: 'requested',
      rejectionReason: null,
      receiptCode: null,
      idempotencyKey: params.idempotencyKey,
      requestedBy: params.actor,
      reviewedBy: null,
      requestedAt: now,
      updatedAt: now,
    };
    state.withdrawals.unshift(withdrawal);

    const event: WithdrawalEventItem = {
      id: state.withdrawalEvents.length + 1,
      tenantId: params.tenantId,
      withdrawalId: withdrawal.id,
      withdrawalCode,
      fromStatus: 'NONE',
      toStatus: 'requested',
      actor: params.actor,
      note: `Solicitação de saque PIX criada com reserva de saldo de ${formatCentsBRL(amountCents)}.`,
      createdAt: now,
    };
    state.withdrawalEvents.unshift(event);

    const ledgerEntry: FinancialLedgerItem = {
      id: state.ledger.length + 1,
      tenantId: params.tenantId,
      ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
      operatorId: wallet.operatorId,
      operatorName: wallet.operatorName,
      operationId: null,
      entryType: 'WITHDRAWAL_RESERVE',
      direction: 'DEBIT',
      amountCents,
      balanceAfterCents: wallet.availableBalanceCents,
      debtAfterCents: wallet.debtBalanceCents,
      description: `Reserva de saldo para solicitação de saque PIX #${withdrawalCode} (Chave ${params.pixKeyType}: ${params.pixKey})`,
      status: 'POSTED',
      originReference: withdrawalCode,
      idempotencyKey: `${params.idempotencyKey}-reserve`,
      actor: params.actor,
      createdAt: now,
    };
    state.ledger.unshift(ledgerEntry);

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      tenantId: params.tenantId,
      actor: params.actor,
      actorRole: params.actorRole,
      action: 'WITHDRAWAL_REQUESTED',
      entityType: 'withdrawal_requests',
      entityId: withdrawalCode,
      idempotencyKey: params.idempotencyKey,
      metadataJson: JSON.stringify({
        operatorId: wallet.operatorId,
        amountCents,
        pixKeyType: params.pixKeyType,
        availableAfterCents: wallet.availableBalanceCents,
      }),
      createdAt: now,
    });

    return { withdrawal, ledgerEntry, wallet };
  } finally {
    state.activeLocks.delete(lockKey);
  }
}

/**
 * Transição de status de saque PIX (under_review, approved, processing, paid, rejected, cancelled, failed).
 * Quando o saque vai para rejected, cancelled ou failed, devolve o valor reservado ao saldo disponível
 * através de lançamento compensatório no ledger.
 */
export function transitionWithdrawalStatusInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    withdrawalId: number;
    nextStatus: WithdrawalStatus;
    reasonOrNote?: string;
    receiptCode?: string;
    actor: string;
    actorRole: UserRole;
  }
): {
  withdrawal: WithdrawalRequestItem;
  wallet: OperatorWalletItem;
  compensatoryLedger?: FinancialLedgerItem;
} {
  const withdrawal = state.withdrawals.find((w) => w.id === params.withdrawalId);
  if (!withdrawal) {
    throw new Error(`Solicitação de saque #${params.withdrawalId} não encontrada.`);
  }

  // Cancelamento pode ser feito pelo próprio operador quando elegível ('requested' ou 'under_review').
  // Demais transições exigem permissão administrativa.
  if (params.nextStatus === 'cancelled') {
    assertOperatorAccess(
      params.actorRole,
      params.actorRole === 'OPERATOR' || params.actorRole === 'RIDER'
        ? params.actor
        : withdrawal.operatorId,
      withdrawal.operatorId
    );
    if (withdrawal.status !== 'requested' && withdrawal.status !== 'under_review') {
      throw new Error(
        `O saque ${withdrawal.withdrawalCode} não pode ser cancelado no status '${withdrawal.status}'.`
      );
    }
  } else {
    assertAdminPermission(params.actorRole, `Alterar status de saque para ${params.nextStatus}`);
  }

  const terminalStatuses: WithdrawalStatus[] = ['paid', 'rejected', 'cancelled', 'failed'];
  if (terminalStatuses.includes(withdrawal.status)) {
    throw new Error(
      `O saque ${withdrawal.withdrawalCode} já está encerrado com status '${withdrawal.status}'.`
    );
  }

  if (params.nextStatus === 'rejected' && (!params.reasonOrNote || params.reasonOrNote.trim().length < 3)) {
    throw new Error('Informe o motivo da rejeição do saque PIX.');
  }

  const wallet = state.wallets.find((w) => w.operatorId === withdrawal.operatorId);
  if (!wallet) {
    throw new Error(`Carteira do operador '${withdrawal.operatorId}' não encontrada.`);
  }

  const previousStatus = withdrawal.status;
  const now = new Date().toISOString();
  withdrawal.status = params.nextStatus;
  withdrawal.updatedAt = now;

  if (params.nextStatus !== 'cancelled') {
    withdrawal.reviewedBy = params.actor;
  }

  let compensatoryLedger: FinancialLedgerItem | undefined;

  if (
    params.nextStatus === 'rejected' ||
    params.nextStatus === 'cancelled' ||
    params.nextStatus === 'failed'
  ) {
    withdrawal.rejectionReason =
      params.reasonOrNote || `Saque ${params.nextStatus} — valor reservado estornado ao saldo.`;

    // Devolve reserva ao saldo elegível via lançamento compensatório
    wallet.reservedWithdrawalCents = Math.max(
      0,
      wallet.reservedWithdrawalCents - withdrawal.amountCents
    );
    wallet.availableBalanceCents += withdrawal.amountCents;
    wallet.updatedAt = now;

    compensatoryLedger = {
      id: state.ledger.length + 1,
      tenantId: params.tenantId,
      ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
      operatorId: wallet.operatorId,
      operatorName: wallet.operatorName,
      operationId: null,
      entryType: 'WITHDRAWAL_REFUND',
      direction: 'CREDIT',
      amountCents: withdrawal.amountCents,
      balanceAfterCents: wallet.availableBalanceCents,
      debtAfterCents: wallet.debtBalanceCents,
      description: `Lançamento compensatório: Devolução de reserva do saque #${withdrawal.withdrawalCode} (${params.nextStatus.toUpperCase()}) — ${withdrawal.rejectionReason}`,
      status: 'POSTED',
      originReference: withdrawal.withdrawalCode,
      idempotencyKey: `idem-wth-refund-${withdrawal.withdrawalCode}-${params.nextStatus}`,
      actor: params.actor,
      createdAt: now,
    };
    state.ledger.unshift(compensatoryLedger);
  } else if (params.nextStatus === 'paid') {
    wallet.reservedWithdrawalCents = Math.max(
      0,
      wallet.reservedWithdrawalCents - withdrawal.amountCents
    );
    wallet.updatedAt = now;
    withdrawal.receiptCode =
      params.receiptCode || `COMP-MANUAL-${withdrawal.withdrawalCode}`;

    compensatoryLedger = {
      id: state.ledger.length + 1,
      tenantId: params.tenantId,
      ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
      operatorId: wallet.operatorId,
      operatorName: wallet.operatorName,
      operationId: null,
      entryType: 'WITHDRAWAL_PAID',
      direction: 'DEBIT',
      amountCents: withdrawal.amountCents,
      balanceAfterCents: wallet.availableBalanceCents,
      debtAfterCents: wallet.debtBalanceCents,
      description: `Liquidação administrativa de saque PIX #${withdrawal.withdrawalCode} (Comprovante: ${withdrawal.receiptCode} · Sem transferência PSP automática)`,
      status: 'POSTED',
      originReference: withdrawal.withdrawalCode,
      idempotencyKey: `idem-wth-paid-${withdrawal.withdrawalCode}`,
      actor: params.actor,
      createdAt: now,
    };
    state.ledger.unshift(compensatoryLedger);
  }

  state.withdrawalEvents.unshift({
    id: state.withdrawalEvents.length + 1,
    tenantId: params.tenantId,
    withdrawalId: withdrawal.id,
    withdrawalCode: withdrawal.withdrawalCode,
    fromStatus: previousStatus,
    toStatus: params.nextStatus,
    actor: params.actor,
    note:
      params.reasonOrNote ||
      `Status atualizado de '${previousStatus}' para '${params.nextStatus}'.`,
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: state.auditLogs.length + 1,
    tenantId: params.tenantId,
    actor: params.actor,
    actorRole: params.actorRole,
    action: `WITHDRAWAL_STATUS_${params.nextStatus.toUpperCase()}`,
    entityType: 'withdrawal_requests',
    entityId: withdrawal.withdrawalCode,
    idempotencyKey: `audit-${withdrawal.withdrawalCode}-${params.nextStatus}`,
    metadataJson: JSON.stringify({
      fromStatus: previousStatus,
      toStatus: params.nextStatus,
      amountCents: withdrawal.amountCents,
      note: params.reasonOrNote,
    }),
    createdAt: now,
  });

  return { withdrawal, wallet, compensatoryLedger };
}

/**
 * Proibição explícita de exclusão de lançamentos do Ledger Financeiro
 */
export function deleteLedgerEntryInMemory(_ledgerId: number): never {
  throw new Error(
    'Operação proibida pelo NexPay Financial Ledger: Lançamentos financeiros são imutáveis e não podem ser excluídos. Utilize estorno por lançamento compensatório.'
  );
}

/**
 * Estorno de lançamento do Ledger através de lançamento compensatório inverso
 */
export function reverseLedgerEntryInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    ledgerId: number;
    reason: string;
    idempotencyKey: string;
    actor: string;
    actorRole: UserRole;
  }
): {
  originalEntry: FinancialLedgerItem;
  compensatoryEntry: FinancialLedgerItem;
  wallet: OperatorWalletItem;
} {
  assertAdminPermission(params.actorRole, 'Estornar lançamento financeiro do ledger');

  if (!params.reason || params.reason.trim().length < 4) {
    throw new Error('Informe a justificativa de auditoria para o estorno compensatório.');
  }

  const originalEntry = state.ledger.find((l) => l.id === params.ledgerId);
  if (!originalEntry) {
    throw new Error(`Lançamento #${params.ledgerId} não encontrado no ledger.`);
  }

  if (originalEntry.status === 'REVERSED') {
    throw new Error(
      `O lançamento ${originalEntry.ledgerCode} já possui estorno compensatório registrado.`
    );
  }

  if (originalEntry.entryType === 'REVERSAL_COMPENSATORY') {
    throw new Error('Não é permitido estornar um lançamento que já é um estorno compensatório.');
  }

  const wallet = state.wallets.find((w) => w.operatorId === originalEntry.operatorId);
  if (!wallet) {
    throw new Error(`Carteira do operador '${originalEntry.operatorId}' não encontrada.`);
  }

  const inverseDirection = originalEntry.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';

  // Verifica se o estorno de um crédito deixaria o saldo disponível negativo
  if (
    inverseDirection === 'DEBIT' &&
    originalEntry.entryType !== 'DEBT_RECORDED' &&
    wallet.availableBalanceCents < originalEntry.amountCents
  ) {
    throw new Error(
      `Não é possível estornar ${formatCentsBRL(originalEntry.amountCents)} diretamente do saldo disponível (${formatCentsBRL(wallet.availableBalanceCents)}) pois geraria saldo negativo.`
    );
  }

  const now = new Date().toISOString();
  if (originalEntry.entryType === 'DEBT_RECORDED') {
    wallet.debtBalanceCents = Math.max(
      0,
      wallet.debtBalanceCents - originalEntry.amountCents
    );
  } else if (inverseDirection === 'DEBIT') {
    wallet.availableBalanceCents -= originalEntry.amountCents;
  } else {
    wallet.availableBalanceCents += originalEntry.amountCents;
  }

  wallet.financialStatus = wallet.debtBalanceCents > 0 ? 'DEBT_PENDING' : 'REGULAR';
  wallet.updatedAt = now;
  originalEntry.status = 'REVERSED';

  const compensatoryEntry: FinancialLedgerItem = {
    id: state.ledger.length + 1,
    tenantId: params.tenantId,
    ledgerCode: `LDG-2026-${String(state.ledger.length + 1).padStart(4, '0')}`,
    operatorId: wallet.operatorId,
    operatorName: wallet.operatorName,
    operationId: originalEntry.operationId,
    entryType: 'REVERSAL_COMPENSATORY',
    direction: inverseDirection,
    amountCents: originalEntry.amountCents,
    balanceAfterCents: wallet.availableBalanceCents,
    debtAfterCents: wallet.debtBalanceCents,
    description: `Estorno compensatório referente ao lançamento ${originalEntry.ledgerCode}: ${params.reason.trim()}`,
    status: 'POSTED',
    originReference: originalEntry.ledgerCode,
    idempotencyKey: params.idempotencyKey,
    actor: params.actor,
    createdAt: now,
  };
  state.ledger.unshift(compensatoryEntry);

  state.auditLogs.unshift({
    id: state.auditLogs.length + 1,
    tenantId: params.tenantId,
    actor: params.actor,
    actorRole: params.actorRole,
    action: 'LEDGER_COMPENSATORY_REVERSAL',
    entityType: 'financial_ledger',
    entityId: originalEntry.ledgerCode,
    idempotencyKey: params.idempotencyKey,
    metadataJson: JSON.stringify({
      originalLedgerCode: originalEntry.ledgerCode,
      compensatoryLedgerCode: compensatoryEntry.ledgerCode,
      amountCents: originalEntry.amountCents,
      inverseDirection,
      reason: params.reason.trim(),
    }),
    createdAt: now,
  });

  return {
    originalEntry,
    compensatoryEntry,
    wallet,
  };
}

/**
 * Atualização ou criação de regra de comissão (Protegida por permissão administrativa)
 */
export function upsertCommissionRuleInMemory(
  state: NexPayMemoryState,
  params: {
    tenantId: string;
    ruleCode: string;
    name: string;
    serviceCategory: CommissionRuleItem['serviceCategory'];
    region: string;
    isExpress: boolean;
    platformPercentBps: number;
    platformFixedFeeCents: number;
    operatorFixedBaseCents: number;
    perKmRateCents: number;
    perKgRateCents: number;
    incentiveBonusCents: number;
    deductCashCommissionFromBalance: boolean;
    actor: string;
    actorRole: UserRole;
  }
): CommissionRuleItem {
  assertAdminPermission(params.actorRole, 'Configurar taxas e regras de comissão NexPay');

  if (params.platformPercentBps < 0 || params.platformPercentBps > 8000) {
    throw new Error('A taxa percentual da plataforma deve estar entre 0% e 80%.');
  }

  const now = new Date().toISOString();
  const existing = state.rules.find((r) => r.ruleCode === params.ruleCode);

  if (existing) {
    existing.name = params.name.trim();
    existing.serviceCategory = params.serviceCategory;
    existing.region = params.region.trim();
    existing.isExpress = params.isExpress;
    existing.platformPercentBps = Math.round(params.platformPercentBps);
    existing.platformFixedFeeCents = Math.max(0, Math.round(params.platformFixedFeeCents));
    existing.operatorFixedBaseCents = Math.max(0, Math.round(params.operatorFixedBaseCents));
    existing.perKmRateCents = Math.max(0, Math.round(params.perKmRateCents));
    existing.perKgRateCents = Math.max(0, Math.round(params.perKgRateCents));
    existing.incentiveBonusCents = Math.max(0, Math.round(params.incentiveBonusCents));
    existing.deductCashCommissionFromBalance = params.deductCashCommissionFromBalance;
    existing.updatedAt = now;

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      tenantId: params.tenantId,
      actor: params.actor,
      actorRole: params.actorRole,
      action: 'COMMISSION_RULE_UPDATED',
      entityType: 'commission_rules',
      entityId: existing.ruleCode,
      metadataJson: JSON.stringify(existing),
      createdAt: now,
    });

    return existing;
  }

  const created: CommissionRuleItem = {
    id: state.rules.length + 1,
    tenantId: params.tenantId,
    ruleCode: params.ruleCode.trim().toUpperCase(),
    name: params.name.trim(),
    serviceCategory: params.serviceCategory,
    region: params.region.trim(),
    isExpress: params.isExpress,
    platformPercentBps: Math.round(params.platformPercentBps),
    platformFixedFeeCents: Math.max(0, Math.round(params.platformFixedFeeCents)),
    operatorFixedBaseCents: Math.max(0, Math.round(params.operatorFixedBaseCents)),
    perKmRateCents: Math.max(0, Math.round(params.perKmRateCents)),
    perKgRateCents: Math.max(0, Math.round(params.perKgRateCents)),
    incentiveBonusCents: Math.max(0, Math.round(params.incentiveBonusCents)),
    deductCashCommissionFromBalance: params.deductCashCommissionFromBalance,
    isActive: true,
    updatedAt: now,
  };
  state.rules.push(created);

  state.auditLogs.unshift({
    id: state.auditLogs.length + 1,
    tenantId: params.tenantId,
    actor: params.actor,
    actorRole: params.actorRole,
    action: 'COMMISSION_RULE_CREATED',
    entityType: 'commission_rules',
    entityId: created.ruleCode,
    metadataJson: JSON.stringify(created),
    createdAt: now,
  });

  return created;
}

/**
 * Agrega os indicadores executivos para o NexPay Admin (NexColetas Control)
 */
export function computeNexPayAdminMetrics(state: NexPayMemoryState): NexPayAdminMetrics {
  const totalOperatorEarningsCents = state.wallets.reduce(
    (sum, w) => sum + w.monthEarningsCents,
    0
  );
  const totalPendingReleaseCents = state.wallets.reduce(
    (sum, w) => sum + w.pendingReleaseCents,
    0
  );
  const totalAvailableBalanceCents = state.wallets.reduce(
    (sum, w) => sum + w.availableBalanceCents,
    0
  );
  const totalOperatorDebtCents = state.wallets.reduce(
    (sum, w) => sum + w.debtBalanceCents,
    0
  );
  const totalPlatformCommissionsCents = state.earnings.reduce(
    (sum, e) => sum + e.platformCommissionCents,
    0
  );

  const requestedList = state.withdrawals;
  const paidList = state.withdrawals.filter((w) => w.status === 'paid');
  const pendingList = state.withdrawals.filter((w) =>
    ['requested', 'under_review', 'approved', 'processing'].includes(w.status)
  );
  const failedList = state.withdrawals.filter((w) =>
    ['rejected', 'failed'].includes(w.status)
  );

  return {
    totalOperatorEarningsCents,
    totalPendingReleaseCents,
    totalAvailableBalanceCents,
    totalOperatorDebtCents,
    totalPlatformCommissionsCents,
    withdrawalsRequestedCount: requestedList.length,
    withdrawalsRequestedCents: requestedList.reduce((s, w) => s + w.amountCents, 0),
    withdrawalsPaidCount: paidList.length,
    withdrawalsPaidCents: paidList.reduce((s, w) => s + w.amountCents, 0),
    withdrawalsPendingCount: pendingList.length,
    withdrawalsPendingCents: pendingList.reduce((s, w) => s + w.amountCents, 0),
    withdrawalsFailedCount: failedList.length,
    withdrawalsFailedCents: failedList.reduce((s, w) => s + w.amountCents, 0),
  };
}
