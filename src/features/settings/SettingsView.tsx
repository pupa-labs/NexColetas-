import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Globe,
  Lock,
  Moon,
  Palette,
  Sun,
  UserCheck,
} from 'lucide-react';
import { NexTheme } from '../../../shared/types/index.ts';
import {
  BRAND_PALETTE,
  ROLE_LABELS_PT,
} from '../../../shared/constants/index.ts';
import {
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskPhoneBR,
  validateCEP,
  validateCNPJ,
  validateCPF,
  validateDateBR,
  validatePhoneBR,
} from '../../../shared/validators/smartData.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';
import { NexColetasLogo } from '../../components/brand/NexColetasLogo.tsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dropdown,
  Input,
  Switch,
  Tabs,
  ThemeSwitcher,
  Tooltip,
} from '../../components/ui/DesignSystem.tsx';
import { fetchGoogleIntegrationsStatus } from '../../services/apiClient.ts';

export const SettingsView: React.FC<{
  onNotify: (msg: string) => void;
}> = ({ onNotify }) => {
  const { theme, setTheme } = useTheme();
  const {
    activeTenant,
    tenants,
    selectTenant,
    firebaseUser,
    idToken,
    signInWithGoogle,
    signOut,
  } = useTenantAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [compactTables, setCompactTables] = useState(false);
  const [showBrandManualRef, setShowBrandManualRef] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState('components');
  const [demoConfirmOpen, setDemoConfirmOpen] = useState(false);

  const [testCpf, setTestCpf] = useState('529.982.247-25');
  const [testCnpj, setTestCnpj] = useState('11.444.777/0001-61');
  const [testCep, setTestCep] = useState('36900-000');
  const [testPhone, setTestPhone] = useState('(33) 98812-4410');
  const [testDate, setTestDate] = useState('22/11/2026');

  const [integrationsStatus, setIntegrationsStatus] = useState<{
    googleMaps?: { configured: boolean; envVarRequired: string };
    geminiAi?: { configured: boolean; envVarRequired: string };
    firebase?: { configured: boolean; projectId: string };
  } | null>(null);

  useEffect(() => {
    fetchGoogleIntegrationsStatus({
      tenantId: activeTenant.tenantId,
      role: activeTenant.role,
      idToken,
    })
      .then((res) => setIntegrationsStatus(res))
      .catch(() => {});
  }, [activeTenant, idToken]);

  const themeCards: {
    id: NexTheme;
    title: string;
    subtitle: string;
    bgHex: string;
    surfaceHex: string;
    primaryHex: string;
    textHex: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'green',
      title: '1. GREEN — Floresta & Eco',
      subtitle: 'Tema padrão oficial NexColetas (#F5F7F4 / #174D35 / #5DAA70)',
      bgHex: '#F5F7F4',
      surfaceHex: '#FFFFFF',
      primaryHex: '#174D35',
      textHex: '#111111',
      icon: <Palette className="w-4 h-4" />,
    },
    {
      id: 'light',
      title: '2. LIGHT — Off-White & Clean',
      subtitle: 'Interface corporativa minimalista (#FFFFFF / #F5F7F4)',
      bgHex: '#FFFFFF',
      surfaceHex: '#F5F7F4',
      primaryHex: '#174D35',
      textHex: '#111111',
      icon: <Sun className="w-4 h-4" />,
    },
    {
      id: 'night',
      title: '3. NIGHT — Grafite & Escuro Premium',
      subtitle: 'Tema noturno para centros de controle (#0D110F / #5DAA70)',
      bgHex: '#0D110F',
      surfaceHex: '#141B17',
      primaryHex: '#5DAA70',
      textHex: '#F5F7F4',
      icon: <Moon className="w-4 h-4" />,
    },
  ];

  const cpfValidation = validateCPF(testCpf);
  const cnpjValidation = validateCNPJ(testCnpj);
  const cepValidation = validateCEP(testCep);
  const phoneValidation = validatePhoneBR(testPhone);
  const dateValidation = validateDateBR(testDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text-primary)]">
          Design System, Temas & Configurações (Sprint 01)
        </h1>
        <p className="text-xs text-[var(--nex-text-secondary)] mt-0.5">
          Blueprint Master NexColetas · &ldquo;Sua coleta. Nossa conexão.&rdquo;
          · Base Operacional: Manhuaçu - MG
        </p>
      </div>

      {/* 1. SISTEMA DE TEMAS (GREEN, LIGHT, NIGHT) */}
      <Card
        title="1. Sistema Global de Temas (GREEN · LIGHT · NIGHT)"
        subtitle="Controle centralizado via CSS variables com persistência após reload"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themeCards.map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id);
                  onNotify(`Tema alterado para: ${item.title}`);
                }}
                aria-pressed={isSelected}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'border-[var(--nex-primary)] bg-[var(--nex-surface-secondary)]/70 shadow-xs'
                    : 'border-[var(--nex-border)] bg-[var(--nex-surface)] hover:border-[var(--nex-text-secondary)]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-[var(--nex-text-primary)] flex items-center gap-2">
                      {item.icon}
                      {item.title}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--nex-primary)] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--nex-text-secondary)]">
                    {item.subtitle}
                  </p>
                </div>

                <div
                  className="p-3 rounded-lg border flex items-center justify-between text-xs font-mono"
                  style={{
                    backgroundColor: item.bgHex,
                    color: item.textHex,
                    borderColor: item.primaryHex,
                  }}
                >
                  <span>Canvas: {item.bgHex}</span>
                  <span
                    className="px-2 py-0.5 rounded font-sans font-semibold text-white"
                    style={{ backgroundColor: item.primaryHex }}
                  >
                    Primary
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tokens Oficiais do Blueprint Master NexColetas */}
        <div className="mt-6 pt-5 border-t border-[var(--nex-border)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-bold text-[var(--nex-text-primary)]">
                Tokens Visuais Oficiais (Blueprint Master NexColetas)
              </h3>
              <p className="text-xs text-[var(--nex-text-secondary)]">
                Forest Green (#174D35) · Eco Green (#5DAA70) · Light Green
                (#B8DCC0) · Off White (#F5F7F4) · Graphite (#111111)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBrandManualRef(!showBrandManualRef)}
            >
              {showBrandManualRef
                ? 'Ocultar Referência da Marca'
                : 'Ver Prancha de Identidade'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: 'Forest Green', hex: BRAND_PALETTE.FOREST_GREEN },
              { name: 'Eco Green', hex: BRAND_PALETTE.ECO_GREEN },
              { name: 'Light Green', hex: BRAND_PALETTE.LIGHT_GREEN },
              { name: 'Off White', hex: BRAND_PALETTE.OFF_WHITE },
              { name: 'Graphite', hex: BRAND_PALETTE.GRAPHITE },
            ].map((sw) => (
              <div
                key={sw.name}
                className="p-2.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex items-center gap-2.5"
              >
                <span
                  className="w-7 h-7 rounded-md border border-black/15 shrink-0"
                  style={{ backgroundColor: sw.hex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--nex-text-primary)] truncate">
                    {sw.name}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--nex-text-secondary)]">
                    {sw.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4 variantes de logo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-lg bg-[#174D35] border border-[#5DAA70]/40 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-[#B8DCC0] font-semibold">
                1. Logo Horizontal (Forest)
              </span>
              <NexColetasLogo variant="horizontal" tone="dark-bg" size="sm" />
            </div>

            <div className="p-3.5 rounded-lg bg-[#174D35] border border-[#5DAA70]/40 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-[#B8DCC0] font-semibold">
                2. Símbolo Reduzido
              </span>
              <NexColetasLogo variant="symbol" tone="dark-bg" size="md" />
            </div>

            <div className="p-3.5 rounded-lg bg-[#F5F7F4] border border-[#D5E3D8] flex flex-col justify-between gap-2">
              <span className="text-[11px] text-[#174D35] font-semibold">
                3. Aplicação Fundo Claro
              </span>
              <NexColetasLogo variant="light-bg" tone="light-bg" size="sm" />
            </div>

            <div className="p-3.5 rounded-lg bg-[#111111] border border-[#26352C] flex flex-col justify-between gap-2">
              <span className="text-[11px] text-[#5DAA70] font-semibold">
                4. Aplicação Fundo Escuro
              </span>
              <NexColetasLogo variant="dark-bg" tone="dark-bg" size="sm" />
            </div>
          </div>

          {showBrandManualRef && (
            <div className="p-4 rounded-xl bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2">
              <div className="text-xs font-semibold text-[var(--nex-text-primary)]">
                Manual de Identidade Visual NexColetas (Referência Consultiva):
              </div>
              <img
                src="/assets/aistudio/69e5455b69f2773f2feb888acaf03d0ba7fdfde9fb495075fc0910b9f982769f_68eabbc8.png"
                alt="Manual de Identidade Visual NexColetas"
                referrerPolicy="no-referrer"
                className="w-full max-w-2xl rounded-lg border border-[var(--nex-border)]"
              />
            </div>
          )}
        </div>
      </Card>

      {/* 2. CATÁLOGO INTERATIVO DE COMPONENTES REUTILIZÁVEIS (SPRINT 01) */}
      <Card
        title="2. Catálogo do Design System Reutilizável (20+ Componentes Tipados)"
        subtitle="Button, Input, Select, Badge, Card, StatCard, Modal, Drawer, Dropdown, Table, Pagination, Tabs, Toast, Skeleton, EmptyState, Avatar, Tooltip, Breadcrumb, ThemeSwitcher, ConfirmDialog"
      >
        <div className="space-y-4">
          <Tabs
            activeTab={showcaseTab}
            onChange={setShowcaseTab}
            tabs={[
              { id: 'components', label: 'Controles & Interação' },
              { id: 'avatars', label: 'Avatares, Badges & Tooltips' },
            ]}
          />

          {showcaseTab === 'components' ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() =>
                  onNotify('Componente Toast acionado com sucesso.')
                }
              >
                Testar Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDemoConfirmOpen(true)}
              >
                Abrir ConfirmDialog
              </Button>
              <Dropdown
                triggerLabel="Menu Dropdown"
                align="left"
                options={[
                  {
                    id: 'opt-1',
                    label: 'Ação Operacional 01',
                    description: 'Despacho regional Manhuaçu - MG',
                    onClick: () =>
                      onNotify('Opção 01 selecionada no Dropdown.'),
                  },
                  {
                    id: 'opt-2',
                    label: 'Ação Operacional 02',
                    description: 'Auditoria de protocolo B2B',
                    onClick: () =>
                      onNotify('Opção 02 selecionada no Dropdown.'),
                  },
                ]}
              />
              <ThemeSwitcher />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <Avatar
                name="Hub Central Manhuaçu"
                subtitle="Operador Regional · MG"
                size="md"
              />
              <Tooltip text="Indicador semântico acessível (não depende apenas de cor)">
                <Badge tone="success">Operação Nominal</Badge>
              </Tooltip>
              <Badge tone="warning">Aguardando Despacho</Badge>
              <Badge tone="danger">Alerta de Rota</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* 3. PREFERÊNCIAS & ISOLAMENTO MULTI-TENANT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="3. Preferências Regionais & Acessibilidade"
          subtitle="Configurações operacionais para Manhuaçu - MG"
        >
          <div className="space-y-3 divide-y divide-[var(--nex-border)]">
            <div className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--nex-primary)]" />
                <span className="font-medium text-[var(--nex-text-primary)]">
                  Padrão Regional
                </span>
              </div>
              <span className="font-semibold text-[var(--nex-primary)]">
                pt-BR · R$ (BRL) · America/Sao_Paulo
              </span>
            </div>

            <Switch
              label="Notificações Operacionais de Coletas"
              description="Receber alertas de solicitações e mudanças de status em Manhuaçu - MG"
              checked={pushNotifications}
              onChange={(val) => {
                setPushNotifications(val);
                onNotify('Preferência de notificações atualizada.');
              }}
            />

            <Switch
              label="Alertas Sonoros de Despacho Urgente"
              description="Emitir aviso sonoro quando uma coleta entrar em alerta operacional"
              checked={soundAlerts}
              onChange={setSoundAlerts}
            />

            <Switch
              label="Modo de Tabelas Compactas"
              description="Otimizar densidade vertical para telas desktop (1440px+)"
              checked={compactTables}
              onChange={setCompactTables}
            />
          </div>
        </Card>

        <Card
          title="4. Governança Multi-Tenant & Autenticação"
          subtitle="Controle de acesso baseado em função (RBAC) e sessão segura"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--nex-text-primary)] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[var(--nex-primary)]" />
                  Sessão e Escopo Ativo
                </span>
                <Badge tone="success">RBAC Ativo</Badge>
              </div>
              <div>
                <span className="text-[var(--nex-text-secondary)]">
                  Usuário:{' '}
                </span>
                <strong className="text-[var(--nex-text-primary)]">
                  {firebaseUser
                    ? `${firebaseUser.displayName || 'Gestor'} (${firebaseUser.email})`
                    : 'Operador Local Manhuaçu (Modo Demonstração)'}
                </strong>
              </div>
              <div>
                <span className="text-[var(--nex-text-secondary)]">
                  Função:{' '}
                </span>
                <strong className="text-[var(--nex-primary)]">
                  {activeTenant.role} — {ROLE_LABELS_PT[activeTenant.role]}
                </strong>
              </div>
              <div>
                <span className="text-[var(--nex-text-secondary)]">
                  Tenant ID:{' '}
                </span>
                <code className="font-mono text-[var(--nex-text-primary)]">
                  {activeTenant.tenantId}
                </code>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="settings-tenant-switcher"
                className="block font-semibold text-[var(--nex-text-primary)]"
              >
                Alternar Escopo Multi-Tenant
              </label>
              <select
                id="settings-tenant-switcher"
                value={activeTenant.tenantId}
                onChange={(e) => {
                  selectTenant(e.target.value);
                  onNotify(
                    'Escopo Multi-Tenant alterado com isolamento de dados.'
                  );
                }}
                className="w-full min-h-[40px] px-3 py-2 text-xs rounded-lg bg-[var(--nex-input-bg)] text-[var(--nex-text-primary)] border border-[var(--nex-border)]"
              >
                {tenants.map((t) => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.name} ({t.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {firebaseUser ? (
                <Button variant="outline" size="sm" onClick={signOut}>
                  Encerrar Sessão Autenticada
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={signInWithGoogle}>
                  Autenticar com Google
                </Button>
              )}
              <span className="text-[11px] text-[var(--nex-text-secondary)] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[var(--nex-primary)]" />
                Zero secrets expostos no frontend
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. VALIDADOR SMART DATA & ARQUITETURA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Validador NexColetas Smart Data (Padrão Brasileiro)"
          subtitle="Validação matemática de CPF, CNPJ, CEP, Telefone com DDD e Data"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Teste de CPF"
              value={testCpf}
              onChange={(e) => setTestCpf(maskCPF(e.target.value))}
              error={cpfValidation.valid ? undefined : cpfValidation.error}
              hint={
                cpfValidation.valid ? 'CPF matematicamente válido' : undefined
              }
            />
            <Input
              label="Teste de CNPJ"
              value={testCnpj}
              onChange={(e) => setTestCnpj(maskCNPJ(e.target.value))}
              error={cnpjValidation.valid ? undefined : cnpjValidation.error}
              hint={
                cnpjValidation.valid ? 'CNPJ matematicamente válido' : undefined
              }
            />
            <Input
              label="Teste de CEP (Manhuaçu: 36900-000)"
              value={testCep}
              onChange={(e) => setTestCep(maskCEP(e.target.value))}
              error={cepValidation.valid ? undefined : cepValidation.error}
              hint={cepValidation.valid ? 'Formato de CEP válido' : undefined}
            />
            <Input
              label="Teste de Telefone com DDD"
              value={testPhone}
              onChange={(e) => setTestPhone(maskPhoneBR(e.target.value))}
              error={phoneValidation.valid ? undefined : phoneValidation.error}
              hint={
                phoneValidation.valid
                  ? 'DDD e celular válidos no Brasil'
                  : undefined
              }
            />
          </div>
          <div className="mt-3">
            <Input
              label="Teste de Data Real (DD/MM/AAAA)"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              error={dateValidation.valid ? undefined : dateValidation.error}
              hint={
                dateValidation.valid
                  ? `Data válida no calendário (${dateValidation.formatted})`
                  : undefined
              }
            />
          </div>
        </Card>

        <Card
          title="Preparação de Integrações Planejadas (Backend)"
          subtitle="Arquitetura preparada sem simular integrações falsas no cliente"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--nex-text-primary)]">
                  API REST Node.js/Express + Banco Relacional
                </div>
                <div className="text-[11px] text-[var(--nex-text-secondary)]">
                  Preparado para MySQL (Hostinger) e Cloud SQL Relacional
                </div>
              </div>
              <Badge tone="success">Estruturado</Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--nex-text-primary)]">
                  Google Maps, Places, Geocoding & Routes
                </div>
                <div className="text-[11px] text-[var(--nex-text-secondary)]">
                  Variável: VITE_GOOGLE_MAPS_API_KEY
                </div>
              </div>
              <Badge
                tone={
                  integrationsStatus?.googleMaps?.configured
                    ? 'success'
                    : 'neutral'
                }
              >
                {integrationsStatus?.googleMaps?.configured
                  ? 'Configurado'
                  : 'Planejado (.env)'}
              </Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--nex-text-primary)]">
                  Firebase Cloud Messaging & PWA
                </div>
                <div className="text-[11px] text-[var(--nex-text-secondary)]">
                  Manifest, ícones e service worker ativos
                </div>
              </div>
              <Badge tone="success">PWA Foundation</Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--nex-text-primary)]">
                  Mercado Pago (Split & Billing B2B)
                </div>
                <div className="text-[11px] text-[var(--nex-text-secondary)]">
                  Módulo Financeiro preparado para Sprint 03 (Server-Side)
                </div>
              </div>
              <Badge tone="neutral">Planejado (Sprint 03)</Badge>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={demoConfirmOpen}
        title="Validação do Componente ConfirmDialog"
        description="Este diálogo reutilizável faz parte do Design System NexColetas (Sprint 01) e adapta-se automaticamente aos temas GREEN, LIGHT e NIGHT."
        confirmLabel="Confirmar Ação"
        onConfirm={() => {
          setDemoConfirmOpen(false);
          onNotify('ConfirmDialog confirmado com sucesso.');
        }}
        onCancel={() => setDemoConfirmOpen(false)}
      />
    </div>
  );
};
