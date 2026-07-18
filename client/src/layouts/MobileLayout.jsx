import { NavLink, Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function MobileLayout({ tabs }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
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
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
