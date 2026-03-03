"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-paper p-8">
          <div className="card-chunky max-w-md w-full p-8 text-center">
            <span className="text-5xl mb-4 block">🔧</span>
            <h2 className="font-display text-2xl font-bold mb-3">
              Oops, something broke!
            </h2>
            <p className="font-body text-sm text-ink/60 mb-6 leading-relaxed">
              Don&apos;t worry — try refreshing the page. If it keeps happening,
              the science lab might need a quick fix.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-chunky bg-playful-mustard"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 text-left text-xs text-ink/40 overflow-auto max-h-32 p-3 bg-ink/5 rounded-lg">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
