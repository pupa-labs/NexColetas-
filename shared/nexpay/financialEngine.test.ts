import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAdminPermission,
  assertOperatorAccess,
  calculateOperationRemuneration,
  createInitialNexPayState,
  deleteLedgerEntryInMemory,
  requestPixWithdrawalInMemory,
  reverseLedgerEntryInMemory,
  settleOperationInMemory,
  settleOperatorDebtByPixInMemory,
  transitionWithdrawalStatusInMemory,
  upsertCommissionRuleInMemory,
} from './financialEngine.ts';

test('1. Operação concluída gerando remuneração (R$ 50,00 com taxa 20% -> R$ 10,00 comissão e R$ 40,00 líquido)', () => {
  const state = createInitialNexPayState();
  const rule = state.rules[0]; // 20% (2000 bps)

  const calc = calculateOperationRemuneration({
    grossOperationAmountCents: 5000, // R$ 50,00
    distanceKm: 4.0,
    weightKg: 2.0,
    serviceCategory: 'STANDARD',
    region: 'Manhuaçu - MG',
    isExpress: false,
    rule,
  });

  assert.equal(calc.grossOperationAmountCents, 5000);
  assert.equal(calc.platformCommissionCents, 1000); // R$ 10,00
  assert.equal(calc.netOperatorEarningCents, 4000); // R$ 40,00
});

test('2 & 4. Pagamento em dinheiro gerando comissão devida e desconto em operador com saldo suficiente', () => {
  const state = createInitialNexPayState();
  // OP-102 possui R$ 285,00 de saldo disponível e R$ 0,00 de dívida
  const initialBalance = 28500;

  const result = settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-CASH-001',
    operatorId: 'OP-102',
    paymentMethod: 'CASH',
    grossAmountCents: 5000, // R$ 50,00 recebidos em espécie pelo operador
    idempotencyKey: 'idem-cash-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.equal(result.remuneration.platformCommissionCents, 1000); // R$ 10,00 de comissão
  assert.ok(result.cashSettlement);
  assert.equal(result.cashSettlement.cashCollectedCents, 5000);
  assert.equal(result.cashSettlement.platformCommissionCents, 1000);
  assert.equal(result.cashSettlement.deductedFromBalanceCents, 1000);
  assert.equal(result.cashSettlement.remainingDebtCents, 0);
  assert.equal(result.cashSettlement.settlementStatus, 'DEDUCTED_FROM_WALLET');
  assert.equal(result.wallet.availableBalanceCents, initialBalance - 1000);
  assert.equal(result.wallet.debtBalanceCents, 0);
});

test('3. Pagamento digital gerando fluxo financeiro correto', () => {
  const state = createInitialNexPayState();
  // OP-102 possui R$ 285,00 de saldo disponível e R$ 0,00 de dívida
  const initialBalance = 28500;

  const result = settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-DIG-001',
    operatorId: 'OP-102',
    paymentMethod: 'DIGITAL',
    grossAmountCents: 5000, // R$ 50,00
    idempotencyKey: 'idem-dig-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.equal(result.earning.grossAmountCents, 5000);
  assert.equal(result.earning.platformCommissionCents, 1000);
  assert.equal(result.earning.netEarningCents, 4000);
  assert.equal(result.earning.releasedAmountCents, 4000);
  assert.equal(result.wallet.availableBalanceCents, initialBalance + 4000);
});

test('5. Operador sem saldo recebendo em dinheiro gera saldo devedor sem saldo negativo', () => {
  const state = createInitialNexPayState();
  // OP-103 possui R$ 0,00 de saldo disponível e R$ 24,00 (2400 cents) de dívida inicial
  const result = settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-CASH-NO-BAL-001',
    operatorId: 'OP-103',
    paymentMethod: 'CASH',
    grossAmountCents: 6000, // R$ 60,00 em espécie -> Comissão 20% = R$ 12,00 (1200 cents)
    idempotencyKey: 'idem-cash-no-bal-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.ok(result.cashSettlement);
  assert.equal(result.cashSettlement.deductedFromBalanceCents, 0);
  assert.equal(result.cashSettlement.remainingDebtCents, 1200);
  assert.equal(result.cashSettlement.settlementStatus, 'DEBT_REGISTERED');
  assert.equal(result.wallet.availableBalanceCents, 0); // Nunca negativo!
  assert.equal(result.wallet.debtBalanceCents, 2400 + 1200); // R$ 36,00
  assert.equal(result.wallet.financialStatus, 'DEBT_PENDING');
});

