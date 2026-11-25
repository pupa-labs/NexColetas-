import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Handshake,
  Headphones,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Network,
  Plus,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
  Waypoints,
} from 'lucide-react';
import { ModuleKey } from '../../../shared/types/index.ts';
import { ROLE_LABELS_PT } from '../../../shared/constants/index.ts';
import { NexColetasLogo } from '../brand/NexColetasLogo.tsx';
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  IconButton,
  Modal,
  OfflineIndicator,
  PWAInstallButton,
  ThemeSwitcher,
} from '../ui/DesignSystem.tsx';
import { useTheme } from '../../theme/ThemeContext.tsx';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';

export interface NavItemConfig {
  key: ModuleKey;
  label: string;
  group: 'Core Operacional' | 'Rede & Cobertura' | 'Negócios & Suporte';
  icon: React.ReactNode;
  statusTag?: 'Ativo' | 'Sprint 02+';
}

export const SIDEBAR_MODULES: NavItemConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    group: 'Core Operacional',
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'operations',
    label: 'Operações',
    group: 'Core Operacional',
    icon: <Waypoints className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'requests',
    label: 'Solicitações',
    group: 'Core Operacional',
    icon: <ClipboardList className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'companies',
    label: 'Empresas',
    group: 'Rede & Cobertura',
    icon: <Building2 className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'operators',
    label: 'Operadores',
    group: 'Rede & Cobertura',
    icon: <Truck className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'coverage',
    label: 'Coverage Network',
    group: 'Rede & Cobertura',
    icon: <Network className="w-4 h-4 shrink-0" />,
    statusTag: 'Sprint 02+',
  },
  {
    key: 'finance',
    label: 'Financeiro (NexPay)',
    group: 'Negócios & Suporte',
    icon: <Wallet className="w-4 h-4 shrink-0" />,
    statusTag: 'Ativo',
  },
  {
    key: 'partners',
    label: 'Parceiros',
    group: 'Negócios & Suporte',
    icon: <Handshake className="w-4 h-4 shrink-0" />,
    statusTag: 'Sprint 02+',
  },
  {
    key: 'support',
    label: 'Suporte',
    group: 'Negócios & Suporte',
    icon: <Headphones className="w-4 h-4 shrink-0" />,
    statusTag: 'Sprint 02+',
  },
];

interface NexControlLayoutProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  onOpenNewPickup: () => void;
  children: React.ReactNode;
}

