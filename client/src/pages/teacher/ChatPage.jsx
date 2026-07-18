import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState } from '../../components/ui.jsx';
import Chat from '../shared/Chat.jsx';

export default function TeacherChat() {
  const { user } = useAuth();
  const { data: classes, isLoading: loadingClasses } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const myClass = classes?.find((c) => c.class_teacher_id === user.id);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', 'class', myClass?.id],
    queryFn: () => api.get('/students', { params: { class_id: myClass.id, limit: 200 } }).then((r) => r.data.data),
    enabled: Boolean(myClass),
  });

  return (
    <div>
      <SectionHeader title="Parent chat" description="Message parents about their child's progress" />
      {loadingClasses || isLoading ? (
        <PageLoader />
      ) : !myClass ? (
        <div className="card"><EmptyState icon="💬" title="You are not a class teacher" description="Chat is available once you're assigned as a class teacher." /></div>
      ) : (
        <Chat students={students} />
      )}
    </div>
  );
}
