import { Router, Response } from 'express';
import {
  AuthRequest,
  requireAuth,
  resolveTenantContext,
} from '../middleware/auth.ts';
import {
  createCompanyForTenant,
  createPickupForTenant,
  getDashboardOverviewByTenant,
  listCompaniesByTenant,
  listPickupsByTenant,
  updatePickupStatusForTenant,
} from '../services/dataService.ts';
import {
  classifySupportTicketWithGemini,
  getGoogleIntegrationsStatus,
} from '../services/googleIntegrations.ts';
import {
  attemptDeleteLedgerEntry,
  getNexPayOverview,
  previewOperationRemuneration,
  requestPixWithdrawal,
  reverseLedgerEntry,
  settleOperation,
  settleOperatorDebtByPix,
  transitionWithdrawalStatus,
  upsertCommissionRule,
} from '../services/nexpayService.ts';
import {
  validateCEP,
  validateCNPJ,
  validateCPF,
  validateEmail,
  validatePhoneBR,
} from '../../../shared/validators/smartData.ts';
import { getOrCreateUser } from '../../../src/db/users.ts';
import { checkDatabaseHealth } from '../../../src/db/index.ts';
import { getSupabaseAdminConfigStatus } from '../lib/supabaseAdmin.ts';
import { getSupabaseStorageReadiness } from '../services/storageService.ts';
import { PaymentMethodType, PixKeyType, WithdrawalStatus } from '../../../shared/types/index.ts';

export const apiRouter = Router();

// Aplica resolução de contexto Multi-Tenant em todas as rotas da API
apiRouter.use(resolveTenantContext);

/**
 * Sincronização de usuário autenticado com Firebase Auth -> Banco Relacional
 */
apiRouter.post('/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid || !req.user?.email) {
      return res.status(400).json({ error: 'Dados de autenticação incompletos.' });
    }
    const dbUser = await getOrCreateUser(
      req.user.uid,
      req.user.email,
      req.user.name
    );
    res.json({ user: dbUser });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar usuário.';
    res.status(500).json({ error: message });
  }
});

/**
 * Resumo operacional e KPIs do Dashboard (Isolado por Tenant)
 */
apiRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const data = await getDashboardOverviewByTenant(tenantId);
    res.json({
      tenantContext: req.tenantContext,
      ...data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Falha ao carregar indicadores.';
    res.status(500).json({ error: message });
  }
});

/**
 * Listagem de empresas (Isolada por Tenant)
 */
apiRouter.get('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const companies = await listCompaniesByTenant(tenantId);
    res.json({ companies });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Falha ao listar empresas.';
    res.status(500).json({ error: message });
  }
});

/**
 * Cadastro de nova empresa com validação NexColetas Smart Data no Backend
 */
apiRouter.post('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const {
      tradeName,
      legalName,
      cnpj,
      email,
      phone,
      segment,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
    } = req.body || {};

    if (!tradeName || String(tradeName).trim().length < 2) {
      return res
        .status(400)
        .json({ error: 'Informe o Nome Fantasia da empresa.' });
    }
    if (!legalName || String(legalName).trim().length < 3) {
      return res
        .status(400)
        .json({ error: 'Informe a Razão Social completa.' });
    }

    const cnpjCheck = validateCNPJ(String(cnpj || ''));
    if (!cnpjCheck.valid) {
      return res.status(400).json({ error: cnpjCheck.error });
    }

    const emailCheck = validateEmail(String(email || ''));
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    const phoneCheck = validatePhoneBR(String(phone || ''));
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.error });
    }

    const cepCheck = validateCEP(String(cep || ''));
    if (!cepCheck.valid) {
      return res.status(400).json({ error: cepCheck.error });
    }

    if (!street || !neighborhood) {
      return res
        .status(400)
        .json({ error: 'Informe o logradouro e o bairro do endereço.' });
    }

    const created = await createCompanyForTenant({
      tenantId,
      tradeName: String(tradeName).trim(),
      legalName: String(legalName).trim(),
      cnpj: cnpjCheck.formatted,
      email: emailCheck.formatted,
      phone: phoneCheck.formatted,
      segment: String(segment || 'Varejo & E-commerce').trim(),
      cep: cepCheck.formatted,
      street: String(street).trim(),
      number: String(number || 'S/N').trim(),
      neighborhood: String(neighborhood).trim(),
      city: String(city || 'Manhuaçu').trim(),
      state: String(state || 'MG').trim().toUpperCase(),
    });

    res.status(201).json({ company: created });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao cadastrar empresa.';
    res.status(400).json({ error: message });
  }
});

