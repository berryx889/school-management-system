import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { SectionHeader } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconX } from '../../components/Icon.jsx';

const DEFAULT_FORMAT = '{stage} {level}{section}';

function buildName(format, stage, level, section) {
  return format
    .replaceAll('{stage}', stage)
    .replaceAll('{level}', String(level))
    .replaceAll('{section}', String(section));
}

function ChipList({ items, onAdd, onRemove, placeholder }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span key={i} className="badge bg-primary-50 text-primary-700">
            {item}
            <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${item}`}>
              <IconX className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              e.preventDefault();
              onAdd(value.trim());
              setValue('');
            }
          }}
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function StructureBuilder() {
  const [stageName, setStageName] = useState('');
  const [levels, setLevels] = useState(['1']);
  const [sections, setSections] = useState(['A']);
  const [namingFormat, setNamingFormat] = useState(DEFAULT_FORMAT);
  const [capacity, setCapacity] = useState(35);
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const preview = stageName.trim()
    ? levels.flatMap((level) => sections.map((section) => buildName(namingFormat, stageName.trim(), level, section)))
    : [];

  const generate = useMutation({
    mutationFn: () => api.post('/classes/bulk-generate', {
      stage_name: stageName.trim(),
      levels,
      sections,
      naming_format: namingFormat,
      capacity_per_class: capacity ? Number(capacity) : null,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      const { created, skipped } = res.data;
      toast(
        skipped.length
          ? `Created ${created.length} classes (${skipped.length} already existed, skipped).`
          : `Created ${created.length} classes.`,
        'success'
      );
      navigate('/admin/classes');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Structure builder" description="Bulk-generate a stage's classes from levels and sections" />

      <form
        className="card p-6 space-y-5 max-w-2xl"
        onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}
      >
        <div>
          <label className="label">Stage name</label>
          <input className="input" required placeholder="e.g. JHS" value={stageName} onChange={(e) => setStageName(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Levels</label>
            <ChipList items={levels} placeholder="e.g. 1, 2, 3"
              onAdd={(v) => setLevels((l) => [...l, v])}
              onRemove={(i) => setLevels((l) => l.filter((_, idx) => idx !== i))} />
          </div>
          <div>
            <label className="label">Sections</label>
            <ChipList items={sections} placeholder="e.g. A, B"
              onAdd={(v) => setSections((s) => [...s, v])}
              onRemove={(i) => setSections((s) => s.filter((_, idx) => idx !== i))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Class naming format</label>
            <input className="input" value={namingFormat} onChange={(e) => setNamingFormat(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1.5">Tokens: {'{stage}'}, {'{level}'}, {'{section}'}</p>
          </div>
          <div>
            <label className="label">Capacity per class</label>
            <input type="number" className="input" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="label mb-2">Preview ({preview.length} classes)</p>
          {preview.length ? (
            <div className="flex flex-wrap gap-2">
              {preview.map((name, i) => (
                <span key={i} className="badge bg-slate-100 text-slate-700">{name}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Enter a stage name to see the preview.</p>
          )}
        </div>

        <button className="btn-primary" disabled={generate.isPending || !preview.length}>
          {generate.isPending ? 'Generating…' : `Generate ${preview.length || ''} classes`}
        </button>
      </form>
    </div>
  );
}
