import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users (Sincronizado com Firebase Auth + Roles Globais / Multi-Tenant)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull().default('Usuário NexColetas'),
  role: text('role').notNull().default('COMPANY_ADMIN'), // SUPER_ADMIN | ADMIN | COMPANY_OWNER | COMPANY_ADMIN | COMPANY_USER | OPERATOR | RIDER | AFFILIATE | SUPPORT_AGENT
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. User Profiles (Dados brasileiros: CPF, Telefone, Preferências de Tema)
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  cpf: text('cpf'),
  phone: text('phone'),
  themePreference: text('theme_preference').notNull().default('green'), // green | white | night
  language: text('language').notNull().default('pt-BR'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Companies (Empresas embarcadoras / Clientes B2B Multi-Tenant)
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  tradeName: text('trade_name').notNull(),
  legalName: text('legal_name').notNull(),
  cnpj: text('cnpj').notNull().unique(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  segment: text('segment').notNull().default('Varejo & E-commerce'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | PENDING | SUSPENDED
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Company Users (Vínculo Multi-Tenant Usuário <-> Empresa e Permissão)
export const companyUsers = pgTable('company_users', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull().default('COMPANY_USER'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Company Addresses (Endereços padronizados com CEP / Manhuaçu e Região)
export const companyAddresses = pgTable('company_addresses', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(),
  cep: text('cep').notNull(),
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull().default('Manhuaçu'),
  state: text('state').notNull().default('MG'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  isPrimary: boolean('is_primary').notNull().default(true),
});

// 6. Pickups (Coletas Urbanas - Base Operacional Integrada ao NexPay)
export const pickups = pgTable('pickups', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  protocol: text('protocol').notNull().unique(),
  companyId: integer('company_id').references(() => companies.id),
  companyName: text('company_name').notNull(),
  originNeighborhood: text('origin_neighborhood').notNull(),
  destinationNeighborhood: text('destination_neighborhood').notNull(),
  city: text('city').notNull().default('Manhuaçu - MG'),
  riderName: text('rider_name'),
  operatorName: text('operator_name'),
  operatorId: text('operator_id').default('OP-101'),
  paymentMethod: text('payment_method').notNull().default('DIGITAL'), // DIGITAL | CASH
  financialSettled: boolean('financial_settled').notNull().default(false),
  weightKg: numeric('weight_kg', { precision: 8, scale: 2 }).notNull().default('1.50'),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }).notNull().default('3.20'),
  feeBrl: numeric('fee_brl', { precision: 10, scale: 2 }).notNull().default('18.50'),
  status: text('status').notNull().default('PENDING'), // PENDING | IN_PROGRESS | COMPLETED | ALERT
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. System Settings (Configurações Globais e por Tenant)
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  settingKey: text('setting_key').notNull(),
  settingValue: text('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Audit Logs (Auditoria e Segurança Multi-Tenant)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  actorUid: text('actor_uid'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// NEXPAY FINANCIAL FOUNDATION TABLES (Precisão em Centavos Inteiros)
// ============================================================================

// 9. Operator Wallets (Carteiras de Operadores e Motoboys)
export const operatorWallets = pgTable('operator_wallets', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  operatorId: text('operator_id').notNull().unique(),
  operatorName: text('operator_name').notNull(),
  operatorRole: text('operator_role').notNull().default('OPERATOR'), // OPERATOR | RIDER
  city: text('city').notNull().default('Manhuaçu - MG'),
  pixKey: text('pix_key').notNull(),
  pixKeyType: text('pix_key_type').notNull().default('CPF'), // CPF | CNPJ | EMAIL | PHONE | EVP
  availableBalanceCents: integer('available_balance_cents').notNull().default(0),
  pendingReleaseCents: integer('pending_release_cents').notNull().default(0),
  reservedWithdrawalCents: integer('reserved_withdrawal_cents').notNull().default(0),
  debtBalanceCents: integer('debt_balance_cents').notNull().default(0),
  todayEarningsCents: integer('today_earnings_cents').notNull().default(0),
  weekEarningsCents: integer('week_earnings_cents').notNull().default(0),
  monthEarningsCents: integer('month_earnings_cents').notNull().default(0),
  totalCompletedOperations: integer('total_completed_operations').notNull().default(0),
  financialStatus: text('financial_status').notNull().default('REGULAR'), // REGULAR | DEBT_PENDING | BLOCKED
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 10. Financial Ledger (Livro-Razão Financeiro Imutável)
export const financialLedger = pgTable('financial_ledger', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  ledgerCode: text('ledger_code').notNull().unique(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  operationId: text('operation_id'),
  entryType: text('entry_type').notNull(),
  direction: text('direction').notNull(), // CREDIT | DEBIT
  amountCents: integer('amount_cents').notNull(),
  balanceAfterCents: integer('balance_after_cents').notNull(),
  debtAfterCents: integer('debt_after_cents').notNull().default(0),
  description: text('description').notNull(),
  status: text('status').notNull().default('POSTED'), // POSTED | PENDING_RELEASE | REVERSED
  originReference: text('origin_reference').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  actor: text('actor').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Commission Rules (Motor Configurável de Taxas e Remuneração)
export const commissionRules = pgTable('commission_rules', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  ruleCode: text('rule_code').notNull().unique(),
  name: text('name').notNull(),
  serviceCategory: text('service_category').notNull().default('STANDARD'), // STANDARD | EXPRESS | CARGO | CONTRACT
  region: text('region').notNull().default('Manhuaçu - MG'),
  isExpress: boolean('is_express').notNull().default(false),
  platformPercentBps: integer('platform_percent_bps').notNull().default(2000), // 2000 = 20.00%
  platformFixedFeeCents: integer('platform_fixed_fee_cents').notNull().default(0),
  operatorFixedBaseCents: integer('operator_fixed_base_cents').notNull().default(0),
  perKmRateCents: integer('per_km_rate_cents').notNull().default(0),
  perKgRateCents: integer('per_kg_rate_cents').notNull().default(0),
  incentiveBonusCents: integer('incentive_bonus_cents').notNull().default(0),
  deductCashCommissionFromBalance: boolean('deduct_cash_commission_from_balance')
    .notNull()
    .default(true),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 12. Operation Earnings (Remuneração por Operação Concluída)
export const operationEarnings = pgTable('operation_earnings', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  operationId: text('operation_id').notNull().unique(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  paymentMethod: text('payment_method').notNull(), // DIGITAL | CASH
  grossAmountCents: integer('gross_amount_cents').notNull(),
  platformCommissionCents: integer('platform_commission_cents').notNull(),
  netEarningCents: integer('net_earning_cents').notNull(),
  compensatedDebtCents: integer('compensated_debt_cents').notNull().default(0),
  releasedAmountCents: integer('released_amount_cents').notNull(),
  ruleCode: text('rule_code').notNull(),
  status: text('status').notNull().default('RELEASED'), // RELEASED | PENDING_RELEASE | SETTLED_IN_CASH | REVERSED
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Cash Collection Settlements (Liquidação de Operações Pagas em Dinheiro)
export const cashCollectionSettlements = pgTable('cash_collection_settlements', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  operationId: text('operation_id').notNull().unique(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  cashCollectedCents: integer('cash_collected_cents').notNull(),
  platformCommissionCents: integer('platform_commission_cents').notNull(),
  deductedFromBalanceCents: integer('deducted_from_balance_cents').notNull().default(0),
  remainingDebtCents: integer('remaining_debt_cents').notNull().default(0),
  settlementStatus: text('settlement_status').notNull(), // DEDUCTED_FROM_WALLET | DEBT_REGISTERED | SETTLED_BY_PIX | COMPENSATED
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Operator Debts (Saldos Devedores de Comissões em Dinheiro)
export const operatorDebts = pgTable('operator_debts', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  operationId: text('operation_id').notNull(),
  originalDebtCents: integer('original_debt_cents').notNull(),
  remainingDebtCents: integer('remaining_debt_cents').notNull(),
  status: text('status').notNull().default('OPEN'), // OPEN | PARTIALLY_PAID | SETTLED
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. Compensations (Histórico de Compensação Automática de Saldo Devedor)
export const compensations = pgTable('compensations', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  sourceOperationId: text('source_operation_id').notNull(),
  debtId: integer('debt_id').notNull(),
  grossEarningCents: integer('gross_earning_cents').notNull(),
  compensatedCents: integer('compensated_cents').notNull(),
  netReleasedCents: integer('net_released_cents').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Withdrawal Requests (Solicitações de Saque PIX — Preparação com Reserva)
export const withdrawalRequests = pgTable('withdrawal_requests', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  withdrawalCode: text('withdrawal_code').notNull().unique(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  pixKey: text('pix_key').notNull(),
  pixKeyType: text('pix_key_type').notNull(),
  beneficiaryName: text('beneficiary_name').notNull(),
  status: text('status').notNull().default('requested'), // requested | under_review | approved | processing | paid | rejected | cancelled | failed
  rejectionReason: text('rejection_reason'),
  receiptCode: text('receipt_code'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  requestedBy: text('requested_by').notNull(),
  reviewedBy: text('reviewed_by'),
  requestedAt: timestamp('requested_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 17. Withdrawal Events (Trilha de Eventos de Saques PIX)
export const withdrawalEvents = pgTable('withdrawal_events', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  withdrawalId: integer('withdrawal_id').notNull(),
  withdrawalCode: text('withdrawal_code').notNull(),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  actor: text('actor').notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. Financial Audit Logs (Auditoria Financeira Especializada NexPay)
export const financialAuditLogs = pgTable('financial_audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tenant_manhuacu_hq'),
  actor: text('actor').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  idempotencyKey: text('idempotency_key'),
  metadataJson: text('metadata_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(userProfiles),
  companyLinks: many(companyUsers),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(companyUsers),
  addresses: many(companyAddresses),
  pickups: many(pickups),
}));
