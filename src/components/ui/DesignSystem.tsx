import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import { NexTheme, PickupStatus } from '../../../shared/types/index.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall.ts';

/* ============================================================================
   1. BUTTON & ICON BUTTON
   ============================================================================ */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-5 py-2.5 text-sm min-h-[44px]',
  }[size];

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[var(--nex-primary)] text-[var(--nex-primary-fg)] hover:opacity-95 shadow-xs',
    secondary:
      'bg-[var(--nex-surface-secondary)] text-[var(--nex-text-primary)] border border-[var(--nex-border)] hover:opacity-90',
    outline:
      'bg-transparent text-[var(--nex-text-primary)] border border-[var(--nex-border)] hover:bg-[var(--nex-surface-secondary)]',
    ghost:
      'bg-transparent text-[var(--nex-text-primary)] hover:bg-[var(--nex-surface-secondary)]',
    danger: 'bg-[var(--nex-danger)] text-white hover:opacity-95',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nex-accent)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer ${sizeClasses} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
    </button>
  );
};

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'surface' | 'ghost';
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  variant = 'surface',
  children,
  className = '',
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--nex-accent)] ${
      variant === 'surface'
        ? 'bg-[var(--nex-surface)] border border-[var(--nex-border)] text-[var(--nex-text-primary)] hover:bg-[var(--nex-surface-secondary)]'
        : 'bg-transparent text-[var(--nex-text-primary)] hover:bg-[var(--nex-surface-secondary)]'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* ============================================================================
   2. INPUT, TEXTAREA, SELECT, CHECKBOX, RADIO, SWITCH
   ============================================================================ */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[var(--nex-text-primary)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-h-[40px] px-3 py-2 text-sm rounded-lg bg-[var(--nex-input-bg)] text-[var(--nex-text-primary)] border transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-[var(--nex-danger)] focus:ring-red-500/30'
            : 'border-[var(--nex-border)] focus:border-[var(--nex-primary)] focus:ring-[var(--nex-accent)]/25'
        } placeholder:text-[var(--nex-text-secondary)]/60 ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-xs text-[var(--nex-danger)] font-medium">
          {error}
        </span>
      ) : (
        hint && (
          <span className="text-xs text-[var(--nex-text-secondary)]">
            {hint}
          </span>
        )
      )}
    </div>
  );
};

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  id,
  className = '',
  ...props
}) => {
  const areaId =
    id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={areaId}
          className="text-xs font-semibold text-[var(--nex-text-primary)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        className={`w-full px-3 py-2 text-sm rounded-lg bg-[var(--nex-input-bg)] text-[var(--nex-text-primary)] border border-[var(--nex-border)] focus:outline-none focus:border-[var(--nex-primary)] focus:ring-2 focus:ring-[var(--nex-accent)]/25 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-[var(--nex-danger)] font-medium">
          {error}
        </span>
      )}
    </div>
  );
};

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  id,
  className = '',
  ...props
}) => {
  const selectId =
    id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--nex-text-primary)]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full min-h-[40px] px-3 py-2 text-sm rounded-lg bg-[var(--nex-input-bg)] text-[var(--nex-text-primary)] border border-[var(--nex-border)] focus:outline-none focus:border-[var(--nex-primary)] focus:ring-2 focus:ring-[var(--nex-accent)]/25 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-[var(--nex-danger)] font-medium">
          {error}
        </span>
      )}
    </div>
  );
};

export const Checkbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm text-[var(--nex-text-primary)] select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-[#174D35] cursor-pointer"
    />
    <span>{label}</span>
  </label>
);

export const Radio: React.FC<{
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}> = ({ label, name, checked, onChange }) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm text-[var(--nex-text-primary)] select-none">
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-[#174D35] cursor-pointer"
    />
    <span>{label}</span>
  </label>
);

