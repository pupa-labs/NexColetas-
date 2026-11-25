import {
  CommissionRuleItem,
  CompanyItem,
  DashboardMetrics,
  NexPayOverviewResponse,
  PaymentMethodType,
  PickupItem,
  PickupStatus,
  PixKeyType,
  RemunerationCalculationResult,
  UserRole,
  WithdrawalStatus,
} from '../../shared/types/index.ts';

export interface RequestContext {
  tenantId: string;
  role: UserRole;
  operatorId?: string;
  idToken?: string | null;
}

function buildHeaders(ctx: RequestContext): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': ctx.tenantId,
    'x-tenant-role': ctx.role,
  };
  if (ctx.operatorId) {
    headers['x-operator-id'] = ctx.operatorId;
  }
  if (ctx.idToken) {
    headers.Authorization = `Bearer ${ctx.idToken}`;
  }
  return headers;
}

export async function fetchDashboardOverview(ctx: RequestContext): Promise<{
  metrics: DashboardMetrics;
  recentPickups: PickupItem[];
  companies: CompanyItem[];
}> {
  const res = await fetch('/api/dashboard', {
    headers: buildHeaders(ctx),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao carregar resumo operacional.');
  }
  return res.json();
}

export async function createCompanyRequest(
  ctx: RequestContext,
  payload: {
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
  }
): Promise<CompanyItem> {
  const res = await fetch('/api/companies', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao cadastrar empresa.');
  }
  return data.company;
}

export async function createPickupRequest(
  ctx: RequestContext,
  payload: {
    companyName: string;
    originNeighborhood: string;
    destinationNeighborhood: string;
    riderName?: string;
    weightKg: number;
    distanceKm: number;
    feeBrl: number;
  }
): Promise<PickupItem> {
  const res = await fetch('/api/pickups', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao solicitar coleta.');
  }
  return data.pickup;
}

export async function updatePickupStatusRequest(
  ctx: RequestContext,
  pickupId: number,
  status: PickupStatus
): Promise<void> {
  const res = await fetch(`/api/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: buildHeaders(ctx),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao atualizar status da coleta.');
  }
}

export async function fetchGoogleIntegrationsStatus(ctx: RequestContext) {
  const res = await fetch('/api/integrations/status', {
    headers: buildHeaders(ctx),
  });
  if (!res.ok) {
    throw new Error('Falha ao verificar camada Google Integrations.');
  }
  return res.json();
}

export async function runSupportTriageRequest(
  ctx: RequestContext,
  message: string
): Promise<{
  category: string;
  priority: string;
  suggestedReply: string;
  usedLiveGemini: boolean;
}> {
  const res = await fetch('/api/integrations/gemini/triage', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha na triagem do chamado.');
  }
  return data;
}

// ============================================================================
// NEXPAY CLIENT HELPERS
// ============================================================================

export async function fetchNexPayOverview(
  ctx: RequestContext,
  filterOperatorId?: string
): Promise<NexPayOverviewResponse> {
  const query = filterOperatorId
    ? `?operatorId=${encodeURIComponent(filterOperatorId)}`
    : '';
  const res = await fetch(`/api/nexpay/overview${query}`, {
    headers: buildHeaders(ctx),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao carregar dados financeiros NexPay.');
  }
  return data;
}

export async function previewNexPayRemunerationRequest(
  ctx: RequestContext,
  payload: {
    grossOperationAmountCents: number;
    distanceKm: number;
    weightKg: number;
    ruleCode?: string;
  }
): Promise<RemunerationCalculationResult> {
  const res = await fetch('/api/nexpay/calculate-remuneration', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao simular remuneração.');
  }
  return data.calculation;
}

export async function settleNexPayOperationRequest(
  ctx: RequestContext,
  payload: {
    operationId: string;
    operatorId: string;
    paymentMethod: PaymentMethodType;
    grossAmountCents: number;
    distanceKm?: number;
    weightKg?: number;
    ruleCode?: string;
    deductCashCommissionFromWallet?: boolean;
    idempotencyKey?: string;
  }
) {
  const res = await fetch('/api/nexpay/operations/settle', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao liquidar operação no NexPay.');
  }
  return data;
}

export async function settleNexPayDebtPixRequest(
  ctx: RequestContext,
  payload: {
    operatorId: string;
    amountCents: number;
    pixReceiptReference: string;
    idempotencyKey?: string;
  }
) {
  const res = await fetch('/api/nexpay/debts/settle-pix', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao regularizar saldo devedor via PIX.');
  }
  return data;
}

export async function createNexPayWithdrawalRequest(
  ctx: RequestContext,
  payload: {
    operatorId: string;
    amountCents: number;
    pixKey: string;
    pixKeyType: PixKeyType;
    beneficiaryName: string;
    idempotencyKey?: string;
  }
) {
  const res = await fetch('/api/nexpay/withdrawals', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao solicitar saque PIX.');
  }
  return data;
}

export async function updateNexPayWithdrawalStatusRequest(
  ctx: RequestContext,
  withdrawalId: number,
  payload: {
    nextStatus: WithdrawalStatus;
    reasonOrNote?: string;
    receiptCode?: string;
  }
) {
  const res = await fetch(`/api/nexpay/withdrawals/${withdrawalId}/status`, {
    method: 'PATCH',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao atualizar status do saque PIX.');
  }
  return data;
}

export async function reverseNexPayLedgerEntryRequest(
  ctx: RequestContext,
  ledgerId: number,
  reason: string
) {
  const res = await fetch(`/api/nexpay/ledger/${ledgerId}/reverse`, {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao estornar lançamento.');
  }
  return data;
}

export async function saveNexPayCommissionRuleRequest(
  ctx: RequestContext,
  payload: {
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
  }
): Promise<CommissionRuleItem> {
  const res = await fetch('/api/nexpay/rules', {
    method: 'POST',
    headers: buildHeaders(ctx),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao salvar regra de comissão.');
  }
  return data.rule;
}
