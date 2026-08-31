import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SkillSphere Uncaught Runtime Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 font-outfit text-text-primary">
          <div className="bg-surface border border-outline-var/30 rounded-md p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-error-container/20 border border-error/30 flex items-center justify-center mx-auto text-error">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-syne text-text-primary tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                An unexpected interface error occurred. You can reload the page or return to the dashboard.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xs text-xs font-syne font-bold uppercase tracking-wider hover:bg-primary/20 transition cursor-pointer"
              >
                <RefreshCw size={12} /> Reload
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-mid border border-outline-var/40 text-text-muted hover:text-text-primary rounded-xs text-xs font-syne font-bold uppercase tracking-wider hover:border-primary/40 transition cursor-pointer"
              >
                <Home size={12} /> Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