export const Switch: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-[var(--nex-text-primary)]">
        {label}
      </span>
      {description && (
        <span className="text-xs text-[var(--nex-text-secondary)]">
          {description}
        </span>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
        checked ? 'bg-[var(--nex-primary)]' : 'bg-[var(--nex-border)]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-150 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

/* ============================================================================
   3. BADGE & STATUS BADGE (Clean accessible semantic labels, no color-only)
   ============================================================================ */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'demo' | 'primary';

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  variant?: BadgeTone;
}> = ({ children, tone, variant }) => {
  const effectiveTone = tone || variant || 'neutral';
  const toneClasses = {
    neutral: 'text-[var(--nex-text-secondary)] font-medium',
    success: 'text-[var(--nex-success)] font-semibold',
    warning: 'text-[var(--nex-warning)] font-semibold',
    danger: 'text-[var(--nex-danger)] font-semibold',
    demo: 'text-[var(--nex-primary)] font-semibold tracking-wide uppercase text-[11px]',
    primary: 'text-[var(--nex-primary)] font-semibold',
  }[effectiveTone];

  return <span className={`text-xs ${toneClasses}`}>{children}</span>;
};

export const StatusBadge: React.FC<{ status: PickupStatus | string }> = ({
  status,
}) => {
  const map: Record<string, { label: string; colorClass: string }> = {
    PENDING: {
      label: 'Solicitação Pendente',
      colorClass: 'text-[var(--nex-warning)]',
    },
    IN_PROGRESS: {
      label: 'Em Andamento',
      colorClass: 'text-[var(--nex-success)]',
    },
    COMPLETED: {
      label: 'Concluída',
      colorClass: 'text-[var(--nex-primary)]',
    },
    ALERT: {
      label: 'Alerta Operacional',
      colorClass: 'text-[var(--nex-danger)]',
    },
    ACTIVE: {
      label: 'Ativo',
      colorClass: 'text-[var(--nex-success)]',
    },
    SUSPENDED: {
      label: 'Suspenso',
      colorClass: 'text-[var(--nex-danger)]',
    },
  };

  const info = map[status] || {
    label: status,
    colorClass: 'text-[var(--nex-text-secondary)]',
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold ${info.colorClass}`}
    >
      {info.label}
    </span>
  );
};

/* ============================================================================
   4. CARD & STAT CARD (Single-Elevation Depth, Tabular Numerals)
   ============================================================================ */

export const Card: React.FC<{
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className = '' }) => (
  <section
    className={`rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] p-5 ${className}`}
  >
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--nex-border)]">
        <div>
          {title && (
            <h2 className="text-base font-display font-bold text-[var(--nex-text-primary)]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-[var(--nex-text-secondary)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </section>
);

export const StatCard: React.FC<{
  label?: string;
  title?: string;
  value: string | number;
  helperText?: string;
  helper?: string;
  trendLabel?: string;
  trendTone?: 'positive' | 'warning' | 'neutral' | 'danger';
  icon?: React.ReactNode;
  highlight?: boolean;
}> = ({
  label,
  title,
  value,
  helperText,
  helper,
  trendLabel,
  trendTone = 'neutral',
  icon,
  highlight = false,
}) => {
  const displayLabel = label || title || '';
  const displayHelper = helperText || helper;
  const trendColor = {
    positive: 'text-[var(--nex-success)] font-semibold',
    warning: 'text-[var(--nex-warning)] font-semibold',
    danger: 'text-[var(--nex-danger)] font-semibold',
    neutral: 'text-[var(--nex-text-secondary)]',
  }[trendTone];

  return (
    <div
      className={`rounded-xl bg-[var(--nex-surface)] border p-4 flex flex-col justify-between gap-2 transition-colors ${
        highlight
          ? 'border-[var(--nex-primary)]'
          : 'border-[var(--nex-border)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--nex-text-secondary)]">
          {displayLabel}
        </span>
        {icon && (
          <span
            className="text-[var(--nex-primary)] shrink-0"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-[var(--nex-text-primary)] tabular-nums tracking-tight">
        {value}
      </div>
      {(displayHelper || trendLabel) && (
        <div className="text-xs text-[var(--nex-text-secondary)] flex items-center justify-between gap-1.5">
          {displayHelper && <span className="truncate">{displayHelper}</span>}
          {trendLabel && <span className={`shrink-0 ${trendColor}`}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   5. TABLE & RESPONSIVE TABLE (Mobile-First Adaptive Cards + Desktop Grid)
   ============================================================================ */

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  mobileCardRender,
}: {
  columns: ResponsiveColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  mobileCardRender?: (row: T) => React.ReactNode;
}) {
  return (
    <div className="w-full">
      {/* Visão Mobile (< 768px): Cards adaptados */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className="rounded-lg bg-[var(--nex-surface-secondary)]/60 border border-[var(--nex-border)] p-3.5 flex flex-col gap-2"
          >
            {mobileCardRender
              ? mobileCardRender(row)
              : columns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-[var(--nex-text-secondary)] font-medium">
                      {col.header}
                    </span>
                    <div className="text-[var(--nex-text-primary)] font-medium text-right">
                      {col.render(row)}
                    </div>
                  </div>
                ))}
          </div>
        ))}
      </div>

      {/* Visão Tablet & Desktop (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--nex-border)] text-xs font-semibold text-[var(--nex-text-secondary)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nex-border)] text-sm">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-[var(--nex-surface-secondary)]/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-3 ${
                      col.align === 'right'
                        ? 'text-right tabular-nums'
                        : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const Table = ResponsiveTable;

/* ============================================================================
   6. TABS, DROPDOWN, AVATAR (SPRINT 01 REUSABLE COMPONENTS)
   ============================================================================ */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export const Tabs: React.FC<{
  tabs?: TabItem[];
  items?: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel?: string;
}> = ({
  tabs,
  items,
  activeTab,
  onChange,
  ariaLabel = 'Navegação por abas',
}) => {
  const list = tabs || items || [];
  return (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)]"
  >
    {list.map((tab) => {
      const isActive = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isActive
              ? 'bg-[var(--nex-primary)] text-[var(--nex-primary-fg)] shadow-xs'
              : 'text-[var(--nex-text-secondary)] hover:text-[var(--nex-text-primary)]'
          }`}
        >
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && (
            <span className="tabular-nums opacity-80">({tab.count})</span>
          )}
        </button>
      );
    })}
  </div>
  );
};

export interface DropdownOption {
  id: string;
  label: string;
  description?: string;
  onClick: () => void;
}

export const Dropdown: React.FC<{
  triggerLabel: string;
  options: DropdownOption[];
  align?: 'left' | 'right';
}> = ({ triggerLabel, options, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg bg-[var(--nex-surface)] text-[var(--nex-text-primary)] border border-[var(--nex-border)] hover:bg-[var(--nex-surface-secondary)] transition-colors cursor-pointer whitespace-nowrap"
      >
        <span>{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--nex-text-secondary)]" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-1.5 w-56 rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] shadow-lg py-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="menuitem"
              onClick={() => {
                opt.onClick();
                setOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-xs hover:bg-[var(--nex-surface-secondary)] transition-colors cursor-pointer flex flex-col"
            >
              <span className="font-semibold text-[var(--nex-text-primary)]">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[11px] text-[var(--nex-text-secondary)]">
                  {opt.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Avatar: React.FC<{
  name: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, subtitle, size = 'md' }) => {
  const initials = (name || 'NC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        aria-hidden="true"
        className={`${sizeClass} rounded-full bg-[#174D35] text-[#F5F7F4] border border-[#5DAA70]/40 font-display font-bold flex items-center justify-center shrink-0`}
      >
        {initials}
      </div>
      {subtitle !== undefined && (
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--nex-text-primary)] truncate">
            {name}
          </div>
          {subtitle && (
            <div className="text-[11px] text-[var(--nex-text-secondary)] truncate">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   7. MODAL, DRAWER, CONFIRM DIALOG, TOOLTIP
   ============================================================================ */

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nex-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] shadow-xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--nex-border)]">
          <h3
            id="nex-modal-title"
            className="text-base font-display font-bold text-[var(--nex-text-primary)]"
          >
            {title}
          </h3>
          <IconButton label="Fechar janela" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 py-3.5 bg-[var(--nex-surface-secondary)]/40 border-t border-[var(--nex-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-72 max-w-[85vw] h-full bg-[var(--nex-sidebar-bg)] text-[var(--nex-sidebar-text)] border-r border-[var(--nex-sidebar-border)] flex flex-col justify-between overflow-y-auto">
        {children}
      </div>
      <button
        type="button"
        aria-label="Fechar menu lateral"
        className="flex-1 h-full cursor-default"
        onClick={onClose}
      />
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    footer={
      <>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-[var(--nex-text-secondary)]">{description}</p>
  </Modal>
);

export const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => (
  <span className="group relative inline-flex items-center" title={text}>
    {children}
  </span>
);

/* ============================================================================
   8. STATES: LOADING, SKELETON, EMPTY STATE, ERROR STATE, ALERT, TOAST
   ============================================================================ */

export const Loading: React.FC<{ label?: string }> = ({
  label = 'Carregando dados operacionais...',
}) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--nex-text-secondary)]">
    <Loader2 className="w-7 h-7 animate-spin text-[var(--nex-primary)]" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export const Skeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div
    className="space-y-3 py-2"
    aria-busy="true"
    aria-label="Carregando conteúdo"
  >
    {Array.from({ length: rows }).map((_, idx) => (
      <div
        key={idx}
        className="h-10 w-full rounded-lg bg-[var(--nex-surface-secondary)] animate-pulse border border-[var(--nex-border)]"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-border)] p-8 text-center flex flex-col items-center justify-center gap-3">
    <Info className="w-8 h-8 text-[var(--nex-primary)]" />
    <div className="max-w-md space-y-1">
      <h3 className="text-base font-display font-bold text-[var(--nex-text-primary)]">
        {title}
      </h3>
      <p className="text-xs text-[var(--nex-text-secondary)]">{description}</p>
    </div>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = 'Falha na comunicação operacional',
  message,
  onRetry,
}) => (
  <div className="rounded-xl bg-[var(--nex-surface)] border border-[var(--nex-danger)]/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-6 h-6 text-[var(--nex-danger)] shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-display font-bold text-[var(--nex-text-primary)]">
          {title}
        </h3>
        <p className="text-xs text-[var(--nex-text-secondary)] mt-0.5">
          {message}
        </p>
      </div>
    </div>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        onClick={onRetry}
      >
        Tentar Novamente
      </Button>
    )}
  </div>
);

export const Alert: React.FC<{
  title: string;
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning';
}> = ({ title, children, variant = 'info' }) => {
  const iconMap = {
    info: (
      <Info className="w-4 h-4 text-[var(--nex-primary)] shrink-0 mt-0.5" />
    ),
    success: (
      <CheckCircle2 className="w-4 h-4 text-[var(--nex-success)] shrink-0 mt-0.5" />
    ),
    warning: (
      <AlertTriangle className="w-4 h-4 text-[var(--nex-warning)] shrink-0 mt-0.5" />
    ),
  };

  return (
    <div className="rounded-lg bg-[var(--nex-surface-secondary)]/70 border border-[var(--nex-border)] p-3.5 flex items-start gap-3">
      {iconMap[variant]}
      <div className="text-xs space-y-0.5">
        <div className="font-semibold text-[var(--nex-text-primary)]">
          {title}
        </div>
        <div className="text-[var(--nex-text-secondary)]">{children}</div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{
  message: string | null;
  onClose: () => void;
}> = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-[#174D35] text-[#F5F7F4] border border-[#5DAA70]/50 px-4 py-3 text-xs font-medium shadow-lg"
    >
      <CheckCircle2 className="w-4 h-4 text-[#B8DCC0] shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={onClose}
        className="text-[#F5F7F4]/70 hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ============================================================================
   9. PAGINATION, BREADCRUMB, THEME SWITCHER & PWA INSTALL
   ============================================================================ */

export const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex items-center justify-between gap-4 pt-3 border-t border-[var(--nex-border)] text-xs text-[var(--nex-text-secondary)]">
    <span className="tabular-nums">
      Página {currentPage} de {Math.max(1, totalPages)}
    </span>
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Anterior
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Próxima
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
);

export const Breadcrumb: React.FC<{
  items: { label: string; onClick?: () => void }[];
}> = ({ items }) => (
  <nav
    aria-label="Localização na plataforma"
    className="flex items-center gap-1.5 text-xs text-[var(--nex-text-secondary)]"
  >
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 && <span aria-hidden="true">/</span>}
        {item.onClick ? (
          <button
            type="button"
            onClick={item.onClick}
            className="hover:text-[var(--nex-text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            {item.label}
          </button>
        ) : (
          <span className="font-semibold text-[var(--nex-text-primary)] whitespace-nowrap">
            {item.label}
          </span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const ThemeSwitcher: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { theme, setTheme } = useTheme();

  const options: {
    id: NexTheme;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'green',
      label: 'GREEN',
      shortLabel: 'Green',
      icon: <Palette className="w-3.5 h-3.5" />,
    },
    {
      id: 'light',
      label: 'LIGHT',
      shortLabel: 'Light',
      icon: <Sun className="w-3.5 h-3.5" />,
    },
    {
      id: 'night',
      label: 'NIGHT',
      shortLabel: 'Night',
      icon: <Moon className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Seletor de tema NexColetas"
      className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--nex-surface-secondary)] border border-[var(--nex-border)]"
    >
      {options.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'bg-[var(--nex-primary)] text-[var(--nex-primary-fg)] shadow-xs'
                : 'text-[var(--nex-text-secondary)] hover:text-[var(--nex-text-primary)]'
            }`}
          >
            {opt.icon}
            <span>{compact ? opt.shortLabel : opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const ThemeSelector = ThemeSwitcher;

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Download className="w-3.5 h-3.5" />}
        onClick={install}
      >
        Instalar App
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={() => setShowIOSGuide(true)}
        >
          Instalar no iOS
        </Button>
        <Modal
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Instalar NexColetas no iPhone / iPad"
          footer={
            <Button variant="primary" onClick={() => setShowIOSGuide(false)}>
              Entendi
            </Button>
          }
        >
          <p className="text-sm text-[var(--nex-text-primary)] leading-relaxed">
            1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
            <br />
            2. Role a lista e selecione{' '}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
        </Modal>
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[var(--nex-warning)] px-3 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Utilizando dados sincronizados localmente.</span>
    </div>
  );
};
