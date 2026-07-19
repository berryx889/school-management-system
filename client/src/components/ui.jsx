import { IconInbox } from './Icon.jsx';

export function StatCard({ label, value, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = IconInbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin h-5 w-5 text-primary-500 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    primary: 'bg-primary-100 text-primary-700',
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
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold shrink-0"
    >
      {initials}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={`relative bg-white rounded-card shadow-card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
