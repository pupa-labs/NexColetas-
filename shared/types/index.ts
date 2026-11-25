export type NexTheme = 'green' | 'light' | 'night';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COMPANY_OWNER'
  | 'COMPANY_ADMIN'
  | 'COMPANY_USER'
  | 'OPERATOR'
  | 'RIDER'
  | 'AFFILIATE'
  | 'SUPPORT_AGENT';

export type ModuleKey =
  | 'dashboard'
  | 'operations'
  | 'requests'
  | 'companies'
  | 'operators'
  | 'coverage'
  | 'finance'
  | 'partners'
  | 'support'
  | 'settings';

export type DataViewState = 'ready' | 'loading' | 'empty' | 'error';

export type PickupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ALERT';

export type PaymentMethodType = 'DIGITAL' | 'CASH';

export interface TenantOption {
  tenantId: string;
  name: string;
  role: UserRole;
  city: string;
  cnpj: string;
  isPlatformScope?: boolean;
  operatorId?: string;
}

export interface PickupItem {
  id: number;
  tenantId: string;
  protocol: string;
  companyId?: number | null;
  companyName: string;
  originNeighborhood: string;
  destinationNeighborhood: string;
  city: string;
  riderName?: string | null;
  operatorName?: string | null;
  operatorId?: string | null;
  paymentMethod?: PaymentMethodType;
  financialSettled?: boolean;
  weightKg: string | number;
  distanceKm: string | number;
  feeBrl: string | number;
  status: PickupStatus;
  isDemo: boolean;
  createdAt: string;
}

