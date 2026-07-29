import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useSettings } from '../../hooks/useSettings.js';
import { Skeleton } from '../../components/ui.jsx';
import { IconPrinter } from '../../components/Icon.jsx';
import './StudentQrCard.css';

// 8-point sparkle from the landing hero.
function Star({ className, color }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill={color} aria-hidden="true">
      <path d="M24 0 L28 18 L48 14 L32 24 L48 34 L28 30 L24 48 L20 30 L0 34 L16 24 L0 14 L20 18Z" />
    </svg>
  );
}

export default function StudentQrCard() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['qr-card', id],
    queryFn: () => api.get(`/students/${id}/qr-card`).then((r) => r.data),
  });
  const { data: settings } = useSettings();

  if (isLoading) {
    return (
      <div className="id-tag-wrap">
        <div className="id-tag" style={{ boxShadow: 'none' }}>
          <div style={{ padding: 24 }} className="space-y-3 flex flex-col items-center">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const primary = settings?.primary_color || '#0B7A55';
  const accent = '#D4860A';
  const schoolName = (settings?.name || 'OUR WORLD MODEL SCHOOL').toUpperCase();

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student ID tag</h1>
          <p className="text-sm text-slate-500">Print and wear on a lanyard. The QR scans at the gate.</p>
        </div>
        <button className="btn-primary" onClick={() => window.print()}><IconPrinter className="h-4 w-4" /> Print</button>
      </div>

      <div className="id-tag-wrap">
        <div className="id-tag" style={{ '--tag-primary': primary, '--tag-accent': accent }}>
          <div className="id-tag__slot" />
          <Star className="id-tag__star id-tag__star--tl" color={primary} />
          <Star className="id-tag__star id-tag__star--accent" color={accent} />

          <div className="id-tag__header" style={{ background: primary }}>
            <div className="id-tag__crest">
              {settings?.logo_url && <img src={settings.logo_url} alt="" className="id-tag__logo" />}
              <span className="id-tag__school">{schoolName}</span>
            </div>
            {settings?.motto && <p className="id-tag__motto">{settings.motto}</p>}
          </div>

          <div className="id-tag__body">
            {data.photo_url && <img src={data.photo_url} alt="" className="id-tag__photo" />}
            <p className="id-tag__name">{data.full_name}</p>
            <p className="id-tag__meta">{data.class_name || 'Unassigned'}</p>
            <div className="id-tag__qr">
              <img src={data.qr_data_url} alt={`QR code for ${data.full_name}`} />
            </div>
            <p className="id-tag__scan">Scan at gate</p>
          </div>

          <div className="id-tag__footer" style={{ color: primary }}>
            <span>Student ID</span>
            <span className="id-tag__id">{data.student_code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