test('6. Compensação de saldo devedor (Dívida R$ 18,00 -> Ganho líquido R$ 50,00 -> Compensação R$ 18,00 -> Saldo liberado R$ 32,00) e regularização PIX', () => {
  const state = createInitialNexPayState();
  // OP-101 inicia com saldo disponível R$ 142,00 (14200) e saldo devedor R$ 18,00 (1800)
  // Para ter um ganho líquido de R$ 50,00 (5000 cents) com taxa de 20%, a operação bruta é R$ 62,50 (6250 cents)
  const result = settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-COMP-001',
    operatorId: 'OP-101',
    paymentMethod: 'DIGITAL',
    grossAmountCents: 6250, // Bruto R$ 62,50 -> Comissão 20% = R$ 12,50 -> Ganho líquido = R$ 50,00 (5000 cents)
    idempotencyKey: 'idem-comp-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.equal(result.earning.netEarningCents, 5000); // Ganho: R$ 50,00
  assert.equal(result.earning.compensatedDebtCents, 1800); // Compensação: R$ 18,00
  assert.equal(result.earning.releasedAmountCents, 3200); // Saldo liberado: R$ 32,00
  assert.equal(result.wallet.debtBalanceCents, 0);
  assert.equal(result.wallet.availableBalanceCents, 14200 + 3200);
  assert.equal(result.ledgerEntriesCreated.length, 2); // Lançamentos separados e rastreáveis (OPERATION_EARNING + DEBT_COMPENSATION)
  assert.equal(result.ledgerEntriesCreated[0].entryType, 'OPERATION_EARNING');
  assert.equal(result.ledgerEntriesCreated[1].entryType, 'DEBT_COMPENSATION');

  // Testar também regularização direta via PIX no operador OP-103 (dívida R$ 24,00)
  const pixReg = settleOperatorDebtByPixInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operatorId: 'OP-103',
    amountCents: 2400,
    pixReceiptReference: 'PIX-E2E-998877',
    idempotencyKey: 'idem-pix-reg-op103',
    actor: 'OP-103',
    actorRole: 'OPERATOR',
  });
  assert.equal(pixReg.settledCents, 2400);
  assert.equal(pixReg.wallet.debtBalanceCents, 0);
  assert.equal(pixReg.wallet.financialStatus, 'REGULAR');
});

test('7. Comissão duplicada bloqueada por idempotência e identificador único de operação', () => {
  const state = createInitialNexPayState();

  settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-DUP-001',
    operatorId: 'OP-102',
    paymentMethod: 'CASH',
    grossAmountCents: 5000,
    idempotencyKey: 'idem-dup-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.throws(
    () =>
      settleOperationInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        operationId: 'NX-DUP-001',
        operatorId: 'OP-102',
        paymentMethod: 'CASH',
        grossAmountCents: 5000,
        idempotencyKey: 'idem-dup-002',
        actor: 'SUPER_ADMIN',
        actorRole: 'SUPER_ADMIN',
      }),
    /Idempotência NexPay/
  );
});

