import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state as State;
    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-blue-600">
              {error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this.props as Props).children;
  }
}

export default ErrorBoundary;
