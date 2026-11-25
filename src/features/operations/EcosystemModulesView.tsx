import React, { useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Download,
  Handshake,
  Headphones,
  Leaf,
  MapPin,
  Navigation,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react';
import { PickupItem } from '../../../shared/types/index.ts';
import {
  formatCurrencyBRL,
  formatDateBR,
  maskCPF,
  maskPhoneBR,
  validateCPF,
  validatePhoneBR,
} from '../../../shared/validators/smartData.ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  ResponsiveTable,
  StatCard,
  StatusBadge,
  Textarea,
} from '../../components/ui/DesignSystem.tsx';
import { runSupportTriageRequest } from '../../services/apiClient.ts';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';

/* ============================================================================
   1. MAPA OPERACIONAL (MANHUAÇU - MG & INTEGRAÇÃO GOOGLE MAPS)
   ============================================================================ */

export const OperationalMapView: React.FC<{
  pickups: PickupItem[];
  onOpenNewPickup: () => void;
}> = ({ pickups, onOpenNewPickup }) => {
  const [selectedSector, setSelectedSector] = useState('Centro Comercial');

  const sectors = [
    {
      name: 'Centro Comercial',
      coords: '-20.2572, -42.0336',
      cepBase: '36900-000',
      ridersOnline: 6,
      avgWaitMin: 7,
    },
    {
      name: 'Coqueiro Rural / Av. Getúlio Vargas',
      coords: '-20.2518, -42.0281',
      cepBase: '36900-001',
      ridersOnline: 4,
      avgWaitMin: 11,
    },
    {
      name: 'Baixada / Santa Luzia',
      coords: '-20.2610, -42.0390',
      cepBase: '36900-110',
      ridersOnline: 3,
      avgWaitMin: 9,
    },
    {
      name: 'Ponte da Aldeia / Eixo BR-262',
      coords: '-20.2445, -42.0195',
      cepBase: '36904-000',
      ridersOnline: 5,
      avgWaitMin: 12,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
            Mapa Operacional — Manhuaçu e Região
          </h1>
          <p className="text-xs text-[var(--nex-muted)] mt-0.5">
            Monitoramento geográfico por quadrantes urbanos e preparação para
            Google Maps Platform (Maps JS, Places, Geocoding, Routes API)
          </p>
        </div>
        <Button variant="primary" onClick={onOpenNewPickup}>
          Despachar Coleta no Mapa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Malha Viária Urbana — Manhuaçu - MG (DEMONSTRAÇÃO)"
          subtitle="Clique em um quadrante para inspecionar operadores e coletas ativas"
          className="lg:col-span-2"
        >
          <div className="relative h-80 rounded-xl bg-[#0B2E1E] text-[#F1FDF4] p-5 border border-[#166534] flex flex-col justify-between overflow-hidden">
            <svg
              viewBox="0 0 600 280"
              className="absolute inset-0 w-full h-full opacity-40"
              fill="none"
            >
              {/* Traçado estilizado BR-262 e Rio Manhuaçu */}
              <path
                d="M 20 220 C 160 180, 290 120, 580 40"
                stroke="#22C55E"
                strokeWidth="4"
                strokeDasharray="8 5"
              />
              <path
                d="M 40 40 C 200 110, 340 160, 560 240"
                stroke="#84CC16"
                strokeWidth="2.5"
              />
              <circle cx="170" cy="168" r="10" fill="#22C55E" />
              <circle cx="300" cy="130" r="12" fill="#84CC16" />
              <circle cx="440" cy="85" r="10" fill="#F1FDF4" />
            </svg>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="inline-flex items-center gap-2 font-display font-bold text-[#84CC16]">
                <Navigation className="w-4 h-4" />
                <span>Setor Selecionado: {selectedSector}</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-[#F1FDF4]/80">
                Base: Manhuaçu - MG · Timezone: America/Sao_Paulo
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sectors.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelectedSector(s.name)}
                  className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
                    selectedSector === s.name
                      ? 'bg-[#166534] border-[#84CC16] text-white'
                      : 'bg-[#0B2E1E]/85 border-[#166534] text-[#F1FDF4]/85 hover:bg-[#166534]/50'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{s.name}</div>
                  <div className="text-[11px] text-[#84CC16] font-mono tabular-nums mt-1">
                    CEP {s.cepBase}
                  </div>
                  <div className="text-[11px] opacity-80 tabular-nums mt-0.5">
                    {s.ridersOnline} motoboys · ~{s.avgWaitMin} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Camada Google Maps Platform"
          subtitle="Configuração segura por variáveis de ambiente"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-1">
              <div className="font-semibold text-[var(--nex-text)]">
                APIs Preparadas na Arquitetura
              </div>
              <ul className="space-y-1 text-[var(--nex-muted)]">
                <li>· Maps JavaScript API (Renderização vetorial)</li>
                <li>· Places API & Address Validation (Endereços)</li>
                <li>· Geocoding API (Coordenadas de coletas)</li>
                <li>· Routes API (Otimização multi-parada)</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] space-y-1">
              <div className="font-semibold text-[var(--nex-text)]">
                Coletas Ativas no Mapa ({pickups.length})
              </div>
              {pickups.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1 border-b border-[var(--nex-border)] last:border-0"
                >
                  <span className="truncate">
                    {p.protocol}: {p.originNeighborhood} →{' '}
                    {p.destinationNeighborhood}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================================
   2. OPERADORES LOGÍSTICOS REGIONAIS
   ============================================================================ */

export const OperatorsView: React.FC = () => {
  const operators = [
    {
      id: 'OP-01',
      name: 'Hub Central Manhuaçu (DEMONSTRAÇÃO)',
      region: 'Centro, Baixada e Coqueiro Rural',
      coordinator: 'Eduardo Martins',
      phone: '(33) 98810-3300',
      activeRiders: 12,
      slaPercent: 98,
      status: 'ACTIVE',
    },
    {
      id: 'OP-02',
      name: 'Operador Eixo BR-262 Leste (DEMONSTRAÇÃO)',
      region: 'Ponte da Aldeia, Alfa Sul e Reduto',
      coordinator: 'Fernanda Oliveira',
      phone: '(33) 99920-5140',
      activeRiders: 8,
      slaPercent: 96,
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
          Operadores Logísticos Regionais
        </h1>
        <p className="text-xs text-[var(--nex-muted)] mt-0.5">
          Unidades operacionais e hubs de distribuição em Manhuaçu - MG (Dados
          marcados como DEMONSTRAÇÃO)
        </p>
      </div>

      <Card title="Bases Operacionais Homologadas">
        <ResponsiveTable
          data={operators}
          keyExtractor={(item) => item.id}
          columns={[
            {
              key: 'name',
              header: 'Unidade / Hub',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[var(--nex-primary)] shrink-0" />
                  <div>
                    <div className="font-semibold text-xs text-[var(--nex-text)]">
                      {row.name}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      Cobertura: {row.region}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'coordinator',
              header: 'Responsável / Contato',
              render: (row) => (
                <div className="text-xs">
                  <div className="text-[var(--nex-text)]">{row.coordinator}</div>
                  <div className="text-[11px] text-[var(--nex-muted)] tabular-nums">
                    {row.phone}
                  </div>
                </div>
              ),
            },
            {
              key: 'metrics',
              header: 'Frota / SLA',
              align: 'right',
              render: (row) => (
                <div className="text-xs tabular-nums">
                  <div className="font-semibold text-[var(--nex-text)]">
                    {row.activeRiders} motoboys vinculados
                  </div>
                  <div className="text-[11px] text-[var(--nex-primary)]">
                    SLA: {row.slaPercent}% no prazo
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'right',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

/* ============================================================================
   3. MOTOBOYS & ENTREGADORES (COM VALIDADOR SMART DATA DE CPF)
   ============================================================================ */

export const RidersView: React.FC = () => {
  const [riders, setRiders] = useState([
    {
      id: 1,
      name: 'Lucas Ferreira (DEMONSTRAÇÃO)',
      cpf: '529.982.247-25',
      phone: '(33) 98841-1020',
      vehicle: 'Honda CG 160 Cargo · Placa QXW-4B12',
      baseSector: 'Centro / Manhuaçu',
      status: 'ACTIVE',
    },
    {
      id: 2,
      name: 'Rafael Souza (DEMONSTRAÇÃO)',
      cpf: '111.444.777-35',
      phone: '(33) 99918-4410',
      vehicle: 'Yamaha Factor 150 · Placa RMT-8C90',
      baseSector: 'Coqueiro Rural',
      status: 'ACTIVE',
    },
  ]);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('Honda CG 160 Start');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (name.trim().length < 3) {
      setFormError('Informe o nome completo do motoboy.');
      return;
    }

    const cpfCheck = validateCPF(cpf);
    if (!cpfCheck.valid) {
      setFormError(cpfCheck.error || 'CPF inválido.');
      return;
    }

    if (riders.some((r) => r.cpf === cpfCheck.formatted)) {
      setFormError('Este CPF já está cadastrado na base de motoboys.');
      return;
    }

    const phoneCheck = validatePhoneBR(phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.error || 'Telefone inválido.');
      return;
    }

    setRiders((prev) => [
      {
        id: Date.now(),
        name: name.trim(),
        cpf: cpfCheck.formatted,
        phone: phoneCheck.formatted,
        vehicle: vehicle.trim(),
        baseSector: 'Centro / Manhuaçu',
        status: 'ACTIVE',
      },
      ...prev,
    ]);
    setName('');
    setCpf('');
    setPhone('');
    setFormSuccess('Motoboy homologado com validação matemática de CPF.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
          Motoboys e Condutores Credenciados
        </h1>
        <p className="text-xs text-[var(--nex-muted)] mt-0.5">
          Homologação com validação matemática de CPF (bloqueio de dígitos
          repetidos e duplicidade)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Homologar Novo Motoboy (Smart Data CPF)"
          subtitle="Validação instantânea em português brasileiro"
        >
          <form onSubmit={handleAddRider} className="space-y-3.5">
            {formError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/40 text-xs text-[#166534] dark:text-[#84CC16] font-medium">
                {formSuccess}
              </div>
            )}

            <Input
              label="Nome Completo do Condutor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Bruno Almeida"
            />
            <Input
              label="CPF (000.000.000-00)"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="529.982.247-25"
            />
            <Input
              label="Celular / WhatsApp com DDD"
              value={phone}
              onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              placeholder="(33) 98812-3456"
            />
            <Input
              label="Veículo / Placa Mercosul"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="Honda CG 160 · Placa..."
            />

            <Button variant="primary" type="submit" className="w-full">
              Validar CPF e Credenciar Motoboy
            </Button>
          </form>
        </Card>

        <Card
          title={`Frota Ativa (${riders.length})`}
          subtitle="Condutores habilitados para coletas em Manhuaçu - MG"
          className="lg:col-span-2"
        >
          <ResponsiveTable
            data={riders}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: 'name',
                header: 'Motoboy / Setor',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-[var(--nex-primary)] shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-[var(--nex-text)]">
                        {row.name}
                      </div>
                      <div className="text-[11px] text-[var(--nex-muted)]">
                        Base: {row.baseSector}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'cpf',
                header: 'CPF / Telefone',
                render: (row) => (
                  <div className="text-xs tabular-nums">
                    <div className="font-mono font-semibold text-[var(--nex-text)]">
                      {row.cpf}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      {row.phone}
                    </div>
                  </div>
                ),
              },
              {
                key: 'vehicle',
                header: 'Veículo',
                render: (row) => (
                  <span className="text-xs text-[var(--nex-muted)]">
                    {row.vehicle}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'right',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

/* ============================================================================
   4. PARCEIROS & AFILIADOS
   ============================================================================ */

export const AffiliatesView: React.FC = () => {
  const partners = [
    {
      code: 'AF-MANHUACU-01',
      name: 'Associação Comercial Regional (DEMONSTRAÇÃO)',
      referredCompanies: 6,
      commissionBrl: 840.0,
      status: 'ACTIVE',
    },
    {
      code: 'AF-LESTE-02',
      name: 'Consultoria Logística Caparaó (DEMONSTRAÇÃO)',
      referredCompanies: 3,
      commissionBrl: 420.0,
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
          Programa de Parceiros e Afiliados
        </h1>
        <p className="text-xs text-[var(--nex-muted)] mt-0.5">
          Expansão regional conectando indicadores comerciais e empresas em
          Manhuaçu e Zona da Mata - MG
        </p>
      </div>

      <Card title="Parceiros Comerciais Ativos (DEMONSTRAÇÃO)">
        <ResponsiveTable
          data={partners}
          keyExtractor={(item) => item.code}
          columns={[
            {
              key: 'name',
              header: 'Parceiro / Código',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-[var(--nex-primary)]" />
                  <div>
                    <div className="font-semibold text-xs text-[var(--nex-text)]">
                      {row.name}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--nex-muted)]">
                      Código: {row.code}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'referred',
              header: 'Empresas Indicadas',
              align: 'right',
              render: (row) => (
                <span className="text-xs font-semibold tabular-nums">
                  {row.referredCompanies} empresas
                </span>
              ),
            },
            {
              key: 'commission',
              header: 'Comissão Acumulada',
              align: 'right',
              render: (row) => (
                <span className="text-xs font-bold text-[var(--nex-primary)] tabular-nums">
                  {formatCurrencyBRL(row.commissionBrl)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'right',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

/* ============================================================================
   5. FINANCEIRO (PADRÃO BRL — R$)
   ============================================================================ */

export const FinanceView: React.FC<{ pickups: PickupItem[] }> = ({
  pickups,
}) => {
  const grossTotal = pickups.reduce((acc, p) => acc + Number(p.feeBrl || 0), 0);
  const ridersPayout = grossTotal * 0.72;
  const platformFee = grossTotal * 0.28;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
          Gestão Financeira Multi-Tenant (BRL — R$)
        </h1>
        <p className="text-xs text-[var(--nex-muted)] mt-0.5">
          Conciliação de fretes urbanos, repasses a motoboys/operadores e
          assinaturas SaaS
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Volume Bruto Transacionado"
          value={formatCurrencyBRL(grossTotal)}
          helperText="Soma das coletas do Tenant atual"
          icon={<Wallet className="w-4 h-4" />}
          highlight
        />
        <StatCard
          label="Repasse Operadores & Motoboys (72%)"
          value={formatCurrencyBRL(ridersPayout)}
          helperText="Liquidação programada D+1"
          icon={<Bike className="w-4 h-4" />}
        />
        <StatCard
          label="Margem Operacional Plataforma (28%)"
          value={formatCurrencyBRL(platformFee)}
          helperText="Taxa tecnológica NexColetas"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      <Card
        title="Extrato de Lançamentos por Coleta"
        subtitle="Moeda oficial: Real Brasileiro (R$) · Datas em DD/MM/AAAA"
      >
        <ResponsiveTable
          data={pickups}
          keyExtractor={(item) => item.id}
          columns={[
            {
              key: 'protocol',
              header: 'Protocolo',
              render: (row) => (
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {row.protocol}
                </span>
              ),
            },
            {
              key: 'company',
              header: 'Empresa Pagadora',
              render: (row) => (
                <span className="text-xs">{row.companyName}</span>
              ),
            },
            {
              key: 'date',
              header: 'Data de Competência',
              render: (row) => (
                <span className="text-xs tabular-nums text-[var(--nex-muted)]">
                  {formatDateBR(row.createdAt)}
                </span>
              ),
            },
            {
              key: 'fee',
              header: 'Valor Bruto (R$)',
              align: 'right',
              render: (row) => (
                <span className="text-xs font-bold tabular-nums text-[var(--nex-text)]">
                  {formatCurrencyBRL(row.feeBrl)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status Operacional',
              align: 'right',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

/* ============================================================================
   6. ATENDIMENTO & SUPORTE (COM CAMADA GEMINI PREPARADA)
   ============================================================================ */

export const SupportView: React.FC = () => {
  const { activeTenant, idToken } = useTenantAuth();
  const [ticketMessage, setTicketMessage] = useState('');
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [tickets, setTickets] = useState([
    {
      id: 'CH-1042',
      subject: 'Prioridade de coleta urgente no Centro de Manhuaçu',
      category: 'Triagem Operacional Manhuaçu',
      priority: 'ALTA',
      reply:
        'Motoboy Lucas Ferreira acionado a 600m da Praça Cordovil Pinto Coelho. Previsão de chegada: 6 minutos.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketMessage.trim().length < 4) return;
    setLoadingTriage(true);
    try {
      const triage = await runSupportTriageRequest(
        {
          tenantId: activeTenant.tenantId,
          role: activeTenant.role,
          idToken,
        },
        ticketMessage
      );
      setTickets((prev) => [
        {
          id: `CH-${Math.floor(1100 + Math.random() * 8900)}`,
          subject: ticketMessage.trim(),
          category: triage.category,
          priority: triage.priority,
          reply: triage.suggestedReply,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTicketMessage('');
    } finally {
      setLoadingTriage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
          Central de Atendimento & Suporte Regional
        </h1>
        <p className="text-xs text-[var(--nex-muted)] mt-0.5">
          Comunicação direta entre empresas, operadores e central Manhuaçu - MG
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Abrir Solicitação Operacional"
          subtitle="Triagem assistida pela camada server-side NexColetas"
        >
          <form onSubmit={handleSendTicket} className="space-y-3.5">
            <Textarea
              label="Descreva sua dúvida ou ocorrência de coleta"
              rows={4}
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Ex.: Preciso reagendar a coleta NX-2026-0103 no bairro Bom Pastor para as 15h30..."
            />
            <Button
              variant="primary"
              type="submit"
              isLoading={loadingTriage}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Registrar Solicitação
            </Button>
          </form>
        </Card>

        <Card
          title={`Chamados do Tenant (${tickets.length})`}
          subtitle="Histórico de atendimento em português brasileiro"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-[var(--nex-surface-secondary)]/60 border border-[var(--nex-border)] space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold text-[var(--nex-primary)]">
                    {t.id} · {t.category}
                  </span>
                  <Badge
                    tone={t.priority === 'ALTA' ? 'warning' : 'success'}
                  >
                    Prioridade {t.priority}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-[var(--nex-text)]">
                  {t.subject}
                </div>
                <div className="text-xs text-[var(--nex-muted)] bg-[var(--nex-surface)] p-3 rounded-lg border border-[var(--nex-border)] flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--nex-primary)] shrink-0 mt-0.5" />
                  <span>{t.reply}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================================
   7. RELATÓRIOS & SUSTENTABILIDADE (EXPORTAÇÃO CSV REAL)
   ============================================================================ */

export const ReportsView: React.FC<{ pickups: PickupItem[] }> = ({
  pickups,
}) => {
  const totalKm = pickups.reduce((acc, p) => acc + Number(p.distanceKm || 0), 0);
  const totalKg = pickups.reduce((acc, p) => acc + Number(p.weightKg || 0), 0);
  const co2SavedKg = (totalKm * 0.18).toFixed(2);

  const handleExportCSV = () => {
    const headers = [
      'Protocolo',
      'Empresa',
      'Origem',
      'Destino',
      'Peso_kg',
      'Distancia_km',
      'Valor_BRL',
      'Status',
    ];
    const rows = pickups.map((p) => [
      p.protocol,
      `"${p.companyName.replace(/"/g, '""')}"`,
      p.originNeighborhood,
      p.destinationNeighborhood,
      p.weightKg,
      p.distanceKm,
      p.feeBrl,
      p.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexcoletas-relatorio-manhuacu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
            Relatórios Operacionais & Sustentabilidade
          </h1>
          <p className="text-xs text-[var(--nex-muted)] mt-0.5">
            Métricas consolidadas de quilometragem (km), carga transportada (kg)
            e eficiência ambiental urbana
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExportCSV}
        >
          Exportar Relatório CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Distância Total Percorrida"
          value={`${totalKm.toFixed(1)} km`}
          helperText="Malha urbana de Manhuaçu - MG"
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatCard
          label="Volume Total Transportado"
          value={`${totalKg.toFixed(1)} kg`}
          helperText="Coletas fracionadas e expressas"
          icon={<Truck className="w-4 h-4" />}
        />
        <StatCard
          label="Redução Estimada de CO₂"
          value={`${co2SavedKg} kg`}
          helperText="Roteirização inteligente NexColetas"
          icon={<Leaf className="w-4 h-4" />}
          highlight
        />
      </div>

      <Alert
        title="Sustentabilidade Logística — Manhuaçu e Região"
        variant="success"
      >
        O agrupamento de coletas por bairro reduz deslocamentos vazios em até
        31% nos corredores Centro, Coqueiro Rural e Ponte da Aldeia.
      </Alert>
    </div>
  );
};
