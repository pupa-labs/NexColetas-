import React, { useState } from 'react';
import {
  OperatorsView,
  RidersView,
} from '../../features/operations/EcosystemModulesView.tsx';
import { NexDriverFinanceView } from '../../features/nexpay/NexDriverFinanceView.tsx';
import { Tabs } from '../../components/ui/DesignSystem.tsx';

export const OperatorsModule: React.FC<{
  onNotify?: (msg: string) => void;
}> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<string>('nexdriver_finance');

  return (
    <div className="space-y-6">
      <Tabs
        activeTab={subTab}
        onChange={setSubTab}
        items={[
          {
            id: 'nexdriver_finance',
            label: 'NexDriver — Carteira, Ganhos & Saques PIX (NexPay)',
          },
          {
            id: 'operators_network',
            label: 'Rede de Operadores & Motoboys (Manhuaçu - MG)',
          },
        ]}
      />

      {subTab === 'nexdriver_finance' ? (
        <NexDriverFinanceView onNotify={onNotify} />
      ) : (
        <div className="space-y-8">
          <OperatorsView />
          <RidersView />
        </div>
      )}
    </div>
  );
};