/**
 * Listagem de coletas (Isolada por Tenant)
 */
apiRouter.get('/pickups', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const pickups = await listPickupsByTenant(tenantId);
    res.json({ pickups });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar coletas.';
    res.status(500).json({ error: message });
  }
});

/**
 * Registro de nova coleta urbana em Manhuaçu - MG
 */
apiRouter.post('/pickups', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const {
      companyName,
      originNeighborhood,
      destinationNeighborhood,
      riderName,
      weightKg,
      distanceKm,
      feeBrl,
    } = req.body || {};

    if (!companyName || !originNeighborhood || !destinationNeighborhood) {
      return res.status(400).json({
        error:
          'Preencha a empresa solicitante, o bairro de coleta e o bairro de destino.',
      });
    }

    const created = await createPickupForTenant({
      tenantId,
      companyName: String(companyName).trim(),
      originNeighborhood: String(originNeighborhood).trim(),
      destinationNeighborhood: String(destinationNeighborhood).trim(),
      riderName: riderName ? String(riderName).trim() : undefined,
      weightKg: Math.max(0.1, Number(weightKg) || 1.5),
      distanceKm: Math.max(0.5, Number(distanceKm) || 3.2),
      feeBrl: Math.max(8, Number(feeBrl) || 18.5),
    });

    res.status(201).json({ pickup: created });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Falha ao criar coleta.';
    res.status(400).json({ error: message });
  }
});

/**
 * Atualização de status de uma coleta
 */
apiRouter.patch('/pickups/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const pickupId = Number(req.params.id);
    const { status } = req.body || {};

    if (!pickupId || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ALERT'].includes(status)) {
      return res.status(400).json({ error: 'Status ou identificador inválido.' });
    }

    await updatePickupStatusForTenant(tenantId, pickupId, status);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Falha ao atualizar coleta.';
    res.status(400).json({ error: message });
  }
});

// ============================================================================
// NEXPAY FINANCIAL FOUNDATION ENDPOINTS
// ============================================================================

/**
 * Visão geral do NexPay (Respeita isolamento de operador e permissões)
 */
