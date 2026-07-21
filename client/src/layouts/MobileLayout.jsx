import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { Avatar, Modal } from '../components/ui.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import ChangePasswordForm from '../components/ChangePassword.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

export default function MobileLayout({ tabs }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-20 no-print">
        <div className="flex items-center gap-2 min-w-0">
          {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-7 w-7 rounded-md object-contain shrink-0" />}
          <span className="font-bold text-slate-900 text-sm truncate">{settings?.name || 'Bright Future Basic School'}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setAccountOpen(true)} aria-label="Account">
            <Avatar name={user?.full_name} size={30} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto pb-24 px-4 pt-5">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 no-print z-30">
        <div className="max-w-lg mx-auto grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition
                ${isActive ? 'text-primary-600' : 'text-slate-400'}`
              }
            >
              <tab.icon className="h-[22px] w-[22px]" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Account">
        <div className="flex items-center gap-3 mb-5">
          <Avatar name={user?.full_name} size={44} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          className="btn-secondary w-full mb-2"
          onClick={() => { setAccountOpen(false); setPasswordModalOpen(true); }}
        >
          Change password
        </button>
        <button className="btn-danger w-full" onClick={logout}>
          Sign out
        </button>
      </Modal>

      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change password">
        <ChangePasswordForm onDone={() => setPasswordModalOpen(false)} />
      </Modal>
    </div>
  );
}
