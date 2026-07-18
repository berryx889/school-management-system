import { useParentChild } from '../../auth/ParentContext.jsx';
import Chat from '../shared/Chat.jsx';

export default function ParentChat() {
  const { kids } = useParentChild();
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Chat with class teacher</h1>
      <Chat students={kids} />
    </div>
  );
}
