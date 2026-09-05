import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { dashboardPath } from '../auth/roleRoutes.js';
import { IconArrowLeft, IconHome, IconSearch } from '../components/Icon.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = dashboardPath(user?.role);
  useEffect(() => {
    const schoolName = document.documentElement.dataset.schoolName || 'OUR WORLD MODEL SCHOOL';
    document.title = `Page not found | ${schoolName}`;
  }, []);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-5 py-12">
      <section className="max-w-xl w-full text-center" aria-labelledby="not-found-title">
        <div className="mx-auto mb-7 relative h-28 w-28">
          <div className="absolute inset-0 rounded-[2rem] bg-primary-100 rotate-6" />
          <div className="absolute inset-2 rounded-[1.7rem] bg-white shadow-card flex items-center justify-center text-primary-700">
            <IconSearch className="h-11 w-11" />
          </div>
        </div>
        <p className="text-sm font-bold tracking-[0.22em] text-primary-600 uppercase">Error 404</p>
        <h1 id="not-found-title" className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">This page isn’t on the timetable</h1>
        <p className="text-slate-500 mt-4 leading-relaxed">
          The link may be old, incomplete, or moved. Your school records are safe—you can return to the dashboard and continue working.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button className="btn-secondary" onClick={() => navigate(-1)}><IconArrowLeft className="h-4 w-4" /> Go back</button>
          <button className="btn-primary" onClick={() => navigate(home, { replace: true })}><IconHome className="h-4 w-4" /> Go to dashboard</button>
        </div>
      </section>
    </main>
  );
}
