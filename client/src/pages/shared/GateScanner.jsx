import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api, apiErrorMessage } from '../../api/client.js';
import { SectionHeader, Avatar } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

const SCANNER_ID = 'qr-reader';

export default function GateScanner() {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScan,
        () => {}
      )
      .then(() => setScanning(true))
      .catch(() => setError('Could not access the camera. Check browser permissions.'));

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function onScan(qrToken) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { data } = await api.post('/attendance/scan', { qr_token: qrToken });
      setResult(data);
      if (data.duplicate) toast('Already checked in today', 'warning');
    } catch (err) {
      setResult({ error: apiErrorMessage(err) });
      toast(apiErrorMessage(err), 'error');
    } finally {
      setTimeout(() => { busyRef.current = false; }, 1500);
    }
  }

  const flashColor = result?.error
    ? 'border-red-300 bg-red-50'
    : result?.duplicate
      ? 'border-amber-300 bg-amber-50'
      : result?.attendance?.status === 'present'
        ? 'border-emerald-300 bg-emerald-50'
        : result?.attendance?.status === 'late'
          ? 'border-amber-300 bg-amber-50'
          : 'border-slate-100 bg-white';

  return (
    <div>
      <SectionHeader title="Gate scanner" description="Point a student's QR code at the camera" />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          {error ? (
            <p className="text-sm text-red-600 p-6 text-center">{error}</p>
          ) : (
            <div id={SCANNER_ID} className="rounded-xl overflow-hidden" />
          )}
          {scanning && <p className="text-xs text-slate-400 text-center mt-2">Scanning…</p>}
        </div>

        <div aria-live="polite" className={`card p-6 border-2 transition-colors ${flashColor}`}>
          {!result ? (
            <p className="text-slate-400 text-center py-16">Awaiting scan…</p>
          ) : result.error ? (
            <p className="text-red-600 font-semibold text-center py-16">{result.error}</p>
          ) : (
            <div className="flex flex-col items-center text-center py-6">
              <Avatar name={result.student.full_name} photoUrl={result.student.photo_url} size={72} />
              <p className="font-bold text-lg text-slate-900 mt-3">{result.student.full_name}</p>
              <p className="text-sm text-slate-500">{result.student.class_name} · {result.student.student_code}</p>
              <p className={`mt-4 font-bold text-2xl uppercase tracking-wide ${result.duplicate ? 'text-amber-600' : result.attendance.status === 'present' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {result.duplicate ? 'Already checked in' : result.attendance.status}
              </p>
              {!result.duplicate && (
                <p className="text-sm text-slate-400 mt-1">at {result.attendance.check_in_time?.slice(0, 5)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