test('8 & 9. Saque acima do saldo e dois saques concorrentes/duplicados bloqueados por reserva de saldo e lock', () => {
  const state = createInitialNexPayState();
  // OP-101 tem R$ 142,00 (14200 cents) disponível

  // 8. Saque acima do saldo disponível (R$ 200,00 > R$ 142,00)
  assert.throws(
    () =>
      requestPixWithdrawalInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        operatorId: 'OP-101',
        amountCents: 20000,
        pixKey: '111.444.777-35',
        pixKeyType: 'CPF',
        beneficiaryName: 'Lucas Ferreira',
        idempotencyKey: 'idem-wth-above-1',
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Saldo disponível insuficiente/
  );

  // Primeiro saque válido de R$ 100,00 (10000 cents) -> Reserva R$ 100,00, sobra R$ 42,00
  const firstWth = requestPixWithdrawalInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operatorId: 'OP-101',
    amountCents: 10000,
    pixKey: '111.444.777-35',
    pixKeyType: 'CPF',
    beneficiaryName: 'Lucas Ferreira',
    idempotencyKey: 'idem-wth-valid-1',
    actor: 'OP-101',
    actorRole: 'OPERATOR',
  });

  assert.equal(firstWth.wallet.availableBalanceCents, 4200);
  assert.equal(firstWth.wallet.reservedWithdrawalCents, 10000);

  // 9a. Segundo saque tentando sacar R$ 50,00 (que era menor que os R$ 142,00 originais, mas maior que os R$ 42,00 restantes após a reserva)
  assert.throws(
    () =>
      requestPixWithdrawalInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        operatorId: 'OP-101',
        amountCents: 5000,
        pixKey: '111.444.777-35',
        pixKeyType: 'CPF',
        beneficiaryName: 'Lucas Ferreira',
        idempotencyKey: 'idem-wth-concurrent-2',
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Saldo disponível insuficiente/
  );

  // 9b. Lock ativo de concorrência impede requisição simultânea na mesma carteira
  state.activeLocks.add('wallet-wth:OP-101');
  assert.throws(
    () =>
      requestPixWithdrawalInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        operatorId: 'OP-101',
        amountCents: 2000,
        pixKey: '111.444.777-35',
        pixKeyType: 'CPF',
        beneficiaryName: 'Lucas Ferreira',
        idempotencyKey: 'idem-wth-locked-3',
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Proteção contra concorrência/
  );
  state.activeLocks.delete('wallet-wth:OP-101');
});

test('10, 11 & 12. Saque cancelado, rejeitado e falho devolvem valor reservado ao saldo disponível via lançamento compensatório', () => {
  const state = createInitialNexPayState();
  // OP-101 inicia com R$ 142,00 disponível

  // 10. Saque cancelado pelo operador
  const w1 = requestPixWithdrawalInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operatorId: 'OP-101',
    amountCents: 3000,
    pixKey: '111.444.777-35',
    pixKeyType: 'CPF',
    beneficiaryName: 'Lucas Ferreira',
    idempotencyKey: 'idem-wth-cancel',
    actor: 'OP-101',
    actorRole: 'OPERATOR',
  });
  assert.equal(w1.wallet.availableBalanceCents, 11200);

  const cancelled = transitionWithdrawalStatusInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    withdrawalId: w1.withdrawal.id,
    nextStatus: 'cancelled',
    reasonOrNote: 'Cancelado a pedido do operador',
    actor: 'OP-101',
    actorRole: 'OPERATOR',
  });
  assert.equal(cancelled.withdrawal.status, 'cancelled');
  assert.equal(cancelled.wallet.availableBalanceCents, 14200);
  assert.equal(cancelled.compensatoryLedger?.entryType, 'WITHDRAWAL_REFUND');

  // 11. Saque rejeitado pela administração com motivo
  const w2 = requestPixWithdrawalInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operatorId: 'OP-101',
    amountCents: 4000,
    pixKey: '111.444.777-35',
    pixKeyType: 'CPF',
    beneficiaryName: 'Lucas Ferreira',
    idempotencyKey: 'idem-wth-reject',
    actor: 'OP-101',
    actorRole: 'OPERATOR',
  });
  assert.equal(w2.wallet.availableBalanceCents, 10200);

  const rejected = transitionWithdrawalStatusInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    withdrawalId: w2.withdrawal.id,
    nextStatus: 'rejected',
    reasonOrNote: 'Divergência de titularidade da chave PIX informada',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });
  assert.equal(rejected.withdrawal.status, 'rejected');
  assert.equal(rejected.wallet.availableBalanceCents, 14200);
  assert.equal(rejected.compensatoryLedger?.entryType, 'WITHDRAWAL_REFUND');

  // 12. Saque falho devolve saldo reservado via lançamento compensatório
  const w3 = requestPixWithdrawalInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operatorId: 'OP-101',
    amountCents: 5000,
    pixKey: '111.444.777-35',
    pixKeyType: 'CPF',
    beneficiaryName: 'Lucas Ferreira',
    idempotencyKey: 'idem-wth-fail',
    actor: 'OP-101',
    actorRole: 'OPERATOR',
  });
  assert.equal(w3.wallet.availableBalanceCents, 9200);

  const failed = transitionWithdrawalStatusInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    withdrawalId: w3.withdrawal.id,
    nextStatus: 'failed',
    reasonOrNote: 'Chave PIX indisponível na instituição destinatária',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });
  assert.equal(failed.withdrawal.status, 'failed');
  assert.equal(failed.wallet.availableBalanceCents, 14200);
  assert.equal(failed.compensatoryLedger?.entryType, 'WITHDRAWAL_REFUND');
});