apiRouter.get('/nexpay/overview', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const callerRole = req.tenantContext?.role || 'COMPANY_ADMIN';
    const callerOperatorId = req.tenantContext?.operatorId;
    const filterOperatorId = req.query.operatorId
      ? String(req.query.operatorId).trim()
      : undefined;

    const overview = await getNexPayOverview({
      tenantId,
      callerRole,
      callerOperatorId,
      filterOperatorId,
    });
    res.json(overview);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar dados NexPay.';
    const status = message.includes('Violação de isolamento') ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

/**
 * Simulador de remuneração estimada antes do aceite da operação
 */
apiRouter.post('/nexpay/calculate-remuneration', async (req: AuthRequest, res: Response) => {
  try {
    const { grossOperationAmountCents, distanceKm, weightKg, ruleCode } = req.body || {};
    const calc = await previewOperationRemuneration({
      grossOperationAmountCents: Number(grossOperationAmountCents) || 5000,
      distanceKm: Number(distanceKm) || 3.5,
      weightKg: Number(weightKg) || 2.0,
      ruleCode: ruleCode ? String(ruleCode) : undefined,
    });
    res.json({ calculation: calc });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Falha ao calcular remuneração.';
    res.status(400).json({ error: message });
  }
});

/**
 * Liquidação financeira de operação concluída (Digital ou Dinheiro/Cash)
 */
apiRouter.post('/nexpay/operations/settle', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const actorRole = req.tenantContext?.role || 'COMPANY_ADMIN';
    const actor =
      req.tenantContext?.email ||
      req.tenantContext?.operatorId ||
      actorRole;

    const {
      operationId,
      operatorId,
      paymentMethod,
      grossAmountCents,
      distanceKm,
      weightKg,
      ruleCode,
      deductCashCommissionFromWallet,
      idempotencyKey,
    } = req.body || {};

    if (!operationId || !operatorId) {
      return res
        .status(400)
        .json({ error: 'Informe o protocolo da operação e o operador responsável.' });
    }

    const method: PaymentMethodType =
      paymentMethod === 'CASH' ? 'CASH' : 'DIGITAL';

    const result = await settleOperation({
      tenantId,
      operationId: String(operationId).trim(),
      operatorId: String(operatorId).trim(),
      paymentMethod: method,
      grossAmountCents: Math.round(Number(grossAmountCents) || 0),
      distanceKm: Number(distanceKm) || 3.2,
      weightKg: Number(weightKg) || 1.5,
      ruleCode: ruleCode ? String(ruleCode) : undefined,
      deductCashCommissionFromWallet:
        typeof deductCashCommissionFromWallet === 'boolean'
          ? deductCashCommissionFromWallet
          : undefined,
      idempotencyKey:
        idempotencyKey
          ? String(idempotencyKey).trim()
          : `idem-settle-${String(operationId).trim()}`,
      actor,
      actorRole,
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao liquidar operação no NexPay.';
    res.status(400).json({ error: message });
  }
});

/**
 * Regularização de saldo devedor via PIX pelo operador
 */
apiRouter.post('/nexpay/debts/settle-pix', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const actorRole = req.tenantContext?.role || 'OPERATOR';
    const actor =
      req.tenantContext?.operatorId ||
      req.tenantContext?.email ||
      actorRole;

    const { operatorId, amountCents, pixReceiptReference, idempotencyKey } =
      req.body || {};

    if (!operatorId || !pixReceiptReference) {
      return res.status(400).json({
        error: 'Informe o operador e a referência do comprovante PIX.',
      });
    }

    const result = await settleOperatorDebtByPix({
      tenantId,
      operatorId: String(operatorId).trim(),
      amountCents: Math.round(Number(amountCents) || 0),
      pixReceiptReference: String(pixReceiptReference).trim(),
      idempotencyKey:
        idempotencyKey
          ? String(idempotencyKey).trim()
          : `idem-debt-pix-${Date.now()}`,
      actor,
      actorRole,
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao regularizar saldo devedor.';
    res.status(400).json({ error: message });
  }
});

/**
 * Solicitação de saque PIX com reserva imediata de saldo
 */
apiRouter.post('/nexpay/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const actorRole = req.tenantContext?.role || 'OPERATOR';
    const actor =
      req.tenantContext?.operatorId ||
      req.tenantContext?.email ||
      String(req.body?.operatorId || 'OP-101');

    const {
      operatorId,
      amountCents,
      pixKey,
      pixKeyType,
      beneficiaryName,
      idempotencyKey,
    } = req.body || {};

    const result = await requestPixWithdrawal({
      tenantId,
      operatorId: String(operatorId || 'OP-101').trim(),
      amountCents: Math.round(Number(amountCents) || 0),
      pixKey: String(pixKey || '').trim(),
      pixKeyType: (pixKeyType as PixKeyType) || 'CPF',
      beneficiaryName: String(beneficiaryName || '').trim(),
      idempotencyKey:
        idempotencyKey
          ? String(idempotencyKey).trim()
          : `idem-wth-${Date.now()}`,
      actor,
      actorRole,
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao registrar solicitação de saque PIX.';
    const status = message.includes('Violação de isolamento') ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

/**
 * Atualização de status de saque PIX (Aprovação, Rejeição, Cancelamento, Falha, Pago)
 */
apiRouter.patch(
  '/nexpay/withdrawals/:id/status',
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
      const actorRole = req.tenantContext?.role || 'SUPER_ADMIN';
      const actor =
        req.tenantContext?.operatorId ||
        req.tenantContext?.email ||
        actorRole;

      const withdrawalId = Number(req.params.id);
      const { nextStatus, reasonOrNote, receiptCode } = req.body || {};

      const result = await transitionWithdrawalStatus({
        tenantId,
        withdrawalId,
        nextStatus: nextStatus as WithdrawalStatus,
        reasonOrNote: reasonOrNote ? String(reasonOrNote) : undefined,
        receiptCode: receiptCode ? String(receiptCode) : undefined,
        actor,
        actorRole,
      });

      res.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao atualizar status do saque.';
      const status =
        message.includes('Permissão negada') ||
        message.includes('Violação de isolamento')
          ? 403
          : 400;
      res.status(status).json({ error: message });
    }
  }
);

/**
 * Estorno de lançamento do Ledger através de lançamento compensatório inverso (Exclusivo Admin)
 */
apiRouter.post(
  '/nexpay/ledger/:id/reverse',
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
      const actorRole = req.tenantContext?.role || 'SUPER_ADMIN';
      const actor = req.tenantContext?.email || actorRole;
      const ledgerId = Number(req.params.id);
      const { reason, idempotencyKey } = req.body || {};

      const result = await reverseLedgerEntry({
        tenantId,
        ledgerId,
        reason: String(reason || ''),
        idempotencyKey:
          idempotencyKey
            ? String(idempotencyKey).trim()
            : `idem-rev-${ledgerId}-${Date.now()}`,
        actor,
        actorRole,
      });

      res.status(201).json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao estornar lançamento do ledger.';
      const status = message.includes('Permissão negada') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

/**
 * Proibição explícita de exclusão de lançamento do Ledger Financeiro
 */
apiRouter.delete('/nexpay/ledger/:id', (req: AuthRequest, res: Response) => {
  try {
    attemptDeleteLedgerEntry(Number(req.params.id));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não é permitido excluir lançamentos financeiros.';
    res.status(403).json({ error: message });
  }
});

/**
 * Criação/Atualização de Regra de Comissão e Remuneração (Exclusivo Admin)
 */
apiRouter.post('/nexpay/rules', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantContext?.tenantId || 'tenant_manhuacu_hq';
    const actorRole = req.tenantContext?.role || 'SUPER_ADMIN';
    const actor = req.tenantContext?.email || actorRole;

    const {
      ruleCode,
      name,
      serviceCategory,
      region,
      isExpress,
      platformPercentBps,
      platformFixedFeeCents,
      operatorFixedBaseCents,
      perKmRateCents,
      perKgRateCents,
      incentiveBonusCents,
      deductCashCommissionFromBalance,
    } = req.body || {};

    if (!ruleCode || !name) {
      return res
        .status(400)
        .json({ error: 'Informe o código e o nome da regra de comissão.' });
    }

    const rule = await upsertCommissionRule({
      tenantId,
      ruleCode: String(ruleCode),
      name: String(name),
      serviceCategory: serviceCategory || 'STANDARD',
      region: String(region || 'Manhuaçu - MG'),
      isExpress: Boolean(isExpress),
      platformPercentBps: Number(platformPercentBps) || 2000,
      platformFixedFeeCents: Number(platformFixedFeeCents) || 0,
      operatorFixedBaseCents: Number(operatorFixedBaseCents) || 0,
      perKmRateCents: Number(perKmRateCents) || 0,
      perKgRateCents: Number(perKgRateCents) || 0,
      incentiveBonusCents: Number(incentiveBonusCents) || 0,
      deductCashCommissionFromBalance:
        typeof deductCashCommissionFromBalance === 'boolean'
          ? deductCashCommissionFromBalance
          : true,
      actor,
      actorRole,
    });

    res.status(201).json({ rule });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao salvar regra de comissão.';
    const status = message.includes('Permissão negada') ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

/**
 * Validação Smart Data Server-Side (CPF, CNPJ, CEP, Telefone, E-mail)
 */
apiRouter.post('/smart-data/validate', (req: AuthRequest, res: Response) => {
  const { cpf, cnpj, cep, phone, email } = req.body || {};
  res.json({
    cpf: cpf ? validateCPF(String(cpf)) : undefined,
    cnpj: cnpj ? validateCNPJ(String(cnpj)) : undefined,
    cep: cep ? validateCEP(String(cep)) : undefined,
    phone: phone ? validatePhoneBR(String(phone)) : undefined,
    email: email ? validateEmail(String(email)) : undefined,
  });
});

/**
 * Status das camadas de integração Google (Maps, Gemini, Firebase) + Supabase
 */
apiRouter.get('/integrations/status', async (_req: AuthRequest, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const supabaseConfig = getSupabaseAdminConfigStatus();
  res.json({
    ...getGoogleIntegrationsStatus(),
    database: dbHealth,
    supabase: supabaseConfig,
  });
});

/**
 * Verificação oficial de conexão e saúde do banco PostgreSQL (Supabase / Local Dev)
 */
apiRouter.get('/health/database', async (_req: AuthRequest, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const supabaseConfig = getSupabaseAdminConfigStatus();
  res.status(dbHealth.ok ? 200 : 503).json({
    database: dbHealth,
    supabase: supabaseConfig,
    authProvider: 'firebase_auth',
  });
});

/**
 * Inspeção da estrutura preparada de Supabase Storage (sem criação automática de buckets)
 */
apiRouter.get('/storage/readiness', async (_req: AuthRequest, res: Response) => {
  const readiness = await getSupabaseStorageReadiness();
  res.json(readiness);
});

/**
 * Triagem inteligente de atendimento via Gemini (Server-side seguro)
 */
apiRouter.post('/integrations/gemini/triage', async (req: AuthRequest, res: Response) => {
  const { message } = req.body || {};
  if (!message || String(message).trim().length < 4) {
    return res
      .status(400)
      .json({ error: 'Descreva a solicitação para realizar a triagem.' });
  }
  const result = await classifySupportTicketWithGemini(String(message));
  res.json(result);
});
