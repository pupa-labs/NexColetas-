import React, { useState } from 'react';
import { PickupItem } from '../../../shared/types/index.ts';
import { NexPayAdminView } from '../../features/nexpay/NexPayAdminView.tsx';
import { NexDriverFinanceView } from '../../features/nexpay/NexDriverFinanceView.tsx';
import { Button } from '../../components/ui/DesignSystem.tsx';
import { ShieldCheck, Smartphone } from 'lucide-react';

export const FinanceModule: React.FC<{
  pickups: PickupItem[];
  onNotify?: (msg: string) => void;
}> = ({ onNotify }) => {
  const [viewMode, setViewMode] = useState<'admin' | 'nexdriver'>('admin');

  return (
    <div className="space-y-6">
      {/* Seletor entre NexPay Admin (NexColetas Control) e NexDriver (Carteira do Operador) */}
      <div className="p-3 rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-semibold text-[var(--nex-text-primary)]">
            Perspectiva do Módulo NexPay:
          </span>{' '}
          <span className="text-[var(--nex-text-secondary)]">
            Alterne entre o painel administrativo <strong>NexColetas Control</strong> e a experiência mobile-first do operador <strong>NexDriver</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={viewMode === 'admin' ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            onClick={() => setViewMode('admin')}
          >
            NexPay Admin (Control)
          </Button>
          <Button
            variant={viewMode === 'nexdriver' ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<Smartphone className="w-4 h-4" />}
            onClick={() => setViewMode('nexdriver')}
          >
            NexDriver (Operador)
          </Button>
        </div>
      </div>

      {viewMode === 'admin' ? (
        <NexPayAdminView onNotify={onNotify} />
      ) : (
        <NexDriverFinanceView onNotify={onNotify} />
      )}
    </div>
  );
};
