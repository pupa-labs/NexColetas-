import React, { useState } from 'react';
import { Building2, CheckCircle2, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { CompanyItem } from '../../../shared/types/index.ts';
import {
  formatDateBR,
  lookupCEP,
  maskCEP,
  maskCNPJ,
  maskPhoneBR,
  validateCEP,
  validateCNPJ,
  validateEmail,
  validatePhoneBR,
} from '../../../shared/validators/smartData.ts';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ResponsiveTable,
  Select,
  StatusBadge,
} from '../../components/ui/DesignSystem.tsx';
import { useTenantAuth } from '../../app/TenantAuthContext.tsx';

interface CompaniesViewProps {
  companies: CompanyItem[];
  onCreateCompany: (payload: {
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
  }) => Promise<void>;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  onCreateCompany,
}) => {
  const { activeTenant } = useTenantAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Estados do formulário Smart Data
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [segment, setSegment] = useState('Varejo & E-commerce');
  const [cep, setCep] = useState('36900-000');
  const [street, setStreet] = useState('Praça Cordovil Pinto Coelho');
  const [number, setNumber] = useState('100');
  const [neighborhood, setNeighborhood] = useState('Centro');
  const [city, setCity] = useState('Manhuaçu');
  const [state, setState] = useState('MG');

  // Erros de validação individual
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<string>(
    'CEP 36900-000 validado automaticamente (Manhuaçu - MG)'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleCnpjChange = (val: string) => {
    const masked = maskCNPJ(val);
    setCnpj(masked);
    if (masked.length === 18) {
      const check = validateCNPJ(masked);
      setErrors((prev) => ({
        ...prev,
        cnpj: check.valid ? '' : check.error || '',
      }));
    }
  };

  const handlePhoneChange = (val: string) => {
    const masked = maskPhoneBR(val);
    setPhone(masked);
    if (masked.length >= 14) {
      const check = validatePhoneBR(masked);
      setErrors((prev) => ({
        ...prev,
        phone: check.valid ? '' : check.error || '',
      }));
    }
  };

  const handleCepChange = async (val: string) => {
    const masked = maskCEP(val);
    setCep(masked);
    if (masked.length === 9) {
      const res = await lookupCEP(masked);
      if (res.found) {
        setStreet(res.street);
        setNeighborhood(res.neighborhood);
        setCity(res.city);
        setState(res.state);
        setCepStatus(`Endereço localizado: ${res.neighborhood}, ${res.city} - ${res.state}`);
        setErrors((prev) => ({ ...prev, cep: '' }));
      } else {
        setCepStatus(res.error || 'Preencha o endereço manualmente.');
        if (res.error && !validateCEP(masked).valid) {
          setErrors((prev) => ({ ...prev, cep: res.error || '' }));
        }
      }
    }
  };

  const fillValidSampleCompany = () => {
    setTradeName('Distribuidora Café Manhuaçu');
    setLegalName('Comércio e Logística Café Manhuaçu Ltda');
    setCnpj('11.222.333/0001-81');
    setEmail('operacao@cafemanhuacu.com.br');
    setPhone('(33) 98845-1290');
    setCep('36900-045');
    setStreet('Rua Amaral Franco');
    setNumber('245');
    setNeighborhood('Centro');
    setCity('Manhuaçu');
    setState('MG');
    setErrors({});
    setCepStatus('Endereço localizado: Centro, Manhuaçu - MG');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (tradeName.trim().length < 2) {
      newErrors.tradeName = 'Informe o Nome Fantasia da empresa.';
    }
    if (legalName.trim().length < 3) {
      newErrors.legalName = 'Informe a Razão Social completa.';
    }

    const cnpjResult = validateCNPJ(cnpj);
    if (!cnpjResult.valid) {
      newErrors.cnpj = cnpjResult.error || 'CNPJ inválido.';
    } else if (companies.some((c) => c.cnpj === cnpjResult.formatted)) {
      newErrors.cnpj = 'Este CNPJ já está cadastrado no sistema (Duplicidade bloqueada).';
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      newErrors.email = emailResult.error || 'E-mail inválido.';
    }

    const phoneResult = validatePhoneBR(phone);
    if (!phoneResult.valid) {
      newErrors.phone = phoneResult.error || 'Telefone inválido.';
    }

    const cepResult = validateCEP(cep);
    if (!cepResult.valid) {
      newErrors.cep = cepResult.error || 'CEP inválido.';
    }

    if (!street.trim() || !neighborhood.trim()) {
      newErrors.street = 'Informe o logradouro e o bairro.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).some((k) => Boolean(newErrors[k]))) {
      return;
    }

    setSubmitting(true);
    try {
      await onCreateCompany({
        tradeName: tradeName.trim(),
        legalName: legalName.trim(),
        cnpj: cnpjResult.formatted,
        email: emailResult.formatted,
        phone: phoneResult.formatted,
        segment,
        cep: cepResult.formatted,
        street: street.trim(),
        number: number.trim() || 'S/N',
        neighborhood: neighborhood.trim(),
        city: city.trim() || 'Manhuaçu',
        state: state.trim() || 'MG',
      });
      setModalOpen(false);
      setTradeName('');
      setLegalName('');
      setCnpj('');
      setEmail('');
      setPhone('');
    } catch (err: unknown) {
      setErrors({
        form: err instanceof Error ? err.message : 'Erro ao salvar empresa.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text)]">
            Empresas Embarcadoras (Multi-Tenant)
          </h1>
          <p className="text-xs text-[var(--nex-muted)] mt-0.5">
            Cadastro inteligente NexColetas Smart Data com validação matemática
            de CNPJ, CEP e isolamento por Tenant
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Cadastrar Empresa
        </Button>
      </div>

      <Alert
        title={`Isolamento Multi-Tenant Ativo — Escopo: ${activeTenant.name}`}
        variant="info"
      >
        Apenas as empresas pertencentes ao escopo{' '}
        <strong>{activeTenant.tenantId}</strong> são exibidas abaixo. Nenhuma
        empresa externa tem acesso aos dados deste ambiente.
      </Alert>

      {companies.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa cadastrada neste Tenant"
          description="Utilize o cadastro inteligente com validação de CNPJ e autopreenchimento de CEP para adicionar a primeira empresa."
          actionLabel="Cadastrar Primeira Empresa"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <Card
          title={`Empresas Vinculadas (${companies.length})`}
          subtitle="Registros protegidos por validação frontend + backend"
        >
          <ResponsiveTable
            data={companies}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: 'tradeName',
                header: 'Nome Fantasia / Razão Social',
                render: (row) => (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-[var(--nex-primary)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-xs text-[var(--nex-text)]">
                        {row.tradeName}
                      </div>
                      <div className="text-[11px] text-[var(--nex-muted)]">
                        {row.legalName}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'cnpj',
                header: 'CNPJ / Tenant ID',
                render: (row) => (
                  <div>
                    <div className="font-mono text-xs font-semibold text-[var(--nex-text)] tabular-nums">
                      {row.cnpj}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      Tenant: {row.tenantId}
                    </div>
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Contato Regional',
                render: (row) => (
                  <div className="text-xs">
                    <div className="text-[var(--nex-text)] tabular-nums">
                      {row.phone}
                    </div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      {row.email}
                    </div>
                  </div>
                ),
              },
              {
                key: 'segment',
                header: 'Segmento / Origem',
                render: (row) => (
                  <div className="text-xs">
                    <div className="text-[var(--nex-text)]">{row.segment}</div>
                    <div className="text-[11px] text-[var(--nex-muted)]">
                      {row.isDemo ? 'DEMONSTRAÇÃO' : 'Cadastro Real'} ·{' '}
                      {formatDateBR(row.createdAt)}
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
      )}

      {/* Modal de Cadastro Inteligente NexColetas Smart Data */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cadastro Inteligente de Empresa (NexColetas Smart Data)"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={fillValidSampleCompany}
            >
              Preencher Exemplo Válido (Manhuaçu)
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              isLoading={submitting}
              onClick={handleSubmit}
            >
              Salvar Empresa
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome Fantasia"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              error={errors.tradeName}
              placeholder="Ex.: Café Manhuaçu Express"
              required
            />
            <Input
              label="CNPJ (Validação Matemática)"
              value={cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              error={errors.cnpj}
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <Input
            label="Razão Social Completa"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            error={errors.legalName}
            placeholder="Ex.: Café Manhuaçu Logística e Distribuição Ltda"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="E-mail Corporativo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="logistica@empresa.com.br"
              required
            />
            <Input
              label="Telefone / WhatsApp com DDD"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={errors.phone}
              placeholder="(33) 98800-0000"
              required
            />
          </div>

          <Select
            label="Segmento de Atuação"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            options={[
              { value: 'Varejo & E-commerce', label: 'Varejo & E-commerce' },
              {
                value: 'Agroindústria & Café Especial',
                label: 'Agroindústria & Café Especial',
              },
              {
                value: 'Saúde & Medicamentos',
                label: 'Saúde & Medicamentos',
              },
              {
                value: 'Autopeças & Distribuição',
                label: 'Autopeças & Distribuição',
              },
              {
                value: 'Alimentação & Delivery',
                label: 'Alimentação & Delivery',
              },
            ]}
          />

          <div className="pt-2 border-t border-[var(--nex-border)] space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--nex-text)]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--nex-primary)]" />
                Endereço de Coleta (Autopreenchimento via CEP)
              </span>
              <span className="text-[11px] text-[var(--nex-primary)]">
                {cepStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="CEP"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                error={errors.cep}
                placeholder="36900-000"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua / Avenida"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  error={errors.street}
                  placeholder="Praça Cordovil Pinto Coelho"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="140"
              />
              <Input
                label="Bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Centro"
              />
              <Input
                label="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Manhuaçu"
              />
              <Input
                label="UF"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="MG"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--nex-muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--nex-primary)] shrink-0" />
            <span>
              Validação dupla (Frontend + Backend) ativa com bloqueio de
              sequências inválidas e duplicidade de CNPJ.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
