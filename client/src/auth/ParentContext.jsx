import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { PageLoader, EmptyState } from '../components/ui.jsx';

const ParentContext = createContext(null);

export function ParentProvider({ children }) {
  const { data: kids, isLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/students', { params: { limit: 50 } }).then((r) => r.data.data),
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (kids?.length && !selectedId) setSelectedId(kids[0].id);
  }, [kids, selectedId]);

  if (isLoading) return <PageLoader />;
  if (!kids?.length) {
    return <div className="card m-4"><EmptyState icon="🎓" title="No children linked yet" description="Contact the school office to link your child's account to this number." /></div>;
  }

  const selectedChild = kids.find((k) => k.id === selectedId) || kids[0];

  return (
    <ParentContext.Provider value={{ kids, selectedChild, setSelectedId }}>
      {children}
    </ParentContext.Provider>
  );
}

export function useParentChild() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error('useParentChild must be used within ParentProvider');
  return ctx;
}
