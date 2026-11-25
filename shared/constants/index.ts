import { TenantOption, UserRole } from '../types/index.ts';

export const BRAND_PALETTE = {
  FOREST_GREEN: '#174D35',
  ECO_GREEN: '#5DAA70',
  LIGHT_GREEN: '#B8DCC0',
  OFF_WHITE: '#F5F7F4',
  GRAPHITE: '#111111',
  // Compatibilidade legada
  PRIMARY_GREEN: '#174D35',
  VIVID_GREEN: '#5DAA70',
  LIME_GREEN: '#B8DCC0',
} as const;

export const ROLE_LABELS_PT: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador (Plataforma)',
  ADMIN: 'Administrador Regional',
  COMPANY_OWNER: 'Proprietário da Empresa',
  COMPANY_ADMIN: 'Gestor da Empresa',
  COMPANY_USER: 'Operador da Empresa',
  OPERATOR: 'Operador Logístico',
  RIDER: 'Motoboy / Entregador',
  AFFILIATE: 'Parceiro Comercial',
  SUPPORT_AGENT: 'Especialista de Suporte',
};

export const INITIAL_TENANTS: TenantOption[] = [
  {
    tenantId: 'platform_global',
    name: 'NexColetas Admin — Rede Regional (Manhuaçu - MG)',
    role: 'SUPER_ADMIN',
    city: 'Manhuaçu - MG',
    cnpj: '51.892.310/0001-22',
    isPlatformScope: true,
  },
  {
    tenantId: 'tenant_manhuacu_hq',
    name: 'Empresa A — Hub Manhuaçu Centro (DEMONSTRAÇÃO)',
    role: 'COMPANY_OWNER',
    city: 'Manhuaçu - MG',
    cnpj: '12.345.678/0001-95',
    isPlatformScope: false,
  },
  {
    tenantId: 'tenant_empresa_b',
    name: 'Empresa B — Polo BR-262 Leste MG (DEMONSTRAÇÃO)',
    role: 'COMPANY_ADMIN',
    city: 'Manhuaçu - MG',
    cnpj: '11.444.777/0001-61',
    isPlatformScope: false,
  },
  {
    tenantId: 'tenant_manhuacu_hq',
    name: 'NexDriver — Lucas Ferreira (Operador #OP-101)',
    role: 'OPERATOR',
    city: 'Manhuaçu - MG',
    cnpj: '34.510.892/0001-08',
    isPlatformScope: false,
    operatorId: 'OP-101',
  },
];

export const MANHUACU_NEIGHBORHOODS = [
  'Centro',
  'Coqueiro Rural',
  'Baixada',
  'Santa Luzia',
  'Bom Pastor',
  'São Vicente',
  'Engenho da Serra',
  'Alfa Sul',
  'Ponte da Aldeia',
  'Matinha',
  'São Jorge',
  'Lajinha',
  'Petróleo',
  'Santo Antônio',
];

export const REGIONAL_CEP_DIRECTORY: Record<
  string,
  {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  }
> = {
  '36900-000': {
    street: 'Praça Cordovil Pinto Coelho',
    neighborhood: 'Centro',
    city: 'Manhuaçu',
    state: 'MG',
  },
  '36900-001': {
    street: 'Avenida Getúlio Vargas',
    neighborhood: 'Coqueiro Rural',
    city: 'Manhuaçu',
    state: 'MG',
  },
  '36900-045': {
    street: 'Rua Amaral Franco',
    neighborhood: 'Centro',
    city: 'Manhuaçu',
    state: 'MG',
  },
  '36900-110': {
    street: 'Avenida Salime Nacif',
    neighborhood: 'Baixada',
    city: 'Manhuaçu',
    state: 'MG',
  },
  '36904-000': {
    street: 'Rodovia BR-262 Km 39',
    neighborhood: 'Ponte da Aldeia',
    city: 'Manhuaçu',
    state: 'MG',
  },
};
