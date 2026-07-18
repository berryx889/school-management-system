import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { SectionHeader, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function ResultsRelease() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const toast = useToast();
  const qc = useQueryClient();

  const releases = useQuery({
    queryKey: ['releases', termId, classes?.map((c) => c.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        classes.map((c) => api.get('/results/release', { params: { class_id: c.id, term_id: termId } }).then((r) => ({ classId: c.id, ...r.data })))
      );
      return Object.fromEntries(results.map((r) => [r.classId, r.released]));
    },
    enabled: Boolean(classes?.length && termId),
  });

  const toggle = useMutation({
    mutationFn: ({ class_id, released }) => api.post('/results/release', { class_id, term_id: termId, released }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['releases'] });
      toast('Updated.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Results release"
        description="Students and parents only see results once released for their class"
        action={
          <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
            {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
          </select>
        }
      />

      <div className="card divide-y divide-slate-50">
        {classes?.map((c) => {
          const released = releases.data?.[c.id];
          return (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-800">{c.name}</p>
                <Badge tone={released ? 'green' : 'slate'}>{released ? 'Released' : 'Not released'}</Badge>
              </div>
              <button
                className={released ? 'btn-secondary' : 'btn-primary'}
                onClick={() => toggle.mutate({ class_id: c.id, released: !released })}
                disabled={toggle.isPending || !termId}
              >
                {released ? 'Unrelease' : 'Release'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
