import { useParentChild } from '../../auth/ParentContext.jsx';
import { Avatar } from '../../components/ui.jsx';

export default function ChildSwitcher() {
  const { kids, selectedChild, setSelectedId } = useParentChild();
  if (kids.length < 2) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-print">
      {kids.map((k) => (
        <button
          key={k.id}
          onClick={() => setSelectedId(k.id)}
          className={`flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 border shrink-0 transition
            ${selectedChild.id === k.id ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white'}`}
        >
          <Avatar name={k.full_name} photoUrl={k.photo_url} size={26} />
          <span className="text-sm font-medium text-slate-700">{k.full_name.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  );
}
