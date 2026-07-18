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
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-card border animate-in fade-in slide-in-from-bottom-2
              ${t.variant === 'error' ? 'bg-red-50 text-red-700 border-red-100' : ''}
              ${t.variant === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
              ${t.variant === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
              ${t.variant === 'info' ? 'bg-white text-slate-700 border-slate-100' : ''}
            `}
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
