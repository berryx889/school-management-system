import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader, EmptyState } from '../../components/ui.jsx';
import { IconMessageCircle } from '../../components/Icon.jsx';

export default function Chat({ students }) {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState(students?.[0]?.id || '');
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  useEffect(() => { if (students?.length && !studentId) setStudentId(students[0].id); }, [students, studentId]);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', studentId],
    queryFn: () => api.get('/messages', { params: { student_id: studentId } }).then((r) => r.data),
    enabled: Boolean(studentId),
    refetchInterval: 10000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useMutation({
    mutationFn: () => api.post('/messages', { student_id: studentId, body }),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['messages', studentId] });
    },
  });

  if (!students?.length) return <div className="card"><EmptyState icon={IconMessageCircle} title="No conversations yet" /></div>;

  return (
    <div className="card overflow-hidden flex flex-col" style={{ height: '70vh' }}>
      {students.length > 1 && (
        <div className="p-3 border-b border-slate-100">
          <select className="input" value={studentId} onChange={(e) => setStudentId(Number(e.target.value))}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <PageLoader />
        ) : !messages.length ? (
          <p className="text-center text-sm text-slate-400 py-10">Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.sender_name}</p>}
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 border-t border-slate-100 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(); }}
      >
        <input className="input" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={send.isPending}>Send</button>
      </form>
    </div>
  );
}