export interface CompanyItem {
  id: number;
  tenantId: string;
  tradeName: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  segment: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  isDemo: boolean;
  createdAt: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface DashboardMetrics {
  pickupsToday: number;
  pickupsPending: number;
  pickupsInProgress: number;
  pickupsCompleted: number;
  registeredCompanies: number;
  activeOperators: number;
  estimatedRevenueBrl: number;
  completionRatePercent: number;
  isDemoData: boolean;
}

export interface ValidationResult {
  valid: boolean;
  formatted: string;
  error?: string;
}

// ============================================================================
// NEXPAY FINANCIAL FOUNDATION TYPES
// ============================================================================

export type LedgerDirection = 'CREDIT' | 'DEBIT';

export type LedgerEntryType =
  | 'OPERATION_EARNING'
  | 'EARNING_RELEASE'
  | 'PLATFORM_COMMISSION_CASH'
  | 'CASH_COMMISSION_DEDUCTION'
  | 'DEBT_RECORDED'
  | 'DEBT_COMPENSATION'
  | 'DEBT_PIX_SETTLEMENT'
  | 'WITHDRAWAL_RESERVE'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_REFUND'
  | 'REVERSAL_COMPENSATORY'
  | 'INCENTIVE_BONUS';

export type LedgerEntryStatus = 'POSTED' | 'PENDING_RELEASE' | 'REVERSED';

export type WithdrawalStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export type OperatorFinancialStatus = 'REGULAR' | 'DEBT_PENDING' | 'BLOCKED';

export interface OperatorWalletItem {
  id: number;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: 'OPERATOR' | 'RIDER';
  city: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  availableBalanceCents: number;
  pendingReleaseCents: number;
  reservedWithdrawalCents: number;
  debtBalanceCents: number;
  todayEarningsCents: number;
  weekEarningsCents: number;
  monthEarningsCents: number;
  totalCompletedOperations: number;
  financialStatus: OperatorFinancialStatus;
  updatedAt: string;
}

export interface FinancialLedgerItem {
  id: number;
  tenantId: string;
  ledgerCode: string;
  operatorId: string;
  operatorName: string;
  operationId: string | null;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountCents: number;
  balanceAfterCents: number;
  debtAfterCents: number;
  description: string;
  status: LedgerEntryStatus;
  originReference: string;
  idempotencyKey: string;
  actor: string;
  createdAt: string;
}

export interface CommissionRuleItem {
  id: number;
  tenantId: string;
  ruleCode: string;
  name: string;
  serviceCategory: 'STANDARD' | 'EXPRESS' | 'CARGO' | 'CONTRACT';
  region: string;
  isExpress: boolean;
  platformPercentBps: number; // 2000 = 20.00%
  platformFixedFeeCents: number;
  operatorFixedBaseCents: number;
  perKmRateCents: number;
  perKgRateCents: number;
  incentiveBonusCents: number;
  deductCashCommissionFromBalance: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface RemunerationCalculationInput {
  grossOperationAmountCents: number;
  distanceKm: number;
  weightKg: number;
  serviceCategory: 'STANDARD' | 'EXPRESS' | 'CARGO' | 'CONTRACT';
  region: string;
  isExpress: boolean;
  rule: CommissionRuleItem;
}

export interface RemunerationCalculationResult {
  grossOperationAmountCents: number;
  platformCommissionCents: number;
  platformPercentApplied: number;
  platformFixedAppliedCents: number;
  distanceBonusCents: number;
  weightBonusCents: number;
  incentiveBonusCents: number;
  netOperatorEarningCents: number;
  ruleCode: string;
  ruleName: string;
}

export interface OperationEarningItem {
  id: number;
  tenantId: string;
  operationId: string;
  operatorId: string;
  operatorName: string;
  paymentMethod: PaymentMethodType;
  grossAmountCents: number;
  platformCommissionCents: number;
  netEarningCents: number;
  compensatedDebtCents: number;
  releasedAmountCents: number;
  ruleCode: string;
  status: 'RELEASED' | 'PENDING_RELEASE' | 'SETTLED_IN_CASH' | 'REVERSED';
  idempotencyKey: string;
  createdAt: string;
}

export interface CashCollectionSettlementItem {
  id: number;
  tenantId: string;
  operationId: string;
  operatorId: string;
  operatorName: string;
  cashCollectedCents: number;
  platformCommissionCents: number;
  deductedFromBalanceCents: number;
  remainingDebtCents: number;
  settlementStatus: 'DEDUCTED_FROM_WALLET' | 'DEBT_REGISTERED' | 'SETTLED_BY_PIX' | 'COMPENSATED';
  idempotencyKey: string;
  createdAt: string;
}

export interface OperatorDebtItem {
  id: number;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  operationId: string;
  originalDebtCents: number;
  remainingDebtCents: number;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'SETTLED';
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompensationItem {
  id: number;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  sourceOperationId: string;
  debtId: number;
  grossEarningCents: number;
  compensatedCents: number;
  netReleasedCents: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface WithdrawalRequestItem {
  id: number;
  tenantId: string;
  withdrawalCode: string;
  operatorId: string;
  operatorName: string;
  amountCents: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  beneficiaryName: string;
  status: WithdrawalStatus;
  rejectionReason?: string | null;
  receiptCode?: string | null;
  idempotencyKey: string;
  requestedBy: string;
  reviewedBy?: string | null;
  requestedAt: string;
  updatedAt: string;
}

export interface WithdrawalEventItem {
  id: number;
  tenantId: string;
  withdrawalId: number;
  withdrawalCode: string;
  fromStatus: string;
  toStatus: WithdrawalStatus;
  actor: string;
  note: string;
  createdAt: string;
}

export interface FinancialAuditLogItem {
  id: number;
  tenantId: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  idempotencyKey?: string | null;
  metadataJson: string;
  createdAt: string;
}

export interface NexPayAdminMetrics {
  totalOperatorEarningsCents: number;
  totalPendingReleaseCents: number;
  totalAvailableBalanceCents: number;
  totalOperatorDebtCents: number;
  totalPlatformCommissionsCents: number;
  withdrawalsRequestedCount: number;
  withdrawalsRequestedCents: number;
  withdrawalsPaidCount: number;
  withdrawalsPaidCents: number;
  withdrawalsPendingCount: number;
  withdrawalsPendingCents: number;
  withdrawalsFailedCount: number;
  withdrawalsFailedCents: number;
}

export interface NexPayOverviewResponse {
  metrics: NexPayAdminMetrics;
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
}
