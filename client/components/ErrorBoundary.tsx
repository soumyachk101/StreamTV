'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full text-center space-y-6 bg-card/80 border border-border rounded-[2rem] p-8 shadow-soft">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground mb-2">
                Something went wrong
              </h2>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