export const NexControlLayout: React.FC<NexControlLayoutProps> = ({
  activeModule,
  onSelectModule,
  onOpenNewPickup,
  children,
}) => {
  const { theme } = useTheme();
  const {
    activeTenant,
    tenants,
    selectTenant,
    firebaseUser,
    signInWithGoogle,
    signOut,
  } = useTenantAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentModuleObj =
    activeModule === 'settings'
      ? {
          key: 'settings' as ModuleKey,
          label: 'Design System & Configurações',
          group: 'Negócios & Suporte' as const,
          icon: <Settings className="w-4 h-4 shrink-0" />,
        }
      : SIDEBAR_MODULES.find((m) => m.key === activeModule) ||
        SIDEBAR_MODULES[0];

  const sidebarTone = theme === 'light' ? 'light-bg' : 'dark-bg';

  const notifications = [
    {
      id: 'n1',
      title: 'Solicitação NX-2026-0103 aguardando triagem',
      detail: 'Bairro Bom Pastor → São Vicente · Manhuaçu - MG (DEMONSTRAÇÃO)',
      time: 'Há 8 min',
    },
    {
      id: 'n2',
      title: 'Coleta NX-2026-0101 em rota urbana',
      detail: 'Centro → Coqueiro Rural · Operador Hub Central Manhuaçu',
      time: 'Há 19 min',
    },
    {
      id: 'n3',
      title: 'Isolamento Multi-Tenant verificado',
      detail: `Escopo ativo: ${activeTenant.name}`,
      time: 'Sistema',
    },
  ];

  const renderSidebarContent = (isMobile = false) => {
    const collapsed = !isMobile && sidebarCollapsed;
    return (
      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Topo da Sidebar: Logo NexColetas + Slogan */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--nex-sidebar-border)]">
            <button
              type="button"
              onClick={() => {
                onSelectModule('dashboard');
                if (isMobile) setMobileDrawerOpen(false);
              }}
              className="text-left focus:outline-none cursor-pointer"
            >
              <NexColetasLogo
                variant={collapsed ? 'symbol' : 'horizontal'}
                tone={sidebarTone}
                size="sm"
                showTagline={!collapsed}
                taglineText="Sua coleta. Nossa conexão."
              />
            </button>
            {!isMobile && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={
                  collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
                }
                className="p-1.5 rounded-lg text-[var(--nex-sidebar-muted)] hover:text-[var(--nex-sidebar-text)] hover:bg-[var(--nex-sidebar-surface)] transition-colors cursor-pointer"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Seletor de Contexto Multi-Tenant */}
          {!collapsed && (
            <div className="px-3.5 py-3 border-b border-[var(--nex-sidebar-border)]">
              <label
                htmlFor={
                  isMobile ? 'tenant-select-mobile' : 'tenant-select-desktop'
                }
                className="block text-[11px] font-semibold text-[var(--nex-sidebar-muted)] mb-1"
              >
                Unidade / Tenant B2B
              </label>
              <select
                id={
                  isMobile ? 'tenant-select-mobile' : 'tenant-select-desktop'
                }
                value={`${activeTenant.tenantId}::${activeTenant.role}`}
                onChange={(e) => selectTenant(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--nex-sidebar-surface)] text-[var(--nex-sidebar-text)] border border-[var(--nex-sidebar-border)] focus:outline-none focus:border-[#5DAA70]"
              >
                {tenants.map((t) => {
                  const compositeKey = `${t.tenantId}::${t.role}`;
                  return (
                    <option key={compositeKey} value={compositeKey}>
                      {t.name}
                    </option>
                  );
                })}
              </select>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--nex-sidebar-muted)]">
                <span className="truncate">{ROLE_LABELS_PT[activeTenant.role]}</span>
                <span className="shrink-0">{activeTenant.city}</span>
              </div>
            </div>
          )}

          {/* Menu Inicial — 9 Módulos Oficiais da Sprint 01 */}
          <nav
            aria-label="Navegação principal NexColetas"
            className="p-2.5 space-y-1"
          >
            {SIDEBAR_MODULES.map((item) => {
              const isActive = item.key === activeModule;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectModule(item.key);
                    if (isMobile) setMobileDrawerOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#174D35] text-[#F5F7F4] font-semibold shadow-xs border border-[#5DAA70]/40'
                      : 'text-[var(--nex-sidebar-text)]/85 hover:bg-[var(--nex-sidebar-surface)] hover:text-[var(--nex-sidebar-text)]'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={
                        isActive
                          ? 'text-[#B8DCC0]'
                          : 'text-[var(--nex-sidebar-muted)]'
                      }
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="truncate whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!collapsed && item.statusTag === 'Sprint 02+' && (
                    <span className="text-[10px] font-mono text-[var(--nex-sidebar-muted)] opacity-80 shrink-0">
                      Plan.
                    </span>
                  )}
                </button>
              );
            })}

            {/* Acesso ao Design System & Configurações da Fundação */}
            <div className="pt-2 mt-2 border-t border-[var(--nex-sidebar-border)]">
              <button
                type="button"
                onClick={() => {
                  onSelectModule('settings');
                  if (isMobile) setMobileDrawerOpen(false);
                }}
                aria-current={activeModule === 'settings' ? 'page' : undefined}
                title={collapsed ? 'Design System & Temas' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeModule === 'settings'
                    ? 'bg-[#174D35] text-[#F5F7F4] font-semibold shadow-xs border border-[#5DAA70]/40'
                    : 'text-[var(--nex-sidebar-text)]/85 hover:bg-[var(--nex-sidebar-surface)] hover:text-[var(--nex-sidebar-text)]'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Settings className="w-4 h-4 text-[var(--nex-sidebar-muted)] shrink-0" />
                {!collapsed && (
                  <span className="truncate whitespace-nowrap">
                    Design System & Temas
                  </span>
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Rodapé da Sidebar: Base Regional Manhuaçu - MG & Conta */}
        <div className="p-3 border-t border-[var(--nex-sidebar-border)] space-y-2">
          {!collapsed && (
            <div className="rounded-lg bg-[var(--nex-sidebar-surface)] p-2.5 text-[11px] text-[var(--nex-sidebar-muted)] space-y-1">
              <div className="flex items-center justify-between font-semibold text-[var(--nex-sidebar-text)]">
                <span>Base Inicial</span>
                <span>Manhuaçu - MG</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5DAA70] shrink-0" />
                <span className="truncate">CNPJ: {activeTenant.cnpj}</span>
              </div>
            </div>
          )}

          {firebaseUser ? (
            <div className="flex items-center justify-between gap-2 px-1">
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--nex-sidebar-text)] truncate">
                    {firebaseUser.displayName || 'Gestor Autenticado'}
                  </div>
                  <div className="text-[11px] text-[var(--nex-sidebar-muted)] truncate">
                    {firebaseUser.email}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={signOut}
                title="Encerrar sessão"
                aria-label="Encerrar sessão"
                className="p-2 rounded-lg text-[var(--nex-sidebar-muted)] hover:text-white hover:bg-red-600/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            !collapsed && (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#5DAA70]/20 hover:bg-[#5DAA70]/30 text-[var(--nex-sidebar-text)] border border-[#5DAA70]/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#5DAA70]" />
                <span className="whitespace-nowrap">Entrar com Google</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[var(--nex-bg)] text-[var(--nex-text-primary)]">
      {/* Sidebar Desktop (>= 1024px) */}
      <aside
        aria-label="Barra lateral de navegação desktop"
        className={`hidden lg:flex flex-col shrink-0 bg-[var(--nex-sidebar-bg)] text-[var(--nex-sidebar-text)] border-r border-[var(--nex-sidebar-border)] transition-all duration-150 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Drawer Mobile & Tablet (< 1024px) */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Menu NexColetas"
      >
        {renderSidebarContent(true)}
      </Drawer>

      {/* Application Shell Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior com Breadcrumb, ThemeSwitcher, Notificações, Perfil e Ação Principal */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 bg-[var(--nex-header-bg)] border-b border-[var(--nex-border)] flex items-center justify-between gap-4">
          {/* Zona 1: Menu Mobile + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <IconButton
              label="Abrir menu de navegação"
              className="lg:hidden"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </IconButton>

            <div className="lg:hidden shrink-0">
              <NexColetasLogo
                variant="symbol"
                tone={theme === 'night' ? 'dark-bg' : 'light-bg'}
                size="sm"
                showTagline={false}
              />
            </div>

            <span className="sm:hidden text-sm font-display font-bold text-[var(--nex-text-primary)] truncate">
              {currentModuleObj.label}
            </span>

            <div className="hidden sm:block min-w-0 overflow-hidden">
              <Breadcrumb
                items={[
                  {
                    label: 'NexColetas',
                    onClick: () => onSelectModule('dashboard'),
                  },
                  { label: currentModuleObj.group },
                  { label: currentModuleObj.label },
                ]}
              />
            </div>
          </div>

          {/* Zona 2: Seletor Global de Temas (GREEN / LIGHT / NIGHT) + Notificações + Perfil */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <ThemeSwitcher />
            <PWAInstallButton />

            <IconButton
              label="Central de notificações operacionais"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="w-4 h-4" />
            </IconButton>

            <Dropdown
              triggerLabel={
                firebaseUser?.displayName || 'Operador Manhuaçu'
              }
              options={[
                {
                  id: 'profile-settings',
                  label: 'Design System & Configurações',
                  description: 'Temas GREEN / LIGHT / NIGHT e tokens visuais',
                  onClick: () => onSelectModule('settings'),
                },
                {
                  id: 'switch-tenant',
                  label: 'Alternar Escopo Multi-Tenant',
                  description: `Atual: ${activeTenant.city}`,
                  onClick: () =>
                    selectTenant(
                      activeTenant.tenantId === 'tenant_manhuacu_hq'
                        ? 'platform_global'
                        : 'tenant_manhuacu_hq'
                    ),
                },
              ]}
            />
          </div>

          {/* Zona 3: Ação Principal */}
          <div className="flex items-center gap-2 shrink-0">
            <IconButton
              label="Notificações"
              className="md:hidden"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="w-4 h-4" />
            </IconButton>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onOpenNewPickup}
            >
              Nova Solicitação
            </Button>
          </div>
        </header>

        {/* Barra compacta mobile para troca de tema (GREEN / LIGHT / NIGHT) e Perfil */}
        <div className="md:hidden px-4 py-2 bg-[var(--nex-surface)] border-b border-[var(--nex-border)] flex items-center justify-between gap-2 overflow-x-auto">
          <ThemeSwitcher compact />
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => onSelectModule('settings')}
              aria-label="Abrir perfil e configurações"
              className="cursor-pointer"
            >
              <Avatar
                name={firebaseUser?.displayName || 'NexColetas MG'}
                size="sm"
              />
            </button>
          </div>
        </div>

        {/* Área Principal do Application Shell */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Rodapé institucional do Application Shell */}
        <footer className="px-4 sm:px-6 py-4 border-t border-[var(--nex-border)] text-xs text-[var(--nex-text-secondary)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            NexColetas — &ldquo;Sua coleta. Nossa conexão.&rdquo; · Base
            Operacional: Manhuaçu, Minas Gerais, Brasil
          </div>
          <div className="flex items-center gap-3">
            <span>Sprint 01 · Foundation Build</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onSelectModule('settings')}
              className="hover:text-[var(--nex-text-primary)] underline cursor-pointer"
            >
              Design System & Temas
            </button>
          </div>
        </footer>
      </div>

      {/* Modal de Notificações do Application Shell */}
      <Modal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notificações Operacionais — Manhuaçu - MG"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNotificationsOpen(false)}
          >
            Fechar
          </Button>
        }
      >
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--nex-text-primary)]">
                  {n.title}
                </span>
                <span className="text-[11px] text-[var(--nex-text-secondary)]">
                  {n.time}
                </span>
              </div>
              <p className="text-xs text-[var(--nex-text-secondary)]">
                {n.detail}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <OfflineIndicator />
    </div>
  );
};
