import { Component } from 'react';
import { IconAlertTriangle, IconArrowLeft, IconHome } from './Icon.jsx';

export default class ErrorBoundary extends Component {
  state = { hasError: false, reference: null };

  static getDerivedStateFromError() {
    return { hasError: true, reference: `ERR-${Date.now().toString(36).toUpperCase()}` };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      return (
        <section className="flex flex-col items-center justify-center text-center py-20 px-6" role="alert" aria-labelledby="page-error-title">
          <div className="relative h-20 w-20 mb-6">
            <div className="absolute inset-0 rounded-3xl bg-amber-100 rotate-6" />
            <div className="absolute inset-1 rounded-3xl bg-white text-amber-600 flex items-center justify-center shadow-card">
              <IconAlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <h1 id="page-error-title" className="text-2xl font-bold text-slate-900">
            {offline ? 'You appear to be offline' : 'This page could not finish loading'}
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
            {offline
              ? 'Reconnect to the internet, then try this page again. Your existing school records are safe.'
              : 'This may be a temporary connection or server problem. Your saved school records have not been removed.'}
          </p>
          <p className="mt-3 text-xs text-slate-400">Support reference: {this.state.reference}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button className="btn-secondary" onClick={() => history.back()}><IconArrowLeft className="h-4 w-4" /> Go back</button>
            <button className="btn-primary" onClick={() => location.reload()}>Try this page again</button>
            <a className="btn-ghost" href="/"><IconHome className="h-4 w-4" /> Dashboard</a>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
