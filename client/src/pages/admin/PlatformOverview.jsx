import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { StatCard, SkeletonCard, Skeleton, SectionHeader, Badge } from '../../components/ui.jsx';
import { IconBuilding, IconUsers, IconGraduationCap, IconInbox } from '../../components/Icon.jsx';

function toneFor(action) {
  if (action.startsWith('auth.login_failed')) return 'red';
  if (action.startsWith('marks.')) return 'amber';
  if (action.startsWith('payment.')) return 'green';
  if (action.startsWith('school.')) return 'primary';
  if (action.startsWith('permission.') || action.startsWith('results.')) return 'blue';
  return 'slate';
}

export default function PlatformOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => api.get('/schools/overview').then((r) => r.data),
  });

  return (
    <div>
      <SectionHeader
        title="Platform overview"
        description="Everything across every school on the platform."
        action={<Link to="/admin/schools" className="btn-secondary">Manage schools</Link>}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Schools" value={data.schools.total} icon={IconBuilding} tone="primary"
              subtitle={`${data.schools.active} active · ${data.schools.suspended} suspended`} delay={0} />
            <StatCard label="Students" value={data.people.students} icon={IconGraduationCap} tone="green" delay={60} />
            <StatCard label="Staff & users" value={data.people.users} icon={IconUsers} tone="blue"
              subtitle={`${data.people.teachers} teachers`} delay={120} />
            <StatCard label="New leads" value={data.signups.new} icon={IconInbox} tone="amber"
              subtitle={`${data.signups.total} total signups`} delay={180} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            {/* Newest schools */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Newest schools</h2>
                <Link to="/admin/schools" className="text-sm font-medium text-primary-600">View all</Link>
              </div>
              {!data.recentSchools.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">No schools yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentSchools.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{s.code} · {format(new Date(s.created_at), 'd MMM yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm text-slate-500 tabular-nums">{s.student_count} students</span>
                        <Badge tone={s.is_active ? 'green' : 'slate'}>{s.is_active ? 'Active' : 'Suspended'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity across all schools */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Recent activity</h2>
                <span className="text-xs text-slate-400">across all schools</span>
              </div>
              {!data.recentActivity.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Badge tone={toneFor(a.action)}>{a.action}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 leading-snug">{a.summary}</p>
                        <p className="text-xs text-slate-400">{a.school_name} · {a.actor_label || '—'} · {format(new Date(a.created_at), 'd MMM, HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
