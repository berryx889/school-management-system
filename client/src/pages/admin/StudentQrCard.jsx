import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';

export default function StudentQrCard() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['qr-card', id],
    queryFn: () => api.get(`/students/${id}/qr-card`).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Student ID card</h1>
        <button className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
      </div>

      <div className="flex justify-center">
        <div className="w-72 rounded-2xl border-2 border-primary-200 overflow-hidden bg-white shadow-card">
          <div className="bg-primary-500 text-white text-center py-2 text-xs font-bold tracking-wide">
            BRIGHT FUTURE BASIC SCHOOL
          </div>
          <div className="p-4 flex flex-col items-center">
            {data.photo_url ? (
              <img src={data.photo_url} alt="" className="h-20 w-20 rounded-full object-cover mb-2" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary-100 mb-2" />
            )}
            <p className="font-bold text-slate-900">{data.full_name}</p>
            <p className="text-xs text-slate-500 mb-1">{data.class_name || 'Unassigned'} · {data.student_code}</p>
            <img src={data.qr_data_url} alt="QR code" className="h-28 w-28 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
