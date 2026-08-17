import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { SectionHeader, Modal, EmptyState, Skeleton, Avatar, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconBuilding, IconActivity } from '../../components/Icon.jsx';

const EMPTY_HOUSE = { name: '', color: '#6366F1', motto: '', description: '' };
const EMPTY_POINTS = { student_id: '', points: '5', category: 'achievement', reason: '' };

export default function HouseSystem() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin'].includes(user.role);
  const toast = useToast();
  const qc = useQueryClient();
  const [houseModal, setHouseModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [houseForm, setHouseForm] = useState(EMPTY_HOUSE);
  const [pointForm, setPointForm] = useState(EMPTY_POINTS);

  const { data: houses, isLoading } = useQuery({ queryKey: ['houses'], queryFn: () => api.get('/houses').then((r) => r.data) });
  const { data: ledger } = useQuery({ queryKey: ['house-points'], queryFn: () => api.get('/houses/points').then((r) => r.data) });
  const { data: students } = useQuery({ queryKey: ['students', 'house-awards'], queryFn: () => api.get('/students', { params: { limit: 500 } }).then((r) => r.data.data) });

  const saveHouse = useMutation({
    mutationFn: () => editing ? api.put(`/houses/${editing.id}`, houseForm) : api.post('/houses', houseForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['houses'] }); toast(editing ? 'House updated.' : 'House created.', 'success'); setHouseModal(false); setEditing(null); setHouseForm(EMPTY_HOUSE); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });
  const award = useMutation({
    mutationFn: () => api.post('/houses/points', { ...pointForm, student_id: Number(pointForm.student_id), points: Number(pointForm.points) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['houses'] }); qc.invalidateQueries({ queryKey: ['house-points'] }); toast('House points recorded.', 'success'); setPointForm(EMPTY_POINTS); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function openEdit(house) {
    setEditing(house);
    setHouseForm({ name: house.name, color: house.color, motto: house.motto || '', description: house.description || '' });
    setHouseModal(true);
  }

  return (
    <div>
      <SectionHeader title="House system" description="Build belonging, reward effort and track friendly competition" action={isAdmin && <button className="btn-primary" onClick={() => { setEditing(null); setHouseForm(EMPTY_HOUSE); setHouseModal(true); }}>+ Add house</button>} />

      {isLoading ? <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div> : !houses?.length ? (
        <div className="card"><EmptyState icon={IconBuilding} title="No houses yet" description={isAdmin ? 'Create the first house to begin assigning students.' : 'An administrator needs to create houses first.'} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {houses.map((h, index) => (
            <div key={h.id} className="card p-5 relative overflow-hidden" style={{ borderTop: `4px solid ${h.color}` }}>
              <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">#{index + 1} standing</p><h3 className="font-bold text-lg text-slate-900 mt-1">{h.name}</h3></div>{isAdmin && <button className="text-xs text-primary-600 font-semibold" onClick={() => openEdit(h)}>Edit</button>}</div>
              {h.motto && <p className="text-sm text-slate-500 italic mt-2">“{h.motto}”</p>}
              <div className="flex items-end justify-between mt-5"><div><p className="text-3xl font-bold tabular-nums" style={{ color: h.color }}>{h.total_points}</p><p className="text-xs text-slate-400">points</p></div><Badge tone="slate">{h.member_count} members</Badge></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <div className="card p-5">
          <h2 className="font-bold text-slate-900">Award or deduct points</h2>
          <p className="text-sm text-slate-500 mb-4">Students must be assigned to a house first.</p>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); award.mutate(); }}>
            <select className="input" required value={pointForm.student_id} onChange={(e) => setPointForm({ ...pointForm, student_id: e.target.value })}><option value="">Choose student…</option>{students?.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.house_name || 'No house'}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><input className="input" type="number" step="1" min="-1000" max="1000" required value={pointForm.points} onChange={(e) => setPointForm({ ...pointForm, points: e.target.value })} /><select className="input" value={pointForm.category} onChange={(e) => setPointForm({ ...pointForm, category: e.target.value })}><option value="achievement">Achievement</option><option value="attendance">Attendance</option><option value="conduct">Conduct</option><option value="sports">Sports</option><option value="service">Service</option><option value="general">General</option></select></div>
            <input className="input" required placeholder="Reason for the points" value={pointForm.reason} onChange={(e) => setPointForm({ ...pointForm, reason: e.target.value })} />
            <button className="btn-primary w-full" disabled={award.isPending}>{award.isPending ? 'Saving…' : 'Record points'}</button>
          </form>
        </div>
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h2 className="font-bold text-slate-900">Recent house activity</h2></div>
          {!ledger?.length ? <EmptyState icon={IconActivity} title="No points recorded" description="Awards and deductions will appear here." /> : <div className="divide-y divide-slate-50 max-h-[430px] overflow-y-auto">{ledger.map((item) => <div key={item.id} className="p-4 flex items-center gap-3"><Avatar name={item.student_name || item.house_name} size={34} /><div className="min-w-0 flex-1"><p className="font-medium text-sm text-slate-800 truncate">{item.student_name || item.house_name}</p><p className="text-xs text-slate-400 truncate">{item.reason} · {item.awarded_by_name || 'Staff'} · {format(new Date(item.awarded_at), 'd MMM')}</p></div><div className={`font-bold tabular-nums ${item.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{item.points > 0 ? '+' : ''}{item.points}</div></div>)}</div>}
        </div>
      </div>

      <Modal open={houseModal} onClose={() => setHouseModal(false)} title={editing ? 'Edit house' : 'Add house'}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveHouse.mutate(); }}><div><label className="label">House name</label><input className="input" required value={houseForm.name} onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })} /></div><div><label className="label">Colour</label><div className="flex gap-3"><input type="color" className="h-11 w-14 rounded-xl" value={houseForm.color} onChange={(e) => setHouseForm({ ...houseForm, color: e.target.value })} /><input className="input" value={houseForm.color} onChange={(e) => setHouseForm({ ...houseForm, color: e.target.value })} /></div></div><div><label className="label">Motto</label><input className="input" value={houseForm.motto} onChange={(e) => setHouseForm({ ...houseForm, motto: e.target.value })} /></div><div><label className="label">Description</label><textarea className="input" rows="3" value={houseForm.description} onChange={(e) => setHouseForm({ ...houseForm, description: e.target.value })} /></div><button className="btn-primary w-full" disabled={saveHouse.isPending}>{saveHouse.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create house'}</button></form></Modal>
    </div>
  );
}
