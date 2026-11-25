import { desc, eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  cashCollectionSettlements,
  commissionRules,
  compensations,
  financialAuditLogs,
  financialLedger,
  operationEarnings,
  operatorDebts,
  operatorWallets,
  pickups,
  withdrawalEvents,
  withdrawalRequests,
} from '../../../src/db/schema.ts';
import {
  CommissionRuleItem,
  NexPayOverviewResponse,
  PaymentMethodType,
  PixKeyType,
  RemunerationCalculationResult,
  UserRole,
  WithdrawalStatus,
} from '../../../shared/types/index.ts';
import {
  assertAdminPermission,
  assertOperatorAccess,
  calculateOperationRemuneration,
  computeNexPayAdminMetrics,
  createInitialNexPayState,
  deleteLedgerEntryInMemory,
  NexPayMemoryState,
  requestPixWithdrawalInMemory,
  reverseLedgerEntryInMemory,
  settleOperationInMemory,
  settleOperatorDebtByPixInMemory,
  transitionWithdrawalStatusInMemory,
  upsertCommissionRuleInMemory,
} from '../../../shared/nexpay/financialEngine.ts';

// Estado transacional sincronizado com o banco Cloud SQL
const nexpayState: NexPayMemoryState = createInitialNexPayState('tenant_manhuacu_hq');
let dbSeeded = false;

