import { Component } from 'react';
import { IconAlertTriangle } from './Icon.jsx';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-24 px-6">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
            <IconAlertTriangle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-slate-800">Something went wrong loading this page</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            The server may be unreachable. Check your connection and try again.
          </p>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