test('13. Estorno por lançamento compensatório e proibição de exclusão de ledger', () => {
  const state = createInitialNexPayState();

  // Proibição de exclusão física/direta de lançamento
  assert.throws(() => deleteLedgerEntryInMemory(1), /Operação proibida/);

  // Criar operação digital e depois estornar o lançamento de ganho
  const settled = settleOperationInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    operationId: 'NX-REV-001',
    operatorId: 'OP-102',
    paymentMethod: 'DIGITAL',
    grossAmountCents: 5000, // Líquido R$ 40,00 (4000 cents)
    idempotencyKey: 'idem-rev-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  const earningLedgerId = settled.ledgerEntriesCreated[0].id;
  const balanceAfterEarning = settled.wallet.availableBalanceCents;

  const reversal = reverseLedgerEntryInMemory(state, {
    tenantId: 'tenant_manhuacu_hq',
    ledgerId: earningLedgerId,
    reason: 'Auditoria: Operação registrada com valor divergente do romaneio',
    idempotencyKey: 'idem-reversal-exec-001',
    actor: 'SUPER_ADMIN',
    actorRole: 'SUPER_ADMIN',
  });

  assert.equal(reversal.originalEntry.status, 'REVERSED');
  assert.equal(reversal.compensatoryEntry.entryType, 'REVERSAL_COMPENSATORY');
  assert.equal(reversal.compensatoryEntry.direction, 'DEBIT');
  assert.equal(reversal.compensatoryEntry.amountCents, 4000);
  assert.equal(reversal.wallet.availableBalanceCents, balanceAfterEarning - 4000);
});

test('14 & 15. Permissão de administrador e isolamento entre operadores', () => {
  const state = createInitialNexPayState();

  // 14. Operador ou usuário comum não pode aprovar saque nem alterar regras de comissão
  assert.throws(
    () => assertAdminPermission('OPERATOR', 'Aprovar Saque PIX'),
    /Permissão negada/
  );

  assert.throws(
    () =>
      upsertCommissionRuleInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        ruleCode: 'RULE-UNAUTHORIZED',
        name: 'Tentativa não autorizada',
        serviceCategory: 'STANDARD',
        region: 'Manhuaçu - MG',
        isExpress: false,
        platformPercentBps: 500,
        platformFixedFeeCents: 0,
        operatorFixedBaseCents: 0,
        perKmRateCents: 0,
        perKgRateCents: 0,
        incentiveBonusCents: 0,
        deductCashCommissionFromBalance: true,
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Permissão negada/
  );

  assert.throws(
    () =>
      transitionWithdrawalStatusInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        withdrawalId: 1,
        nextStatus: 'approved',
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Permissão negada/
  );

  // 15. Isolamento entre operadores: OP-101 não pode acessar ou solicitar saque na carteira de OP-102
  assert.throws(
    () => assertOperatorAccess('OPERATOR', 'OP-101', 'OP-102'),
    /Violação de isolamento entre operadores/
  );

  assert.throws(
    () =>
      requestPixWithdrawalInMemory(state, {
        tenantId: 'tenant_manhuacu_hq',
        operatorId: 'OP-102',
        amountCents: 2000,
        pixKey: 'hacker@pix.com',
        pixKeyType: 'EMAIL',
        beneficiaryName: 'Outro Operador',
        idempotencyKey: 'idem-cross-operator-attack',
        actor: 'OP-101',
        actorRole: 'OPERATOR',
      }),
    /Violação de isolamento entre operadores/
  );
});
