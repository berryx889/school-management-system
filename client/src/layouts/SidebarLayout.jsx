import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { api } from '../api/client.js';
import { Avatar, Modal, NavGroup } from '../components/ui.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import ChangePasswordForm from '../components/ChangePassword.jsx';
import { IconMenu, IconX, IconSettings } from '../components/Icon.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import CommandPalette from '../components/CommandPalette.jsx';

function matchesPath(pathname, item) {
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}


function SearchTrigger() {
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  }
  return (
    <button onClick={openPalette} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-primary-50/50 text-slate-400 text-sm transition-colors w-52" style={{ border: '1px solid #EBE5DC' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 shrink-0">
        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
      </svg>
      <span>Search...</span>
      <kbd className="ml-auto text-[10px] font-medium text-slate-400 bg-white rounded px-1.5 py-0.5" style={{ border: '1px solid #EBE5DC' }}>&#8984;K</kbd>
    </button>
  );
}

function Breadcrumbs({ nav }) {
  const location = useLocation();
  const crumbs = [];
  for (const entry of nav) {
    if (entry.items) {
      for (const item of entry.items) {
        if (matchesPath(location.pathname, item)) {
          crumbs.push({ label: entry.label }, { label: item.label, to: item.to });
          break;
        }
      }
      if (crumbs.length) break;
    } else if (matchesPath(location.pathname, entry)) {
      crumbs.push({ label: entry.label, to: entry.to });
      break;
    }
  }
  if (!crumbs.length) return null;
  return (
    <nav className="hidden lg:flex items-center gap-1.5 text-[13px] text-slate-400 ml-4">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {c.to ? (
            <span className="text-slate-500 font-medium">{c.label}</span>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function SidebarLayout({ nav, brand: brandProp = 'Bright Future Basic School' }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const { data: me } = useQuery({ queryKey: ['account', 'me'], queryFn: () => api.get('/account/me').then((r) => r.data) });
  const brand = settings?.name || brandProp;
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const location = useLocation();

  const navLinkClasses = (isActive) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150
    ${isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-slate-600 hover:bg-primary-50/50 hover:text-slate-800'}`;

  return (
    <div className="min-h-screen bg-surface">
      {open && (
        <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-30 lg:hidden no-print" onClick={() => setOpen(false)} />
      )}

      {/* ── Floating sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[268px] flex flex-col z-40 no-print
          lg:top-3 lg:left-3 lg:h-[calc(100vh-24px)]
          bg-white lg:rounded-sidebar sidebar-float
          transition-transform duration-300 ease-out lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 shrink-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="" className="h-9 w-9 rounded-xl object-contain shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {brand[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-sm truncate leading-tight">{brand}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.role} portal</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {nav.map((entry) =>
            entry.items ? (
              <NavGroup
                key={entry.label}
                label={entry.label}
                icon={entry.icon}
                defaultOpen={entry.items.some((i) => matchesPath(location.pathname, i))}
              >
                {entry.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    <item.icon className="h-[16px] w-[16px] shrink-0 opacity-70" />
                    {item.label}
                  </NavLink>
                ))}
              </NavGroup>
            ) : (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <entry.icon className="h-[18px] w-[18px] shrink-0" />
                {entry.label}
              </NavLink>
            )
          )}
        </nav>

        {/* User footer */}
        <div className="border-t p-3 shrink-0" style={{ borderColor: '#F2EDE5' }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-primary-50/50 transition-colors cursor-default">
            <Avatar name={user?.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role}{me?.department && ` · ${me.department}`}</p>
            </div>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
              title="Settings"
            >
              <IconSettings className="h-4 w-4" />
            </button>
          </div>
          <button onClick={logout} className="btn-ghost w-full mt-1.5 text-sm justify-center">
            Sign out
          </button>
        </div>
      </aside>

      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change password">
        <ChangePasswordForm onDone={() => setPasswordModalOpen(false)} />
      </Modal>

      <CommandPalette nav={nav} />

      {/* ── Main content ── */}
      <div className="lg:pl-[280px] min-h-screen flex flex-col">
        <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 sticky top-0 z-20 no-print bg-surface/80 backdrop-blur-md">
          <button onClick={() => setOpen(true)} className="text-slate-600 hover:text-slate-800 lg:hidden mr-3 p-1" aria-label="Open menu">
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-900 text-sm lg:hidden">{brand}</span>

          <div className="hidden lg:flex items-center">
            <SearchTrigger />
            <Breadcrumbs nav={nav} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l" style={{ borderColor: '#EBE5DC' }}>
              <Avatar name={user?.full_name} size={32} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