async function syncInitialSeedWithDatabase(): Promise<void> {
  if (dbSeeded) return;
  dbSeeded = true;
  try {
    const existingWallets = await db.select().from(operatorWallets);
    if (existingWallets.length === 0) {
      // Popula tabelas Cloud SQL com a semente inicial de Manhuaçu - MG
      for (const w of nexpayState.wallets) {
        await db
          .insert(operatorWallets)
          .values({
            tenantId: w.tenantId,
            operatorId: w.operatorId,
            operatorName: w.operatorName,
            operatorRole: w.operatorRole,
            city: w.city,
            pixKey: w.pixKey,
            pixKeyType: w.pixKeyType,
            availableBalanceCents: w.availableBalanceCents,
            pendingReleaseCents: w.pendingReleaseCents,
            reservedWithdrawalCents: w.reservedWithdrawalCents,
            debtBalanceCents: w.debtBalanceCents,
            todayEarningsCents: w.todayEarningsCents,
            weekEarningsCents: w.weekEarningsCents,
            monthEarningsCents: w.monthEarningsCents,
            totalCompletedOperations: w.totalCompletedOperations,
            financialStatus: w.financialStatus,
          })
          .onConflictDoNothing();
      }

      for (const r of nexpayState.rules) {
        await db
          .insert(commissionRules)
          .values({
            tenantId: r.tenantId,
            ruleCode: r.ruleCode,
            name: r.name,
            serviceCategory: r.serviceCategory,
            region: r.region,
            isExpress: r.isExpress,
            platformPercentBps: r.platformPercentBps,
            platformFixedFeeCents: r.platformFixedFeeCents,
            operatorFixedBaseCents: r.operatorFixedBaseCents,
            perKmRateCents: r.perKmRateCents,
            perKgRateCents: r.perKgRateCents,
            incentiveBonusCents: r.incentiveBonusCents,
            deductCashCommissionFromBalance: r.deductCashCommissionFromBalance,
            isActive: r.isActive,
          })
          .onConflictDoNothing();
      }

      for (const l of [...nexpayState.ledger].reverse()) {
        await db
          .insert(financialLedger)
          .values({
            tenantId: l.tenantId,
            ledgerCode: l.ledgerCode,
            operatorId: l.operatorId,
            operatorName: l.operatorName,
            operationId: l.operationId,
            entryType: l.entryType,
            direction: l.direction,
            amountCents: l.amountCents,
            balanceAfterCents: l.balanceAfterCents,
            debtAfterCents: l.debtAfterCents,
            description: l.description,
            status: l.status,
            originReference: l.originReference,
            idempotencyKey: l.idempotencyKey,
            actor: l.actor,
          })
          .onConflictDoNothing();
      }

      for (const d of nexpayState.debts) {
        await db.insert(operatorDebts).values({
          tenantId: d.tenantId,
          operatorId: d.operatorId,
          operatorName: d.operatorName,
          operationId: d.operationId,
          originalDebtCents: d.originalDebtCents,
          remainingDebtCents: d.remainingDebtCents,
          status: d.status,
          reason: d.reason,
        });
      }

      for (const wth of nexpayState.withdrawals) {
        await db
          .insert(withdrawalRequests)
          .values({
            tenantId: wth.tenantId,
            withdrawalCode: wth.withdrawalCode,
            operatorId: wth.operatorId,
            operatorName: wth.operatorName,
            amountCents: wth.amountCents,
            pixKey: wth.pixKey,
            pixKeyType: wth.pixKeyType,
            beneficiaryName: wth.beneficiaryName,
            status: wth.status,
            rejectionReason: wth.rejectionReason,
            receiptCode: wth.receiptCode,
            idempotencyKey: wth.idempotencyKey,
            requestedBy: wth.requestedBy,
            reviewedBy: wth.reviewedBy,
          })
          .onConflictDoNothing();
      }
    } else {
      // Hidrata o estado em memória a partir das linhas existentes no banco Cloud SQL
      const [
        dbWallets,
        dbRules,
        dbLedger,
        dbEarnings,
        dbCash,
        dbDebts,
        dbCompensations,
        dbWithdrawals,
        dbEvents,
        dbAudits,
      ] = await Promise.all([
        db.select().from(operatorWallets).orderBy(operatorWallets.id),
        db.select().from(commissionRules).orderBy(commissionRules.id),
        db.select().from(financialLedger).orderBy(desc(financialLedger.id)),
        db.select().from(operationEarnings).orderBy(desc(operationEarnings.id)),
        db
          .select()
          .from(cashCollectionSettlements)
          .orderBy(desc(cashCollectionSettlements.id)),
        db.select().from(operatorDebts).orderBy(desc(operatorDebts.id)),
        db.select().from(compensations).orderBy(desc(compensations.id)),
        db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.id)),
        db.select().from(withdrawalEvents).orderBy(desc(withdrawalEvents.id)),
        db.select().from(financialAuditLogs).orderBy(desc(financialAuditLogs.id)),
      ]);

      if (dbWallets.length > 0) {
        nexpayState.wallets = dbWallets.map((w) => ({
          id: w.id,
          tenantId: w.tenantId,
          operatorId: w.operatorId,
          operatorName: w.operatorName,
          operatorRole: (w.operatorRole as 'OPERATOR' | 'RIDER') || 'OPERATOR',
          city: w.city,
          pixKey: w.pixKey,
          pixKeyType: (w.pixKeyType as PixKeyType) || 'CPF',
          availableBalanceCents: w.availableBalanceCents,
          pendingReleaseCents: w.pendingReleaseCents,
          reservedWithdrawalCents: w.reservedWithdrawalCents,
          debtBalanceCents: w.debtBalanceCents,
          todayEarningsCents: w.todayEarningsCents,
          weekEarningsCents: w.weekEarningsCents,
          monthEarningsCents: w.monthEarningsCents,
          totalCompletedOperations: w.totalCompletedOperations,
          financialStatus:
            (w.financialStatus as 'REGULAR' | 'DEBT_PENDING' | 'BLOCKED') || 'REGULAR',
          updatedAt: w.updatedAt ? w.updatedAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbRules.length > 0) {
        nexpayState.rules = dbRules.map((r) => ({
          id: r.id,
          tenantId: r.tenantId,
          ruleCode: r.ruleCode,
          name: r.name,
          serviceCategory:
            (r.serviceCategory as CommissionRuleItem['serviceCategory']) || 'STANDARD',
          region: r.region,
          isExpress: r.isExpress,
          platformPercentBps: r.platformPercentBps,
          platformFixedFeeCents: r.platformFixedFeeCents,
          operatorFixedBaseCents: r.operatorFixedBaseCents,
          perKmRateCents: r.perKmRateCents,
          perKgRateCents: r.perKgRateCents,
          incentiveBonusCents: r.incentiveBonusCents,
          deductCashCommissionFromBalance: r.deductCashCommissionFromBalance,
          isActive: r.isActive,
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbLedger.length > 0) {
        nexpayState.ledger = dbLedger.map((l) => ({
          id: l.id,
          tenantId: l.tenantId,
          ledgerCode: l.ledgerCode,
          operatorId: l.operatorId,
          operatorName: l.operatorName,
          operationId: l.operationId,
          entryType: l.entryType as NexPayMemoryState['ledger'][number]['entryType'],
          direction: l.direction as 'CREDIT' | 'DEBIT',
          amountCents: l.amountCents,
          balanceAfterCents: l.balanceAfterCents,
          debtAfterCents: l.debtAfterCents,
          description: l.description,
          status: l.status as 'POSTED' | 'PENDING_RELEASE' | 'REVERSED',
          originReference: l.originReference,
          idempotencyKey: l.idempotencyKey,
          actor: l.actor,
          createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbEarnings.length > 0) {
        nexpayState.earnings = dbEarnings.map((e) => ({
          id: e.id,
          tenantId: e.tenantId,
          operationId: e.operationId,
          operatorId: e.operatorId,
          operatorName: e.operatorName,
          paymentMethod: e.paymentMethod as PaymentMethodType,
          grossAmountCents: e.grossAmountCents,
          platformCommissionCents: e.platformCommissionCents,
          netEarningCents: e.netEarningCents,
          compensatedDebtCents: e.compensatedDebtCents,
          releasedAmountCents: e.releasedAmountCents,
          ruleCode: e.ruleCode,
          status: e.status as NexPayMemoryState['earnings'][number]['status'],
          idempotencyKey: e.idempotencyKey,
          createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbCash.length > 0) {
        nexpayState.cashSettlements = dbCash.map((c) => ({
          id: c.id,
          tenantId: c.tenantId,
          operationId: c.operationId,
          operatorId: c.operatorId,
          operatorName: c.operatorName,
          cashCollectedCents: c.cashCollectedCents,
          platformCommissionCents: c.platformCommissionCents,
          deductedFromBalanceCents: c.deductedFromBalanceCents,
          remainingDebtCents: c.remainingDebtCents,
          settlementStatus:
            c.settlementStatus as NexPayMemoryState['cashSettlements'][number]['settlementStatus'],
          idempotencyKey: c.idempotencyKey,
          createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbDebts.length > 0) {
        nexpayState.debts = dbDebts.map((d) => ({
          id: d.id,
          tenantId: d.tenantId,
          operatorId: d.operatorId,
          operatorName: d.operatorName,
          operationId: d.operationId,
          originalDebtCents: d.originalDebtCents,
          remainingDebtCents: d.remainingDebtCents,
          status: d.status as 'OPEN' | 'PARTIALLY_PAID' | 'SETTLED',
          reason: d.reason,
          createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: d.updatedAt ? d.updatedAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbCompensations.length > 0) {
        nexpayState.compensations = dbCompensations.map((c) => ({
          id: c.id,
          tenantId: c.tenantId,
          operatorId: c.operatorId,
          operatorName: c.operatorName,
          sourceOperationId: c.sourceOperationId,
          debtId: c.debtId,
          grossEarningCents: c.grossEarningCents,
          compensatedCents: c.compensatedCents,
          netReleasedCents: c.netReleasedCents,
          idempotencyKey: c.idempotencyKey,
          createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbWithdrawals.length > 0) {
        nexpayState.withdrawals = dbWithdrawals.map((w) => ({
          id: w.id,
          tenantId: w.tenantId,
          withdrawalCode: w.withdrawalCode,
          operatorId: w.operatorId,
          operatorName: w.operatorName,
          amountCents: w.amountCents,
          pixKey: w.pixKey,
          pixKeyType: w.pixKeyType as PixKeyType,
          beneficiaryName: w.beneficiaryName,
          status: w.status as WithdrawalStatus,
          rejectionReason: w.rejectionReason,
          receiptCode: w.receiptCode,
          idempotencyKey: w.idempotencyKey,
          requestedBy: w.requestedBy,
          reviewedBy: w.reviewedBy,
          requestedAt: w.requestedAt
            ? w.requestedAt.toISOString()
            : new Date().toISOString(),
          updatedAt: w.updatedAt ? w.updatedAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbEvents.length > 0) {
        nexpayState.withdrawalEvents = dbEvents.map((ev) => ({
          id: ev.id,
          tenantId: ev.tenantId,
          withdrawalId: ev.withdrawalId,
          withdrawalCode: ev.withdrawalCode,
          fromStatus: ev.fromStatus,
          toStatus: ev.toStatus as WithdrawalStatus,
          actor: ev.actor,
          note: ev.note,
          createdAt: ev.createdAt ? ev.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
      if (dbAudits.length > 0) {
        nexpayState.auditLogs = dbAudits.map((a) => ({
          id: a.id,
          tenantId: a.tenantId,
          actor: a.actor,
          actorRole: a.actorRole as UserRole,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          idempotencyKey: a.idempotencyKey,
          metadataJson: a.metadataJson,
          createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.error('NexPay DB seed/hydration warning (using transactional memory store):', err);
  }
}

async function persistWalletUpdateToDb(operatorId: string): Promise<void> {
  const w = nexpayState.wallets.find((item) => item.operatorId === operatorId);
  if (!w) return;
  try {
    await db
      .update(operatorWallets)
      .set({
        availableBalanceCents: w.availableBalanceCents,
        pendingReleaseCents: w.pendingReleaseCents,
        reservedWithdrawalCents: w.reservedWithdrawalCents,
        debtBalanceCents: w.debtBalanceCents,
        todayEarningsCents: w.todayEarningsCents,
        weekEarningsCents: w.weekEarningsCents,
        monthEarningsCents: w.monthEarningsCents,
        totalCompletedOperations: w.totalCompletedOperations,
        financialStatus: w.financialStatus,
        updatedAt: new Date(),
      })
      .where(eq(operatorWallets.operatorId, operatorId));
  } catch (err) {
    console.error('Failed to persist wallet update to DB:', err);
  }
}

/**
 * Retorna visão consolidada do NexPay respeitando o isolamento entre operadores.
 * Se callerRole for OPERATOR ou RIDER, retorna exclusivamente os dados do seu operatorId.
 */
export async function getNexPayOverview(params: {
  tenantId: string;
  callerRole: UserRole;
  callerOperatorId?: string;
  filterOperatorId?: string;
}): Promise<NexPayOverviewResponse> {
  await syncInitialSeedWithDatabase();

  const isOperatorScoped =
    params.callerRole === 'OPERATOR' || params.callerRole === 'RIDER';

  const effectiveOperatorFilter = isOperatorScoped
    ? params.callerOperatorId || 'OP-101'
    : params.filterOperatorId;

  if (isOperatorScoped && params.filterOperatorId) {
    assertOperatorAccess(
      params.callerRole,
      effectiveOperatorFilter,
      params.filterOperatorId
    );
  }

  const wallets = effectiveOperatorFilter
    ? nexpayState.wallets.filter((w) => w.operatorId === effectiveOperatorFilter)
    : nexpayState.wallets;

  const ledger = effectiveOperatorFilter
    ? nexpayState.ledger.filter((l) => l.operatorId === effectiveOperatorFilter)
    : nexpayState.ledger;

  const earnings = effectiveOperatorFilter
    ? nexpayState.earnings.filter((e) => e.operatorId === effectiveOperatorFilter)
    : nexpayState.earnings;

  const cashSettlements = effectiveOperatorFilter
    ? nexpayState.cashSettlements.filter(
        (c) => c.operatorId === effectiveOperatorFilter
      )
    : nexpayState.cashSettlements;

  const debts = effectiveOperatorFilter
    ? nexpayState.debts.filter((d) => d.operatorId === effectiveOperatorFilter)
    : nexpayState.debts;

  const compensationsList = effectiveOperatorFilter
    ? nexpayState.compensations.filter(
        (c) => c.operatorId === effectiveOperatorFilter
      )
    : nexpayState.compensations;

  const withdrawals = effectiveOperatorFilter
    ? nexpayState.withdrawals.filter(
        (w) => w.operatorId === effectiveOperatorFilter
      )
    : nexpayState.withdrawals;

  const withdrawalIds = new Set(withdrawals.map((w) => w.id));
  const withdrawalEventsList = effectiveOperatorFilter
    ? nexpayState.withdrawalEvents.filter((ev) =>
        withdrawalIds.has(ev.withdrawalId)
      )
    : nexpayState.withdrawalEvents;

  const metrics = computeNexPayAdminMetrics({
    ...nexpayState,
    wallets,
    earnings,
    withdrawals,
  });

  return {
    metrics,
    wallets,
    ledger,
    rules: nexpayState.rules,
    earnings,
    cashSettlements,
    debts,
    compensations: compensationsList,
    withdrawals,
    withdrawalEvents: withdrawalEventsList,
    auditLogs: isOperatorScoped ? [] : nexpayState.auditLogs.slice(0, 30),
  };
}

/**
 * Simulador de remuneração estimada antes do aceite da operação
 */
export async function previewOperationRemuneration(params: {
  grossOperationAmountCents: number;
  distanceKm: number;
  weightKg: number;
  ruleCode?: string;
}): Promise<RemunerationCalculationResult> {
  await syncInitialSeedWithDatabase();
  const rule =
    nexpayState.rules.find((r) => r.ruleCode === params.ruleCode && r.isActive) ||
    nexpayState.rules[0];

  return calculateOperationRemuneration({
    grossOperationAmountCents: params.grossOperationAmountCents,
    distanceKm: params.distanceKm,
    weightKg: params.weightKg,
    serviceCategory: rule.serviceCategory,
    region: rule.region,
    isExpress: rule.isExpress,
    rule,
  });
}

/**
 * Liquida operação concluída (Digital ou Dinheiro/Cash) e persiste no banco Cloud SQL
 */
export async function settleOperation(params: {
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
}) {
  await syncInitialSeedWithDatabase();
  const result = settleOperationInMemory(nexpayState, params);

  try {
    await persistWalletUpdateToDb(params.operatorId);

    await db
      .insert(operationEarnings)
      .values({
        tenantId: result.earning.tenantId,
        operationId: result.earning.operationId,
        operatorId: result.earning.operatorId,
        operatorName: result.earning.operatorName,
        paymentMethod: result.earning.paymentMethod,
        grossAmountCents: result.earning.grossAmountCents,
        platformCommissionCents: result.earning.platformCommissionCents,
        netEarningCents: result.earning.netEarningCents,
        compensatedDebtCents: result.earning.compensatedDebtCents,
        releasedAmountCents: result.earning.releasedAmountCents,
        ruleCode: result.earning.ruleCode,
        status: result.earning.status,
        idempotencyKey: result.earning.idempotencyKey,
      })
      .onConflictDoNothing();

    if (result.cashSettlement) {
      await db
        .insert(cashCollectionSettlements)
        .values({
          tenantId: result.cashSettlement.tenantId,
          operationId: result.cashSettlement.operationId,
          operatorId: result.cashSettlement.operatorId,
          operatorName: result.cashSettlement.operatorName,
          cashCollectedCents: result.cashSettlement.cashCollectedCents,
          platformCommissionCents: result.cashSettlement.platformCommissionCents,
          deductedFromBalanceCents: result.cashSettlement.deductedFromBalanceCents,
          remainingDebtCents: result.cashSettlement.remainingDebtCents,
          settlementStatus: result.cashSettlement.settlementStatus,
          idempotencyKey: result.cashSettlement.idempotencyKey,
        })
        .onConflictDoNothing();
    }

    for (const entry of result.ledgerEntriesCreated) {
      await db
        .insert(financialLedger)
        .values({
          tenantId: entry.tenantId,
          ledgerCode: entry.ledgerCode,
          operatorId: entry.operatorId,
          operatorName: entry.operatorName,
          operationId: entry.operationId,
          entryType: entry.entryType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          balanceAfterCents: entry.balanceAfterCents,
          debtAfterCents: entry.debtAfterCents,
          description: entry.description,
          status: entry.status,
          originReference: entry.originReference,
          idempotencyKey: entry.idempotencyKey,
          actor: entry.actor,
        })
        .onConflictDoNothing();
    }

    for (const comp of result.compensationsCreated) {
      await db
        .insert(compensations)
        .values({
          tenantId: comp.tenantId,
          operatorId: comp.operatorId,
          operatorName: comp.operatorName,
          sourceOperationId: comp.sourceOperationId,
          debtId: comp.debtId,
          grossEarningCents: comp.grossEarningCents,
          compensatedCents: comp.compensatedCents,
          netReleasedCents: comp.netReleasedCents,
          idempotencyKey: comp.idempotencyKey,
        })
        .onConflictDoNothing();
    }

    // Marca a coleta como liquidada caso exista na tabela pickups
    await db
      .update(pickups)
      .set({
        status: 'COMPLETED',
        paymentMethod: params.paymentMethod,
        financialSettled: true,
        operatorId: params.operatorId,
      })
      .where(eq(pickups.protocol, params.operationId));
  } catch (err) {
    console.error('Error persisting NexPay settlement to DB:', err);
  }

  return result;
}

/**
 * Regulariza saldo devedor de operador via PIX
 */
export async function settleOperatorDebtByPix(params: {
  tenantId: string;
  operatorId: string;
  amountCents: number;
  pixReceiptReference: string;
  idempotencyKey: string;
  actor: string;
  actorRole: UserRole;
}) {
  await syncInitialSeedWithDatabase();
  const result = settleOperatorDebtByPixInMemory(nexpayState, params);

  try {
    await persistWalletUpdateToDb(params.operatorId);
    await db
      .insert(financialLedger)
      .values({
        tenantId: result.ledgerEntry.tenantId,
        ledgerCode: result.ledgerEntry.ledgerCode,
        operatorId: result.ledgerEntry.operatorId,
        operatorName: result.ledgerEntry.operatorName,
        operationId: result.ledgerEntry.operationId,
        entryType: result.ledgerEntry.entryType,
        direction: result.ledgerEntry.direction,
        amountCents: result.ledgerEntry.amountCents,
        balanceAfterCents: result.ledgerEntry.balanceAfterCents,
        debtAfterCents: result.ledgerEntry.debtAfterCents,
        description: result.ledgerEntry.description,
        status: result.ledgerEntry.status,
        originReference: result.ledgerEntry.originReference,
        idempotencyKey: result.ledgerEntry.idempotencyKey,
        actor: result.ledgerEntry.actor,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error('Error persisting PIX debt regularization to DB:', err);
  }

  return result;
}

/**
 * Cria solicitação de saque PIX com reserva imediata de saldo
 */
export async function requestPixWithdrawal(params: {
  tenantId: string;
  operatorId: string;
  amountCents: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  beneficiaryName: string;
  idempotencyKey: string;
  actor: string;
  actorRole: UserRole;
}) {
  await syncInitialSeedWithDatabase();
  const result = requestPixWithdrawalInMemory(nexpayState, params);

  try {
    await persistWalletUpdateToDb(params.operatorId);
    await db
      .insert(withdrawalRequests)
      .values({
        tenantId: result.withdrawal.tenantId,
        withdrawalCode: result.withdrawal.withdrawalCode,
        operatorId: result.withdrawal.operatorId,
        operatorName: result.withdrawal.operatorName,
        amountCents: result.withdrawal.amountCents,
        pixKey: result.withdrawal.pixKey,
        pixKeyType: result.withdrawal.pixKeyType,
        beneficiaryName: result.withdrawal.beneficiaryName,
        status: result.withdrawal.status,
        idempotencyKey: result.withdrawal.idempotencyKey,
        requestedBy: result.withdrawal.requestedBy,
      })
      .onConflictDoNothing();

    await db
      .insert(financialLedger)
      .values({
        tenantId: result.ledgerEntry.tenantId,
        ledgerCode: result.ledgerEntry.ledgerCode,
        operatorId: result.ledgerEntry.operatorId,
        operatorName: result.ledgerEntry.operatorName,
        operationId: result.ledgerEntry.operationId,
        entryType: result.ledgerEntry.entryType,
        direction: result.ledgerEntry.direction,
        amountCents: result.ledgerEntry.amountCents,
        balanceAfterCents: result.ledgerEntry.balanceAfterCents,
        debtAfterCents: result.ledgerEntry.debtAfterCents,
        description: result.ledgerEntry.description,
        status: result.ledgerEntry.status,
        originReference: result.ledgerEntry.originReference,
        idempotencyKey: result.ledgerEntry.idempotencyKey,
        actor: result.ledgerEntry.actor,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error('Error persisting withdrawal request to DB:', err);
  }

  return result;
}

/**
 * Atualiza status de saque PIX (com estorno compensatório automático se cancelado, rejeitado ou falho)
 */
export async function transitionWithdrawalStatus(params: {
  tenantId: string;
  withdrawalId: number;
  nextStatus: WithdrawalStatus;
  reasonOrNote?: string;
  receiptCode?: string;
  actor: string;
  actorRole: UserRole;
}) {
  await syncInitialSeedWithDatabase();
  const result = transitionWithdrawalStatusInMemory(nexpayState, params);

  try {
    await persistWalletUpdateToDb(result.wallet.operatorId);
    await db
      .update(withdrawalRequests)
      .set({
        status: result.withdrawal.status,
        rejectionReason: result.withdrawal.rejectionReason,
        receiptCode: result.withdrawal.receiptCode,
        reviewedBy: result.withdrawal.reviewedBy,
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.withdrawalCode, result.withdrawal.withdrawalCode));

    if (result.compensatoryLedger) {
      await db
        .insert(financialLedger)
        .values({
          tenantId: result.compensatoryLedger.tenantId,
          ledgerCode: result.compensatoryLedger.ledgerCode,
          operatorId: result.compensatoryLedger.operatorId,
          operatorName: result.compensatoryLedger.operatorName,
          operationId: result.compensatoryLedger.operationId,
          entryType: result.compensatoryLedger.entryType,
          direction: result.compensatoryLedger.direction,
          amountCents: result.compensatoryLedger.amountCents,
          balanceAfterCents: result.compensatoryLedger.balanceAfterCents,
          debtAfterCents: result.compensatoryLedger.debtAfterCents,
          description: result.compensatoryLedger.description,
          status: result.compensatoryLedger.status,
          originReference: result.compensatoryLedger.originReference,
          idempotencyKey: result.compensatoryLedger.idempotencyKey,
          actor: result.compensatoryLedger.actor,
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error('Error persisting withdrawal status transition to DB:', err);
  }

  return result;
}

/**
 * Estorna um lançamento do ledger através de lançamento compensatório inverso
 */
export async function reverseLedgerEntry(params: {
  tenantId: string;
  ledgerId: number;
  reason: string;
  idempotencyKey: string;
  actor: string;
  actorRole: UserRole;
}) {
  await syncInitialSeedWithDatabase();
  const result = reverseLedgerEntryInMemory(nexpayState, params);

  try {
    await persistWalletUpdateToDb(result.wallet.operatorId);
    await db
      .update(financialLedger)
      .set({ status: 'REVERSED' })
      .where(eq(financialLedger.ledgerCode, result.originalEntry.ledgerCode));

    await db
      .insert(financialLedger)
      .values({
        tenantId: result.compensatoryEntry.tenantId,
        ledgerCode: result.compensatoryEntry.ledgerCode,
        operatorId: result.compensatoryEntry.operatorId,
        operatorName: result.compensatoryEntry.operatorName,
        operationId: result.compensatoryEntry.operationId,
        entryType: result.compensatoryEntry.entryType,
        direction: result.compensatoryEntry.direction,
        amountCents: result.compensatoryEntry.amountCents,
        balanceAfterCents: result.compensatoryEntry.balanceAfterCents,
        debtAfterCents: result.compensatoryEntry.debtAfterCents,
        description: result.compensatoryEntry.description,
        status: result.compensatoryEntry.status,
        originReference: result.compensatoryEntry.originReference,
        idempotencyKey: result.compensatoryEntry.idempotencyKey,
        actor: result.compensatoryEntry.actor,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error('Error persisting ledger compensatory reversal to DB:', err);
  }

  return result;
}

/**
 * Bloqueia exclusão física de lançamento do ledger
 */
export function attemptDeleteLedgerEntry(ledgerId: number): never {
  return deleteLedgerEntryInMemory(ledgerId);
}

/**
 * Cria ou atualiza regra de comissão NexPay (exclusivo Admin)
 */
export async function upsertCommissionRule(params: {
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
}) {
  await syncInitialSeedWithDatabase();
  assertAdminPermission(params.actorRole, 'Salvar Regra de Comissão NexPay');
  const rule = upsertCommissionRuleInMemory(nexpayState, params);

  try {
    await db
      .insert(commissionRules)
      .values({
        tenantId: rule.tenantId,
        ruleCode: rule.ruleCode,
        name: rule.name,
        serviceCategory: rule.serviceCategory,
        region: rule.region,
        isExpress: rule.isExpress,
        platformPercentBps: rule.platformPercentBps,
        platformFixedFeeCents: rule.platformFixedFeeCents,
        operatorFixedBaseCents: rule.operatorFixedBaseCents,
        perKmRateCents: rule.perKmRateCents,
        perKgRateCents: rule.perKgRateCents,
        incentiveBonusCents: rule.incentiveBonusCents,
        deductCashCommissionFromBalance: rule.deductCashCommissionFromBalance,
        isActive: rule.isActive,
      })
      .onConflictDoUpdate({
        target: commissionRules.ruleCode,
        set: {
          name: rule.name,
          serviceCategory: rule.serviceCategory,
          region: rule.region,
          isExpress: rule.isExpress,
          platformPercentBps: rule.platformPercentBps,
          platformFixedFeeCents: rule.platformFixedFeeCents,
          operatorFixedBaseCents: rule.operatorFixedBaseCents,
          perKmRateCents: rule.perKmRateCents,
          perKgRateCents: rule.perKgRateCents,
          incentiveBonusCents: rule.incentiveBonusCents,
          deductCashCommissionFromBalance: rule.deductCashCommissionFromBalance,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.error('Error persisting commission rule to DB:', err);
  }

  return rule;
}
