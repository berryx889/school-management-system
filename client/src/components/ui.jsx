import { useState } from 'react';
import { IconInbox, IconEye, IconEyeOff, IconChevronRight } from './Icon.jsx';

export function PasswordInput({ id, value, onChange, required, autoComplete, className = '' }) {
  const [visible, setVisible] = useState(false);
  const base = className.includes('auth-input') ? className : `input ${className}`;
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${base} pr-10`}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', subtitle, delay = 0 }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="card card-hover p-6 flex items-start gap-4 animate-fade-in-up" style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-500 tracking-wide">{label}</p>
        <p className="text-[28px] font-bold text-slate-900 leading-tight tabular-nums mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = IconInbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-16 w-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mb-5 animate-float">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-semibold text-slate-800 text-lg">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin h-5 w-5 text-primary-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`rounded-xl bg-slate-100 animate-shimmer ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    primary: 'bg-primary-50 text-primary-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Avatar({ name, photoUrl, size = 40 }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-2xl object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold shrink-0"
    >
      {initials}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="absolute inset-0 bg-surface-overlay backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-7 animate-scale-in`}
        style={{ borderRadius: 'var(--radius-modal)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function NavGroup({ label, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </span>
        <IconChevronRight className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="ml-2 pl-3 border-l border-slate-100 space-y-0.5 mt-0.5 mb-1">{children}</div>
      </div>
    </div>
  );
}

export function Disclosure({ title, defaultOpen = true, bordered = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={bordered ? 'border-t border-slate-100 pt-6' : ''}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left mb-4 group"
      >
        <span className="font-semibold text-slate-800">{title}</span>
        <IconChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}
