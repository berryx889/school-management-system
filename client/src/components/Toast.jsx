import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, variant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 no-print"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl px-5 py-3.5 text-sm font-medium animate-slide-in-toast backdrop-blur-sm
              ${t.variant === 'error' ? 'bg-red-50 text-red-700 shadow-lg shadow-red-100/40' : ''}
              ${t.variant === 'success' ? 'bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-100/40' : ''}
              ${t.variant === 'warning' ? 'bg-amber-50 text-amber-700 shadow-lg shadow-amber-100/40' : ''}
              ${t.variant === 'info' ? 'bg-white text-slate-700 shadow-lg shadow-slate-200/40' : ''}
            `}
            style={{ boxShadow: 'var(--shadow-card-hover)' }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
