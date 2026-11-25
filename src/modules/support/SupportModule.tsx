import React from 'react';
import { PlannedModuleFoundation } from '../common/PlannedModuleFoundation.tsx';
import { SupportView } from '../../features/operations/EcosystemModulesView.tsx';

export const SupportModule: React.FC = () => (
  <PlannedModuleFoundation
    moduleName="Suporte Operacional & Central de Atendimento"
    sprintTarget="Sprint 03 · Atendimento & SLA"
    tagline="Canal estruturado entre empresas, operadores logísticos e equipe de suporte NexColetas."
    description="A central completa de tickets em tempo real, notificações push via Firebase Cloud Messaging e protocolo de ocorrências em rota está planejada para implementação completa nas próximas sprints."
    plannedCapabilities={[
      'Abertura de chamados vinculados a protocolos de coleta (NX-2026-...)',
      'Triagem de prioridade para ocorrências em trânsito urbano',
      'Histórico de mensagens auditado por Tenant',
      'Alertas operacionais via Firebase Cloud Messaging (PWA)',
    ]}
    plannedIntegrations={[
      'Firebase Cloud Messaging (Notificações Push Operacionais)',
      'Triagem server-side protegida por variáveis de ambiente',
    ]}
    databaseEntities={[
      'support_conversations',
      'support_messages',
      'notifications',
    ]}
    previewComponent={<SupportView />}
  />
);
