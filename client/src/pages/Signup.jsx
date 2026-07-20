import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client.js';
import { usePublicBranding } from '../hooks/usePublicBranding.js';
import { applyBrandColor, applyFavicon } from '../utils/brandColor.js';
import { useToast } from '../components/Toast.jsx';
import { IconArrowLeft, IconArrowRight } from '../components/Icon.jsx';

const EMPTY_FORM = { school_name: '', contact_name: '', contact_email: '', contact_phone: '', desired_subdomain: '', message: '' };

export default function Signup() {
  const { data: branding } = usePublicBranding();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (branding?.primary_color) applyBrandColor(branding.primary_color);
  }, [branding?.primary_color]);

  useEffect(() => {
    applyFavicon(branding?.favicon_url);
  }, [branding?.favicon_url]);

  const submit = useMutation({
    mutationFn: () => api.post('/signups', form),
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const name = branding?.name || 'Bright Future Basic School';

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="animate-drift absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="animate-drift absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary-300/30 blur-3xl" style={{ animationDelay: '-5s', animationDuration: '18s' }} />
      <div className="animate-drift absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" style={{ animationDelay: '-10s', animationDuration: '16s' }} />

      <div className="relative w-full max-w-md">
        <div className="card p-6">
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600 font-medium mb-6 flex items-center gap-1">
            <IconArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          {submitted ? (
            <div className="animate-fade-in-up text-center py-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Thanks for reaching out</h2>
              <p className="text-slate-500 text-sm mb-6">
                We'll be in touch at <span className="font-medium text-slate-700">{form.contact_email}</span> soon.
              </p>
              <Link to="/login" className="text-primary-600 font-medium text-sm">Back to login</Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold tracking-[0.2em] text-primary-600 uppercase mb-2">{name}</p>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Bring your school on board</h2>
              <p className="text-slate-500 text-sm mb-6">Tell us about your school and we'll reach out to get you set up.</p>

              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
              >
                <div>
                  <label className="label">School name</label>
                  <input className="input" required value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Contact name</label>
                  <input className="input" required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Contact email</label>
                  <input type="email" className="input" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Contact phone (optional)</label>
                  <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Desired subdomain (optional)</label>
                  <input className="input" placeholder="yourschool" value={form.desired_subdomain} onChange={(e) => setForm({ ...form, desired_subdomain: e.target.value })} />
                  <p className="text-xs text-slate-400 mt-1.5">We'll finalize this together — just a preference for now.</p>
                </div>
                <div>
                  <label className="label">Message (optional)</label>
                  <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>

                <button className="btn-primary w-full" disabled={submit.isPending}>
                  {submit.isPending ? 'Sending…' : 'Request access'} <IconArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
