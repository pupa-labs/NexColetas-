import React from 'react';
import { PlannedModuleFoundation } from '../common/PlannedModuleFoundation.tsx';
import { AffiliatesView } from '../../features/operations/EcosystemModulesView.tsx';

export const PartnersModule: React.FC = () => (
  <PlannedModuleFoundation
    moduleName="Parceiros Comerciais & Expansão Regional"
    sprintTarget="Sprint 03 · Ecossistema & Afiliados"
    tagline="Rede de parceiros indicadores, associações comerciais e expansão regional a partir de Manhuaçu - MG."
    description="O módulo de atribuição comercial, carteira de comissões e acompanhamento de metas de expansão regional está planejado para a Sprint 03."
    plannedCapabilities={[
      'Cadastro de parceiros estratégicos e indicadores B2B',
      'Rastreamento de empresas embarcadoras indicadas por região',
      'Cálculo transparente de comissionamento recorrente',
      'Solicitação e histórico de saques de parceiros',
    ]}
    plannedIntegrations={[
      'Mercado Pago Split & Transferências (Server-Side)',
      'Validação cadastral CPF/CNPJ NexColetas Smart Data',
    ]}
    databaseEntities={[
      'affiliates',
      'affiliate_attributions',
      'affiliate_commissions',
      'affiliate_wallets',
      'affiliate_withdrawals',
    ]}
    previewComponent={<AffiliatesView />}
  />
);
