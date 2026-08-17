import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { SectionHeader, StatCard, Badge } from '../../components/ui.jsx';
import {
  IconUsers, IconBuilding, IconActivity, IconShield, IconAlertTriangle,
  IconSettings, IconWallet, IconGraduationCap, IconArrowRight,
} from '../../components/Icon.jsx';
import AdminDashboard from '../admin/Dashboard.jsx';

const QUICK_ACTIONS = [
  { to: '/admin/staff', label: 'Manage roles and staff', detail: 'Create admins and control staff access', icon: IconUsers },
  { to: '/admin/audit', label: 'Review audit trail', detail: 'See logins, marks, payments and sensitive changes', icon: IconActivity },
  { to: '/admin/settings', label: 'School controls', detail: 'Branding, grading, finance and security policy', icon: IconSettings },
  { to: '/admin/fees/debtors', label: 'Financial oversight', detail: 'Review outstanding balances and payments', icon: IconWallet },
];

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'super-admin'],
    queryFn: () => api.get('/dashboard/super-admin').then((r) => r.data),
  });

  return (
    <div>
      <SectionHeader title="Super Admin command center" description="School-wide operations, access and security oversight" />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total staff" value={isLoading ? '—' : data?.total_staff ?? 0} icon={IconUsers} />
        <StatCard label="Active classes" value={isLoading ? '—' : data?.active_classes ?? 0} icon={IconBuilding} tone="blue" />
        <StatCard label="Audit events today" value={isLoading ? '—' : data?.audit_events_today ?? 0} icon={IconActivity} tone="green" />
        <StatCard label="Failed logins · 24h" value={isLoading ? '—' : data?.failed_logins_24h ?? 0} icon={IconAlertTriangle} tone={data?.failed_logins_24h ? 'red' : 'green'} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="font-bold text-slate-900">Administrative shortcuts</h2><p className="text-sm text-slate-500">The most common oversight tasks in one step</p></div>
            <IconShield className="h-6 w-6 text-primary-600" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-2xl border border-slate-100 p-4 hover:border-primary-200 hover:bg-primary-50/40 transition-all group">
                <div className="flex items-start gap-3"><div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center"><item.icon className="h-4 w-4" /></div><div className="min-w-0"><p className="font-semibold text-slate-800 text-sm flex items-center gap-1">{item.label}<IconArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></p><p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.detail}</p></div></div>
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">System readiness</h2>
          <p className="text-sm text-slate-500 mb-5">Operational signals from this school deployment</p>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-600">Inactive staff accounts</span><Badge tone={data?.inactive_staff ? 'amber' : 'green'}>{data?.inactive_staff ?? 0}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Online payments used</span><Badge tone={data?.paystack_used ? 'green' : 'slate'}>{data?.paystack_used ? 'Active' : 'Not used yet'}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">SMS delivery used</span><Badge tone={data?.sms_used ? 'green' : 'slate'}>{data?.sms_used ? 'Active' : 'Not used yet'}</Badge></div>
          </div>
          <Link to="/admin/students" className="btn-secondary w-full mt-6"><IconGraduationCap className="h-4 w-4" /> Open student records</Link>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-7">
        <AdminDashboard />
      </div>
    </div>
  );
}
