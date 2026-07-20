import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { Avatar, Modal } from '../components/ui.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import ChangePasswordForm from '../components/ChangePassword.jsx';
import { IconMenu } from '../components/Icon.jsx';

export default function SidebarLayout({ nav, brand: brandProp = 'Bright Future Basic School' }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const brand = settings?.name || brandProp;
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-surface">
      {open && (
        <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden no-print" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-40 no-print
          transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-100">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold shrink-0">
              {brand[0]}
            </div>
          )}
          <span className="font-bold text-slate-900 text-sm truncate">{brand}</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={user?.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={() => setPasswordModalOpen(true)} className="text-sm text-slate-500 hover:text-slate-700 w-full mt-2 py-1.5">
            Change password
          </button>
          <button onClick={logout} className="btn-secondary w-full mt-1 text-sm">
            Sign out
          </button>
        </div>
      </aside>

      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change password">
        <ChangePasswordForm onDone={() => setPasswordModalOpen(false)} />
      </Modal>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden h-14 bg-white border-b border-slate-100 flex items-center px-4 sticky top-0 z-20 no-print">
          <button onClick={() => setOpen(true)} className="text-slate-600" aria-label="Open menu">
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-bold text-slate-900 text-sm">{brand}</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
