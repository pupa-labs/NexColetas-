import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  Layers,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
} from '../../components/ui/DesignSystem.tsx';

export interface PlannedModuleSpec {
  moduleName: string;
  sprintTarget: string;
  tagline: string;
  description: string;
  plannedCapabilities: string[];
  plannedIntegrations: string[];
  databaseEntities: string[];
  previewComponent?: React.ReactNode;
}

export const PlannedModuleFoundation: React.FC<PlannedModuleSpec> = ({
  moduleName,
  sprintTarget,
  tagline,
  description,
  plannedCapabilities,
  plannedIntegrations,
  databaseEntities,
  previewComponent,
}) => {
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [confirmPreviewOpen, setConfirmPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Transparente de Módulo Planejado (Requisito 7 da Sprint 01) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--nex-border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nex-text-secondary)]">
            <span>Blueprint Master NexColetas</span>
            <span aria-hidden="true">·</span>
            <span>Base: Manhuaçu - MG</span>
            <span aria-hidden="true">·</span>
            <Badge tone="warning">
              MÓDULO PLANEJADO ({sprintTarget})
            </Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--nex-text-primary)] mt-1">
            {moduleName}
          </h1>
          <p className="text-xs text-[var(--nex-text-secondary)] mt-0.5">
            {tagline}
          </p>
        </div>

        {previewComponent && (
          <div className="flex items-center gap-2">
            {showDemoPreview ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDemoPreview(false)}
              >
                Voltar ao Estado Planejado
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => setConfirmPreviewOpen(true)}
              >
                Inspecionar Layout de Demonstração
              </Button>
            )}
          </div>
        )}
      </div>

      <Alert
        title={`Status Transparente de Fundação — ${moduleName} (${sprintTarget})`}
        variant="info"
      >
        Em conformidade com as diretrizes do{' '}
        <strong>NexColetas Foundation Build (Sprint 01)</strong>, este módulo
        possui rota, contrato de navegação e arquitetura preparados no
        Application Shell, sem simular integrações externas como se fossem reais.
      </Alert>

      {!showDemoPreview ? (
        <>
          <EmptyState
            title={`${moduleName} — Estrutura Preparada para ${sprintTarget}`}
            description={description}
            actionLabel={
              previewComponent
                ? 'Visualizar Protótipo UI (Demonstração)'
                : undefined
            }
            onAction={
              previewComponent
                ? () => setConfirmPreviewOpen(true)
                : undefined
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              title="Capacidades Planejadas"
              subtitle="Escopo funcional previsto no Blueprint Master"
            >
              <ul className="space-y-2 text-xs text-[var(--nex-text-secondary)]">
                {plannedCapabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--nex-primary)] shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="Integrações & Segurança"
              subtitle="Camadas server-side sem exposição de credenciais"
            >
              <ul className="space-y-2 text-xs text-[var(--nex-text-secondary)]">
                {plannedIntegrations.map((intg) => (
                  <li key={intg} className="flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--nex-primary)] shrink-0 mt-0.5" />
                    <span>{intg}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="Modelagem Relacional"
              subtitle="Entidades e isolamento Multi-Tenant"
            >
              <div className="space-y-2.5 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {databaseEntities.map((entity) => (
                    <code
                      key={entity}
                      className="px-2 py-1 rounded bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)] font-mono text-[11px] text-[var(--nex-text-primary)]"
                    >
                      {entity}
                    </code>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--nex-text-secondary)] flex items-center gap-1.5 pt-1">
                  <CalendarClock className="w-3.5 h-3.5 text-[var(--nex-primary)] shrink-0" />
                  <span>Base operacional inicial: Manhuaçu - MG</span>
                </p>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-primary)] flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--nex-text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--nex-primary)]" />
              Modo de Validação Visual do Design System (DADOS DE DEMONSTRAÇÃO)
            </span>
            <span className="text-[var(--nex-text-secondary)] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Manhuaçu - MG
            </span>
          </div>
          {previewComponent}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmPreviewOpen}
        title={`Abrir Layout de Demonstração — ${moduleName}`}
        description="Este modo exibe componentes visuais do Design System utilizando exclusivamente dados identificados como DEMONSTRAÇÃO para validação de UI/UX. Nenhuma integração externa falsa será simulada como real."
        confirmLabel="Visualizar Layout (DEMO)"
        onConfirm={() => {
          setConfirmPreviewOpen(false);
          setShowDemoPreview(true);
        }}
        onCancel={() => setConfirmPreviewOpen(false)}
      />
    </div>
  );
};
