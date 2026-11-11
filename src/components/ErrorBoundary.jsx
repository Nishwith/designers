import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-xl space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-red-100">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Oops! Something went wrong.
              </h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                An unexpected error occurred while rendering this page. Please try refreshing or return back home.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-accent hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

